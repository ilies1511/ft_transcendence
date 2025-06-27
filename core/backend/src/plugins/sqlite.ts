import fp from 'fastify-plugin'
import fastifySqlite from 'fastify-sqlite'

export default fp(async (app) => {
  await app.register(fastifySqlite, {
    dbFile: './data/pong.db',
    promiseApi: true  // This enables the sqlite wrapper with Promise API
  })

  // Create users table on startup
  await app.sqlite.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
})
