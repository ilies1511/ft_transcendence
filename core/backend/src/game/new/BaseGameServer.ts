import { Game } from '../game_server.ts';
import { GameLobby } from './lobby/GameLobby.ts';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export abstract class BaseGameServer {
	protected _lobbies: Map<number, GameLobby> = new Map<number, GameLobby>;
	protected _fastify: FastifyInstance;

	constructor(fastify: FastifyInstance) {
		this._fastify = fastify;
	}

	//returns the lobby id or and error string
	protected async _create_lobby(
		map_name: string,
		ai_count: number,
		password?: string
	): Promise<number>
	{
		const lobby_id: number = 0;
		//todo: actually create lobby in db and use real id
		//lobby_id = await create looby in db();
		const lobby: GameLobby = new GameLobby(map_name, ai_count, password);
		this._lobbies.set(lobby_id, lobby);
		return (lobby_id);
	}
};
