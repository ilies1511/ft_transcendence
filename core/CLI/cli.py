import ssl
import json
import sys
import select
import threading
import requests
import websocket

#BASE = "http://localhost:3000"
#HOST = "localhost:3000"
HOST = f'{input("Server host name:: ")}:1443'
#HOST = f'localhost:1433'

BASE = f'https://{HOST}'


def _cookie_header_from(session: requests.Session) -> str:
    jar = requests.utils.dict_from_cookiejar(session.cookies)
    return "; ".join(f"{k}={v}" for k, v in jar.items())

class Game:
    def __init__(self, host: str, game_id: int | str, client_id: int | str,
                 secure: bool = True, headers: list[str] | None = None, origin: str | None = None):
        scheme = "wss" if secure else "ws"
        self.route = f"{scheme}://{host}/game/{game_id}"
        self.client_id = client_id
        self._ws = None
        self._headers = headers or []
        self._origin = origin
        self._connected = False
        self.w = False
        self.a = False
        self.s = False
        self.d = False
        self._stop = threading.Event()
        self._ws_thread = None

    def _connect(self):
        print("GAME: Attempting connect..")

        def on_open(ws):
            print("GAME: Connected to server")
            self._connected = True
            msg = {"client_id": self.client_id, "type": "connect"}
            ws.send(json.dumps(msg))

        def on_message(ws, message):
            if not isinstance(message, (bytes, bytearray)):
                print("message:", message)

        def on_close(ws, status_code, close_msg):
            print("Socket closed")
            self._stop.set()

        def on_error(ws, error):
            print("GAME: error:", error)
            self._stop.set()

        self._ws = websocket.WebSocketApp(
            self.route,
            header=self._headers,
            on_open=on_open,
            on_message=on_message,
            on_close=on_close,
            on_error=on_error,
        )

        t = threading.Thread(
            target=self._ws.run_forever,
            kwargs={
                "origin": self._origin,
                "sslopt": {"cert_reqs": ssl.CERT_NONE, "check_hostname": False},
            },
            daemon=True,
        )
        t.start()

    def _send_input(self, key: str, type_: str):
        if not (self._ws and self._connected):
            print("(not connected yet)")
            return
        try:
            self._ws.send(json.dumps({
                "client_id": self.client_id,
                "type": "send_input",
                "payload": {"key": key, "type": type_},
            }))
        except Exception as e:
            print("send failed:", e)

    def run(self):
        self._connect()
        print("Type: w/a/s/d, 'q' to quit.")
        try:
            while not self._stop.is_set():
                r, _, _ = select.select([sys.stdin], [], [], 0.1)
                if not r:
                    continue

                line = sys.stdin.readline()
                if not line:
                    break
                cmd = line.strip().lower()
                if not cmd:
                    continue
                if cmd == "q":
                    break
                elif cmd == 'w':
                    if self.w:
                        self._send_input('w', 'up')
                    else:
                        self._send_input('w', 'down')
                    self.w = not self.w;
                elif cmd == 'a':
                    if self.a:
                        self._send_input('a', 'up')
                    else:
                        self._send_input('a', 'down')
                    self.a = not self.a;
                elif cmd == 's':
                    if self.s:
                        self._send_input('s', 'up')
                    else:
                        self._send_input('s', 'down')
                    self.s = not self.s;
                elif cmd == 'd':
                    if self.d:
                        self._send_input('d', 'up')
                    else:
                        self._send_input('d', 'down')
                    self.d = not self.d;
                else:
                    print("unknown command: ", cmd)
        finally:
            self._stop.set()
            try:
                if self._ws:
                    self._ws.close()
            except Exception:
                pass
            if self._ws_thread and self._ws_thread.is_alive():
                self._ws_thread.join(timeout=2)
            print("exiting...")

def enter_matchmaking(session, csrf_token, user_id=2, display_name='CLI_DISPLAY_NAME', map_name='default_2'):
    print("\n=== Enter Matchmaking ===")
    payload = {
        "user_id": user_id,
        "display_name": display_name,
        "map_name": map_name,
        "ai_count": 0,
    }
    headers = {
        "X-CSRF-Token": csrf_token,
    }
    try:
        r2 = session.post(f"{BASE}/api/enter_matchmaking", json=payload, headers=headers)
    except requests.RequestException as e:
        print(f"Network error during enter_matchmaking: {e}")
        sys.exit(1)

    if r2.status_code == 401:
        print("Unauthorized (401). Session not established — login likely failed.")
        sys.exit(1)

    try:
        resp_json = r2.json()
    except ValueError:
        print(f"Unexpected response: {r2.text}")
        sys.exit(1)

    if resp_json.get("error"):
        print("enter_matchmaking returned an error:")
        print(json.dumps(resp_json, indent=2))
        sys.exit(1)
    print("enter_matchmaking successful:")
    print(json.dumps(resp_json, indent=2))
    return resp_json

def whoami(session: requests.Session):
    r = session.get(f"{BASE}/api/me", timeout=10)
    return r.json()['id']

def login():
    print("=== Login ===")
    email = input('email: ')

    password = input('password: ')


    with requests.Session() as session:
        session.verify = False
        try:
            csrf_res = session.get(f"{BASE}/api/csrf")
            csrf_res.raise_for_status()
            csrf_token = csrf_res.json().get("token")

            if not csrf_token:
                raise RuntimeError("Could not fetch CSRF token")

            print("CSRF Token:", csrf_token)

            headers = {
                "X-CSRF-Token": csrf_token
            }
            r = session.post(f"{BASE}/api/login", json={"email": email, "password": password})
        except requests.RequestException as e:
            print(f"Network error during login: {e}")
            sys.exit(1)

        try:
            data = r.json()
        except ValueError:
            data = {}

        if not r.ok:
            print(f"Login failed: {data.get('error') or r.status_code}")
            sys.exit(1)

        if data.get("twofa_required"):
            print("CLI does not support 2FA.")
            sys.exit(1)

        print("Logged in")
        client_id = whoami(session)
        print(f'client_id: {client_id}')
        mm_response = enter_matchmaking(session, csrf_token, user_id=client_id)
        match_id = mm_response['match_id']

        cookie_header = _cookie_header_from(session)
        headers = [f"Cookie: {cookie_header}", f"X-CSRF-Token: {csrf_token}"]
        origin = BASE

        Game(host=HOST, game_id=match_id, client_id=client_id, headers=headers, origin=origin).run()



def main():
    login()

if __name__ == "__main__":
    main()

