// import type { fastify, FastifyPluginAsync } from 'fastify'
import type { FastifyInstance } from 'fastify'
// import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
import cookie from 'cookie'            // npm install cookie
import { findUserWithFriends, setUserLive } from '../functions/user.ts'
import { error } from 'console'

interface ExtendedWebSocket extends WebSocket {
	userId?: number
	isAlive?: boolean
}

export const wsRoute = async function (app: FastifyInstance) {
	app.get('/ws', { websocket: true }, async (socket: WebSocket, req) => {
		// Token aus dem Cookie auslesen
		const raw = req.headers.cookie || ''
		const { token } = cookie.parse(raw)

		// Token validieren und Payload holen
		let payload: any
		try {
			if (token === undefined)
				throw Error
			// fastify.jwt.verify wirft, wenn ungültig
			payload = app.jwt.verify(token)
		} catch (err) {
			socket.close(1008, 'Invalid token')
			return
		}

		//  userID speichern
		const extSocket = socket as ExtendedWebSocket
		extSocket.userId = payload.id
		extSocket.isAlive = true

		// Setze user „live“ in der DB
		if (extSocket.userId === undefined) {
			throw error
		}
		await setUserLive(app, extSocket.userId, true)
		// echo message handler
		extSocket.on('message', (msg: Buffer) => {
			extSocket.send(
				`[BACK-END PART] Server received: ${msg.toString()}`
			)
		})

		// Clean-up & Broadcast at Closure
		extSocket.on('close', async () => {
			// User als offline markieren
			await setUserLive(app, extSocket.userId!, false)

			// Freunde laden
			const friends = await findUserWithFriends(app, extSocket.userId!)

			console.log(friends);
			if (!friends) {
				throw error(friends);
			}
			console.log("ALoo0");
			for (const client of app.websocketServer.clients) {
				const c = client as ExtendedWebSocket;
				if (c.readyState !== WebSocket.OPEN || c.userId === undefined) {
					continue;
				}

				console.log("ALoo1");
				for (const friend of friends.friends) {
					console.log(friend);
					console.log(extSocket.userId);
					console.log(c.userId);
					if ((friend.id !== extSocket.userId && friend.id === c.userId)) {
						console.log("ALoo2");
						c.send(JSON.stringify({
							type: 'friend_status_update',
							friendId: extSocket.userId,
							online: false
						}));
					}
				}
			}
		})
	})
}
