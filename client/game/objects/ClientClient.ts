import { ClientVec2 } from './ClientVec2.ts'
import { SharedClient } from '../game_shared/objects/SharedClient.ts';

export class ClientClient extends SharedClient {
	constructor(pos?: ClientVec2,
		id?: number,
		socket?: WebSocket,
		direct?: ClientVec2,
		obj_id?: number)
	{
		super(pos, id, socket, direct, obj_id);
	}
};
