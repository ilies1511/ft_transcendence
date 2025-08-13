// import type { fastify, FastifyPluginAsync } from 'fastify'
import { type FastifyInstance } from 'fastify'
// import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
import cookie from 'cookie'            // npm install cookie
import { setUserLive } from '../functions/user.ts'
import { error } from 'console'
import { notifyFriendStatus } from '../functions/wsHandler/connectHandler.ts'
import type { ExtendedWebSocket} from '../types/wsTypes.ts'
import { handleWsMessage } from '../functions/wsHandler/messageHandler.ts'
import { handleClose } from '../functions/wsHandler/closeHandler.ts'
import { userSockets } from '../types/wsTypes.ts'

/*
	FOr Live Chat, where every user can send msgs to other users and not only friends
*/

// const userSockets = new Map<number, Set<ExtendedWebSocket>>()

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
		await notifyFriendStatus(app, userSockets, extSocket.userId, true)

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
		await notifyFriendStatus(app, userSockets, extSocket.userId, true);

		// BEGIN -- Message Handler
		extSocket.on('message', raw => {
			handleWsMessage(app, userSockets, extSocket, raw);
		})
		// END -- Message Handler

		// BEGIN -- CLose Hanlder
		extSocket.on('close', async () => {
			handleClose(app, userSockets, extSocket);
		})
		// END -- CLose Hanlder
	})
}
