import fp from 'fastify-plugin'
import { fpSqlitePlugin } from 'fastify-sqlite-typed'   // typed plugin[1]

export default fp(async (database) => {
  // 1-line registration
  await database.register(fpSqlitePlugin, {
    dbFilename: './src/data/pong.db'
    // any extra options from the README may go here
  })

  // boot-time migration
  await database.db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT UNIQUE NOT NULL,
      display_name TEXT UNIQUE NOT NULL,
      password     TEXT NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
})
