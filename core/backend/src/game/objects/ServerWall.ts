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
};
