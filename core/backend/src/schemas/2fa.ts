export const Generate2FABodySchema = {
	type: 'object',
	additionalProperties: false,
	maxProperties: 0
} as const

export const Generate2FAResponseSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['qr', 'secret'],
	properties: {
		qr: { type: 'string', pattern: '^data:image/' },
		secret: { type: 'string', minLength: 16, maxLength: 128 }
	}
} as const

export const generate2FASchema = {
	tags: ['2fa'],
	description: 'Generate a new TOTP secret and QR code (data URL)',
	// body: Generate2FABodySchema,
	response: {
		200: Generate2FAResponseSchema,
		// 401: { $ref: 'common#/Error' }
	}
} as const
