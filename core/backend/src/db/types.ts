// src/db/types.ts
export interface UserRow {
	// nickname:	string
	// avatar:		string
	id:			number
	username:	string
	password:	string  // just Hash
	email:		string | null
	live:		number // 0 = offline, 1 = online
	created_at: number
}
/*
	TODO: Websocket for Live status of friend + Live chat (store in tmp array
		and not db)
	//IF player live --> live: true
	//IF player off --> live: false

	Websocket checkt diese Daten in regelmaessigen Abstaenden
*/

export interface Game {
	id: [number, number];
	result: string;
	scores: [number, number];
	password: string
	email: string | null
	start: number
	end: number
}

