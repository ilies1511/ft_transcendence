export enum BinType {
	GAME_STATE = 1,
};


export type GameOptions = {
	player_count: number;
	timer: number;
	no_tie: boolean;//for tournament, game goes unitl time is over and one player leads
};

export type ServerToClientJson =
	| {
		type: 'game_lobby_update',
		player_count: number,
		target_player_count: number,
	}
	| {
		type: 'starting_game',
		game_id: number,
		options: GameOptions
	};

/*
 * ArrayBuffer content:
	0: uint8:: type => enum BinType
*/
export type ServerToClientMessage = ServerToClientJson | ArrayBuffer;


//todo: leave game option
export type ClientToServerMessage =
	| {
		type: 'search_game';
		player_id: number;
		payload: {
			options: GameOptions;
		}
	}
	| {
		type: 'reconnect';
		player_id: number;
		payload: {
		}
	}
	| {
		type: 'send_input';
		player_id: number;
		game_id: number;
		payload: {
		}
	};



//placeholder
enum Effects {
	FIRE = 0,
}

class vec2 {
	public x: number;
	public y: number;

	constructor(x?: number, y?: number) {
		this.x = x || 0;
		this.y = y || 0;
	}

	public serialize(): ArrayBuffer {
		const ret: ArrayBuffer = new ArrayBuffer(8);
		const view: Float32Array = new Float32Array(ret);
		view[0] = this.x;
		view[1] = this.y;
		return ret;
	}

	public deserialize(array: ArrayBuffer) {
		const view: Float32Array = new Float32Array(array);
		this.x = view[0];
		this.y = view[1];
	}

	static deserialize(array: ArrayBuffer, offset: number = 0): { vec: vec2, offset: number } {
		const view = new DataView(array);
		const x = view.getFloat32(offset, true);
		const y = view.getFloat32(offset + 4, true);
		return { vec: new vec2(x, y), offset: offset + 8 };
	}
}

class Client {
	public id: number;
	public socket?: WebSocket;
	public effects: Effects[];
	public pos: vec2;
	public direct: vec2;

	constructor(pos?: vec2, id?: number, socket?: WebSocket, direct?: vec2) {
		this.id = id || 0;
		this.socket = socket;
		this.effects = [];
		this.pos = pos || new vec2();
		this.direct = direct || new vec2();
	}

	// serializes the id, effects, pos, direct
	public serialize(): ArrayBuffer {
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(4 + 1 + effectsCount + 8 + 8); // id, effects, pos, direct
		const view = new DataView(buffer);
		let offset = 0;
		view.setUint32(offset, this.id, true);
		offset += 4;
		view.setUint8(offset, effectsCount);
		offset += 1;
		for (let i = 0; i < effectsCount; i++) {
			view.setUint8(offset++, this.effects[i]);
		}
		// pos
		let posArr = new Float32Array(buffer, offset, 2);
		posArr[0] = this.pos.x;
		posArr[1] = this.pos.y;
		offset += 8;
		// direct
		let dirArr = new Float32Array(buffer, offset, 2);
		dirArr[0] = this.direct.x;
		dirArr[1] = this.direct.y;
		return buffer;
	}

	public static deserialize(array: ArrayBuffer, offset: number = 0): { client: Client, offset: number } {
		const view = new DataView(array);
		let id = view.getUint32(offset, true);
		offset += 4;
		const effectsCount = view.getUint8(offset++); 
		let effects: Effects[] = [];
		for (let i = 0; i < effectsCount; i++) {
			effects.push(view.getUint8(offset++));
		}
		// pos
		const { vec: pos, offset: off2 } = vec2.deserialize(array, offset);
		offset = off2;
		// direct
		const { vec: direct, offset: off3 } = vec2.deserialize(array, offset);
		offset = off3;
		const client = new Client(pos, id, undefined, direct);
		client.effects = effects;
		return { client, offset };
	}
}

class Ball {
	public pos: vec2;
	public speed?: vec2; // not serialized
	public acceleration?: vec2; // not serialized
	public effects: Effects[];
	public lifetime: number;
	constructor() {
		this.pos = new vec2();
		this.speed = new vec2();
		this.effects = [];
		this.lifetime = 0;
	}

	// serializes the pos, effects, lifetime
	public serialize(): ArrayBuffer {
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(8 + 1 + effectsCount + 4);
		const view = new DataView(buffer);
		let offset = 0;
		// pos
		let arr = new Float32Array(buffer, offset, 2);
		arr[0] = this.pos.x;
		arr[1] = this.pos.y;
		offset += 8;
		// effects
		view.setUint8(offset, effectsCount);
		offset += 1;
		for (let i = 0; i < effectsCount; i++) {
			view.setUint8(offset++, this.effects[i]);
		}
		// lifetime
		view.setFloat32(offset, this.lifetime, true);
		return buffer;
	}

	static deserialize(array: ArrayBuffer, offset: number = 0): { ball: Ball, offset: number } {
		const { vec: pos, offset: off2 } = vec2.deserialize(array, offset);
		offset = off2;
		const view = new DataView(array);
		const effectsCount = view.getUint8(offset++);
		let effects: Effects[] = [];
		for (let i = 0; i < effectsCount; i++) {
			effects.push(view.getUint8(offset++));
		}
		const lifetime = view.getFloat32(offset, true);
		offset += 4;
		let ball = new Ball();
		ball.pos = pos;
		ball.effects = effects;
		ball.lifetime = lifetime;
		return { ball, offset };
	}
}

class Wall {
	public center: vec2;
	public normal: vec2;
	public length: number;
	public effects: Effects[];

	constructor(center: vec2, normal: vec2, length: number, effects?: Effects[]) {
		this.center = center;
		this.normal = normal;
		this.length = length;
		this.effects = effects || [];
	}

	// Serialization: center(8), normal(8), length(4), effects(1+N)
	public serialize(): ArrayBuffer {
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(8 + 8 + 4 + 1 + effectsCount);
		const view = new DataView(buffer);
		let offset = 0;
		// center
		let arr = new Float32Array(buffer, offset, 2);
		arr[0] = this.center.x;
		arr[1] = this.center.y;
		offset += 8;
		// normal
		arr = new Float32Array(buffer, offset, 2);
		arr[0] = this.normal.x;
		arr[1] = this.normal.y;
		offset += 8;
		// length
		view.setFloat32(offset, this.length, true);
		offset += 4;
		// effects
		view.setUint8(offset, effectsCount);
		offset += 1;
		for (let i = 0; i < effectsCount; i++) {
			view.setUint8(offset++, this.effects[i]);
		}
		return buffer;
	}

	static deserialize(array: ArrayBuffer, offset: number = 0): { wall: Wall, offset: number } {
		const { vec: center, offset: o2 } = vec2.deserialize(array, offset);
		offset = o2;
		const { vec: normal, offset: o3 } = vec2.deserialize(array, offset);
		offset = o3;
		const view = new DataView(array);
		const length = view.getFloat32(offset, true);
		offset += 4;
		const effectsCount = view.getUint8(offset++); 
		let effects: Effects[] = [];
		for (let i = 0; i < effectsCount; i++) {
			effects.push(view.getUint8(offset++));
		}
		const wall = new Wall(center, normal, length, effects);
		return { wall, offset };
	}
}

// serializable game state
class GameState {
	public clients: Client[];
	public balls: Ball[];
	public walls: Wall[];

	constructor(game: Game) {
		this.clients = game.clients.map(c => {
			const cc = new Client(
				new vec2(c.pos.x, c.pos.y),
				c.id,
				undefined,
				new vec2(c.direct.x, c.direct.y)
			);
			cc.effects = [...c.effects];
			return cc;
		});
		this.balls = game.balls.map(b => {
			const bb = new Ball();
			bb.pos = new vec2(b.pos.x, b.pos.y);
			bb.effects = [...b.effects];
			bb.lifetime = b.lifetime;
			return bb;
		});
		this.walls = (game.walls ?? []).map(w => {
			return new Wall(
				new vec2(w.center.x, w.center.y),
				new vec2(w.normal.x, w.normal.y),
				w.length,
				[...(w.effects || [])]
			);
		});
	}

	public serialize(): ArrayBuffer {
		const clientBuffers = this.clients.map(c => c.serialize());
		const ballBuffers = this.balls.map(b => b.serialize());
		const wallBuffers = this.walls.map(w => w.serialize());
		const clientCount = clientBuffers.length;
		const ballCount = ballBuffers.length;
		const wallCount = wallBuffers.length;
		let totalSize =
			4 + clientBuffers.reduce((s, b) => s + b.byteLength, 0) +
			4 + ballBuffers.reduce((s, b) => s + b.byteLength, 0) +
			4 + wallBuffers.reduce((s, b) => s + b.byteLength, 0);
		const buffer = new ArrayBuffer(totalSize);
		const view = new DataView(buffer);
		let offset = 0;
		// Clients
		view.setUint32(offset, clientCount, true);
		offset += 4;
		clientBuffers.forEach(b => {
			new Uint8Array(buffer, offset, b.byteLength).set(new Uint8Array(b));
			offset += b.byteLength;
		});
		// Balls
		view.setUint32(offset, ballCount, true);
		offset += 4;
		ballBuffers.forEach(b => {
			new Uint8Array(buffer, offset, b.byteLength).set(new Uint8Array(b));
			offset += b.byteLength;
		});
		// Walls
		view.setUint32(offset, wallCount, true);
		offset += 4;
		wallBuffers.forEach(b => {
			new Uint8Array(buffer, offset, b.byteLength).set(new Uint8Array(b));
			offset += b.byteLength;
		});
		return buffer;
	}

	public static deserialize(array: ArrayBuffer): GameState {
		const view = new DataView(array);
		let offset = 0;
		const clients: Client[] = [];
		const balls: Ball[] = [];
		const walls: Wall[] = [];
		// Clients
		const clientCount = view.getUint32(offset, true);
		offset += 4;
		for (let i = 0; i < clientCount; i++) {
			let { client, offset: newOffset } = Client.deserialize(array, offset);
			clients.push(client);
			offset = newOffset;
		}
		// Balls
		const ballCount = view.getUint32(offset, true);
		offset += 4;
		for (let i = 0; i < ballCount; i++) {
			let { ball, offset: newOffset } = Ball.deserialize(array, offset);
			balls.push(ball);
			offset = newOffset;
		}
		// Walls
		const wallCount = view.getUint32(offset, true);
		offset += 4;
		for (let i = 0; i < wallCount; i++) {
			let { wall, offset: newOffset } = Wall.deserialize(array, offset);
			walls.push(wall);
			offset = newOffset;
		}
		const state = Object.create(GameState.prototype) as GameState;
		state.clients = clients;
		state.balls = balls;
		state.walls = walls;
		return state;
	}
}
