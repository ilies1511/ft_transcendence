import { Effects } from '../../../game_shared/serialization.ts';
import { ServerBall } from '../../../objects/ServerBall.ts';
import { ServerClient } from '../../../objects/ServerClient.ts';
import { ServerVec2 } from '../../../objects/ServerVec2.ts';
import { ServerWall } from '../../../objects/ServerWall.ts';

import default_map from './default.json' with { type: "json" };
import default_10m_100p from './default_10m_100p.json' with { type: "json" };
import default_3m_30p from './default_3m_30p.json' with { type: "json" };

import BigPlus2 from './BigPlus2.json' with { type: "json" };
import BigPlus2_10m_100p from './BigPlus2_10m_100p.json' with { type: "json" };
import BigPlus2_3m_30p from './BigPlus2_3m_30p.json' with { type: "json" };
import BigPlus4 from './BigPlus4.json' with { type: "json" };
import BigPlus4_10m_100p from './BigPlus4_10m_100p.json' with { type: "json" };
import BigPlus4_3m_30p from './BigPlus4_3m_30p.json' with { type: "json" };

import Diamond2 from './Diamond2.json' with { type: "json" };
import Diamond2_10m_100p from './Diamond2_10m_100p.json' with { type: "json" };
import Diamond2_3m_30p from './Diamond2_3m_30p.json' with { type: "json" };

import OctaPong2 from './OctaPong2.json' with { type: "json" };
import OctaPong2_10m_100p from './OctaPong2_10m_100p.json' with { type: "json" };
import OctaPong2_3m_30p from './OctaPong2_3m_30p.json' with { type: "json" };
import OctaPong4 from './OctaPong4.json' with { type: "json" };
import OctaPong4_10m_100p from './OctaPong4_10m_100p.json' with { type: "json" };
import OctaPong4_3m_30p from './OctaPong4_3m_30p.json' with { type: "json" };

import SimpleSquare2 from './SimpleSquare2.json' with { type: "json" };
import SimpleSquare2_10m_100p from './SimpleSquare2_10m_100p.json' with { type: "json" };
import SimpleSquare2_3m_30p from './SimpleSquare2_3m_30p.json' with { type: "json" };
import SimpleSquare4 from './SimpleSquare4.json' with { type: "json" };
import SimpleSquare4_10m_100p from './SimpleSquare4_10m_100p.json' with { type: "json" };
import SimpleSquare4_3m_30p from './SimpleSquare4_3m_30p.json' with { type: "json" };

export class MapFile {
	public walls: ServerWall[] = [];
	public balls: ServerBall[] = [];
	public clients: ServerClient[] = [];
	public next_obj_id: number = 1;
	public max_time: number; //seconds

	constructor(map_name: string = 'default_3m_30p') {
		let map_data: any;
		if (map_name == "default") {
			map_data = default_map;
		} else if (map_name == "default_3m_30p") {
			map_data = default_3m_30p;
		} else if (map_name == "default_10m_100p") {
			map_data = default_10m_100p;

		} else if (map_name == "BigPlus2") {
			map_data = BigPlus2;
		} else if (map_name == "BigPlus2_3m_30p") {
			map_data = BigPlus2_3m_30p;
		} else if (map_name == "BigPlus2_10m_100p") {
			map_data = BigPlus2_10m_100p;

		} else if (map_name == "BigPlus4") {
			map_data = BigPlus4;
		} else if (map_name == "BigPlus4_3m_30p") {
			map_data = BigPlus4_3m_30p;
		} else if (map_name == "BigPlus4_10m_100p") {
			map_data = BigPlus4_10m_100p;

		} else if (map_name == "Diamond2") {
			map_data = Diamond2;
		} else if (map_name == "Diamond2_3m_30p") {
			map_data = Diamond2_3m_30p;
		} else if (map_name == "Diamond2_10m_100p") {
			map_data = Diamond2_10m_100p;

		} else if (map_name == "OctaPong2") {
			map_data = OctaPong2;
		} else if (map_name == "OctaPong2_3m_30p") {
			map_data = OctaPong2_3m_30p;
		} else if (map_name == "OctaPong2_10m_100p") {
			map_data = OctaPong2_10m_100p;

		} else if (map_name == "OctaPong4") {
			map_data = OctaPong4;
		} else if (map_name == "OctaPong4_3m_30p") {
			map_data = OctaPong4_3m_30p;
		} else if (map_name == "OctaPong4_10m_100p") {
			map_data = OctaPong4_10m_100p;

		} else if (map_name == "SimpleSquare2") {
			map_data = SimpleSquare2;
		} else if (map_name == "SimpleSquare2_3m_30p") {
			map_data = SimpleSquare2_3m_30p;
		} else if (map_name == "SimpleSquare2_10m_100p") {
			map_data = SimpleSquare2_10m_100p;

		} else if (map_name == "SimpleSquare4") {
			map_data = SimpleSquare4;
		} else if (map_name == "SimpleSquare4_3m_30p") {
			map_data = SimpleSquare4_3m_30p;
		} else if (map_name == "SimpleSquare4_10m_100p") {
			map_data = SimpleSquare4_10m_100p;

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
			wall.rotation = w.rotation;
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
			ball.effects.push(Effects.RESETING);
			ball.pos = pos;
			ball.init_pos = ball.clone();
			this.balls.push(ball);
		});
	}
};

