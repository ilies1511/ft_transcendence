import fp from 'fastify-plugin'
import type{ FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import oauthPlugin from '@fastify/oauth2'
import 'dotenv/config'
import OAuth2, { type OAuth2Namespace } from "@fastify/oauth2";

// export interface ProviderConfiguration {
// 	/** String used to set the host to request the tokens to. Required. */
// 	tokenHost: string;
// 	/** String path to request an access token. Default to /oauth/token. */
// 	tokenPath?: string | undefined;
// 	/** String path to revoke an access token. Default to /oauth/revoke. */
// 	revokePath?: string | undefined;
// 	/** String used to set the host to request an "authorization code". Default to the value set on auth.tokenHost. */
// 	authorizeHost?: string | undefined;
// 	/** String path to request an authorization code. Default to /oauth/authorize. */
// 	authorizePath?: string | undefined;
// }

declare module 'fastify' {
	interface FastifyInstance {
		GoogleOAuth2: OAuth2Namespace;
	}
}

const GOOGLE_OAUTH2_CONFIG = {
	authorizeHost: 'https://accounts.google.com',
	authorizePath: '/o/oauth2/v2/auth',

	tokenHost: 'https://oauth2.googleapis.com',
	tokenPath: '/token'
}

export default fp(async (fastify: FastifyInstance) => {
	fastify.register(oauthPlugin, {
		name: 'googleOAuth2',
		// scope: ['openid', 'profile', 'email'],
		scope: ['openid', 'profile', 'email'],
		credentials: {
			client: {
				id: process.env.GOOGLE_CLIENT_ID!,
				secret: process.env.GOOGLE_CLIENT_SECRET!
			},
			// auth: {
			// 	authorizeHost: 'https://accounts.google.com',
			// 	authorizePath: '/o/oauth2/v2/auth',
			// 	tokenHost: 'https://oauth2.googleapis.com',
			// 	tokenPath: '/token'
			// }
			/*
				siehe Unten
			 */

			// // auth: oauthPlugin.GOOGLE_CONFIGURATION
			// auth: GOOGLE_OAUTH2_CONFIG
		},
		startRedirectPath: '/api/auth/google', // entry for user
		callbackUri: 'http://localhost:3000/api/auth/google/callback',
		discovery: {
			issuer: 'https://accounts.google.com',
		},
		// generateStateFunction: (request: FastifyRequest, reply: FastifyReply) => {
		// 	// @ts-ignore
		// 	return request.query.state
		// },
		// checkStateFunction: (request: FastifyRequest, callback: any) => {
		// 	// @ts-ignore
		// 	if (request.query.state) {
		// 		callback()
		// 		return;
		// 	}
		// 	callback(new Error('Invalid state'))
		// }
	})
})

/*
	https://www.npmjs.com/package/@fastify/oauth2

Custom configuration

fastify.register(oauthPlugin, {
  name: 'customOauth2',
  credentials: {
	client: {
	  id: '<CLIENT_ID>',
	  secret: '<CLIENT_SECRET>'
	},
	auth: {
	  authorizeHost: 'https://my-site.com',
	  authorizePath: '/authorize',
	  tokenHost: 'https://token.my-site.com',
	  tokenPath: '/api/token'
	}
  },
  startRedirectPath: '/login',
  callbackUri: 'http://localhost:3000/login/callback',
  callbackUriParams: {
	exampleParam: 'example param value'
  }
})

*/



/*
https://github.com/fastify/fastify-oauth2/issues/260
https://www.npmjs.com/package/@fastify/oauth2

When your provider supports OpenID connect discovery and you want to configure
authorization, token and revocation endpoints automatically, then you can use
discovery option. discovery is a simple object that requires issuer property.

Issuer is expected to be string URL or metadata url. Variants with or without
trailing slash are supported.

fastify.register(oauthPlugin, {
	name: 'customOAuth2',
	scope: ['profile', 'email'],
	credentials: {
	  client: {
		id: '<CLIENT_ID>',
		secret: '<CLIENT_SECRET>',
	  },
	  // Note how "auth" is not needed anymore when discovery is used.
	},
	startRedirectPath: '/login',
	callbackUri: 'http://localhost:3000/callback',
	discovery: { issuer: 'https://identity.mycustomdomain.com' }
	// pkce: 'S256', you can still do this explicitly, but since discovery is used,
	// it's BEST to let plugin do it itself
	// based on what Authorization Server Metadata response
  });
*/
