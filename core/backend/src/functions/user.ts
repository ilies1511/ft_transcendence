import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'
import type { FriendInfo, UserRow, UserWithFriends } from '../types/userTypes.ts'
// import { DEFAULT_AVATARS } from '../constants/avatars.ts'
// import { DEFAULT_AVATARS } from '../../constants/avatars.ts'
import { DEFAULT_AVATARS } from '../constants/avatars.ts'
export interface NewUser {
	username: string
	password: string
	email?: string
}

//POST -- BEGIN
export async function createUser(
	fastify: FastifyInstance,
	{ username, password, email }: NewUser): Promise<number> {
	// Passwort hashen
	const hash = await bcrypt.hash(password, 10)
	const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]

	//Insert Part
	try {
		const info = await fastify.db.run(
			`INSERT INTO users (username, nickname, password, email, live, avatar, is_oauth, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			// `INSERT INTO users (username, password, email, live, created_at)
			// VALUES (?, ?, ?, ?, ?)`,
			username,
			username,
			hash,
			email ?? null,
			false,
			avatar,
			0,                 // is_oauth = 0 (local account)
			Date.now()
		)
		return info.lastID!
	} catch (e: any) {
		throw new Error('UsernameOrEmailCollision')
	}
}
//POST -- END

export interface UpdateUserData {
	username?: string
	password?: string
	email?: string
	// avatar: string
}

//PUT -- BEGIN
export async function updateUser(
	fastify: FastifyInstance,
	id: number,
	data: UpdateUserData
): Promise<boolean> {
	const updates: string[] = []
	const values: unknown[] = []

	if (data.username) {
		updates.push('username = ?')
		values.push(data.username)
	}
	if (data.email) {
		updates.push('email = ?')
		values.push(data.email)
	}
	if (data.password) {
		const hash = await bcrypt.hash(data.password, 10)
		updates.push('password = ?')
		values.push(hash)
	}

	if (updates.length === 0) {
		throw new Error('NoFieldsToUpdate')
	}

	values.push(id);
	const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
	const info = await fastify.db.run(sql, ...values);

	if (info.changes === undefined) {
		return false;
	}
	return info.changes > 0;
}
//PUT -- END

//DELETE
export async function deleteUserById(
	fastify: FastifyInstance,
	id: number): Promise<boolean> {
	const result = await fastify.db.run(
		'DELETE FROM users WHERE id = ?',
		id
	)
	if (result.changes === undefined) {
		return (false);
	}
	return (result.changes > 0);
}

//GET -- BEGIN
export async function getUserById(
	fastify: FastifyInstance,
	id: number): Promise<UserRow | null> {
	const user = await fastify.db.get<UserRow>(
		"SELECT id, username, nickname, email, live, avatar, created_at FROM users WHERE id = ?", id);

	if (!user) {
		return (null);
	}
	return (user);
}

export async function findUserWithFriends(
	fastify: FastifyInstance,
	id: number
): Promise<UserWithFriends | null> {
	// 1) Basis-User
	const row = await fastify.db.get<UserRow>(
		`SELECT id, username, nickname, email, live, avatar, created_at
		 FROM users WHERE id = ?`,
		id
	)
	if (!row) return null

	// const friends: { friend_id: number }[] = await fastify.db.all(
	// 	'SELECT friend_id FROM friendships WHERE user_id = ?',
	// 	id
	// )

	// const friends = await fastify.db.all<FriendInfo>(
	// 	`SELECT u.id, u.username, u.live, u.avatar
	// 	   FROM users u
	// 	   JOIN friendships f ON u.id = f.friend_id
	// 	  WHERE f.user_id = ?`,
	// 	id
	// )
	const friends = await fastify.db.all<FriendInfo[]>(
		`SELECT u.id,
				u.username,
				u.live,
				u.avatar
			FROM users AS u
		INNER JOIN friendships AS f ON u.id = f.friend_id WHERE f.user_id = ?`,
		id);
	return {
		id: row.id,
		username: row.username,
		nickname: row.nickname,
		email: row.email,
		live: row.live,
		created_at: row.created_at,
		avatar: row.avatar,
		friends
		// friends: friends.map(f => f.friend_id)
	}
}

//GET -- END

//PATCH -- BEGIN
export async function setUserLive(
	fastify: FastifyInstance,
	id: number,
	live: boolean
): Promise<boolean> {
	const info = await fastify.db.run(
		'UPDATE users SET live = ? WHERE id = ?',
		live ? 1 : 0,
		id
	)
	if (info.changes === undefined) {
		return (false);
	}
	return (info.changes > 0)
}

export async function updateUserAvatar(
	fastify: FastifyInstance,
	id: number,
	avatar: string
): Promise<boolean> {
	const info = await fastify.db.run(
		`UPDATE users SET avatar = ? WHERE id = ?`, avatar, id)
	return info.changes !== undefined && info.changes > 0
}
//PATCH -- END
