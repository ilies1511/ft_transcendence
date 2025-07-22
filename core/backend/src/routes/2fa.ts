import { type FastifyInstance, type FastifyRequest, type FastifyReply, type FastifyPluginAsync, fastify } from "fastify";
import QRCode from 'qrcode'
import { init2FA, verify2FA } from "../functions/2fa.ts";

export const twoFaRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
	fastify.post(
		'/api/2fa/generate',
		{ preHandler: [fastify.auth] }, //Needed ?
		// // {
		// // 	schema: {
		// // 		tags: ['auth'],
		// // 		body: {
		// // 			type: 'object',
		// // 			required: ['token'],
		// // 			properties: { token: { type: 'string' } }
		// // 		},
		// // 		response: {
		// // 			200: { type: 'object', properties: { success: { type: 'boolean' } } },
		// // 			400: { type: 'object', properties: { error: { type: 'string' } } }
		// // 		}
		// // 	},
		// // // BEGIN -- Working Scheme
		// {
		// 	preHandler: [fastify.auth],
		// 	schema: {
		// 		tags: ['auth'],
		// 		summary: 'Initializes 2FA',
		// 		description: 'Generiert ein QR-Code-Bild als Data-URL. Authentifizierung erfolgt über das Cookie `token`.',
		// 		response: {
		// 			200: {
		// 				description: 'QR-Code succesfully generated',
		// 				type: 'object',
		// 				properties: {
		// 					qr: { type: 'string', description: 'Data-URL of a QR-Code' }
		// 				}
		// 			},
		// 			400: {
		// 				description: 'Invalid Token or other error',
		// 				type: 'object',
		// 				properties: {
		// 					error: { type: 'string' }
		// 				}
		// 			}
		// 		}
		// 	}
		// 	// preHandler: [fastify.auth]
		// },
		// // // END -- Working Scheme
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

/*
	TEST FLOW:

	1. Normal Login via /api/login to get JWT
		curl -i -X POST http://localhost:3000/api/login \
		-H 'Content-Type: application/json' \
		-d '{"email":"alice@example.com","password":"geheim"}'

	2. Generate SECRET & QR-Code (simpyfies setup)
		curl -i -X POST http://localhost:3000/api/2fa/generate \
		-H "Cookie: token=<USER_JWT_TOKEN>"
// --cookie "token=<USER_JWT_TOKEN>"

	3. Verifying TOTP Code -> provided by GoogleAuthentifactor after 2 step
		curl -i -X POST http://localhost:3000/api/2fa/verify \
		--cookie "token=<USER_JWT_TOKEN>" \
		-H 'Content-Type: application/json' \
		-d '{"token":"123456"}'

	4. Now 2FA is set-up for user

	5. Starting from now the user is logging in with the 2fa login --> /api/login/2fa
		curl -i -X POST http://localhost:3000/api/login/2fa \
		-H 'Content-Type: application/json' \
		-d '{"email":"alice@example.com","password":"geheim","token":"123456"}'

	TL;DR:
	1. Login -> 'extracting' Cookie token
	2. Generate -> scan QR-Code (via external App/Tool)
	3. Verify -> paste in TOTP-Codes
	4. 2FA-Login:
		- if user tries now via '/api/login', he will be 'redirected' to
			'/api/login/2fa' and asked to enter TOTP-Codes
		- now login via '/api/login/2fa'
 */
