// backend/src/routes/users.ts
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';

export default async function usersRoute(app: FastifyInstance) {
  // List all users
  app.get('/users', async (_req, reply) => {
    const rows = await app.db.all<{
      id: number;
      email: string;
	  avatar: string;
      username: string;
	  nickname: string;
      created_at: string;
    }>(
      'SELECT id, email, username, nickname, avatar, created_at FROM users ORDER BY id ASC'
    );
    reply.send(rows);
  });

  // Public profile: get user by ID
  app.get<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const { id } = req.params;
    const user = await app.db.get(
      'SELECT id, username, nickname, avatar FROM users WHERE id = ?',
      [id]
    );
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    reply.send(user);
  });

  app.patch<{ Params: { id: string }, Body: { username?: string, nickname?: string, email?: string, password?: string } }>(
    '/users/:id',
    async (req, reply) => {
      const { id } = req.params;
      const { username, nickname, email, password } = req.body;

      // TODO: Replace this with your real authentication check!
      // Only allow the logged-in user to update their own info
      // For now, just assume it's allowed.

      // Uniqueness checks
      if (email) {
        const exists = await app.db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
        if (exists) return reply.code(409).send({ error: 'Email already in use' });
      }
      if (username) {
        const exists = await app.db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
        if (exists) return reply.code(409).send({ error: 'Username already in use' });
      }

      // Build update fields
      const fields = [];
      const values = [];
      if (username) {
        fields.push('username = ?');
        values.push(username);
      }
	  if (nickname) {
        fields.push('nickname = ?');
        values.push(nickname);
      }
      if (email) {
        fields.push('email = ?');
        values.push(email);
      }
      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        fields.push('password = ?');
        values.push(hashed);
      }
      if (fields.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }
      values.push(id);

      await app.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      reply.send({ success: true });
    }
  );

}
