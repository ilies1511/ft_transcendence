import { SharedVec2 } from '../game_shared/objects/SharedVec2.ts';

export class ClientVec2 extends SharedVec2 {
	constructor(x?: number, y?: number) {
		super(x, y);
	}
};
