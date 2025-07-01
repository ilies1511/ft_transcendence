import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { Interface } from 'readline'
import type { UserRow } from '../db/types.ts'

export interface NewUser {
	username:	string
	password:	string
	email?:		string
}

//POST -- BEGIN
export async function createUser(
	fastify: FastifyInstance,
	{ username, password, email }: NewUser): Promise<number> {
	// Passwort hashen
	const hash = await bcrypt.hash(password, 10)

	//Insert Part
	try {
		const info = await fastify.db.run(
			`INSERT INTO users (username, password, email, created_at)
			VALUES (?, ?, ?, ?)`,
			username,
			hash,
			email ?? null,
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

//GET
export async function getUserById(
	fastify: FastifyInstance,
	id: number): Promise<UserRow | null> {
	const user = await fastify.db.get<UserRow>(
		"SELECT id, username, email, live, created_at FROM users WHERE id = ?", id);

	if (!user) {
		return (null);
	}
	return (user);
}

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
//PATCH -- END
