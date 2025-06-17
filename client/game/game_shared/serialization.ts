import * as ft_math from './math.ts';

const EPSILON: number = 1e-6;

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

	static eq(a: vec2, b:vec2): boolean {
		if (Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y)) {
			return (true);
		}
		return (false);
	}

	public len(): number {
		const len: number = Math.sqrt(this.x * this.x + this.y * this.y);
		return (len);
	}

	public clone(): vec2 {
		return new vec2(this.x, this.y);
	}

	public unit() {
		const len: number = Math.sqrt(this.x * this.x + this.y * this.y);
		this.x /= len;
		this.y /= len;
	}

	public add(a: vec2) {
		this.x += a.x;
		this.y += a.y;
	}

	public sub(a: vec2) {
		this.x -= a.x;
		this.y -= a.y;
	}

	public scale(a: number) {
		this.x *= a;
		this.y *= a;
	}

	public div(a: number) {
		this.x /= a;
		this.y /= a;
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
	public obj_id: number;
	public game_player_id: number = undefined;
	public socket?: WebSocket;
	public effects: Effects[];
	public pos: vec2;
	public direct: vec2;

	constructor(pos?: vec2, id?: number, socket?: WebSocket, direct?: vec2, obj_id?: number) {
		this.id = id || 0;
		this.socket = socket;
		this.effects = [];
		this.pos = pos || new vec2();
		this.direct = direct || new vec2();
		this.obj_id = obj_id !== undefined ? obj_id : -1;
	}

	// serializes the obj_id, id, effects, pos, direct
	public serialize(): ArrayBuffer {
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(
			2 // obj_id
			+ 4 // id
			+ 1 + effectsCount //effects
			+ 8 // pos
			+ 8 // direct
		);
		const view = new DataView(buffer);
		let offset = 0;
		//obj_id
		view.setUint16(offset, this.obj_id, true);
		offset += 2;
		// id
		view.setUint32(offset, this.id, true);
		offset += 4;
		//effects
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
		//obj_id
		const obj_id = view.getUint16(offset, true);
		offset += 2;
		//id
		const id = view.getUint32(offset, true);
		offset += 4;
		//effects
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
		client.obj_id = obj_id;
		return { client, offset };
	}
}

//todo: add radius to serialization
export class Ball {
	public pos: vec2;
	public obj_id: number;
	public speed: vec2; // not serialized
	public acceleration?: vec2; // not serialized
	public effects: Effects[];
	public lifetime: number;
	public dispose: boolean;
	public radius: number = 1;
	public last_collision_obj_id: number[] = [];
	public cur_collision_obj_id: number[] = [];


	constructor(obj_id?: number, dispose?: boolean) {
		this.pos = new vec2();
		this.speed = new vec2();
		this.effects = [];
		this.lifetime = 0;
		this.obj_id = obj_id !== undefined ? obj_id : -1;
		this.dispose = dispose || false;
	}

	public reflect(walls: Wall[]) {
		//console.log("reflecting ball.. ", i++);
		//console.log("initial ball speed: ", ball.speed);
		//console.log("walls hit: ", wall.length);
		//console.log("ball pos: ", ball.pos);
		for (let wall of walls) {
			const normal = wall.normal.clone();
			//console.log("wall normal: ", normal);
	
			const dot_p: number = ft_math.dot(this.speed, normal);
			const n = normal.clone();
			n.scale(2 * dot_p);
			this.speed.sub(n);
			//console.log("intermediate ball speed: ", ball.speed);
		}
		//console.log("ball speed after: ", ball.speed);
		//console.log("****************");
	}

	public intersec(wall: Wall, delta_time: number):
		ft_math.intersection_point | undefined
	{
		if (this.last_collision_obj_id.includes(wall.obj_id)) {
			return undefined;
		}
		const dist_rate: number = ft_math.dot(this.speed, wall.normal);
		//console.log("dist_rate:", dist_rate);
		if (Math.abs(dist_rate) < EPSILON) {
			return (undefined);
		}
		/* this can be used for walls that have no hitbox on one side */
		//if (dist_rate >= 0) { 
		//	return undefined;
		//}
	
		const center_diff = new vec2(this.pos.x - wall.center.x, this.pos.y - wall.center.y);
		const signed_dist: number = ft_math.dot(center_diff, wall.normal);
	
		let impact_time: number;
		if (signed_dist != 0) {
			impact_time = (signed_dist) / (-dist_rate);
		} else {
			impact_time = 0;
		}
		if (impact_time < 0) {
			return (undefined);
		}
		if (impact_time < EPSILON) {
			impact_time = EPSILON;
		}
		if (impact_time > delta_time - EPSILON) {
			return (undefined);
		}
	
		const ball_movement: vec2 = new vec2(this.speed.x, this.speed.y);
		ball_movement.scale(impact_time);
		const ball_impact_pos: vec2 = new vec2(this.pos.x, this.pos.y);
		ball_impact_pos.add(ball_movement);
	
		const vec_from_wall_center = new vec2(wall.center.x, wall.center.y);
		vec_from_wall_center.sub(ball_impact_pos);
		const dist_from_center = Math.abs(ft_math.dot(vec_from_wall_center, wall.get_direct()));
		if (dist_from_center <= (wall.length / 2) + EPSILON) {
			return {p: ball_impact_pos, time: impact_time, wall};
		}
		return (undefined);
	}

	// serializes the pos, effects, lifetime, dispose
	public serialize(): ArrayBuffer {
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(
			2 // obj_id
			+ 8 //pos
			+ 1 // dispose
			+ 1 + effectsCount //effects
			+ 4 // lifetime
		);
		const view = new DataView(buffer);
		let offset = 0;
		//obj_id
		view.setUint16(offset, this.obj_id, true);
		offset += 2;
		// pos
		view.setFloat32(offset, this.pos.x, true);
		offset += 4;
		view.setFloat32(offset, this.pos.y, true);
		offset += 4;
		// dispose
		view.setUint8(offset, this.dispose ? 1 : 0);
		offset += 1;
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
		const view = new DataView(array);
		//obj_id
		const obj_id = view.getUint16(offset, true);
		offset += 2;
		//pos
		const { vec: pos, offset: off2 } = vec2.deserialize(array, offset);
		offset = off2;
		// dispose
		const dispose = view.getUint8(offset++) !== 0;
		//effects
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
		ball.obj_id = obj_id;
		ball.dispose = dispose;
		return { ball, offset };
	}
}

export class Wall {
	public center: vec2;
	public normal: vec2;
	public length: number;
	public effects: Effects[];
	public obj_id: number;
	public dispose: boolean;

	private _direct: vec2 = new vec2();
	private _endpoint1: vec2 = new vec2();
	private _endpoint2: vec2 = new vec2();


	constructor(center: vec2,
		normal: vec2,
		length: number,
		effects?: Effects[],
		obj_id?: number,
		dispose?: boolean)
	{
		this.center = center;
		this.normal = normal;
		this.normal.unit();
		this.length = length;
		this.effects = effects || [];
		this.obj_id = obj_id !== undefined ? obj_id : -1;
		this.dispose = dispose || false;
		this.update();
	}

	private _set_direct() {
		this._direct = new vec2(this.normal.y * -1, this.normal.x);
	}

	private _set_endpoints() {
		this._endpoint1 = new vec2(this.center.x, this.center.y);
		this._endpoint2 = new vec2(this.center.x, this.center.y);
		const offset: vec2 = new vec2(this._direct.x, this._direct.y);
		offset.scale(this.length / 2);
		this._endpoint1.add(offset);
		offset.scale(this.length * - 1);
		this._endpoint2.add(offset);
	}

	private _unit() {
		this.normal.unit();
	}

	//todo: make it possible to adjust normal, center + len; for now idc
	public update() {
		this._unit();
		this._set_direct();
		this._set_endpoints();
	}

	public get_endpoints(): {p1: vec2, p2: vec2} {
		return {
			p1: new vec2(this._endpoint1.x, this._endpoint1.y), 
			p2: new vec2(this._endpoint2.x, this._endpoint2.y)
		};
	}

	public get_direct(): vec2 {
		return new vec2(this._direct.x, this._direct.y);
	}

	// Serialization: center(8), normal(8), length(4), dispose(1), effects(1+N)
	public serialize(): ArrayBuffer {
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(
			2 // obj_id
			+ 8 // center
			+ 8 // normal
			+ 4 // length
			+ 1 // dispose
			+ 1 + effectsCount //effects
		);
		const view = new DataView(buffer);
		let offset = 0;
		//obj_id
		view.setUint16(offset, this.obj_id, true);
		offset += 2;
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
		// dispose
		view.setUint8(offset, this.dispose ? 1 : 0);
		offset += 1;
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
		const view = new DataView(array);
		const obj_id = view.getUint16(offset, true);
		offset += 2;

		const { vec: center, offset: o2 } = vec2.deserialize(array, offset);
		offset = o2;
		const { vec: normal, offset: o3 } = vec2.deserialize(array, offset);
		offset = o3;
		const length = view.getFloat32(offset, true);
		offset += 4;
		const dispose = view.getUint8(offset++) !== 0;
		const effectsCount = view.getUint8(offset++);
		let effects: Effects[] = [];
		for (let i = 0; i < effectsCount; i++) {
			effects.push(view.getUint8(offset++));
		}
		const wall = new Wall(center, normal, length, effects, obj_id, dispose);
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
