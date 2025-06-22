import { SharedVec2 } from './SharedVec2.ts';
import { Effects } from '../serialization.ts';

export class SharedClient {
	public id: number;
	public obj_id: number;
	public game_player_id: number = undefined;
	public effects: Effects[];
	public pos: SharedVec2;
	public direct: SharedVec2;

	constructor(pos?: SharedVec2, id?: number, direct?: SharedVec2, obj_id?: number) {
		this.id = id || 0;
		this.effects = [];
		this.pos = pos || new SharedVec2();
		this.direct = direct || new SharedVec2();
		this.obj_id = obj_id !== undefined ? obj_id : -1;
	}

	// serializes the obj_id, id, effects, pos, direct
	public serialize(): ArrayBuffer {
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(
			2 // obj_id
			+ 4 // id
			+ 1 + effectsCount //effects
			+ 8 // pos
			+ 8 // direct
		);
		const view = new DataView(buffer);
		let offset = 0;
		//obj_id
		view.setUint16(offset, this.obj_id, true);
		offset += 2;
		// id
		view.setUint32(offset, this.id, true);
		offset += 4;
		//effects
		view.setUint8(offset, effectsCount);
		offset += 1;
		for (let i = 0; i < effectsCount; i++) {
			view.setUint8(offset++, this.effects[i]);
		}
		// pos
		view.setFloat32(offset, this.pos.x, true);
		offset += 4;
		view.setFloat32(offset, this.pos.y, true);
		offset += 4;
		// direct
		view.setFloat32(offset, this.direct.x, true);
		offset += 4;
		view.setFloat32(offset, this.direct.y, true);
		offset += 4;
		return buffer;
	}

	public static deserialize(array: ArrayBuffer, offset: number = 0): { client: SharedClient, offset: number } {
		const view = new DataView(array);
		//obj_id
		const obj_id = view.getUint16(offset, true);
		offset += 2;
		//id
		const id = view.getUint32(offset, true);
		offset += 4;
		//effects
		const effectsCount = view.getUint8(offset++); 
		let effects: Effects[] = [];
		for (let i = 0; i < effectsCount; i++) {
			effects.push(view.getUint8(offset++));
		}
		// pos
		const { vec: pos, offset: off2 } = SharedVec2.deserialize(array, offset);
		offset = off2;
		// direct
		const { vec: direct, offset: off3 } = SharedVec2.deserialize(array, offset);
		offset = off3;
		const client = new SharedClient(pos, id, direct);
		client.effects = effects;
		client.obj_id = obj_id;
		return { client, offset };
	}
}
