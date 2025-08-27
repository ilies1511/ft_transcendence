// import type { fastify, FastifyPluginAsync } from 'fastify'
import { type FastifyInstance } from 'fastify'
// import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'
import cookie from 'cookie'            // npm install cookie
import { getUserId, setUserLive } from '../functions/user.js'
import { error } from 'console'
import { notifyFriendStatus } from '../functions/wsHandler/connectHandler.js'
import type { ExtendedWebSocket } from '../types/wsTypes.js'
import { handleWsMessage } from '../functions/wsHandler/messageHandler.js'
import { handleClose } from '../functions/wsHandler/closeHandler.js'
import { userSockets } from '../types/wsTypes.js'

/*
	FOr Live Chat, where every user can send msgs to other users and not only friends
*/

// const userSockets = new Map<number, Set<ExtendedWebSocket>>()


function originGuard(req: any, reply: any, done: any) {
	const allowed = new Set(
		[
			'http://localhost:5173',
			'http://localhost:3000',
			'https://localhost:5173',
			'https://localhost:3000'
		])
	const origin = req.headers.origin
	if (!origin || !allowed.has(origin)) {
		return reply.code(403).send({ error: 'Forbidden origin' })
	}
	done()
}

export const wsRoute = async function (app: FastifyInstance) {
	app.get('/ws',
		{
			websocket: true,
			preHandler: [app.auth, originGuard]
		},
		async (socket: WebSocket, req) => {
			const authUserId = await getUserId(req);
			// const raw = req.headers.cookie || ''
			// const { token } = cookie.parse(raw)

			// let payload: any
			// try {
			// 	if (token === undefined)
			// 		throw Error
			// 	payload = app.jwt.verify(token)
			// } catch (err) {
			// 	socket.close(1008, 'Invalid token')
			// 	return
			// }

			const extSocket = socket as ExtendedWebSocket
			// extSocket.userId = payload.id
			extSocket.userId = authUserId
			extSocket.isAlive = true

			if (extSocket.userId === undefined) {
				throw error
			}

			await setUserLive(app, extSocket.userId, true)
			await notifyFriendStatus(app, userSockets, extSocket.userId, true)

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
