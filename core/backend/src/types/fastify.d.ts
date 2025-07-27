import type { FastifyRequest, FastifyReply } from 'fastify'
import "@fastify/oauth2"

declare module 'fastify' {
	interface FastifyInstance {
		auth(req: FastifyRequest, reply: FastifyReply): Promise<void>
	}
}

declare module "fastify" {
	export interface FastifyInstance {
		googleOAuth2: import("@fastify/oauth2").OAuth2Namespace
	}
}

/*
	https://dev.to/fozooni/google-oauth2-with-fastify-typescript-from-scratch-1a57

	import OAuth2, { type OAuth2Namespace} from "@fastify/oauth2";

	declare module 'fastify' {
	    interface FastifyInstance {
	        GoogleOAuth2: OAuth2Namespace;
	    }
	}
 */
