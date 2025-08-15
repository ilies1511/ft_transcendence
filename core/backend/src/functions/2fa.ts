import bcrypt from 'bcrypt';
import { type FastifyInstance } from "fastify";
import speakeasy from 'speakeasy';
import { type UserRow } from "../types/userTypes.ts";

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
	token: string): Promise<boolean> {
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

// BEGIN -- '/api/login/2fa'
export function verify2FaToken(
	user: Pick<UserRow, 'twofa_enabled' | 'twofa_secret'>,
	token: string
): boolean {
	if (!user.twofa_enabled || !user.twofa_secret) {
		throw new Error('2FA_NOT_SETUP')
	}
	return speakeasy.totp.verify({
		secret: user.twofa_secret,
		encoding: 'base32',
		token,
		window: 1
	})
}

export async function validateCredentials(
	fastify: FastifyInstance,
	email: string,
	password?: string
): Promise<UserRow | null> {
	const user = await fastify.db.get<UserRow>(
		`SELECT id, password, username, twofa_secret, twofa_enabled, is_oauth FROM users
		 WHERE email = ?`,
		email
	)
	if (!user) return null

	// If password explicitly provided (even empty string), enforce proper verification.
	if (password !== undefined) {
		if (password.trim() === '') return null           // reject empty password bypass
		const ok = await bcrypt.compare(password, user.password)
		return ok ? user : null
	}

	// No password supplied -> only allow for OAuth accounts
	if (user.is_oauth === 1) return user

	return null
}
// END -- '/api/login/2fa'


export enum Disable2FAResponse {
	UserNotFound = 'User not found',
	NotEnabled = '2FA not enabled',
	Success = '2FA successfully disabled',
	Error = 'An error occurred while disabling 2FA'
}

export async function disable2FA(
	fastify: FastifyInstance,
	userId: number
): Promise<Disable2FAResponse> {
	const user = await fastify.db.get<{ twofa_enabled: number }>(
		'SELECT twofa_enabled FROM users WHERE id = ?', userId);
	if (!user) {
		return Disable2FAResponse.UserNotFound;
	}
	if (user.twofa_enabled === 0) {
		return Disable2FAResponse.NotEnabled
	}
	try {
		await fastify.db.run(
			`UPDATE users SET twofa_enabled = 0, twofa_secret = '' WHERE id = ?`,
			userId
		)
		return Disable2FAResponse.Success
	} catch (error) {
		console.error('Error disabling 2FA:', error)
		return Disable2FAResponse.Error
	}
}