// backend/src/routes/users.ts
import type { FastifyInstance } from 'fastify';

export default async function usersRoute(app: FastifyInstance) {
  // List all users
  app.get('/users', async (_req, reply) => {
    const rows = await app.db.all<{
      id: number;
      email: string;
	  avatar: string;
      display_name: string;
      created_at: string;
    }>(
      'SELECT id, email, display_name, avatar, created_at FROM users ORDER BY id ASC'
    );
    reply.send(rows);
  });

  // Public profile: get user by ID
  app.get<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const { id } = req.params;
    const user = await app.db.get(
      'SELECT id, display_name as name, avatar FROM users WHERE id = ?',
      [id]
    );
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    reply.send(user);
  });
}
