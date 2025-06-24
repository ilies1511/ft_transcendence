import { SharedWall } from '../game_shared/objects/SharedWall.ts'
import { ServerVec2 } from './ServerVec2.ts';
import { Effects } from '../game_shared/serialization.ts';

export class ServerWall extends SharedWall {
	public angular_vel: number;

	constructor(
		center: ServerVec2,
		normal: ServerVec2,
		length: number,
		effects?: Effects[],
		obj_id?: number,
		dispose?: boolean)
	{
		super(center, normal, length, effects, obj_id, dispose);
		this.angular_vel = 0;
	}

	public rotate(angle: number, delta_time: number) {
		const theta = angle * delta_time;

		// grab the old normal
		const n = this.normal;

		// compute the rotated components
		const cos = Math.cos(theta);
		const sin = Math.sin(theta);
		const newX = n.x * cos - n.y * sin;
		const newY = n.x * sin + n.y * cos;

		this.normal.x = newX;
		this.normal.y = newY;
		this.normal.unit();
		this.update();
		this.angular_vel = angle;
	}
};
