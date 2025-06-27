import type { FastifyInstance } from 'fastify'

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'displayName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
          displayName: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (req, reply) => {
    const { email, password, displayName } = req.body as {
      email: string
      password: string
      displayName: string
    }

    try {
      const stmt = `INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)`
      const result = await app.sqlite.run(stmt, [email, password, displayName])
      
      reply.code(201).send({ 
        success: true, 
        message: 'User created successfully',
        userId: result.lastID 
      })
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return reply.code(409).send({ 
          success: false, 
          error: 'Email or display name already exists' 
        })
      }
      throw err
    }
  })
}
