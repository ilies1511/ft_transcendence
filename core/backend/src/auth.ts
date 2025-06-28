export default async function authRoutes(app) {
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

	  try {
		const { lastID } = await app.db.run(
		  'INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)',
		  [email, password, displayName]
		)
		reply.code(201).send({ userId: lastID })
	  } catch (err: any) {
		if (err.code === 'SQLITE_CONSTRAINT') {
		  return reply.code(409).send({ error: 'Email or display name taken' })
		}
		throw err
	  }
	})
  }
