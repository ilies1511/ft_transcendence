import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'

const PORT: number = 3333;

const fastify = Fastify({ logger: true })

// Register the websocket plugin BEFORE routes
await fastify.register(websocket)

// WebSocket echo endpoint
fastify.get('/game', { websocket: true }, (socket: WebSocket, req) => {
	console.log("fastify.get(game)");
  socket.on('message', (message: Buffer) => {
    // Echo the received message back to the client
    socket.send('[BACK-END PART] Server received: ' + message.toString())
  })
})

// HTTP API endpoint
fastify.get('/api/hello', async (request, reply) => {
	console.log("fastify.get(api/hello)");
  return { hello: 'world' }
})

// Start the server
try {
  await fastify.listen({ port: PORT })
  console.log('[BACK-END PART] Fastify WebSocket server running on ws://localhost:3333/game')
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

/*import Fastify from 'fastify';
//import websocketPlugin, { SocketStream } from '@fastify/websocket'
import websocketPlugin from '@fastify/websocket';
import type { fastifyWebsocket } from '@fastify/websocket';
import type { FastifyInstance, FastifyRequest } from 'fastify';
////import { WebSocketServer } from 'ws';
//import type { ClientToServerMessage } from '../../game_shared/message_types';
//import type { ServerToClientMessage } from '../../game_shared/message_types';
//import type { ServerToClientJson } from '../../game_shared/message_types';
//import { BinType } from '../../game_shared/message_types';
//import type { GameOptions } from '../../game_shared/message_types';

const fastify: FastifyInstance = Fastify();
fastify.register(websocketPlugin);
fastify.get(
  '/game',
  { websocket: true },
  (connection: any , req: FastifyRequest) => {
    //const { socket } = connection.socket;
    const socket = connection.socket;

    // When a client connects
    console.log('Client connected');
	
	try {
    socket.on('message', (message: string) => {
      console.log('Received:', message);
      // Echo it back
      socket.send(`You said: ${message}`);
    });
	} catch (e) {
    fastify.log.error(e);
	console.log(e);
    process.exit(1);
	}

    socket.on('close', () => {
      console.log('Client disconnected');
    });
  }
);

const start = async () => {
  try {
    await fastify.listen({ port: PORT });
    console.log('Server listening on http://localhost:' + PORT);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

//placeholder
enum Effects {
	FIRE = 0,
};

type vec3 = {
	x: number;
	y: number;
	z: number; //for now ignore z, just incase of future features use 3d movement
};

type Client = {
	id: number;
	socket: WebSocket;
	effects: Effects[];
	pos: vec3;
};

type Ball = {
	pos: vec3;
	direct: vec3;
	effects: Effects[];
	lifetime: number;
};


////const wss = new WebSocketServer({ port: PORT });
//const games: Game[] = [];
//
//class Game {
//	running: boolean = false;
//	public options: GameOptions;
//	clients: Client[] = [];
//	private balls: Ball[] = [];
//	constructor(options: GameOptions) {
//		this.options = options;
//	}
//
//	send_game_state(ws: WebSocket) {
//		const arr = new ArrayBuffer(1);
//		const view = new DataView(arr);
//		view.setUint8(0, BinType.GAME_STATE);
//		//msg.setUint8(0, BinType.GAME_STATE);
//		ws.send(arr);
//	}
//};
//
//
//
//
//function game_input_msg(game: Game, player_id: number, message: ArrayBuffer) {
//	const view = new DataView(message);
//	const type: BinType = view.getUint8(0);
//}
//
//function join_game(ws: WebSocket, player_id: number, options: GameOptions, game: Game) {
//	const client: Client = {
//		id: player_id,
//		socket: ws,
//		effects: [],
//		pos: { x: 0, y:0, z: 0}
//	};
//	game.clients.push(client);
//	if (game.clients.length == game.options.player_count) {
//		for (let client of game.clients) {
//			const msg: ServerToClientJson = {
//				type: 'starting_game',
//				options: options,
//			};
//			client.socket.send(JSON.stringify(msg));
//		}
//		//todo: start game
//		//todo: flush ws so no old request are left inside
//		//ws.onmessage = (event) => {
//		ws.on('message') => {
//			//if (event.data instanceof ArrayBuffer) {
//			//	// game_input_msg(game, player_id, event.data);
//			//} else {
//			//	const json = JSON.parse(event.data as string) as ClientToServerMessage;
//			//}
//		};
//
//		//ws.on('message', (message: unknown) => {
//		//	//todo: multiplexor for message type (example Leave or ArrayBuffer)
//		//	//case (ArrayBuffer) :
//		//		// game_input_msg(game, player_id, message);
//		//		// break ;
//		//	// case ('leave_game'):
//		//	// ...
//		//});
//
//	} else {
//		for (let client of game.clients) {
//			const msg: ServerToClientJson = {
//				type: 'game_lobby_update',
//				player_count: game.clients.length,
//				target_player_count: game.options.player_count
//			};
//			client.socket.send(JSON.stringify(msg));
//		}
//	}
//}
//
//function enter_matchmaking(ws: WebSocket, player_id: number, options: GameOptions) {
//	console.log("enter_matchmaking");
//	//todo: check if the player is allready in a lobby and leave it first
//	//todo: validate options
//	//ws.on('message', (message: ClientToServerMessage) => {
//		//console.log(`Received in enter_matchmaking: ${message}`);
//		for (let game of games) {
//			if (game.running != true
//				&& game.options == options
//				&& game.clients.length < game.options.player_count
//			) {
//				join_game(ws, player_id, options, game);
//				return ;
//			}
//		}
//		const game: Game = new Game(options);
//		games.push(game);
//		join_game(ws, player_id, options, game);
//	//});
//}
//
//function first_ws_msg(ws: WebSocket, message: string) {
//	let json: ClientToServerMessage;// = JSON.parse(message);
//	try {
//		json = JSON.parse(message) as ClientToServerMessage;
//	} catch (e) {
//		console.log("Error: new connection with message in not valid ClientToServerMessage json format");
//		//todo: maybe simply show a front end error msg:
//		//	'There was an issue with the game server communiction,
//		//	try to reconnect if you were in a game'
//		ws.close();
//		return ;
//	}
//	console.log(`initial. Received: ${message}`);
//	//if (typeof message !== "string") {
//	//	console.log("Error: new connection with message not of type string, type: ",
//	//		typeof message);
//	//	ws.close();
//	//	return ;
//	//}
//	const player_id: number = json.player_id;
//	switch (json.type) {
//		case ('search_game'):
//			enter_matchmaking(ws, player_id, json.payload.options);
//			break ;
//		//todo:
//		//case('leave_game'):
//		//break ;
//		case ('reconnect'):
//		console.log(`client tries to reconnect`);
//		case ('send_input'):
//			for (let game of games) {
//				for (let client of game.clients) {
//					if (client.id == player_id) {
//						client.socket.close();
//						client.socket = ws;
//						console.log("client was reconnected to game");
//						return ;
//					}
//				}
//			}
//			//todo: give client some error, maybe deiffer between the types
//			console.log("client did not search for game and was also not in game");
//			return ;
//		default:
//			console.log("Error: first msg type was not matched");
//			ws.close();
//			return ;
//	}
//}
//
////wss.on('connection', (ws: any) => {
////	console.log('Client connected');
////	ws.once('message', (message: string) => {
////		first_ws_msg(ws, message);
////	});
////
////	ws.on('close', () => {
////		console.log('Client disconnected');
////	});
////});
//
//
//console.log('WebSocket server running on ws://localhost:3333');
//

*/
