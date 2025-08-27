import { Effects } from '../../../game_shared/serialization.js';
import { ServerBall } from '../../../objects/ServerBall.js';
import { ServerClient } from '../../../objects/ServerClient.js';
import { ServerVec2 } from '../../../objects/ServerVec2.js';
import { ServerWall } from '../../../objects/ServerWall.js';

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

const mapImports: Record<string, any> = {
	default_map,
	default_3m_30p,
	default_10m_100p,
	BigPlus2,
	BigPlus2_10m_100p,
	BigPlus2_3m_30p,
	BigPlus4,
	BigPlus4_10m_100p,
	BigPlus4_3m_30p,
	Diamond2,
	Diamond2_10m_100p,
	Diamond2_3m_30p,
	OctaPong2,
	OctaPong2_10m_100p,
	OctaPong2_3m_30p,
	OctaPong4,
	OctaPong4_10m_100p,
	OctaPong4_3m_30p,
	SimpleSquare2,
	SimpleSquare2_10m_100p,
	SimpleSquare2_3m_30p,
	SimpleSquare4,
	SimpleSquare4_10m_100p,
	SimpleSquare4_3m_30p,
};

export class MapFile {
	public walls: ServerWall[] = [];
	public balls: ServerBall[] = [];
	public clients: ServerClient[] = [];
	public next_obj_id: number = 1;
	public max_time: number; //seconds

	constructor(map_name: string = 'default_3m_30p') {
		console.log(map_name);
		let map_data: any;
		// The frontend will send names like "default_2_3m_30p"
		// We need to convert it to the format the backend understands
		let internal_map_name = map_name;
		const parts = map_name.split('_');

		// Reconstruct name: e.g., BigPlus_4_3m_30p -> BigPlus4_3m_30p
		if (parts.length > 1 && (parts[1] === '2' || parts[1] === '4')) {
			const base = parts[0];
			const players = parts[1];
			const variant = parts.slice(2).join('_');
			if (base === 'default') {
				internal_map_name = variant ? `default_${variant}` : 'default';
			} else {
				internal_map_name = `${base}${players}${variant ? `_${variant}` : ''}`;
			}
		}

		// Normalize 'default' to 'default_map' for the import object key
		if (internal_map_name === 'default') {
			internal_map_name = 'default_map';
		}

		map_data = mapImports[internal_map_name];

		if (!map_data) {
			console.error(`Map not found for: ${map_name} (resolved to ${internal_map_name})`);
			// Fallback to a default map to prevent crash
			map_data = default_3m_30p;
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

