// src/types/ws.ts
export type FriendStatusMsg = {
	type: 'friend_status_update';
	friendId: number;
	online: number;
};

// src/types/api.ts
export type ApiUser = {
	id: number
	username: string
	nickname: string
	avatar: string
	live: number
}

export type ApiFriend = {
	id: number
	username: string
	live: number
	avatar: string
}

export type ApiUserWithFriends = ApiUser & {
	friends: ApiFriend[]
}

export interface AuthUser {
	id: number;
	username: string;
	nickname: string;
	avatar: string;
	live: number;
}