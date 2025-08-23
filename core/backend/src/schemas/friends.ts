import { ErrorResponse } from "./block.ts"

export const Params = {
	type: "object",
	additionalProperties: false,
	required: ["id"],
	properties: { id: { type: "integer" } },
} as const

export const OkResponseSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['id', 'username', 'nickname', 'email', 'live', 'avatar', 'created_at', 'friends'],
	properties: {
		id: { type: 'integer' },
		username: { type: 'string' },
		nickname: { type: 'string' },
		email: { type: ['string', 'null'] },
		live: { type: 'integer' },
		avatar: { type: 'string' },
		created_at: { type: 'integer' },
		friends: {
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['id', 'username', 'live', 'avatar'],
				properties: {
					id: { type: 'integer' },
					username: { type: 'string' },
					live: { type: 'integer' },
					avatar: { type: 'string' }
				}
			},
		}
	}
} as const

export const listFriendsSchema = {
	tags: ['friends'],
	// params: Params, // --> Not needed anymire since API Design changed
	response: {
		200: OkResponseSchema,
		404: ErrorResponse
	}
} as const

// schema: {
// 	tags: ['friends'],
// 	params: {
// 		type: "object",
// 		required: ["id"],
// 		properties: { id: { type: "integer" } },
// 	},
// 	response: {
// 		200: {
// 			type: 'object',
// 			properties: {
// 				id: { type: 'integer' },
// 				username: { type: 'string' },
// 				nickname: { type: 'string' },
// 				email: { type: ['string', 'null'] },
// 				live: { type: 'integer' },
// 				avatar: { type: 'string' },
// 				created_at: { type: 'integer' },
// 				friends: {
// 					type: 'array',
// 					items: {
// 						type: 'object',
// 						properties: {
// 							id: { type: 'integer' },
// 							username: { type: 'string' },
// 							live: { type: 'integer' },
// 							avatar: { type: 'string' }
// 						},
// 						required: ['id', 'username', 'live', 'avatar']
// 					}
// 				}
// 			},
// 			required: ['id', 'username', 'nickname', 'email', 'live', 'avatar', 'created_at', 'friends']
// 		},
// 		404: {
// 			type: "object",
// 			properties: { error: { type: "string" } },
// 		}
// 	}
// }
