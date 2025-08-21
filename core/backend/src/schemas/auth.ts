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
