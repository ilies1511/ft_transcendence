import { ErrorResponse, OkMessageResponse } from "./shared.ts";

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
