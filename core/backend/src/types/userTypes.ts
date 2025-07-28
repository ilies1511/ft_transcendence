export interface UserRow {
	// nickname:	string
	id: number
	username: string
	nickname: string
	password: string  // just Hash
	email: string | null
	live: number // 0 = offline, 1 = online
	avatar: string
	twofa_secret?: string;
	twofa_enabled: 0 | 1;
	created_at: number
}

// export interface FriendRequestRow {
// 	id: number
// 	requester_id: number
// 	recipient_id: number
// 	status: 'pending' | 'accepted' | 'rejected'
// 	created_at: number
// 	responded_at: number | null
// }
export interface FriendRequestRow {
	id: number
	requester_id: number
	recipient_id: number
	created_at: number
	responded_at: number | null
}

export interface FriendInfo {
	id: number
	username: string
	live: number
	avatar: string
}

export interface UserWithFriends extends Omit<UserRow, 'password' | 'twofa_secret'| 'twofa_enabled'> {
	// friends: number[]
	friends: FriendInfo[]
}

// BEGIN -- Match History and User Statistics
export interface MatchRow {
	id: number;
	mode: number;
	duration: number;
	created_at: number;
}

export type MatchParticipants = ParticipantRow & {
	username: string;
};

export interface ParticipantRow {
	match_id: number;
	user_id: number;
	score: number;
	result: 'win' | 'loss' | 'draw';
}

export interface UserMatch {
	match: MatchRow;
	score: number;
	result: 'win' | 'loss' | 'draw';
}

export interface UserStats {
	totalGames: number;
	wins: number;
	losses: number;
	draws: number;
	winRate: number;
	byMode: Array<{
		mode: number;
		games: number;
		wins: number;
		losses: number;
		draws: number;
		winRate: number;
	}>;
}
// END -- Match History and User Statistics
