import { type FastifyInstance, type FastifyRequest, type FastifyReply, type FastifyPluginAsync, fastify } from "fastify";
import QRCode from 'qrcode'
import { init2FA, verify2FA } from "../functions/2fa.ts";

export const twoFaRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
	fastify.post(
		'/api/2fa/generate',
		{ preHandler: [fastify.auth] }, //Needed ?
		// {
		// 	schema: {
		// 		tags: ['auth'],
		// 		body: {
		// 			type: 'object',
		// 			required: ['token'],
		// 			properties: { token: { type: 'string' } }
		// 		},
		// 		response: {
		// 			200: { type: 'object', properties: { success: { type: 'boolean' } } },
		// 			400: { type: 'object', properties: { error: { type: 'string' } } }
		// 		}
		// 	},
			// schema: {
			// 	tags: ['auth'],
			// 	summary: 'Initialisiert die Zwei-Faktor-Authentifizierung',
			// 	description: 'Generiert ein QR-Code-Bild als Data-URL. Authentifizierung erfolgt über das Cookie `token`.',
			// 	response: {
			// 		200: {
			// 			description: 'QR-Code erfolgreich generiert',
			// 			type: 'object',
			// 			properties: {
			// 				qr: { type: 'string', description: 'Data-URL eines QR-Codes' }
			// 			}
			// 		},
			// 		400: {
			// 			description: 'Ungültiger Token oder anderer Fehler',
			// 			type: 'object',
			// 			properties: {
			// 				error: { type: 'string' }
			// 			}
			// 		}
			// 	}
			// },
			// preHandler: [fastify.auth]
		// },
		// { preHandler: [fastify.auth] }, //Needed ?
		async (req, reply) => {
			const userId = (req.user as any).id
			console.log("USER ID 2FA:" + userId);
			const { otpAuthUrl } = await init2FA(fastify, userId);

			const qrDataUrl = await QRCode.toDataURL(otpAuthUrl)

			return reply.send({ qr: qrDataUrl })
		}
	)

	/*
		Endpoint to activate 2FA, only called once at very beginning after
		'/api/2fa/generate',
	 */
	fastify.post<{
		Body: { token: string }
	}>(
		'/api/2fa/verify',
		{
			schema: {
				tags: ['auth'],
				body: {
					type: 'object',
					required: ['token'],
					properties: { token: { type: 'string' } }
				},
				response: {
					200: { type: 'object', properties: { success: { type: 'boolean' } } },
					400: { type: 'object', properties: { error: { type: 'string' } } }
				}
			},
			preHandler: [fastify.auth]
		},
		async (req, reply) => {
			const userId = (req.user as any).id
			const { token } = req.body

			try {
				const ok = await verify2FA(fastify, userId, token);
				if (!ok) {
					return reply.code(400).send({ error: 'Invalid 2FA code' })
				}
				return reply.send({ success: 'true' })
			} catch (err: any) {
				if (err.message === 'NOT_INITIALIZED') {
					return reply.code(400).send({ error: '2FA not initialized' })
				}
				throw err
			}
		}
	)
}

