import type { FastifyInstance } from 'fastify';

export default async function usersRoute(app: FastifyInstance) {
  app.get('/users', async (_req, reply) => {
    const rows = await app.db.all<{
      id: number;
      email: string;
      display_name: string;
      created_at: string;
    }>('SELECT id, email, display_name, created_at FROM users ORDER BY id ASC');

    reply.send(rows);
  });
}
