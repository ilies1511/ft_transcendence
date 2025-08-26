import AjvModule from 'ajv'
import ajvKeywordsModule from 'ajv-keywords'
import { ChatSchema } from '../../schemas/wsSchema.ts'

const Ajv = (AjvModule as any).default ?? AjvModule
const ajvKeywords = (ajvKeywordsModule as any).default ?? ajvKeywordsModule

const ajv = new Ajv({
	removeAdditional: 'all',
	coerceTypes: true,
	allErrors: true,
})
ajvKeywords(ajv, ['transform'])
export const validateChat = ajv.compile(ChatSchema)
