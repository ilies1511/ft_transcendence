import { GameEngine } from './engine/GameEngine.ts';

export class GameLobby {
	public finished: boolean = false;
	public engine?: GameEngine = undefined;
	public id: number;

	// set by constructor incase of invalid constructor args
	public error?: string = undefined;



	private _password?: string;


	constructor(id: number, map_name: string, ai_count: number, password?: string) {
		console.log("game: GameLobby constructor");
		this._password = password;
		this.id = id;
	}


	// returns false if player can not join
	public join(user_id, map_name: string, password?: string): boolean {
		if (this._password !== undefined && password === undefined
			|| this._password === undefined && password !== undefined
			|| this._password !== undefined && this._password != password
		) {
			return (false);
		}
		//todo: actual logic
		console.log("Game: User", user_id, " joing lobby ", this.id);
		return (true);
	}

	public check_finished(): boolean {
		if (this.engine !== undefined && this.engine.finished) {
			this.finished = true;
		}
		return (this.finished);
	}

	public cleanup() {
	}
};
