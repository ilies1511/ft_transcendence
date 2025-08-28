import { ErrorResponse, OkMessageResponse } from "./shared.js";

// schema: {
// 	description: 'Alle Teilnehmer eines Matches mit Score und Ergebnis',
// 	tags: ['match'],
// 	params: {
// 		type: 'object',
// 		required: ['matchId'],
// 		properties: {
// 			matchId: { type: 'integer' }
// 		}
// 	},
// 	response: {
// 		200: {
// 			type: 'array',
// 			items: {
// 				type: 'object',
// 				properties: {
// 					user_id: { type: 'integer' },
// 					username: { type: 'string' },
// 					score: { type: 'integer' },
// 					result: { type: 'string', enum: ['win', 'loss', 'draw'] }
// 				}
// 			}
// 		}
// 	}
// }

export const MatchParticipantsParamsSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['matchId'],
	properties: {
		matchId: { type: 'integer', minimum: 1 },
	},
} as const

// one list item
export const MatchParticipantItemSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['user_id', 'username', 'score', 'result'],
	properties: {
		user_id: { type: 'integer', minimum: 1 },
		username: { type: 'string' },
		score: { type: 'integer' },
		result: { type: 'string', enum: ['win', 'loss', 'draw'] },
	},
} as const

export const MatchParticipantsResponseSchema = {
	type: 'array',
	items: MatchParticipantItemSchema,
} as const

export const getMatchParticipantsSchema = {
	description: 'All participants of a match with score/result',
	tags: ['match'],
	params: MatchParticipantsParamsSchema,
	response: {
		200: MatchParticipantsResponseSchema,
	},
} as const


// BEGIN -- POST

export const CreateMatchBodySchema = {
	type: 'object',
	additionalProperties: false,
	required: ['mode'],
	properties: {
		mode: { type: 'integer', minimum: 0 },
	},
} as const

export const CreateMatch201Schema = {
	type: 'object',
	additionalProperties: false,
	required: ['matchId'],
	properties: {
		matchId: { type: 'integer', minimum: 1 },
	},
} as const

export const createMatchSchema = {
	tags: ['match'],
	body: CreateMatchBodySchema,
	response: {
		201: CreateMatch201Schema,
		400: ErrorResponse,
		401: ErrorResponse,
		500: ErrorResponse,
	},
} as const
// END -- POST

// BEGIN -- complete match
export const CompleteMatchParamsSchema = CreateMatch201Schema

export const CompleteMatchBodySchema = {
	type: 'object',
	additionalProperties: false,
	required: ['duration', 'participants'],
	properties: {
		duration: { type: 'integer' },
		participants: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['user_id', 'score', 'result'],
				properties: {
					user_id: { type: 'integer'},
					score: { type: 'integer' },
					result: { type: 'string', enum: ['win', 'loss', 'draw'] },
				},
			},
		},
	},
} as const

//
export const CompleteMatch200Schema = {
	type: 'object',
	additionalProperties: false,
	required: ['success'],
	properties: { success: { type: 'boolean', const: true } },
} as const

export const completeMatchSchema = {
	tags: ['match'],
	params: CompleteMatchParamsSchema,
	body: CompleteMatchBodySchema,
	response: {
		200: CompleteMatch200Schema,
		400: ErrorResponse,
		404: ErrorResponse,
		409: ErrorResponse,
	},
} as const
// END -- complete match
