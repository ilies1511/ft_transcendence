import { ErrorResponse, OkMessageResponse } from "./shared.ts"

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
