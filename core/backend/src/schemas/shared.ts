export const ErrorResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['error'],
	properties: { error: { type: 'string' } },
} as const

export const OkMessageResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['message'],
	properties: { message: { type: 'string' } },
} as const

export const EmptyBodySchema = {
	type: ['object', 'null'],
	additionalProperties: false,
	maxProperties: 0,
} as const
