import type { FastifyInstance, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt'
import archiver from 'archiver'
import path from 'node:path'
import fs from "fs";
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';
import { sessionCookieOpts } from '../index.js';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BACKEND_ROOT = path.resolve(__dirname, '../..')
export const PUBLIC_DIR = process.env.PUBLIC_DIR ?? path.resolve(BACKEND_ROOT, '../frontend/public')
export const AVATAR_SUBDIR = process.env.AVATAR_SUBDIR ?? 'avatars'

export async function getUserData(fastify: FastifyInstance, userId: number) {
	const row = await fastify.db.get(
		`SELECT id, username, nickname, email, avatar, created_at FROM users
		WHERE id = ? AND is_deleted = 0`, userId);
	return row;
}

// BEGIN -- NEW anonymize
export function generatePseudo(userId: number) {
	const username = `anonymous_user_${userId}`;
	const email = `anonymous_user_${userId}@pong.de`;
	return { username, email };
}

export async function anonymizeAndSetPassword(
	app: FastifyInstance,
	userId: number,
	newPassword: string,
): Promise<{ pseudoUsername: string; pseudoEmail: string }> {
	const { username, email } = generatePseudo(userId);
	const avatar = 'deleted_avatar.png';
	const hash = await bcrypt.hash(newPassword, 12);

	await app.db.run(
		`UPDATE users SET
		username = ?,
		nickname = ?,
		email = ?,
		avatar = ?,
		password = ? WHERE id = ?`,
		// is_deleted = 1 WHERE id = ?`,
		username, username, email, avatar,hash, userId
	);
	return { pseudoUsername: username, pseudoEmail: email };
}

export async function issueFreshAuthCookie(
	app: FastifyInstance,
	reply: FastifyReply,
	userId: number,
	displayName: string
) {
	const jwt = await reply.jwtSign({ id: userId, name: displayName });
	reply.setCookie('token', jwt, sessionCookieOpts);
	// reply.setCookie('token', jwt, {
	// 	path: '/',
	// 	httpOnly: true,
	// 	sameSite: 'lax',
	// 	// secure: false,
	// 	secure: process.env.NODE_ENV === 'production',
	// });
}
// END -- NEW anonymize

export async function anonymizeUser(fastify: FastifyInstance, userId: number) {
	const pseudo = `anonymous_user_${userId}`;
	// const pseudo = `deleted_user_${userId}`;
	await fastify.db.run(
		`UPDATE users SET
		username	= ?,
		nickname	= ?,
		email		= NULL,
		avatar		= '',
		password	= '',
		is_deleted	= 1
		WHERE id = ?`,
		pseudo, pseudo, userId
	);
}
//// Old
// export async function deleteUserAndData(fastify: FastifyInstance, userId: number) {
// 	await fastify.db.run(
// 		`DELETE FROM users WHERE id = ?`,
// 		userId
// 	);
// }

//// NEWWW: Refined with ROLLBACK
// export async function deleteUserAndData(fastify: FastifyInstance, userId: number) {
// 	await fastify.db.exec('BEGIN;')
// 	try {
// 		await fastify.db.run(`DELETE FROM users WHERE id = ?`, userId)
// 		await fastify.db.exec('COMMIT;')
// 	} catch (e) {
// 		await fastify.db.exec('ROLLBACK;')
// 		throw e
// 	}
// }

export async function deleteUserAndData(fastify: FastifyInstance, userId: number) {
	await fastify.db.exec('SAVEPOINT delete_user;')
	try {
		const info = await fastify.db.run(`DELETE FROM users WHERE id = ?`, userId)
		if ((info.changes ?? 0) === 0) {
			await fastify.db.exec('ROLLBACK TO SAVEPOINT delete_user;')
			await fastify.db.exec('RELEASE SAVEPOINT delete_user;')
			const err: any = new Error('User not found')
			err.statusCode = 404
			throw err
		}
		await fastify.db.exec('RELEASE SAVEPOINT delete_user;')
	}
	catch (e: any) {
		try { await fastify.db.exec('ROLLBACK TO SAVEPOINT delete_user;') } catch { }
		try { await fastify.db.exec('RELEASE SAVEPOINT delete_user;') } catch { }

		if (e?.code === 'SQLITE_CONSTRAINT') {
			e.statusCode = e.statusCode ?? 409
			e.message = e.message ?? 'Foreign key constraint failed'
		}
		throw e
	}
}

export interface UpdateProfile {
	username?: string
	nickname?: string
	email?: string
	password?: string
	currentPassword?: string
}

// // BEGIN -- pre 16.08 Version
// export async function updateMyProfile(
// 	fastify: FastifyInstance,
// 	userId: number,
// 	data: UpdateProfile
// ): Promise<boolean> {
// 	const updates: string[] = []
// 	const values: unknown[] = []

// 	if (data.username) {
// 		updates.push('username = ?')
// 		values.push(data.username)
// 	}
// 	if (data.nickname) {
// 		updates.push('nickname = ?')
// 		values.push(data.nickname)
// 	}
// 	if (data.email) {
// 		updates.push('email = ?')
// 		values.push(data.email)
// 	}
// 	//TODO: 15.08 Add additional check
// 	if (data.password) {
// 		if ((await bcrypt.compare(data.password, user.password))) {
// 			// return reply.code(401).send({ error: 'invalid credentials' })
// 			const hash = await bcrypt.hash(data.password, 12)
// 			updates.push('password = ?')
// 			values.push(hash)
// 		}
// 	}

// 	if (updates.length === 0) {
// 		return false
// 	}

// 	values.push(userId)
// 	const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`
// 	const info = await fastify.db.run(sql, ...values)
// 	return (info.changes ?? 0) > 0
// }
// // END -- pre 16.08 Version

export async function updateMyProfile(
	fastify: FastifyInstance,
	userId: number,
	data: UpdateProfile
): Promise<boolean> {
	const updates: string[] = []
	const values: unknown[] = []

	const user = await fastify.db.get<{ password: string | null; is_oauth?: number }>(
		'SELECT password, is_oauth FROM users WHERE id = ? AND is_deleted = 0',
		userId
	)
	if (!user) return false

	if (data.username) { updates.push('username = ?'); values.push(data.username) }
	if (data.nickname) { updates.push('nickname = ?'); values.push(data.nickname) }
	// Prevent changing email for OAuth users
	if (data.email !== undefined) {
		if (user.is_oauth) {
			const e: any = new Error('email is managed by oauth'); e.code = 'OAUTH_EMAIL_READONLY'; throw e
		}
		updates.push('email = ?'); values.push(data.email)
	}

	if (typeof data.password === 'string') {
		if (!data.currentPassword) {
			const e: any = new Error('current password required'); e.code = 'CURRENT_PASSWORD_REQUIRED'; throw e
		}
		if (!user.password) {
			const e: any = new Error('no local password'); e.code = 'NO_LOCAL_PASSWORD'; throw e
		}
		const currentOk = await bcrypt.compare(data.currentPassword, user.password)
		if (!currentOk) {
			const e: any = new Error('invalid current password'); e.code = 'INVALID_CURRENT_PASSWORD'; throw e
		}
		const sameAsOld = await bcrypt.compare(data.password, user.password)
		if (sameAsOld) {
			const e: any = new Error('new password equals old'); e.code = 'PASSWORD_UNCHANGED'; throw e
		}
		const hash = await bcrypt.hash(data.password, 12)
		updates.push('password = ?'); values.push(hash)
		// optional: Passwortwechselzeitpunkt speichern, wenn Spalte vorhanden ist
		// updates.push('password_changed_at = ?'); values.push(Date.now())
		// optional: Sessions invalidieren, wenn Spalte vorhanden ist
		// updates.push('token_version = COALESCE(token_version, 0) + 1')
	}

	if (updates.length === 0) {
		return false
	}

	values.push(userId)
	const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`
	const info = await fastify.db.run(sql, ...values)
	return (info.changes ?? 0) > 0
}


export type UserExport = {
	generated_at: string
	user: any
	// privacy: { includeOtherUsers: boolean, includeMedia: boolean }
	privacy: { includeMedia: boolean }
	profile: {
		id: number
		username: string
		nickname: string
		email: string | null
		avatar: string | null
		twofa_enabled: number
		is_oauth: number
		created_at: number
	} | null
	friendships: { friend_ids: number[] }
	friend_requests: {
		sent: Array<{ recipient_id: number; created_at: number; responded_at: number | null }>
		received: Array<{ requester_id: number; created_at: number; responded_at: number | null }>
	}
	blocks: {
		blocked_ids: number[]
		blocked_by_ids: number[]
	}
	matches: {
		count: number
		items: Array<{
			match: { id: number; mode: number; duration: number; created_at: number }
			score: number
			result: 'win' | 'loss' | 'draw'
		}>
	}
}

export async function collectUserExport(
	fastify: FastifyInstance,
	userId: number,
	// opts: { includeOtherUsers?: boolean; includeMedia?: boolean } = {}
	opts: { includeMedia?: boolean } = {}
): Promise<UserExport> {

	// const includeOtherUsers = !!opts.includeOtherUsers
	const includeMedia = !!opts.includeMedia

	await fastify.db.exec('SAVEPOINT export_user;')
	try {
		const profile = await fastify.db.get<any>(
			`SELECT id, username, nickname, email, avatar, twofa_enabled, \
			is_oauth, created_at FROM users WHERE id = ? AND is_deleted = 0`, userId)

		const friends = await fastify.db.all<{ friend_id: number }[]>(
			`SELECT friend_id FROM friendships WHERE user_id = ?`, userId)

		const sent = await fastify.db.all<{ recipient_id: number; created_at: number; responded_at: number | null }[]>(
			`SELECT recipient_id, created_at, responded_at FROM friend_requests \
			WHERE requester_id = ?`, userId)

		const received = await fastify.db.all<{ requester_id: number; created_at: number; responded_at: number | null }[]>(
			`SELECT requester_id, created_at, responded_at FROM friend_requests \
			WHERE recipient_id = ?`, userId)

		const blocksOut = await fastify.db.all<{ blocked_id: number }[]>(
			`SELECT blocked_id FROM user_blocks WHERE blocker_id = ?`, userId)
		const blocksIn = await fastify.db.all<{ blocker_id: number }[]>(
			`SELECT blocker_id FROM user_blocks WHERE blocked_id = ?`, userId)

		const rows = await fastify.db.all<any[]>(
			`SELECT m.id AS match_id, m.mode, m.duration, m.created_at, p.score, p.result
			FROM matches m JOIN match_participants p ON m.id = p.match_id
			WHERE p.user_id = ? ORDER BY m.created_at DESC`, userId)

		await fastify.db.exec('RELEASE SAVEPOINT export_user;')

		return {
			generated_at: new Date().toISOString(),
			user: { id: userId },
			// privacy: { includeOtherUsers, includeMedia },
			privacy: { includeMedia },
			profile: profile || null,
			friendships: { friend_ids: friends.map(f => f.friend_id) },
			friend_requests: { sent, received },
			blocks: {
				blocked_ids: blocksOut.map(b => b.blocked_id),
				blocked_by_ids: blocksIn.map(b => b.blocker_id)
			},
			matches: {
				count: rows.length,
				items: rows.map(r => ({
					match: { id: r.match_id, mode: r.mode, duration: r.duration, created_at: r.created_at },
					score: r.score,
					result: r.result as 'win' | 'loss' | 'draw'
				}))
			}
		}
	} catch (e) {
		try { await fastify.db.exec('ROLLBACK TO SAVEPOINT export_user;') } catch { }
		try { await fastify.db.exec('RELEASE SAVEPOINT export_user;') } catch { }
		throw e
	}
}

export async function jsonHandler(
	fastify: FastifyInstance,
	reply: FastifyReply,
	data: UserExport,
	userId: number,
	ts: string) {
	const body = JSON.stringify(data, null, 2)
	reply
		.header('Content-Type', 'application/json; charset=utf-8')
		.header('Content-Disposition', `attachment; filename="user_${userId}_${ts}.json"`)
	return reply.send(body)
}

export async function jsonGZHandler(
	fastify: FastifyInstance,
	reply: FastifyReply,
	data: UserExport,
	userId: number,
	ts: string) {
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

export async function zipHandler(
	fastify: FastifyInstance,
	reply: FastifyReply,
	data: UserExport,
	includeMedia: boolean,
	userId: number,
	ts: string) {
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

	// console.log('Pre resolvePublicPath fnc: ' + data.profile?.avatar!)
	// console.log('data.profile?.avatar: ' + data.profile?.avatar);
	// const extrFN = extractFilename(data.profile?.avatar);
	// console.log('POST extract FIlename fnc: ' + extrFN)
	// // const abs = resolvePublicPath(data.profile?.avatar!);
	// // const abs = resolvePublicPath(extrFN!);
	// const abs = resolveAvatarFsPath(extrFN);
	// // const abs = resolvePublicPath('default_03.png');
	// console.log('POST resolvePublicPath fnc: ' + abs)
	// console.log('PUBLIC_DIR: ' + { PUBLIC_DIR })
	// console.log({ abs, exists: fs.existsSync(abs!) })
	// console.log('BACKEND_ROOT: ' + BACKEND_ROOT);
	// if (includeMedia && abs && fs.existsSync(abs)) {
	// 	console.log('Avatar there !!!!!');
	// 	archive.file(abs, { name: 'avatar.png' })
	// } else if (includeMedia) {
	// 	console.log('Avatar MISSSSSING !!!!!');
	// 	archive.append(`Avatar not found at ${abs ?? 'n/a'}\n`, { name: 'avatar_missing.txt' })
	// }
	if (includeMedia) {
		const name = extractFilename(data.profile?.avatar)
		console.log('Raw FileName: ' + name);
		if (name) {
			const abs = resolveAvatarFsPath(name)
			console.log('Extr. FileName: ' + abs);
			const exists = !!abs && fs.existsSync(abs)
			// fastify.log.info({ abs, exists }, 'avatar path')
			console.log({ abs, exists }, 'avatar path');
			if (exists && abs) {
				console.log('File there !!!!!');
				archive.file(abs, { name: 'avatar.png' })
			} else {
				console.log('File MISSING !!!!!');
				archive.append(`Avatar not found at ${abs ?? 'n/a'}\n`, { name: 'avatar_missing.txt' })
			}
		}
		else {
			console.log('File unavailable !!!!!');
			archive.append('Avatar filename unavailable\n', { name: 'avatar_missing.txt' })
		}
	}
	await archive.finalize()
}

// BEGIN -- Helpers
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

	console.log('In resolveAvatarFsPath:\n')
	console.log('base: ' + base)

	// 1) Try PUBLIC_DIR root (where uploads are currently stored)
	const publicRoot = path.resolve(PUBLIC_DIR) + path.sep
	const direct = path.resolve(PUBLIC_DIR, base)
	console.log('publicRoot: ' + publicRoot)
	console.log('direct: ' + direct)
	if (!direct.startsWith(publicRoot)) {
		throw new Error('Invalid avatar path')
	}
	const existsDirect = fs.existsSync(direct)
	console.log({ direct, exists: existsDirect }, 'avatar path (root)')
	if (existsDirect) {
		return direct
	}

	// 2) Try PUBLIC_DIR/AVATAR_SUBDIR (legacy/default location)
	const subRoot = path.resolve(PUBLIC_DIR, AVATAR_SUBDIR) + path.sep
	const inSubdir = path.resolve(PUBLIC_DIR, AVATAR_SUBDIR, base)
	console.log('subRoot: ' + subRoot)
	console.log('inSubdir: ' + inSubdir)
	if (!inSubdir.startsWith(subRoot)) {
		throw new Error('Invalid avatar path')
	}
	const existsInSubdir = fs.existsSync(inSubdir)
	console.log({ inSubdir, exists: existsInSubdir }, 'avatar path (subdir)')
	if (existsInSubdir) {
		return inSubdir
	}

	// Fallback: return subdir path for clearer diagnostics
	return inSubdir
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
// END -- Helpers
