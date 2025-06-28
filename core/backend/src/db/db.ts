// // https://www.octans-solutions.fr/en/articles/sqlite-typescript

// import { Database } from 'sqlite3';

// // Open a SQLite database, stored in the file db.sqlite
// const db = new Database('db.sqlite');

// // Fetch a random integer between -99 and +99
// db.get(
//   'SELECT RANDOM() % 100 as result',
//   (_, res) => console.log(res)
// );

// export {
// 	db
// }

// import sqlite3 from 'sqlite3'
// import { promisify } from 'util'

// const { Database, OPEN_READWRITE, OPEN_CREATE } = sqlite3

// // DB-Datei anlegen / öffnen
// export const db = new Database(
//   'db.sqlite',
//   OPEN_READWRITE | OPEN_CREATE,
//   err => {
//     if (err) console.error('✗ SQLite:', err)
//     else console.log('✔️ SQLite verbunden')
//   }
// )

// // Promisify, wenn du async/await nutzen willst
// export const dbGet = promisify(db.get.bind(db))
// export const dbRun = promisify(db.run.bind(db))


// import Fastify from 'fastify'
// const fastify = Fastify({ logger: true })

// import sqlite3 from 'sqlite3'
// const { Database, OPEN_READWRITE, OPEN_CREATE } = sqlite3


// const db = new Database(
//   'db.sqlite',
//   OPEN_READWRITE | OPEN_CREATE,
//   err => {
//     if (err) fastify.log.error('SQLite Fehler:', err)
//     else fastify.log.info('✔️ SQLite verbunden')
//   }
// )

// fastify.decorate('db', db)
// db.serialize(() => {
//   db.run(`
//     CREATE TABLE IF NOT EXISTS test (
//       id    INTEGER PRIMARY KEY AUTOINCREMENT,
//       value TEXT
//     )
//   `, err => {
//     if (err) fastify.log.error('Tabelle test anlegen fehlgeschlagen:', err)
//   })
// })

// export {
// 	db
// }
