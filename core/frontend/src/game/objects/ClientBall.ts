import { ClientVec2 } from './ClientVec2.ts'
// import { SharedBall } from '../game_shared/objects/SharedBall.ts';
import { SharedBall } from '../../../../game_shared/objects/SharedBall.ts';

export class ClientBall extends SharedBall {
	constructor(obj_id?: number, dispose?: boolean) {
		super(obj_id, dispose);
	}
};
