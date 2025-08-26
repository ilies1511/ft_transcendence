export const RegisterBodySchema = {
	tags: ['auth'],
	body: {
		type: 'object',
		additionalProperties: false,
		required: ['email', 'username', 'password'],
		properties: {
			email: { type: 'string', format: 'email', maxLength: 254, transform: ['trim', 'toLowerCase'] },
			username: { type: 'string', minLength: 3, maxLength: 24, pattern: '^[a-zA-Z0-9_]+$', transform: ['trim'] },
			//password: { type: 'string', minLength: 8, maxLength: 128 }
			password: { type: 'string', minLength: 1, maxLength: 128 } //TODO: UPDATE THIS
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

// Old Schema:
// schema: {
// 	description: 'Loggt einen Benutzer ein und liefert ein HTTP-Only Cookie',
// 	tags: ['auth'],
// 	body: {
// 		type: 'object',
// 		required: ['email', 'password'],
// 		properties: {
// 			email: { type: 'string', format: 'email' },
// 			password: { type: 'string', minLength: 1 }
// 			// token: { type: 'string'}
// 		}
// 	},
// 	response: {
// 		200: {
// 			description: 'Successful login or 2FA required',
// 			type: 'object',
// 			properties: {
// 				ok: { type: 'boolean', const: true },
// 				twofa_required: { type: 'boolean' }
// 			}
// 		},
// 		401: {
// 			description: 'Invalid credentials',
// 			type: 'object',
// 			properties: {
// 				error: { type: 'string' }
// 			}
// 		}
// 	}
// }

// END -- '/api/login' Schema

// BEGIN -- '/api/logout' Schema
export const LogoutBodySchema = {
	type: ['object', 'null'],
	additionalProperties: false,
	maxProperties: 0,
} as const

export const LogoutOkResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['ok'],
	properties: { ok: { type: 'boolean', const: true } },
} as const

export const logoutSchema = {
	tags: ['auth'],
	description: 'Clears the auth cookie and marks the user offline.',
	// body: LogoutBodySchema,
	response: {
		200: LogoutOkResponse,
	},
} as const

// END -- '/api/logout' Schema

// BEGIN -- '/api/login/2fa' Schema

//OLD
// schema: {
// 	tags: ['auth'],
// 	body: {
// 		type: 'object',
// 		required: ['email', 'token'],
// 		properties: {
// 			email: { type: 'string', format: 'email' },
// 			password: { type: 'string' },
// 			token: { type: 'string' }
// 		}
// 	}
// }
//OLD
export const Login2FABodySchema = {
	type: 'object',
	additionalProperties: false,
	required: ['email', 'token'],
	properties: {
		email: {
			type: 'string',
			format: 'email',
			maxLength: 254,
			transform: ['trim', 'toLowerCase'],
		},
		password: {
			type: 'string',
			minLength: 8,
			maxLength: 128,
			transform: ['trim'],
		},
		token: {
			type: 'string',
			minLength: 6,
			maxLength: 12,
			pattern: '^[0-9\\s]+$', // Spacw also allowed
			transform: ['trim'],
		},
	},
} as const

export const Login2FAResponse200 = LoginOkResponse
export const LoginError400 = LoginError401

export const login2FASchema = {
	tags: ['2fa'],
	description: 'Completes login with TOTP (2FA) + sets an HTTP-only cookie',
	body: Login2FABodySchema,
	response: {
		200: Login2FAResponse200,
		400: LoginError400,
		401: LoginError401,
	},
} as const

// END -- '/api/login/2fa' Schema
