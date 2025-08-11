// backend/src/routes/friends_invitation.ts
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import chalk from 'chalk'; // add color to print statement to server console
import util  from 'util'; // for priting out to server console


// -----------------------------------------------

const friendsInviteNotificationRoute: FastifyPluginAsync = async (fastify) => {
	fastify.get('/friends', { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
		try {
			await req.jwtVerify();
		} catch (err: any) {
			console.log(chalk.yellow('Client/User is NOT logged in →', err.message));
			socket.close(1008, 'unauthorized');
			return;
		}

		const ws = socket as WebSocket & { userId: number; wsPath: string };
		ws.userId = (req.user as { id: number }).id;
		ws.wsPath = '/friends';

		console.log(chalk.green(`WS connected  uid=${ws.userId}`));

		// printing all client/user list
		const printClientList_WS = () => {
			const rows = [...fastify.websocketServer.clients].map((c: any, i) => ({
				idx : i + 1, // 1-based position
				id : c.userId ?? '—', // user id
				open : c.readyState === 1, // true ⇢ OPEN, false ⇢ CLOSING/CLOSED
				path : c.wsPath,
			}));
			//TODO: Copy this in /ws endpoint logic
			console.log(
				chalk.magenta.bold(
					`Total WS clients: ${rows.length}\n` + util.inspect(rows, {
						depth : null,
						compact : false,
						breakLength : 1
					})
				)
			);
		};

		printClientList_WS();
		socket.on('close', printClientList_WS); // print after disconnect
		socket.on('error', e => console.log('WS error', e));
	});
};

export default friendsInviteNotificationRoute;
