// backend/src/routes/users.ts
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { join } from 'node:path'
import { createWriteStream, unlink, existsSync } from 'node:fs';
// for file upload
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

	app.post<{ Params: { id: string } }>('/users/:id/avatar', async (req, reply) => {
		const { id } = req.params

		// TODO: Check authentication: Only allow the logged-in user to update their own avatar

		// parse the file
		const data = await req.file()
		if (!data) return reply.code(400).send({ error: 'No file uploaded' })

		// TODO remove after testing
		console.log('Uploaded iamge:', data.mimetype, 'filename:', data.filename);


		// validate file type and size (migth not work, because we do that from frontend)
		if (!['image/png', 'image/jpeg'].includes(data.mimetype)) {
		return reply.code(400).send({ error: 'Only PNG/JPEG allowed' })
		}
		if (data.file.truncated) {
		return reply.code(400).send({ error: 'File too large' })
		}

		// generate unique filename
		const ext = data.filename.split('.').pop()
		const filename = `user_${id}_${Date.now()}.${ext}`
		const savePath = join(__dirname, '../../public/avatars', filename)

		// 4. Save file
		await new Promise((resolve, reject) => {
			const ws = createWriteStream(savePath);
			data.file.pipe(ws);
			data.file.on('end', resolve);
			data.file.on('error', reject);
		});

		// delete old avatar if not default
		const user = await app.db.get('SELECT avatar FROM users WHERE id = ?', [id])
		if (user && user.avatar && !user.avatar.startsWith('default_')) {
		const oldPath = join(__dirname, '../../public/avatars', user.avatar)
		if (existsSync(oldPath)) unlink(oldPath, () => {})
		}

		// 6. Update DB
		await app.db.run('UPDATE users SET avatar = ? WHERE id = ?', [filename, id])

		reply.send({ avatar: filename })
	});

}
