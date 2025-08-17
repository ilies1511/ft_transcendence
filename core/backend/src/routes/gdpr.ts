import type { FastifyPluginAsync } from 'fastify';
import { anonymizeUser, deleteUserAndData, getUserData } from '../functions/gdpr.ts';
import { type UpdateProfile, updateMyProfile } from '../functions/gdpr.ts';
import { collectUserExport } from '../functions/gdpr.ts';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';
import archiver from 'archiver'
import path from 'node:path'
import fs from "fs";
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKEND_ROOT = path.resolve(__dirname, '../..')
export const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.resolve(BACKEND_ROOT, '../frontend/public')
export const AVATAR_SUBDIR = process.env.AVATAR_SUBDIR ?? 'avatars'


export const gdprRoutes: FastifyPluginAsync = async fastify => {

	fastify.get('/api/me/data', { preHandler: [fastify.auth] }, async (req, reply) => {
		const userId = (req.user as any).id;
		const data = await getUserData(fastify, userId);
		return reply.send(data);
	});

	// fastify.get('/api/me', { preHandler: [fastify.auth] }, async (req, reply) => {
	// 	const userId = (req.user as any).id;
	// 	const data = await getUserData(fastify, userId);
	// 	return reply.send(data);
	// });

	// fastify.post('/api/me/anonymize', { preHandler: [fastify.auth] },
	fastify.post('/api/me/anonymize',
		{
			schema: {
				tags: ['gdpr'],
			}
		},
		async (req, reply) => {
			const userId = (req.user as any).id;
			await anonymizeUser(fastify, userId);
			return reply.send({ message: 'Your personal data has been anonymized.' });
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
			// preHandler: [fastify.auth],
			schema: {
				tags: ['gdpr'],
				response: {
					200: { type: 'object', properties: { message: { type: 'string' } } },
					404: { type: 'object', properties: { error: { type: 'string' } } },
					409: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}
		},
		async (req, reply) => {
			const userId = (req.user as any).id
			try {
				// await deleteUserAndData(fastify, userId)
				reply.clearCookie('token', {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: false
				})
				await deleteUserAndData(fastify, userId);
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
			// schema: {
			// 	tags: ['gdpr'],
			// 	body: {
			// 		type: 'object',
			// 		minProperties: 1,
			// 		properties: {
			// 			username: { type: 'string', minLength: 1 },
			// 			nickname: { type: 'string', minLength: 1 },
			// 			email: { type: 'string', format: 'email' },
			// 			password: { type: 'string', minLength: 8 },
			// 			currentPassword: { type: 'string', minLength: 8 }

			// 		},
			// 		allOf: [
			// 			{
			// 				if: { required: ['password'] },
			// 				then: { required: ['currentPassword'] }
			// 			}
			// 		]
			// 	},
			// 	response: {
			// 		200: { type: 'object', properties: { ok: { type: 'boolean' } } },
			// 		400: { type: 'object', properties: { error: { type: 'string' } } }
			// 	}
			// }
			schema: {
				tags: ['gdpr'],
				body: {
					type: 'object',
					minProperties: 1,
					properties: {
						username: { type: 'string', minLength: 1 },
						nickname: { type: 'string', minLength: 1 },
						email: { type: 'string', format: 'email' },
						password: { type: 'string', minLength: 1 },
						currentPassword: { type: 'string', minLength: 1 }
					},
					allOf: [
						{ if: { required: ['password'] }, then: { required: ['currentPassword'] } },
						{ if: { required: ['currentPassword'] }, then: { required: ['password'] } }
					]
				},
				response: {
					200: { type: 'object', properties: { ok: { type: 'boolean' } } },
					400: { type: 'object', properties: { error: { type: 'string' } } },
					401: { type: 'object', properties: { error: { type: 'string' } } },
					409: { type: 'object', properties: { error: { type: 'string' } } },
					500: { type: 'object', properties: { error: { type: 'string' } } }
				}
			}

		},
		// async (req, reply) => {
		// 	const userId = (req.user as any).id
		// 	const ok = await updateMyProfile(fastify, userId, req.body)
		// 	if (!ok) return reply.code(400).send({ error: 'No valid fields to update' })
		// 	return { ok: true }
		// }
		async (req, reply) => {
			const userId = (req.user as any).id
			try {
				const ok = await updateMyProfile(fastify, userId, req.body)
				if (!ok) return reply.code(400).send({ error: 'Nothing to update or user not found.' })
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

	fastify.get('/api/me/export',
		{
			preHandler: [fastify.auth],
			schema: {
				tags: ['gdpr'],
				querystring: {
					type: 'object',
					properties: {
						format: { type: 'string', enum: ['json', 'json.gz', 'zip'], default: 'json' },
						// includeOtherUsers: { type: 'boolean', default: false },
						includeMedia: { type: 'boolean', default: false }
					}
				},
				response: {
					200: {
						content: {
							'application/json': { schema: { type: 'string' } },
							'application/gzip': { schema: { type: 'string', format: 'binary' } },
							'application/zip': { schema: { type: 'string', format: 'binary' } }
						}
						// type: 'string'
					}
				}
			}
		},
		async (req, reply) => {
			const userId = (req.user as any).id
			// const { format = 'json', includeOtherUsers = false, includeMedia = false } = req.query as any
			const { format = 'json', includeMedia = false } = req.query as any

			if (format !== 'zip' && includeMedia) {
				return reply.code(400).send({ error: 'includeMedia only with format=zip possible' })
			}

			// const data = await collectUserExport(fastify, userId, {
			// 	includeOtherUsers, includeMedia: format === 'zip' && includeMedia
			// })
			const data = await collectUserExport(fastify, userId, {
				includeMedia: format === 'zip' && includeMedia
			})

			const ts = new Date().toISOString().replace(/[:.]/g, '_')

			// BEGIN -- JSON Handler
			if (format === 'json') {
				const body = JSON.stringify(data, null, 2)
				reply
					.header('Content-Type', 'application/json; charset=utf-8')
					.header('Content-Disposition', `attachment; filename="user_${userId}_${ts}.json"`)
				return reply.send(body)
			}

			if (format === 'json.gz') {
				const body = JSON.stringify(data, null, 2)
				reply
					.header('Content-Type', 'application/gzip')
					.header('Content-Disposition', `attachment; filename="user_${userId}_${ts}.json.gz"`)
				const stream = Readable.from(body)
				await new Promise<void>((resolve, reject) => {
					stream.pipe(createGzip()).pipe(reply.raw).on('finish', () => resolve()).on('error', reject)
				})
				return reply
			}
			// END -- JSON Handler

			// BEGIN -- ZIP Handler
			if (format === 'zip') {
				reply
					.type('application/zip')
					.header('Content-Disposition', `attachment; filename="user_${userId}_${ts}.zip"`)
				reply.hijack()

				const archive = archiver('zip', { zlib: { level: 9 } })
				archive.on('error', (err) => {
					fastify.log.error({ err }, 'zip stream error')
					if (!reply.raw.destroyed) reply.raw.destroy(err)
				})

				archive.pipe(reply.raw)
				archive.append(JSON.stringify(data, null, 2), { name: 'data.json' })

				// const abs = resolveAvatarFsPath(data.profile?.avatar)
				// const abs = '/app/core/frontend/public/default_03.png' // Im Container

				console.log('Pre resolvePublicPath fnc: ' + data.profile?.avatar!)
				console.log('data.profile?.avatar: ' + data.profile?.avatar);
				const extrFN = extractFilename(data.profile?.avatar);
				console.log('POST extract FIlename fnc: ' + extrFN)
				// const abs = resolvePublicPath(data.profile?.avatar!);
				// const abs = resolvePublicPath(extrFN!);
				const abs = resolveAvatarFsPath(extrFN);
				// const abs = resolvePublicPath('default_03.png');
				console.log('POST resolvePublicPath fnc: ' + abs)
				console.log('PUBLIC_DIR: ' + { PUBLIC_DIR })
				console.log({ abs, exists: fs.existsSync(abs!) })
				console.log('BACKEND_ROOT: ' + BACKEND_ROOT);
				if (includeMedia && abs && fs.existsSync(abs)) {
					console.log('Avatar there !!!!!');
					archive.file(abs, { name: 'avatar.png' })
				} else if (includeMedia) {
					console.log('Avatar MISSSSSING !!!!!');
					archive.append(`Avatar not found at ${abs ?? 'n/a'}\n`, { name: 'avatar_missing.txt' })
				}

				await archive.finalize()
				return
			}
		}
		// END -- ZIP Handler
	)
}

export function resolvePublicPath(webPath: string) {
	const rel = webPath.startsWith('/') ? webPath.slice(1) : webPath
	console.log('relative: ' + rel);
	console.log('PUBLIC_DIR: ' + PUBLIC_DIR);
	// const target = path.join(PUBLIC_DIR, 'avatars', rel)
	const target = path.join(PUBLIC_DIR, rel)
	console.log('Joined: ' + target);
	return target
}

export function resolveAvatarFsPath(filename?: string | null): string | null {
	if (!filename) {
		return null
	}
	const base = path.basename(filename)
	console.log('In resolveAvatarFsPath: \n');
	console.log('base: ' + base);
	const target = path.resolve(PUBLIC_DIR, AVATAR_SUBDIR, base)
	console.log('target: ' + target);

	const root = path.resolve(PUBLIC_DIR, AVATAR_SUBDIR) + path.sep
	console.log('root: ' + root);
	if (!target.startsWith(root)) {
		throw new Error('Invalid avatar path')
	}
	return target
}


export function extractFilename(input?: string | null): string | null {
	if (!input) return null;

	let p = input;

	if (/^[a-z]+:\/\//i.test(p)) {
		try { p = new URL(p).pathname } catch { }
	}

	p = p.replace(/\\/g, '/');
	p = p.split('?')[0].split('#')[0];

	const j = p.lastIndexOf('/public/');
	if (j !== -1) p = p.slice(j + '/public/'.length);

	const filename = p.substring(p.lastIndexOf('/') + 1);

	const ok = /^[A-Za-z0-9._-]+$/.test(filename);
	return ok ? filename : null;
}
