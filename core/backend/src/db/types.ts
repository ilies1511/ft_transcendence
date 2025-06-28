// src/db/types.ts
export interface UserRow {
	id:        number
	username:  string
	password:  string  // gespeicherter Hash
	email:     string | null
	created_at: number
  }

export interface Game {
	id: [number, number];
	result:  string;
	scores: [number, number];
	password:  string
	email:     string | null
	start: number
	end: number
  }

