import type { FastifyPluginAsync } from 'fastify'
import { getMatchHistory, getUserStats, createMatchMeta, completeMatch } from '../functions/match.ts'
import { type UserStats } from '../types/userTypes.ts'
import { type NewMatch } from '../functions/match.ts'

export const matchRoutes: FastifyPluginAsync = async fastify => {
	// BEGIN -- GET
	fastify.get<{
		Params: { id: number }
		Reply: UserStats | { error: string }
	}>(
		'/api/users/:id/stats',
		{
			schema: {
				tags: ['match']
			}
		},
		async (request, reply) => {
			const stats = await getUserStats(fastify, request.params.id)
			return stats
		}
	)

	fastify.get<{
		Params: { id: number }
		Reply: Array<{
			match: { id: number; mode: number; duration: number; created_at: number }
			score: number
			result: 'win' | 'loss' | 'draw'
		}>
	}>(
		'/api/users/:id/matches',
		{
			schema: {
				tags: ['match'],
			}
		},
		async (request) => {
			return getMatchHistory(fastify, request.params.id)
		}
	)
	// END -- GET

	// BEGIN -- POST
	////TESTING ROUTE for getters
	// fastify.post<{
	// 	Body: NewMatch;
	// 	Reply: { matchId: number } | { error: string }
	// }>(
	// 	'/api/matches',
	// 	{
	// 		schema: {
	// 			tags: ['match'],
	// 			body: {
	// 				type: 'object',
	// 				required: ['mode', 'duration', 'participants'],
	// 				properties: {
	// 					mode: { type: 'integer' },
	// 					duration: { type: 'integer' },
	// 					participants: {
	// 						type: 'array',
	// 						items: {
	// 							type: 'object',
	// 							required: ['user_id', 'score', 'result'],
	// 							properties: {
	// 								user_id: { type: 'integer' },
	// 								score: { type: 'integer' },
	// 								result: { type: 'string', enum: ['win', 'loss'] }
	// 							}
	// 						}
	// 					}
	// 				}
	// 			},
	// 			response: {
	// 				201: {
	// 					type: 'object',
	// 					properties: { matchId: { type: 'integer' } }
	// 				},
	// 				400: {
	// 					type: 'object',
	// 					properties: { error: { type: 'string' } }
	// 				}
	// 			}
	// 		}
	// 	},
	// 	async (request, reply) => {
	// 		try {
	// 			const id = await createMatchMeta(fastify, request.body.mode);
	// 			// const id = await createMatch(fastify, request.body)
	// 			return reply.code(201).send({ matchId: id })
	// 		} catch (err: any) {
	// 			fastify.log.error(err)
	// 			return reply.code(400).send({ error: err.message })
	// 		}
	// 		// try {
	// 		// 	const id = await createMatch(fastify, request.body)
	// 		// 	return reply.code(201).send({ matchId: id })
	// 		// } catch (err: any) {
	// 		// 	fastify.log.error(err)
	// 		// 	return reply.code(400).send({ error: err.message })
	// 		// }
	// 	}
	// )

	// for Fabi's part -- BEGIN

	/*
		curl -i -X POST http://localhost:3000/api/matches \
		-H "Content-Type: application/json" \
		-d '{ "mode": 2 }'
	*/
	fastify.post<{ Body: { mode: number } }>(
		'/api/matches',
		async (req, reply) => {
			const matchId = await createMatchMeta(fastify, req.body.mode)
			return reply.code(201).send({ matchId })
		}
	)

	/*
		curl -i -X POST http://localhost:3000/api/matches/:matchID/complete \
		-H "Content-Type: application/json" \
		-d '{
		"duration": 90,
		"participants": [
			{"user_id":1,"score":5,"result":"win"},
			{"user_id":2,"score":3,"result":"loss"}
		]
		}'

		curl -i -X POST http://localhost:3000/api/matches/:matchID/complete \
		-H "Content-Type: application/json" \
		-d '{
		"duration": 90,
		"participants": [
			{"user_id":1,"score":0,"result":"draw"},
			{"user_id":2,"score":0,"result":"draw"}
		]
		}'
	 */
	fastify.post<{
		Params: { matchId: number }
		Body: { duration: number; participants: Array<{ user_id: number; score: number; result: 'win' | 'loss' | 'draw' }> }
	}>(
		'/api/matches/:matchId/complete',
		async (req, reply) => {
			await completeMatch(
				fastify,
				req.params.matchId,
				{ duration: req.body.duration, participants: req.body.participants }
			)
			return reply.code(200).send({ success: true })
		}
	)
	// for Fabi's part -- END
	// END -- POST
}

/*
curl -i -X POST http://localhost:3000/api/matches \
  -H "Content-Type: application/json" \
  -d '{
	"mode": 4,
	"duration": 120,
	"participants": [
	  { "user_id": 1, "score": 15, "result": "win" },
	  { "user_id": 2, "score": 12, "result": "loss" },
	  { "user_id": 3, "score":  8, "result": "loss" },
	  { "user_id": 4, "score": 10, "result": "loss" }
	]
  }'
 */
