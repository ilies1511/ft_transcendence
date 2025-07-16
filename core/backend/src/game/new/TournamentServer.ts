import { BaseGameServer } from './BaseGameServer.ts';
import type { FastifyInstance, FastifyRequest } from 'fastify';

//todo: later
export class TournamentServer extends BaseGameServer {
	constructor(fastify: FastifyInstance) {
		super(fastify);
	}

};
