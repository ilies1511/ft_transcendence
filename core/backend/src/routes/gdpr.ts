import type { FastifyPluginAsync } from 'fastify';
import { type UpdateProfile, anonymizeUser, deleteUserAndData, getUserData, jsonGZHandler, jsonHandler, zipHandler, updateMyProfile, anonymizeAndSetPassword, issueFreshAuthCookie } from '../functions/gdpr.ts';
import { collectUserExport } from '../functions/gdpr.ts';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';
import archiver from 'archiver'
import path from 'node:path'
import fs from "fs";
import { fileURLToPath } from 'node:url'
import { extractFilename, resolveAvatarFsPath, resolvePublicPath } from '../functions/gdpr.ts';
import { getUserId } from '../functions/user.ts';
import { anonymizeAndSetPwSchema, anonymizeMeSchema, meDataSchema, meDeleteSchema, meExportSchema, mePatchSchema, ogExportSchema } from '../schemas/gdpr.ts';
import { notifyFriendStatus } from '../functions/wsHandler/connectHandler.ts';
import { userSockets } from '../types/wsTypes.ts';
import { setUserLive } from '../functions/user.ts';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKEND_ROOT = path.resolve(__dirname, '../..')
export const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.resolve(BACKEND_ROOT, '../frontend/public')
export const AVATAR_SUBDIR = process.env.AVATAR_SUBDIR ?? 'avatars'

export const gdprRoutes: FastifyPluginAsync = async fastify => {

	fastify.get('/api/me/data',
		{
			schema: meDataSchema
		},
		async (req, reply) => {
			const userId = await getUserId(req);

			const data = await getUserData(fastify, userId);
			if (!data) {
				return reply.code(404).send({ error: 'User not found' })
			}
			return reply.send(data);
		});

	// BEGIN -- OLD
	// fastify.post('/api/me/anonymize',
	// 	{
	// 		schema: anonymizeMeSchema
	// 	},
	// 	async (req, reply) => {
	// 		const userId = await getUserId(req);
	// 		await anonymizeUser(fastify, userId);
	// 		return reply.send({ message: 'Your personal data has been anonymized.' });
	// 	});
	// END -- OLD
	fastify.post('/api/me/anonymize',
		{
			schema: anonymizeAndSetPwSchema
		},
		async (req, reply) => {
			const userId = await getUserId(req);
			const { newPassword } = req.body as { newPassword: string };

			const { pseudoUsername, pseudoEmail } =
				await anonymizeAndSetPassword(fastify, userId, newPassword);
			// await issueFreshAuthCookie(fastify, reply, userId, pseudoUsername);
			return reply.send({
				message: 'Your data has been anonymized and your password was updated.',
				pseudoEmail,
			});
		});

	// fastify.delete('/api/me',
	// 	{
	// 		preHandler: [fastify.auth],
	// 		schema: {
	// 			tags: ['gdpr'],
	// 		}
	// 	},
	// 	async (req, reply) => {
	// 		const userId = (req.user as any).id;
	// 		await deleteUserAndData(fastify, userId);
	// 		reply.clearCookie('token', { path: '/' });
	// 		return reply.send({ message: 'Your account and all associated data have been permanently deleted.' });
	// 	});

	fastify.delete('/api/me',
		{
			schema: meDeleteSchema
		},
		async (req, reply) => {
			// const userId = (req.user as any).id
			const userId = await getUserId(req);

			await setUserLive(fastify, userId, false);
			await notifyFriendStatus(fastify, userSockets, userId, false);

			try {
				await deleteUserAndData(fastify, userId);

				//remove user from the open sockets
				const set = userSockets.get(userId);
				if (set) {
					for (const sock of set) {
						try { sock.close(1000, 'Account deleted'); } catch {}
					}
					userSockets.delete(userId);
				}
				//notify other users that user account was deleted, so FE can be updated
				const payload = { type: 'user_deleted', userId };
				for (const client of fastify.websocketServer.clients) {
					if ((client as any).readyState === WebSocket.OPEN) {
						try { client.send(JSON.stringify(payload)); } catch {}
					}
				}

				reply.clearCookie('token', {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: false
				})
				return reply.send({ message: 'Your account and all associated data have been permanently deleted.' })
			} catch (error: any) {
				if (error?.statusCode) {
					return reply.code(error.statusCode).send({ error: error.message ?? 'Error' })
				}
				throw error
			}
		}
	)

	//TODO: edit user Profile --> Add Endpoints for single changes + one for global change
	// fastify.patch('/api/me', async(req, reply)=> {

	// });
	fastify.patch<{
		Body: UpdateProfile
	}>(
		'/api/me',
		{
			schema: mePatchSchema
		},
		async (req, reply) => {
			const userId = await getUserId(req);
			try {
				const ok = await updateMyProfile(fastify, userId, req.body)
				if (!ok) return reply.code(400).send({ error: 'Nothing to update or user not found.' })

				// Broadcast updated user to all WS clients
				const updated = await fastify.db.get(
					'SELECT id, username, nickname, email, live, avatar FROM users WHERE id = ?',
					[userId]
				)
				if (updated) {
					const payload = { type: 'user_updated', user: updated }
					for (const client of fastify.websocketServer.clients) {
						if (client.readyState === WebSocket.OPEN) {
							client.send(JSON.stringify(payload))
						}
					}
				}

				return { ok: true }
			} catch (err: any) {
				if (err.code === 'INVALID_CURRENT_PASSWORD') {
					return reply.code(401).send({ error: 'Current password is incorrect.' })
				}
				if (err.code === 'CURRENT_PASSWORD_REQUIRED') {
					return reply.code(400).send({ error: 'Current password is required to change your password' })
				}
				if (err.code === 'PASSWORD_UNCHANGED') {
					return reply.code(400).send({ error: 'New password must be different from the current one' })
				}
				if (err.code === 'NO_LOCAL_PASSWORD') {
					return reply.code(400).send({ error: 'Your account has no local password. Use the set password flow.' })
				}
				if (err.code === 'SQLITE_CONSTRAINT' && String(err.message).includes('users.username')) {
					return reply.code(409).send({ error: 'Username is already taken.' })
				}
				// if (err.code === 'SQLITE_CONSTRAINT' && String(err.message).includes('users.email')) {
				// 	return reply.code(409).send({ error: 'Email is already taken.' })
				// }
				// if (err.code === 'SQLITE_CONSTRAINT' && String(err.message).includes('users.username')) {
				// 	return reply.code(409).send({ error: 'Username is already taken.' })
				// }
				if (err.code === 'SQLITE_CONSTRAINT') {
					if (String(err.message).includes('users.email')) {
						return reply.code(409).send({ error: 'Email is already taken.' })
					}
					else if (String(err.message).includes('users.username')) {
						return reply.code(409).send({ error: 'Username is already taken.' })
					}
				}
				req.log.error(err, 'Error updating profile for user ' + userId)
				return reply.code(500).send({ error: 'An internal server error occurred.' })
			}
		}
	)

	fastify.get('/api/me/export',
		{
			schema: meExportSchema
			// schema: ogExportSchema
		},
		async (req, reply) => {
			const userId = await getUserId(req);
			const { format = 'json', includeMedia = false } = req.query as any

			if (format !== 'zip' && includeMedia) {
				return reply.code(400).send({ error: 'includeMedia only with format=zip possible' })
			}
			const data = await collectUserExport(fastify, userId, {
				includeMedia: format === 'zip' && includeMedia
			})
			const ts = new Date().toISOString().replace(/[:.]/g, '_')

			// BEGIN -- HANDLERS
			if (format === 'json') {
				return jsonHandler(fastify, reply, data, userId, ts);
			}
			if (format === 'json.gz') {
				return jsonGZHandler(fastify, reply, data, userId, ts);
			}
			if (format === 'zip') {
				await zipHandler(fastify, reply, data, includeMedia, userId, ts);
				return
			}
			// END -- HANDLERS
			return reply.code(400).send({ error: 'Unsupported format' })
		}
	)
}

// BEGIN -- Backup Zip Handler
// if (format === 'zip') {
// 	reply
// 		.type('application/zip')
// 		.header('Content-Disposition', `attachment; filename="user_${userId}_${ts}.zip"`)
// 	reply.hijack()

// 	const archive = archiver('zip', { zlib: { level: 9 } })
// 	archive.on('error', (err) => {
// 		fastify.log.error({ err }, 'zip stream error')
// 		if (!reply.raw.destroyed) reply.raw.destroy(err)
// 	})

// 	archive.pipe(reply.raw)
// 	archive.append(JSON.stringify(data, null, 2), { name: 'data.json' })

// 	// const abs = resolveAvatarFsPath(data.profile?.avatar)
// 	// const abs = '/app/core/frontend/public/default_03.png' // Im Container

// 	console.log('Pre resolvePublicPath fnc: ' + data.profile?.avatar!)
// 	console.log('data.profile?.avatar: ' + data.profile?.avatar);
// 	const extrFN = extractFilename(data.profile?.avatar);
// 	console.log('POST extract FIlename fnc: ' + extrFN)
// 	// const abs = resolvePublicPath(data.profile?.avatar!);
// 	// const abs = resolvePublicPath(extrFN!);
// 	const abs = resolveAvatarFsPath(extrFN);
// 	// const abs = resolvePublicPath('default_03.png');
// 	console.log('POST resolvePublicPath fnc: ' + abs)
// 	console.log('PUBLIC_DIR: ' + { PUBLIC_DIR })
// 	console.log({ abs, exists: fs.existsSync(abs!) })
// 	console.log('BACKEND_ROOT: ' + BACKEND_ROOT);
// 	if (includeMedia && abs && fs.existsSync(abs)) {
// 		console.log('Avatar there !!!!!');
// 		archive.file(abs, { name: 'avatar.png' })
// 	} else if (includeMedia) {
// 		console.log('Avatar MISSSSSING !!!!!');
// 		archive.append(`Avatar not found at ${abs ?? 'n/a'}\n`, { name: 'avatar_missing.txt' })
// 	}

// 	await archive.finalize()
// 	return
// 	// return zipHandler(fastify, reply, data, includeMedia, userId, ts);
// }
// BEGIN -- Backup Zip Handler


//// Works but no media
// 	fastify.get('/api/me/export',
// 		{
// 			// preHandler: [fastify.auth],
// 			schema: {
// 				tags: ['gdpr'],
// 				querystring: {
// 					type: 'object',
// 					properties: {
// 						format: { type: 'string', enum: ['json', 'json.gz'], default: 'json' },
// 						includeOtherUsers: { type: 'boolean', default: false },
// 						includeMedia: { type: 'boolean', default: false }
// 					}
// 				}
// 			}
// 		},
// 		async (req, reply) => {
// 			const userId = (req.user as any).id
// 			const { format = 'json', includeOtherUsers = false, includeMedia = false } = req.query as any

// 			const data = await collectUserExport(fastify, userId, { includeOtherUsers, includeMedia })
// 			const pretty = JSON.stringify(data, null, 2)
// 			const ts = new Date().toISOString().replace(/[:.]/g, '_')

// 			if (format === 'json') {
// 				reply
// 					.header('Content-Type', 'application/json; charset=utf-8')
// 					.header('Content-Disposition', `attachment; filename="user_${userId}_${ts}.json"`)
// 				return reply.send(pretty)
// 			}
// 			reply
// 				.header('Content-Type', 'application/gzip')
// 				.header('Content-Disposition', `attachment; filename="user_${userId}_${ts}.json.gz"`)

// 			const stream = Readable.from(pretty)
// 			await new Promise<void>((resolve, reject) => {
// 				stream.pipe(createGzip()).pipe(reply.raw).on('finish', () => resolve()).on('error', reject)
// 			})
// 			return reply
// 		}
// 	)
// };
