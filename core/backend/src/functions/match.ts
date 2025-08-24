import type { FastifyInstance } from 'fastify'
import type { UserMatch, UserStats, MatchParticipants} from '../types/userTypes.ts'

type HistoryRow = {
	match_id: number;
	mode: number;
	duration: number;
	created_at: number;
	score: number;
	result: string;
}

export async function getMatchHistory(
	fastify: FastifyInstance,
	userId: number
): Promise<UserMatch[]> {
	const rows = await fastify.db.all<HistoryRow[]>(
		`SELECT m.id   AS match_id,
			m.mode,
			m.duration,
			m.created_at,
			p.score,
			p.result
		FROM matches AS m
		INNER JOIN match_participants AS p
			ON m.id = p.match_id
		WHERE p.user_id = ?
		ORDER BY m.created_at DESC`,
		userId
	)
	return rows.map(r => ({
		match: {
			id: r.match_id,
			mode: r.mode,
			duration: r.duration,
			created_at: r.created_at
		},
		score: r.score,
		result: r.result as 'win' | 'loss' | 'draw'
	}))
}

export async function getUserStats(
	fastify: FastifyInstance,
	userId: number
): Promise<UserStats> {
	const agg = await fastify.db.get<{
		total: number; wins: number; losses: number; draws: number
	}>(
		`SELECT
		COUNT(*)					AS total,
		SUM(CASE WHEN result='win'  THEN 1 ELSE 0 END) AS wins,
		SUM(CASE WHEN result='loss' THEN 1 ELSE 0 END) AS losses,
		SUM(CASE WHEN result='draw' THEN 1 ELSE 0 END) AS draws
		FROM match_participants
		WHERE user_id = ?`,
		userId
	)

	type ModeAggRow = {
		mode: number
		games: number
		wins: number
		losses: number
		draws: number
	}
	const byMode = await fastify.db.all<ModeAggRow[]>(
		`SELECT
		m.mode                         AS mode,
		COUNT(*)                       AS games,
		SUM(CASE WHEN p.result='win'  THEN 1 ELSE 0 END) AS wins,
		SUM(CASE WHEN p.result='loss' THEN 1 ELSE 0 END) AS losses,
		SUM(CASE WHEN p.result='draw' THEN 1 ELSE 0 END) AS draws
		FROM matches AS m
		JOIN match_participants AS p
		ON m.id = p.match_id
		WHERE p.user_id = ?
		GROUP BY m.mode`,
		userId
	)

	const total = agg?.total ?? 0
	const wins = agg?.wins ?? 0
	const losses = agg?.losses ?? 0
	const draws = agg?.draws ?? 0

	return {
		totalGames: total,
		wins,
		losses,
		draws,
		winRate: total > 0 ? wins / total : 0,
		byMode: byMode.map(m => ({
			mode: m.mode,
			games: m.games,
			wins: m.wins,
			losses: m.losses,
			draws: m.draws,
			winRate: m.games > 0 ? m.wins / m.games : 0
		}))
	}
}

export interface NewMatch {
	mode: number;
	duration: number;
	participants: Array<{
		user_id: number;
		score: number;
		result: 'win' | 'loss' | 'draw';
	}>;
}

//only for debugging
const finishes_per_id: Map<number, number> = new Map<number, number>;

// BEGIN -- Testing Route for Match (to be removed)
export async function createMatch(
	fastify: FastifyInstance,
	data: NewMatch
): Promise<number> {
	try {
		await fastify.db.exec('BEGIN')
		const info = await fastify.db.run(
			`INSERT INTO matches (mode, duration)
			VALUES (?, ?)`,
			data.mode,
			data.duration
		)
		const matchId = info.lastID;
		for (const p of data.participants) {
			await fastify.db.run(
				`INSERT INTO match_participants (match_id, user_id, score, result)
				VALUES (?, ?, ?, ?)`,
				matchId,
				p.user_id,
				p.score,
				p.result
			)
		}
		await fastify.db.exec('COMMIT')
		if (matchId == undefined || finishes_per_id.get(matchId)) {
			console.log("Error: createMatch; matchId: ", matchId);
			if (matchId) {
				console.log("finishes_per_id.get(matchId): ", finishes_per_id.get(matchId));
			}
		}
		if (matchId === undefined) {
			process.exit(123);
			return (0);
		}
		finishes_per_id.set(matchId, 0);
		return matchId
	} catch (e) {
		console.log("Error when creating match: ", e);
		process.exit(123);
		return (0);
	}
}
// END -- Testing Route for Match

// for Fabi to get MatchID to enable clients to connect via ws (using the MatchID)
export async function createMatchMeta(
	fastify: FastifyInstance,
	mode: number
): Promise<number> {
	const info = await fastify.db.run(
		`INSERT INTO matches (mode, duration)
		VALUES (?, 0)`,
		mode
	);
	const old_finishes_count = finishes_per_id.get(info.lastID!);
	if (old_finishes_count != undefined) {
		console.log("old_finishes_count is not undefined in createMatchMeta");
		process.exit(123);
	}
	finishes_per_id.set(info.lastID!, 0);
	return info.lastID!;
}

export async function completeMatch(
	fastify: FastifyInstance,
	matchId: number,
	data: Pick<NewMatch, 'duration' | 'participants'>
): Promise<void> {
	console.log(`completeMatch(${matchId})`);
	const old_finishes_count = finishes_per_id.get(matchId);
	if (old_finishes_count == undefined) {
		console.log("completeMatch: old finishes_per_id does not exist");
		process.exit(123);
	}
	if (old_finishes_count != 0) {
		console.log("completeMatch: old finishes_per_id is not 0");
		process.exit(123);
	}
	finishes_per_id.set(matchId, old_finishes_count + 1);
	try {
		await fastify.db.exec('BEGIN')
		await fastify.db.run(
			`UPDATE matches SET duration = ? WHERE id = ?`,
			data.duration,
			matchId
		)
		for (const p of data.participants) {
			await fastify.db.run(
			`INSERT INTO match_participants (match_id, user_id, score, result)
			VALUES (?, ?, ?, ?)`,
				matchId,
				p.user_id,
				p.score,
				p.result
			)
		}
		await fastify.db.exec('COMMIT')
	} catch (e) {
		console.log("Error when finishing match: ", e);
		console.log('\tdata: ', data);
		console.log('\tmatch_id: ', matchId);
	}
}


export async function getParticipantsForMatch(
	fastify: FastifyInstance,
	matchId: number
): Promise<Array<MatchParticipants>> {
	return fastify.db.all<MatchParticipants[]>(
		`SELECT
		p.user_id,
		u.username,
		p.score,
		p.result
			FROM match_participants AS p JOIN users AS u ON p.user_id = u.id
		WHERE p.match_id = ? ORDER BY p.score DESC`, matchId
	)
}
