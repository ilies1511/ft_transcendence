export const RegisterBodySchema = {
	tags: ['auth'],
	body: {
		type: 'object',
		additionalProperties: false,
		required: ['email', 'username', 'password'],
		properties: {
			email: { type: 'string', format: 'email', maxLength: 254, transform: ['trim', 'toLowerCase'] },
			username: { type: 'string', minLength: 3, maxLength: 24, pattern: '^[a-zA-Z0-9_]+$', transform: ['trim'] },
			password: { type: 'string', minLength: 8, maxLength: 128 }
		}
	}
} as const

// BEGIN -- Old Schema
// schema: {
// 	body: {
// 		type: 'object',
// 		required: ['email', 'password', 'username'],
// 		properties: {
// 			email: { type: 'string', format: 'email' },
// 			password: { type: 'string', minLength: 1 }, //TODO: update minLength on production
// 			username: { type: 'string', minLength: 1 } //TODO: update minLength on production
// 		}
// 	}
// }
// END -- Old Schema


// BEGIN -- '/api/login' Schema
export const LoginBodySchema = {
	type: 'object',
	additionalProperties: false,
	required: ['email', 'password'],
	properties: {
		email: {
			type: 'string',
			format: 'email',
			maxLength: 254,
			transform: ['trim', 'toLowerCase'],
		},
		password: {
			type: 'string',
			minLength: 1,
			maxLength: 128,
			transform: ['trim'],
		},
	},
} as const

export const LoginOkResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['ok'],
	properties: {
		ok: { type: 'boolean', const: true },
	},
} as const

export const Login2FARequiredResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['twofa_required'],
	properties: {
		twofa_required: { type: 'boolean', const: true },
	},
} as const

export const LoginError401 = {
	type: 'object',
	additionalProperties: false,
	required: ['error'],
	properties: {
		error: { type: 'string' },
	},
} as const

export const loginSchema = {
	description: 'Logs a user in and sets an HTTP-only cookie',
	tags: ['auth'],
	body: LoginBodySchema,
	response: {
		200: {
			description: 'Either logged in or 2FA is required.',
			oneOf: [LoginOkResponse, Login2FARequiredResponse],
		},
		401: LoginError401,
	},
} as const
// END -- '/api/login' Schema
