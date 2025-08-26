import { ErrorResponse, OkMessageResponse, EmptyBodySchema } from "./shared.ts"

export const MeDataResponseSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['id', 'username', 'nickname', 'email', 'avatar', 'created_at'],
	properties: {
		id: { type: 'integer', minimum: 1 },
		username: { type: 'string' },
		nickname: { type: 'string' },
		email: { type: ['string', 'null'] },
		avatar: { type: ['string', 'null'] },
		created_at: { type: 'integer', minimum: 0 },
	},
} as const

export const meDataSchema = {
	tags: ['gdpr'],
	response: {
		200: MeDataResponseSchema,
		404: ErrorResponse
	},
} as const

export const anonymizeMeSchema = {
	tags: ['gdpr'],
	response: {
		200: OkMessageResponse,
		401: ErrorResponse,
	},
} as const


// BEGIN -- /api/me DELETE
// schema: {
// 	tags: ['gdpr'],
// 	response: {
// 		200: { type: 'object', properties: { message: { type: 'string' } } },
// 		404: { type: 'object', properties: { error: { type: 'string' } } },
// 		409: { type: 'object', properties: { error: { type: 'string' } } }
// 	}
// }

export const meDeleteSchema = {
	tags: ['gdpr'],
	response: {
		200: OkMessageResponse,
		401: ErrorResponse,
		409: ErrorResponse,
	},
}
// END -- /api/me DELETE
// schema: {
// 	tags: ['gdpr'],
// 	body: {
// 		type: 'object',
// 		minProperties: 1,
// 		properties: {
// 			username: { type: 'string', minLength: 1 },
// 			nickname: { type: 'string', minLength: 1 },
// 			email: { type: 'string', format: 'email' },
// 			password: { type: 'string', minLength: 1 },
// 			currentPassword: { type: 'string', minLength: 1 }
// 		},
// 		allOf: [
// 			{ if: { required: ['password'] }, then: { required: ['currentPassword'] } },
// 			{ if: { required: ['currentPassword'] }, then: { required: ['password'] } }
// 		]
// 	},
// 	response: {
// 		200: { type: 'object', properties: { ok: { type: 'boolean' } } },
// 		400: { type: 'object', properties: { error: { type: 'string' } } },
// 		401: { type: 'object', properties: { error: { type: 'string' } } },
// 		409: { type: 'object', properties: { error: { type: 'string' } } },
// 		500: { type: 'object', properties: { error: { type: 'string' } } }
// 	}
// }

// BEGIN -- /api/me PATCH
// schema: {
// 	tags: ['gdpr'],
// 	body: {
// 		type: 'object',
// 		minProperties: 1,
// 		properties: {
// 			username: { type: 'string', minLength: 1 },
// 			nickname: { type: 'string', minLength: 1 },
// 			email: { type: 'string', format: 'email' },
// 			password: { type: 'string', minLength: 1 },
// 			currentPassword: { type: 'string', minLength: 1 }
// 		},
// 		allOf: [
// 			{ if: { required: ['password'] }, then: { required: ['currentPassword'] } },
// 			{ if: { required: ['currentPassword'] }, then: { required: ['password'] } }
// 		]
// 	},
// 	response: {
// 		200: { type: 'object', properties: { ok: { type: 'boolean' } } },
// 		400: { type: 'object', properties: { error: { type: 'string' } } },
// 		401: { type: 'object', properties: { error: { type: 'string' } } },
// 		409: { type: 'object', properties: { error: { type: 'string' } } },
// 		500: { type: 'object', properties: { error: { type: 'string' } } }
// 	}
// }

export const old_PatchBodySchema = {
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
}

export const old_mePatchSchema = {
	tags: ['gdpr'],
	body: old_PatchBodySchema,
	response: {
		200: { type: 'object', properties: { ok: { type: 'boolean' } } },
		401: ErrorResponse,
		409: ErrorResponse,
		500: ErrorResponse
	},
}

// PATCH /api/me
export const PatchBodySchema = {
	type: 'object',
	additionalProperties: false,
	minProperties: 1,
	properties: {
		username: {
			type: 'string',
			minLength: 3,
			maxLength: 10,
			pattern: '^[a-zA-Z0-9_]+$',
			transform: ['trim'],
		},
		nickname: {
			type: 'string',
			minLength: 1,
			maxLength: 10,
			transform: ['trim'],
		},
		email: {
			type: 'string',
			format: 'email',
			maxLength: 50,
			transform: ['trim', 'toLowerCase'],
		},
		password: { type: 'string', minLength: 8, maxLength: 128 },
		currentPassword: { type: 'string', minLength: 8, maxLength: 128 },
	},
	allOf: [
		{ if: { required: ['password'] }, then: { required: ['currentPassword'] } },
		{ if: { required: ['currentPassword'] }, then: { required: ['password'] } },
	],
} as const

export const mePatchSchema = {
	tags: ['gdpr'],
	body: PatchBodySchema,
	response: {
		200: {
			type: 'object',
			additionalProperties: false,
			required: ['ok'],
			properties: { ok: { type: 'boolean', const: true } },
		},
		400: ErrorResponse,
		401: ErrorResponse,
		409: ErrorResponse,
		500: ErrorResponse,
	},
} as const
// END -- /api/me PATCH



// BEGIN -- /api/me/export

export const ogExportSchema = {
	tags: ['gdpr'],
	querystring: {
		type: 'object',
		properties: {
			format: { type: 'string', enum: ['json', 'json.gz', 'zip'], default: 'json' },
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
		}
	}
}

export const MeExportQuerySchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		format: { type: 'string', enum: ['json', 'json.gz', 'zip'], default: 'json' },
		includeMedia: { type: 'boolean', default: false },
	},
	// allOf: [
	// 	{
	// 		if: { properties: { includeMedia: { const: true } } },
	// 		then: { properties: { format: { const: 'zip' } } },
	// 	},
	// ],
} as const

export const meExportSchema = {
	tags: ['gdpr'],
	summary: 'Export your data (JSON, JSON.GZ, ZIP)',
	querystring: MeExportQuerySchema,
	response: {
		200: {
			content: {
				'application/json': { schema: { type: 'string' } },
				'application/gzip': { schema: { type: 'string', format: 'binary' } },
				'application/zip': { schema: { type: 'string', format: 'binary' } },
			},
		},
		400: ErrorResponse,
		401: ErrorResponse,
	},
} as const

// END -- /api/me/export


export const anonymizeOkResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['message', 'pseudoEmail'],
	properties: {
		message: { type: 'string' },
		pseudoEmail: { type: 'string' },
	}
}

export const anonymizeAndSetPwSchemaBody = {
	type: 'object',
	additionalProperties: false,
	required: ['newPassword'],
	properties: {
		newPassword: { type: 'string', minLength: 8, maxLength: 128 },
	}
}

export const anonymizeAndSetPwSchema = {
	tags: ['gdpr'],
	body: anonymizeAndSetPwSchemaBody,
	response: {
		200: anonymizeOkResponse,
		401: ErrorResponse,
		500: ErrorResponse
	},
} as const;
