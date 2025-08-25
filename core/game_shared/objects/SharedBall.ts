import { SharedVec2 } from './SharedVec2.ts'
import { Effects } from '../serialization.ts'

//todo: add radius to serialization
export class SharedBall {
	public pos: SharedVec2;
	public obj_id: number;
	public speed: SharedVec2; // not serialized
	public acceleration?: SharedVec2; // not serialized
	public effects: Effects[];
	public lifetime: number;
	public dispose: boolean;
	public radius: number = 0.5;//hotfix: idk the actual radius is 1 but this seems to fix the calculations
	public changed: boolean = true;

	constructor(obj_id?: number, dispose?: boolean) {
		this.pos = new SharedVec2();
		this.speed = new SharedVec2();
		this.effects = [];
		this.lifetime = 0;
		this.obj_id = obj_id !== undefined ? obj_id : -1;
		this.dispose = dispose || false;
	}

	public clone(): SharedBall {
		const clone: SharedBall = new SharedBall(this.obj_id, this.dispose);
		clone.pos = this.pos.clone();
		clone.speed = this.speed.clone();
		clone.effects = this.effects.slice();
		clone.lifetime = this.lifetime;
		clone.obj_id = this.obj_id;
		clone.dispose = this.dispose;
		clone.radius = this.radius;
		if (this.acceleration) {
			clone.acceleration = this.acceleration.clone();
		}
		//clone.last_collision_obj_id = this.last_collision_obj_id.slice();
		//clone.cur_collision_obj_id = this.cur_collision_obj_id.slice();
		return clone;
	}

	public sane(): boolean {
		return this.pos.sane() && this.speed.sane();
	}

	// serializes the pos, effects, lifetime, dispose
	public serialize(): ArrayBuffer | undefined {
		if (!this.changed) {
			return ;
		}
		this.changed = false;
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(
			2 // obj_id
			+ 8 //pos
			+ 1 // dispose
			+ 1 + effectsCount //effects
			+ 4 // lifetime
		);
		const view = new DataView(buffer);
		let offset = 0;
		//obj_id
		view.setUint16(offset, this.obj_id, true);
		offset += 2;
		// pos
		view.setFloat32(offset, this.pos.x, true);
		offset += 4;
		view.setFloat32(offset, this.pos.y, true);
		offset += 4;
		// dispose
		view.setUint8(offset, this.dispose ? 1 : 0);
		offset += 1;
		// effects
		view.setUint8(offset, effectsCount);
		offset += 1;
		for (let i = 0; i < effectsCount; i++) {
			view.setUint8(offset++, this.effects[i]);
		}
		// lifetime
		view.setFloat32(offset, this.lifetime, true);
		return buffer;
	}

	static deserialize(array: ArrayBuffer, offset: number = 0):
		{ ball: SharedBall, offset: number }
	{
		const view = new DataView(array);
		//obj_id
		const obj_id = view.getUint16(offset, true);
		offset += 2;
		//pos
		const { vec: pos, offset: off2 } = SharedVec2.deserialize(array, offset);
		offset = off2;
		// dispose
		const dispose = view.getUint8(offset++) !== 0;
		//effects
		const effectsCount = view.getUint8(offset++);
		let effects: Effects[] = [];
		for (let i = 0; i < effectsCount; i++) {
			effects.push(view.getUint8(offset++));
		}
		const lifetime = view.getFloat32(offset, true);
		offset += 4;
		let ball = new SharedBall();
		ball.pos = pos;
		ball.effects = effects;
		ball.lifetime = lifetime;
		ball.obj_id = obj_id;
		ball.dispose = dispose;
		return { ball, offset };
	}
}
