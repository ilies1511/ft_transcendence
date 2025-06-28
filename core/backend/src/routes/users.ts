// src/routes/users.ts
import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { type UserRow } from '../db/types.ts'

export const userRoutes: FastifyPluginAsync = async fastify => {
  fastify.post<{ Body: { username: string; password: string; email?: string } }>(
    '/api/users',
    async (request, reply) => {
      const { username, password, email } = request.body
      const now = Date.now()

      const hash = await bcrypt.hash(password, 10)

      try {
        const info = await fastify.db.run(
          `INSERT INTO users (username, password, email, created_at)
           VALUES (?, ?, ?, ?)`,
          username,
          hash,
          email ?? null,
          now
        )
        return reply.code(201).send({ id: info.lastID })
      } catch (err: any) {
        // z.B. Unique-Constraint
        return reply.code(409).send({ error: 'Username or email already exists' })
      }
    }
  )

  fastify.post<{ Body: { username: string; password: string } }>(
    '/api/login',
    async (request, reply) => {
      const { username, password } = request.body

      const user = await fastify.db.get<UserRow>(
        `SELECT * FROM users WHERE username = ?`,
        username
      )
      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      const ok = await bcrypt.compare(password, user.password)
      if (!ok) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const { password: _, ...safe } = user
      return { user: safe }
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/users/id/:id',
	async (request, reply) => {
		const {id} = request.params;
		const user = await fastify.db.run('DELETE FROM users WHERE id = ?', id)

		if (user.changes === 0) {
			// kein Datensatz gelöscht → 404
			return (reply.code(404).send({ error: 'User not found' }));
		}

		return reply
		.code(200)
		.send({ message: 'User succesfully deleted' })
		// return reply.code(204).send({message: "successfully deleted  user profile"});
	}
	)

 // DELETE by username
 fastify.delete<{ Params: { username: string } }>(
    '/api/users/username/:username',
    async (request, reply) => {
      const { username } = request.params
      const result = await fastify.db.run(
        'DELETE FROM users WHERE username = ?',
        username
      )

      if (result.changes === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return reply.code(200)
	  			.send({ message: 'User succesfully deleted' })
    }
  )

 fastify.delete<{ Params: { email: string } }>(
    '/api/users/email/:email',
    async (request, reply) => {
      const { email } = request.params
      const result = await fastify.db.run(
        'DELETE FROM users WHERE email = ?',
        email
      )

      if (result.changes === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return reply.code(200).send({ message: 'User succesfully deleted' })
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/api/users/id/:id',
    async (request, reply) => {
      const { id } = request.params
      const user = await fastify.db.get<UserRow>(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        id
      )
      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }
      return user
    }
  )
}
