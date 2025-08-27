import { SharedVec2 } from './objects/SharedVec2.js'
import { SharedBall } from './objects/SharedBall.js'
import { SharedWall } from './objects/SharedWall.js'
import { SharedClient } from './objects/SharedClient.js'

//placeholder
export enum Effects {
	PADDLE = 0,
	BASE = 1,
	FIRE = 2,
	RESETING = 3,
};

// serializable game state
export class GameState {
	public clients: SharedClient[];
	public balls: SharedBall[];
	public walls: SharedWall[];
	public game_timer: number;

	constructor(game: any) {
		this.clients = game.clients!;
		this.balls = game.balls!;
		this.walls = game.walls!;
		if (game.timer != undefined) {
			this.game_timer = game.timer;
		} else {
			this.game_timer = -1;
		}
	}

	public serialize(): ArrayBuffer {
		const clientBuffers: ArrayBuffer[] = [];
		let clientCount = 0;
		for (const client of this.clients) {
			const buf: ArrayBuffer | undefined = client.serialize();
			if (!buf) {
				continue ;
			}
			clientBuffers.push(buf);
			clientCount++;
		}

		const ballBuffers: ArrayBuffer[] = [];
		let ballCount = 0;
		for (const ball of this.balls) {
			const buf: ArrayBuffer | undefined = ball.serialize();
			if (!buf) {
				continue;
			}
			ballBuffers.push(buf);
			ballCount++;
		}

		const wallBuffers: ArrayBuffer[] = [];
		let wallCount = 0;
		for (const wall of this.walls) {
			const buf: ArrayBuffer | undefined = wall.serialize();
			if (!buf) {
				continue;
			}
			wallBuffers.push(buf);
			wallCount++;
		}
		let totalSize =
			4 + clientBuffers.reduce((s, b) => s + b.byteLength, 0) +
			4 + ballBuffers.reduce((s, b) => s + b.byteLength, 0) +
			4 + wallBuffers.reduce((s, b) => s + b.byteLength, 0)
			+ 4 /*game_timer */
		;
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
		view.setInt32(offset, this.game_timer, true);
		offset += 4;
		return buffer;
	}

	public static deserialize(array: ArrayBuffer): GameState {
		const view = new DataView(array);
		let offset = 0;
		const clients: SharedClient[] = [];
		const balls: SharedBall[] = [];
		const walls: SharedWall[] = [];
		// Clients
		const clientCount = view.getUint32(offset, true);
		offset += 4;
		for (let i = 0; i < clientCount; i++) {
			let { client, offset: newOffset } = SharedClient.deserialize(array, offset);
			clients.push(client);
			offset = newOffset;
		}
		// Balls
		const ballCount = view.getUint32(offset, true);
		offset += 4;
		for (let i = 0; i < ballCount; i++) {
			let { ball, offset: newOffset } = SharedBall.deserialize(array, offset);
			balls.push(ball);
			offset = newOffset;
		}
		// Walls
		const wallCount = view.getUint32(offset, true);
		offset += 4;
		for (let i = 0; i < wallCount; i++) {
			let { wall, offset: newOffset } = SharedWall.deserialize(array, offset);
			walls.push(wall);
			offset = newOffset;
		}
		const game_timer = view.getInt32(offset, true);
		offset += 4;

		const state = Object.create(GameState.prototype) as GameState;
		state.clients = clients;
		state.balls = balls;
		state.walls = walls;
		state.game_timer = game_timer;
		return state;
	}
};
