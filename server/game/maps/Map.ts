import { ServerVec2 } from '../objects/ServerVec2.ts';
import { ServerWall } from '../objects/ServerWall.ts';
import { ServerBall } from '../objects/ServerBall.ts';
import { ServerClient } from '../objects/ServerClient.ts';
import { Effects } from 'game_shared/serialization.ts';

import default_map from './default.json';

/**
 * Simple helper interfaces mirroring the JSON schema so that
 * we get strong property‑access typing while parsing.
 */
interface PlayerJson {
	center: [number, number];
	normal: [number, number];
}

interface WallJson {
	center: [number, number];
	normal: [number, number];
	length: number;
	effects?: number[];
}

interface BallJson {
	point: [number, number];
	speed: [number, number];
	effects?: number[];
}
		const parse_map = (map_name?: string) => {
;
		}

export class Map {
	public walls: ServerWall[] = [];
	public balls: ServerBall[] = [];
	public clients: ServerClient[] = [];
	public next_obj_id: number = 1;

	constructor(map_name: string = 'default') {
		let map_data: any;
		if (map_name == "default") {
			map_data = default_map;
		} else {
			throw new Error("Unknown map name");
		}
		console.log(map_data);
		Object.values(map_data.walls).forEach((w: any) => {
			const cent: ServerVec2 = new ServerVec2(w.center[0], w.center[1]);
			const nor: ServerVec2 = new ServerVec2(w.normal[0], w.normal[1]);
			const len: number = w.length;
			const wall: ServerWall = new ServerWall(cent, nor, len, undefined, this.next_obj_id++);
			wall.effects = w.effects;
			this.walls.push(wall);
		});
		Object.values(map_data.balls).forEach((b: any) => {
			const pos: ServerVec2 = new ServerVec2(b.point[0], b.point[1]);
			const speed: ServerVec2 = new ServerVec2(b.speed[0], b.speed[1]);
			const effects: Effects[] = b.effects;
			const ball: ServerBall = new ServerBall(this.next_obj_id++, false);
			ball.speed = speed;
			ball.effects = effects;
			ball.pos = pos;
			this.balls.push(ball);
		});
	}
};

