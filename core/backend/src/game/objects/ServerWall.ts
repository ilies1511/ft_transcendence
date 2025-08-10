import { SharedWall } from '../game_shared/objects/SharedWall.ts'
import { ServerVec2 } from './ServerVec2.ts';
import { Effects } from '../game_shared/serialization.ts';

export class ServerWall extends SharedWall {
	public angular_vel: number;

	public next_normal: ServerVec2 | undefined = undefined;
	public interp_normal: ServerVec2 | undefined = undefined;
	public rotation: number = 0;

	constructor(
		center: ServerVec2,
		normal: ServerVec2,
		length: number,
		effects?: Effects[],
		obj_id?: number,
		dispose?: boolean
	) {
		super(center, normal, length, effects, obj_id, dispose);
		this.angular_vel = 0;
	}

	public rotate(angle: number, delta_time: number) {
		if (angle == 0) {
			this.angular_vel = 0;
			return ;
		}
		const theta = angle * delta_time;

		// grab the old normal
		const n = this.normal;

		// compute the rotated components
		const cos = Math.cos(theta);
		const sin = Math.sin(theta);
		const newX = n.x * cos - n.y * sin;
		const newY = n.x * sin + n.y * cos;

		this.next_normal = new ServerVec2(newX, newY);
		this.next_normal.unit();
		//this.normal = next_normal;
		//this.normal.x = newX;
		//this.normal.y = newY;

		//this.normal.unit();
		//this.update();
		this.angular_vel = angle;
	}
};
