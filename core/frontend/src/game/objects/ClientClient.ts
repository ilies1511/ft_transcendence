import { ClientVec2 } from './ClientVec2.ts'
// import { SharedClient } from '../game_shared/objects/SharedClient.ts';
import { SharedClient } from '../../../../game_shared/objects/SharedClient.ts';
import { ClientWall } from './ClientWall.ts';

export class ClientClient extends SharedClient {
	declare public paddle: ClientWall;
	declare public base: ClientWall;

	constructor(
		paddle: ClientWall,
		base: ClientWall,
		id?: number,
		obj_id?: number
	) {
		super(paddle, base, id, obj_id);
		this.paddle = paddle;
		this.base = base;
	}
};
