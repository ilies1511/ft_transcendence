// import type { FastifyInstance } from 'fastify'
// import { db } from '../db/db.js';

// async function randomRoute(fastify: FastifyInstance) {
// 	fastify.get('/api/random', (request, reply) => {
// 	  db.get(
// 		'SELECT ABS(RANDOM()) % 100 AS result',
// 		(err, row: { result: number }) => {
// 		  if (err) {
// 			fastify.log.error(err)
// 			return reply.code(500).send({ error: 'DB-Abfrage fehlgeschlagen' })
// 		  }
// 		  reply.send({ random: row.result })
// 		}
// 	  )
// 	})
// }


// async function alo(fastify:FastifyInstance) {
// 	  fastify.get('/api/hello', async (request, reply) => {
// 		  return { hello: 'world' }
// 		})
// 	}

// export {
// 	randomRoute,
// 	alo
// }


// // src/routes/test_route.js
// import type { fastify, FastifyPluginAsync } from 'fastify'
// import { db } from '../db/db.js'

// export const randomRoute: FastifyPluginAsync = async fastify => {
//   fastify.get('/api/random', (request, reply) => {
//     db.get(
//       'SELECT ABS(RANDOM()) % 100 AS result',
//       (err, row: { result: number }) => {
//         if (err) {
//           fastify.log.error(err)
//           return reply.code(500).send({ error: 'DB-Abfrage fehlgeschlagen' })
//         }
//         reply.send({random: row.result })
//       }
//     )
//   })
// }

// export const helloRoute: FastifyPluginAsync = async fastify => {
//   fastify.get('/api/hello', async () => {
//     return { hello: 'world' }
//   })
// }

// export const test: FastifyPluginAsync = async fastify => {
// 	fastify.get('/api/test', async (req, reply) => {
// 		fastify.log.info('/api/test wurde aufgerufen')
// 		reply.send("Alooooo");
// 	})
// }


// z.B. src/routes/test_route.js
import type { FastifyPluginAsync } from 'fastify'

export const randomRoute: FastifyPluginAsync = async fastify => {
  fastify.get('/api/random', async () => {
    // Typsicher: du sagst, dass result eine Zahl ist
    const row = await fastify.db.get<{ result: number }>(
      'SELECT ABS(RANDOM()) % 100 AS result'
    )
	if (row)
    	return { random: row.result}
  })
}

export const helloRoute: FastifyPluginAsync = async fastify => {
  fastify.get('/api/hello', async () => {
    return { hello: 'world' }
  })
}

export const test: FastifyPluginAsync = async fastify => {
	fastify.get('/api/test', async (req, reply) => {
		fastify.log.info('/api/test wurde aufgerufen')
		reply.send("Alooooo");
	})
}
