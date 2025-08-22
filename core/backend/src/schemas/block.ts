export const BlockParamsSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['id', 'targetId'],
	properties: {
		id: { type: 'integer', minimum: 1 },
		targetId: { type: 'integer', minimum: 1 },
	},
} as const

export const EmptyBodySchema = {
	type: ['object', 'null'],
	additionalProperties: false,
	maxProperties: 0,
} as const

export const BlockOkResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['message'],
	properties: { message: { type: 'string' } },
} as const

export const ErrorResponse = {
	type: 'object',
	additionalProperties: false,
	required: ['error'],
	properties: { error: { type: 'string' } },
} as const

export const blockUserSchema = {
	tags: ['block'],
	params: BlockParamsSchema,
	body: EmptyBodySchema,
	response: {
		200: BlockOkResponse,
		400: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
} as const

// BEGIN -- Unblock
export const unblockUserSchema = {
	tags: ['block'],
	params: BlockParamsSchema,
	body: EmptyBodySchema,
	response: {
		200: BlockOkResponse,
		400: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
} as const
// END -- Unblock

// BEGIN -- GET Blocked List
export const BlockListParamsSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['id'],
	properties: {
		id: { type: 'integer', minimum: 1 },
	},
} as const

export const BlockListResponseSchema = {
	type: 'array',
	items: { type: 'integer', minimum: 1 },
	uniqueItems: true,
} as const

export const blockListSchema = {
	tags: ['block'],
	params: BlockListParamsSchema,
	response: {
		200: BlockListResponseSchema,
		403: ErrorResponse,
	},
} as const
// END -- GET Blocked List
