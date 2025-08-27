import { ErrorResponse, OkMessageResponse, EmptyBodySchema } from "./shared.js"
// BEGIN -- POST Avatar file updload
// schema: {
// 	params: {
// 		type: 'object',
// 		required: ['id'],
// 		properties: { id: { type: 'integer' } }
// 	},
// 	response: {
// 		200: {
// 			type: 'object',
// 			properties: { avatarUrl: { type: 'string' } }
// 		},
// 		400: { type: 'object', properties: { error: { type: 'string' } } },
// 		404: { type: 'object', properties: { error: { type: 'string' } } }
// 	}
// }

export const UploadAvatar200Schema = {
	type: 'object',
	additionalProperties: false,
	required: ['avatarUrl'],
	properties: {
		avatarUrl: { type: 'string' },
	},
} as const

export const uploadAvatarSchema = {
	tags: ['me', 'upload'],
	consumes: ['multipart/form-data'],
	response: {
		200: UploadAvatar200Schema,
		400: ErrorResponse,
		404: ErrorResponse,
	},
} as const
// END -- POST Avatar file updload
