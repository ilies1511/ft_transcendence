import { ServerVec2 } from '../../../objects/ServerVec2.ts';
import { ServerWall } from '../../../objects/ServerWall.ts';
import { ServerBall } from '../../../objects/ServerBall.ts';
import { ServerClient } from '../../../objects/ServerClient.ts';
import { Effects } from '../../../game_shared/serialization.ts';
import type { ServerError } from '../../../game_shared/message_types.ts';

import default_map from './default.json';

export class MapFile {
	public walls: ServerWall[] = [];
	public balls: ServerBall[] = [];
	public clients: ServerClient[] = [];
	public next_obj_id: number = 1;
	public max_time: number; //seconds


	constructor(map_name: string = 'default') {
		let map_data: any;
		if (map_name == "default") {
			map_data = default_map;
		} else {
			throw ('Invalid Map');
		}
		this.max_time = map_data.max_time;
		//console.log(map_data);
		const paddle_len: number = map_data.paddle_length;
		const base_len: number = map_data.base_length;

		Object.values(map_data.players).forEach((c: any) => {
			const center: ServerVec2 = new ServerVec2(c.center[0], c.center[1]);
			const normal: ServerVec2 = new ServerVec2(c.normal[0], c.normal[1]);
			normal.unit();
			const paddle_effects: Effects[] = [];
			const base_effects: Effects[] = [];
			const paddle = new ServerWall(
				center, normal, paddle_len, paddle_effects, this.next_obj_id++, false);
			const base_center: ServerVec2 = normal.clone().scale(-0.1).add(center);
			const base = new ServerWall(
				base_center, normal.clone(), base_len, base_effects, this.next_obj_id++, false);
			const id: number = this.next_obj_id++;
			const client: ServerClient = new ServerClient(paddle, base, id, id);
			client.score = map_data.health;
			this.clients.push(client);
		});

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
			ball.init_pos = ball.clone();
			this.balls.push(ball);
		});
	}
};

