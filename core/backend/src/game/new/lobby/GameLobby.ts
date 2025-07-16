import { GameEngine } from './engine/GameEngine.ts';

export class GameLobby {
	public finished: boolean = false;
	public engine?: GameEngine = undefined;

	// set by constructor incase of invalid constructor args
	public error?: string = undefined;



	private _password?: string;


	constructor(map_name: string, ai_count: number, password?: string) {
		this._password = password;
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
