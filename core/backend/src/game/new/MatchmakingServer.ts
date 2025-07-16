import { BaseGameServer } from './BaseGameServer.ts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { GameLobby } from './lobby/GameLobby.ts';

export class MatchmakingServer extends BaseGameServer {
	constructor(fastify: FastifyInstance) {
		super(fastify);
	}

	//returns false on error
	public async join(user_id: number, map_name: string): Promise<boolean> {
		const ai_count: number = 0;
		
		for (const [lobby_id, lobby] of this._lobbies) {
			if (lobby.join(user_id, map_name)) {
				return (true);
			}
		}
	
		this._create_lobby(map_name, ai_count)
			.then(lobby_id => {
				const lobby: GameLobby | undefined = this._lobbies.get(lobby_id);
				try {
					if (lobby === undefined) {
						console.log("lobby not in this._lobbies eventhough it was just created");
						return (false);
					}
					lobby.join(user_id, map_name);
				} catch (error) {
					console.log(error);
					return (false);
				}
			})
			.catch(error => {
				console.log(error);
				return (false);
			});
		return (true);
	}
};
