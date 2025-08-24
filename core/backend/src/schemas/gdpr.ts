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
		avatar: { type: 'string' },
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
	body: EmptyBodySchema,
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
	body: EmptyBodySchema,
	response: {
		200: OkMessageResponse,
		401: ErrorResponse,
		409: ErrorResponse,
	},
}

// END -- /api/me DELETE
