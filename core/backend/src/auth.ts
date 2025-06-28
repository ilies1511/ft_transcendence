// export default async function authRoutes(app) {
// 	app.post('/register', {
// 	  schema: {
// 		body: {
// 		  type: 'object',
// 		  required: ['email', 'password', 'displayName'],
// 		  properties: {
// 			email:       { type: 'string', format: 'email' },
// 			password:    { type: 'string', minLength: 1 },
// 			displayName: { type: 'string', minLength: 1 }
// 		  }
// 		}
// 	  }
// 	}, async (req, reply) => {
// 	  const { email, password, displayName } = req.body as {
// 		email: string; password: string; displayName: string
// 	  }

// 	  try {
// 		const { lastID } = await app.db.run(
// 		  'INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)',
// 		  [email, password, displayName]
// 		)
// 		reply.code(201).send({ userId: lastID })
// 	  } catch (err: any) {
// 		if (err.code === 'SQLITE_CONSTRAINT') {
// 		  return reply.code(409).send({ error: 'Email or display name taken' })
// 		}
// 		throw err
// 	  }
// 	})
//   }

// src/auth.ts
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'

const COST   = 12  // bcrypt cost factor (2^12 ≈ 400 ms on laptop)

export default async function authRoutes (app: FastifyInstance) {

  /*──────────────────────────  REGISTRATION  ──────────────────────────*/
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'displayName'],
        properties: {
          email:       { type: 'string', format: 'email' },
          password:    { type: 'string', minLength: 1 },
          displayName: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (req, reply) => {
    const { email, password, displayName } = req.body as {
      email: string; password: string; displayName: string
    }

    const hash = await bcrypt.hash(password, COST)          // ← salt + hash

    try {
      const { lastID } = await app.db.run(
        'INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)',
        [email, hash, displayName]                          // store hash, not plain text
      )
      reply.code(201).send({ userId: lastID })
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return reply.code(409).send({ error: 'email or display name taken' })
      }
      throw err
    }
  })


  /*──────────────────────────────  LOGIN  ─────────────────────────────*/
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string }

    const user = await app.db.get(
      'SELECT id, password, display_name FROM users WHERE email = ?',
      [email]
    )

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.code(401).send({ error: 'invalid credentials' })
    }

    const token = await reply.jwtSign({ id: user.id, name: user.display_name })

    reply.setCookie('token', token, {
      path:     '/',
      httpOnly: true,
      sameSite: 'lax',
      secure:   false          // set true when you enable HTTPS
    })

    reply.send({ ok: true })
  })


  /*────────────────────────────  LOGOUT  ──────────────────────────────*/
  app.post('/logout', async (_req, reply) => {
    reply.clearCookie('token', { path: '/' })
    reply.send({ ok: true })
  })

// types/fastify-auth.d.ts Need to figure it out how it works 100%;
  /*──────────────────────────  PROTECTED TEST  ────────────────────────*/
//   app.get('/me', { preHandler: app.auth }, async (req) => {
//     return { user: req.user }      // set by request.jwtVerify()
//   })
app.get('/me', { preHandler: app.auth }, async (req) => {
	return req.user               // not wrapped
  })
}
