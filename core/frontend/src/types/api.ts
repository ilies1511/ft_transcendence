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