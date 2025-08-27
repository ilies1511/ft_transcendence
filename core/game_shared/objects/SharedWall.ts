import { SharedVec2 } from './SharedVec2.js';
import { Effects } from '../serialization.js';

export class SharedWall {
	public center: SharedVec2;
	public normal: SharedVec2;
	public length: number;
	public width: number;
	public effects: Effects[];
	public obj_id: number;
	public dispose: boolean;

	private _direct: SharedVec2 = new SharedVec2();
	private _endpoint1: SharedVec2 = new SharedVec2();
	private _endpoint2: SharedVec2 = new SharedVec2();
	public changed: boolean = true;

	constructor(center: SharedVec2,
		normal: SharedVec2,
		length: number,
		effects?: Effects[],
		obj_id?: number,
		dispose?: boolean)
	{
		this.width = 1;
		this.center = center;
		this.normal = normal;
		this.normal.unit();
		this.length = length;
		this.effects = effects || [];
		this.obj_id = obj_id !== undefined ? obj_id : -1;
		this.dispose = dispose || false;
		this.update();
	}

	private _set_direct() {
		this._direct = new SharedVec2(this.normal.y * -1, this.normal.x);
	}

	private _set_endpoints() {
		this._endpoint1 = new SharedVec2(this.center.x, this.center.y);
		this._endpoint2 = new SharedVec2(this.center.x, this.center.y);
		const offset: SharedVec2 = new SharedVec2(this._direct.x, this._direct.y);
		offset.scale(this.length / 2);
		this._endpoint1.add(offset);
		offset.scale(this.length * - 1);
		this._endpoint2.add(offset);
	}

	private _unit() {
		this.normal.unit();
	}

	//todo: make it possible to adjust normal, center + len; for now idc
	public update() {
		this._unit();
		this._set_direct();
		this._set_endpoints();
	}

	public get_endpoints(): {p1: SharedVec2, p2: SharedVec2} {
		return {
			p1: new SharedVec2(this._endpoint1.x, this._endpoint1.y),
			p2: new SharedVec2(this._endpoint2.x, this._endpoint2.y)
		};
	}

	public get_direct(): SharedVec2 {
		return new SharedVec2(this._direct.x, this._direct.y);
	}

	// Serialization: center(8), normal(8), length(4), dispose(1), effects(1+N)
	public serialize(): ArrayBuffer | undefined {
		if (!this.changed) {
			return ;
		}
		//currently the frontend needs these always in case of init since
		//these are currently stoared as part of a client and wall
		if (!this.effects.includes(Effects.PADDLE) && !this.effects.includes(Effects.BASE)) {
			this.changed = false;
		}
		const effectsCount = this.effects.length;
		const buffer = new ArrayBuffer(
			2 // obj_id
			+ 8 // center
			+ 8 // normal
			+ 4 // length
			+ 1 // dispose
			+ 1 + effectsCount //effects
		);
		const view = new DataView(buffer);
		let offset = 0;
		//obj_id
		view.setUint16(offset, this.obj_id, true);
		offset += 2;
		// center
		view.setFloat32(offset, this.center.x, true);
		offset += 4;
		view.setFloat32(offset, this.center.y, true);
		offset += 4;
		// normal
		view.setFloat32(offset, this.normal.x, true);
		offset += 4;
		view.setFloat32(offset, this.normal.y, true);
		offset += 4;
		// length
		view.setFloat32(offset, this.length, true);
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
		return buffer;
	}

	static deserialize(array: ArrayBuffer, offset: number = 0):
		{ wall: SharedWall, offset: number }
	{
		const view = new DataView(array);
		const obj_id = view.getUint16(offset, true);
		offset += 2;

		const { vec: center, offset: o2 } = SharedVec2.deserialize(array, offset);
		offset = o2;
		const { vec: normal, offset: o3 } = SharedVec2.deserialize(array, offset);
		offset = o3;
		const length = view.getFloat32(offset, true);
		offset += 4;
		const dispose = view.getUint8(offset++) !== 0;
		const effectsCount = view.getUint8(offset++);
		let effects: Effects[] = [];
		for (let i = 0; i < effectsCount; i++) {
			effects.push(view.getUint8(offset++));
		}
		const wall = new SharedWall(center, normal, length, effects, obj_id, dispose);
		return { wall, offset };
	}
}
