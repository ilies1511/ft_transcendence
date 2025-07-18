import type { WebSocket } from '@fastify/websocket';
import type {
	ServerToClientError,
	ServerToClientMessage,
	ServerError,
    ClientToTournament,
} from '../game_shared/message_types.ts';

export class Tournament {
	constructor() {
	}

	//todo:
	public recv(ws: WebSocket, msg: ClientToTournament): boolean {
		return (false);
	}
};
