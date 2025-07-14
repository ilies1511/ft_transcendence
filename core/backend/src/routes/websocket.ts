// import type { fastify, FastifyPluginAsync } from 'fastify'
import type { FastifyInstance } from 'fastify'
// import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
import cookie from 'cookie'            // npm install cookie
import { findUserWithFriends, setUserLive } from '../functions/user.ts'
import { error } from 'console'

/*
	FOr Live Chat, where every user can send msgs to other users and not only friends
*/
const userSockets = new Map<number, Set<ExtendedWebSocket>>()

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

		//// Old msg Handler
		// echo message handler
		// extSocket.on('message', (msg: Buffer) => {
		// 	extSocket.send(
		// 		`[BACK-END PART] Server received: ${msg.toString()}`
		// 	)
		// })
		{
			const set = userSockets.get(extSocket.userId) ?? new Set()
			set.add(extSocket)
			userSockets.set(extSocket.userId, set)
		}
		// BEGIN -- Message Handler
		extSocket.on('message', async raw => {
			let msg: any
			try { msg = JSON.parse(raw.toString()) }
			catch {
				return extSocket.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }))
			}
			if (msg.type === 'direct_message') {
				const targets = userSockets.get(msg.to as number)
				if (!targets || targets.size === 0) {
					return extSocket.send(JSON.stringify({
						type: 'error',
						error: 'User not connected'
					}))
				}
				for (const tsock of targets) {
					tsock.send(JSON.stringify({
						type: 'direct_message',
						from: extSocket.userId,
						content: msg.content,
						ts: Date.now()
					}))
				}
			}
			else {
				extSocket.send('[BACK-END PART] Server received: ' + raw.toString())
			}
		})
		// END -- Message Handler

		// BEGIN -- CLose Hanlder
		extSocket.on('close', async () => {
			await setUserLive(app, extSocket.userId!, false)
			const set = userSockets.get(extSocket.userId!)
			if (set) {
				set.delete(extSocket)
				if (set.size === 0) userSockets.delete(extSocket.userId!)
			}
			const friends = await findUserWithFriends(app, extSocket.userId!)
			console.log(friends);
			if (!friends) {
				// throw error(friends);
				throw new Error(`findUserWithFriends returned null for user ${extSocket.userId}`)
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
		// END -- CLose Hanlder
	})
}
