import { SharedWall } from '../game_shared/objects/SharedWall.ts'
import { ClientVec2 } from './ClientVec2.ts';
import { Effects } from '../game_shared/serialization.ts';

export class ClientWall extends SharedWall {
	constructor(center: ClientVec2,
		normal: ClientVec2,
		length: number,
		effects?: Effects[],
		obj_id?: number,
		dispose?: boolean)
	{
		super(center, normal, length, effects, obj_id, dispose);
	}

	public update() {
		return ;
	}
};
