import { ErrorResponse, OkMessageResponse } from "./shared.ts"

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

// BEGIN -- GET friend request

export const SendFRResponse201 = {
	type: 'object',
	additionalProperties: false,
	required: ['requestId'],
	properties: { requestId: { type: 'integer', minimum: 1 } },
} as const

export const SendFRBodySchema = {
	type: 'object',
	additionalProperties: false,
	required: ['username'],
	properties: {
		username: {
			type: 'string',
			// minLength: 3,
			// maxLength: 24,
			// pattern: '^[a-zA-Z0-9_]+$',
			// transform: ['trim'],
		},
	},
} as const

export const sendFriendRequestSchema = {
	tags: ['friends'],
	summary: 'Send a friend request as the authenticated user',
	body: SendFRBodySchema,
	response: {
		200: OkMessageResponse,
		201: SendFRResponse201,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
		409: ErrorResponse,
		500: ErrorResponse
	}
};
// END --GET friend request

// BEGIN -- Incoming requests listen ---> received request
export const FriendRequestItemSchema = {
	type: 'object',
	// additionalProperties: false,
	required: ['id', 'requester_id', 'recipient_id', 'created_at', 'responded_at'],
	properties: {
		id: { type: 'integer', minimum: 1 },
		requester_id: { type: 'integer', minimum: 1 },
		recipient_id: { type: 'integer', minimum: 1 },
		created_at: { type: 'integer', minimum: 0 },
		responded_at: { type: ['integer', 'null'] },
	},
} as const

export const IncomingRequestsResponseSchema = {
	type: 'array',
	uniqueItems: true,
	items: FriendRequestItemSchema,
} as const

export const incomingRequestsSchema = {
	tags: ['friends'],
	response: {
		200: IncomingRequestsResponseSchema,
	},
} as const

// schema: {
// 	tags: ['friends'],
// 	params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
// 	response: {
// 		200: {
// 			type: 'array',
// 			items: {
// 				type: 'object',
// 				properties: {
// 					id: { type: 'integer' },
// 					requester_id: { type: 'integer' },
// 					recipient_id: { type: 'integer' },
// 					status: { type: 'string' },
// 					created_at: { type: 'integer' },
// 					responded_at: { type: ['integer', 'null'] }
// 				}
// 			}
// 		}
// 	}
// }

// END -- Incoming requests listen ---> received request


// BEGIN -- GET request outgoing
// schema: {
// 	tags: ['friends'],
// 	params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
// 	response: {
// 		200: {
// 			type: 'array',
// 			items: {
// 				type: 'object',
// 				properties: {
// 					id: { type: 'integer' },
// 					requester_id: { type: 'integer' },
// 					recipient_id: { type: 'integer' },
// 					status: { type: 'string' },
// 					created_at: { type: 'integer' },
// 					responded_at: { type: ['integer', 'null'] }
// 				}
// 			}
// 		}
// 	}
// }

export const outgoingRequestsSchema = {
	tags: ['friends'],
	response: {
		200: {
			type: 'array',
			uniqueItems: true,
			items: FriendRequestItemSchema,
		},
	},
} as const
// END -- GET request outgoing


// BEGIN -- POST Accecpt
// schema: {
// 	tags: ['friends'],
// 	params: { type: 'object', required: ['requestId'], properties: { requestId: { type: 'integer' } } },
// 	response: {
// 		200: { type: 'object', properties: { message: { type: 'string' } } },
// 		404: { type: 'object', properties: { error: { type: 'string' } } }
// 	}
// }

export const AcceptFRParamsSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['requestId'],
	properties: {
		requestId: { type: 'integer', minimum: 1 },
	},
} as const

export const acceptFriendRequestSchema = {
	tags: ['friends'],
	params: AcceptFRParamsSchema,
	response: {
		200: OkMessageResponse,
		400: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
		409: ErrorResponse,
	},
} as const
// END -- POST Accecpt

// BEGIN -- POST Accecpt
export const rejectFriendRequestSchema = acceptFriendRequestSchema
// END -- POST Accecpt
