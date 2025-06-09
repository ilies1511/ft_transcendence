
//placeholder
export enum Effects {
	FIRE = 0,
}

export class vec2 {
	public x: number;
	public y: number;

	constructor(x?: number, y?: number) {
		this.x = x || 0;
		this.y = y || 0;
	}

	public serialize(): ArrayBuffer {
		const ret: ArrayBuffer = new ArrayBuffer(8);
		const view: DataView = new DataView(ret);
		view.setFloat32(0, this.x, true);
		view.setFloat32(4, this.y, true);
		return ret;
	}

	static deserialize(array: ArrayBuffer, offset: number = 0):
		{ vec: vec2, offset: number }
	{
		const view = new DataView(array);
		const x = view.getFloat32(offset, true);
		const y = view.getFloat32(offset + 4, true);
		return { vec: new vec2(x, y), offset: offset + 8 };
	}
}

export class Client {
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
		view.setFloat32(offset, this.pos.x, true);
		offset += 4;
		view.setFloat32(offset, this.pos.y, true);
		offset += 4;
		// direct
		view.setFloat32(offset, this.direct.x, true);
		offset += 4;
		view.setFloat32(offset, this.direct.y, true);
		offset += 4;
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

export class Ball {
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
		view.setFloat32(offset, this.pos.x, true);
		offset += 4;
		view.setFloat32(offset, this.pos.y, true);
		offset += 4;
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

	static deserialize(array: ArrayBuffer, offset: number = 0):
		{ ball: Ball, offset: number }
	{
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

export class Wall {
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
		view.setFloat32(offset, this.center.x, true);
		offset += 4;
		view.setFloat32(offset, this.center.y, true);
		offset += 4;
		// normal
		view.setFloat32(offset, this.normal.x, true);
		offset += 4;
		view.setFloat32(offset, this.normal.y, true);
		offset += 4;
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

	static deserialize(array: ArrayBuffer, offset: number = 0):
		{ wall: Wall, offset: number }
	{
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
export class GameState {
	public clients: Client[];
	public balls: Ball[];
	public walls: Wall[];

	constructor(game: Game) {
		this.clients = game.clients;
		this.balls = game.balls;
		this.walls = game.walls;
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

