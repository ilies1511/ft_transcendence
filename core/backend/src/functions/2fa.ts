import { fastify, type FastifyInstance } from "fastify";
import speakeasy from 'speakeasy'
import { type UserRow } from "../types/userTypes.ts";
import bcrypt from 'bcrypt'

/*
	for '/api/2fa/generate', --> if user wants 2FA
	generates 2FA secret by adding it to column twofa_secret
 */
export async function init2FA(
	fastify: FastifyInstance,
	userId: number): Promise<{ base32: string, otpAuthUrl: string }> {
	const secret = speakeasy.generateSecret({
		name: `MyApp (${userId})`,
		length: 20
	})
	await fastify.db.run(
		'UPDATE users SET twofa_secret = ?, twofa_enabled = 0 WHERE id = ?',
		secret.base32, userId
	)

	return {
		base32: secret.base32,
		otpAuthUrl: secret.otpauth_url!
		// otpAuthUrl: secret?.otpauth_url ?? '0'
	}
}

// '/api/2fa/verify'
export async function verify2FA(
	fastify: FastifyInstance,
	userId: number,
	token: string): Promise<boolean>
{
	const row = await fastify.db.get<UserRow>(
		'SELECT twofa_secret FROM users WHERE id = ?',
		userId
	)
	if (!row?.twofa_secret) {
		throw new Error('NOT_INITIALIZED');
	}
	const ok = speakeasy.totp.verify({
		secret: row.twofa_secret,
		encoding: 'base32',
		token,
		window: 1,
	})
	if (!ok) {
		return false;
	}
	await fastify.db.run(
		'UPDATE users SET twofa_enabled = 1 WHERE id = ?',
		userId
	)
	return true;
}
