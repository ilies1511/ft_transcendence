export const ChatSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['type', 'to', 'content'],
	properties: {
		type: { const: 'direct_message' },
		to: { type: 'integer', minimum: 1 },
		content: { type: 'string', minLength: 1, maxLength: 30, transform: ['trim'] }
	}
} as const

export type ChatMessage = {
	type: 'chat'
	payload: { text: string }
}
