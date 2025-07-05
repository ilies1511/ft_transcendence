import type { fastify, FastifyPluginAsync } from 'fastify'
// import websocket from '@fastify/websocket'
import type { WebSocket } from '@fastify/websocket' // <-- use 'import type'

// WebSocket echo endpoint
export const wsRoute: FastifyPluginAsync = async fastify => {
	fastify.get('/ws', { websocket: true }, (socket: WebSocket, req) => {
		socket.on('message', (message: Buffer) => {
			// Echo the received message back to the client
			socket.send('[BACK-END PART] Server received: ' + message.toString())
		})
	})
	fastify.get('/ws/alo', { websocket: true }, (socket: WebSocket, req) => {
		socket.on('message', (message: Buffer) => {
			// Echo the received message back to the client
			socket.send('Bien recu le message frere');
		})
	})


	// // 2) In-Memory-Map für Presence
	// const userSockets = new Map<number, Set<WebSocket>>()

	// // 3) Der WS-Endpoint für Presence
	// fastify.get('/wsBE', { websocket: true }, (socket, req) => {
	// 	// a) User-ID aus Query param lesen
	// 	const url = new URL(req.url!, 'http://localhost')
	// 	const userId = Number(url.searchParams.get('userId'))
	// 	if (!userSockets.has(userId)) userSockets.set(userId, new Set())
	// 	userSockets.get(userId)!.add(socket)

	// 	// b) beim Connect → online setzen + Friends benachrichtigen
	// 	setUserOnline(userId, true)

	// 	// c) aufräumen bei Disconnect
	// 	socket.on('close', () => {
	// 		const set = userSockets.get(userId)!
	// 		set.delete(socket)
	// 		if (set.size === 0) {
	// 			// letzter Socket zu diesem User d.h. offline
	// 			setUserOnline(userId, false)
	// 		}
	// 	})
	// })

	// // Hilfsfunktion: DB updaten und Friends benachrichtigen
	// async function setUserOnline(userId: number, online: boolean) {
	// 	await fastify.db.run(
	// 		'UPDATE users SET live = ? WHERE id = ?',
	// 		online ? 1 : 0,
	// 		userId
	// 	)
	// 	notifyFriends(userId, online)
	// }

	// // Push-Event an alle Freunde
	// async function notifyFriends(userId: number, online: boolean) {
	// 	const rows : { friend_id: number }[] = await fastify.db.all<{ friend_id: number }>(
	// 		'SELECT friend_id FROM friendships WHERE user_id = ?',
	// 		userId
	// 	)
	// 	// const rows: { friend_id: number }[] = await fastify.db.all<{ friend_id: number }[]>(
	// 	// 	`SELECT friend_id
	// 	// 	   FROM friendships
	// 	// 	  WHERE user_id = ?
	// 	// 	  ORDER BY created_at DESC`,
	// 	// 	userId
	// 	// )
	// 	const msg = JSON.stringify({
	// 		type: 'friend:status',
	// 		payload: { id: userId, live: online }
	// 	})
	// 	for (const { friend_id } of rows) {
	// 		for (const ws of userSockets.get(friend_id) ?? []) {
	// 			ws.send(msg)
	// 		}
	// 	}
	// }


	// fastify.register(async function (fastify) {
	// 	fastify.get('/', { websocket: true }, (socket /* WebSocket */, req /* FastifyRequest */) => {
	// 		socket.on('message', message => {
	// 			// message.toString() === 'hi from client'
	// 			socket.send('hi from server')
	// 		})
	// 	})
	// })
	// fastify.register(async function (fastify) {
		fastify.get('/*', { websocket: true }, (socket /* WebSocket */, req /* FastifyRequest */) => {
			socket.on('message', message => {
				// message.toString() === 'hi from client'
				socket.send('hi from wildcard route')
			})
		})

		fastify.get('/', { websocket: true }, (socket /* WebSocket */, req /* FastifyRequest */) => {
			socket.on('message', message => {
				// message.toString() === 'hi from client'
				socket.send('hi from server')
			})
		})


	// fastify.listen({ port: 3000 }, err => {
	// 	if (err) {
	// 		fastify.log.error(err)
	// 		process.exit(1)
	// 	}
	// })

	// type Socket = import('@fastify/websocket').WebSocket
	// // 1) Map behalten, welche Sockets zu welchem User gehören
	// const userSockets = new Map<number, Set<Socket>>()

	// fastify.get('/wsBE', { websocket: true }, (socket, req) => {
	// 	// a) userId über QueryString mitgeben, z.B. ws://…/ws?userId=42
	// 	const userId = Number(new URL(req.url!, 'http://x').searchParams.get('userId'))
	// 	if (!userSockets.has(userId)) userSockets.set(userId, new Set())
	// 	userSockets.get(userId)!.add(socket)

	// 	// b) beim ersten Connect → online setzen + Freunde benachrichtigen
	// 	setUserLive(fastify, userId, true).catch(console.error)
	// 	notifyFriends(userId, true)

	// 	// c) aufräumen bei Disconnect
	// 	socket.on('close', async () => {
	// 		const set = userSockets.get(userId)!
	// 		set.delete(socket)
	// 		if (set.size === 0) {
	// 			// letzter Socket dicht → offline
	// 			await setUserLive(fastify, userId, false)
	// 			notifyFriends(userId, false)
	// 		}
	// 	})
	// })

	// async function notifyFriends(userId: number, live: boolean) {
	// 	// alle Freunde ermitteln
	// 	const rows = await fastify.db.all<{ friend_id: number }>(
	// 		'SELECT friend_id FROM friendships WHERE user_id = ?',
	// 		userId
	// 	)
	// 	const msg = JSON.stringify({
	// 		type: 'friend:status',
	// 		payload: { id: userId, live }
	// 	})
	// 	// an jeden offenen Socket jedes Freundes senden
	// 	for (const { friend_id } of rows) {
	// 		for (const ws of userSockets.get(friend_id) ?? []) {
	// 			ws.send(msg)
	// 		}
	// 	}
	// }

}
