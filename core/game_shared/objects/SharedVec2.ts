import {EPSILON} from '../math.js';

export class SharedVec2 {
	public x: number;
	public y: number;

	constructor(x?: number, y?: number) {
		this.x = x || 0;
		this.y = y || 0;
	}

	public length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	public sane(): boolean {
		return !(isNaN(this.x)
			|| isNaN(this.y)
			|| this.x == Infinity
			|| this.y == Infinity
		);
	}

	static eq(a: SharedVec2, b:SharedVec2): boolean {
		if (Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y)) {
			return (true);
		}
		return (false);
	}

	public len(): number {
		const len: number = Math.sqrt(this.x * this.x + this.y * this.y);
		return (len);
	}

	public clone(): SharedVec2 {
		return new SharedVec2(this.x, this.y);
	}

	public unit(): SharedVec2 {
		const len: number = Math.sqrt(this.x * this.x + this.y * this.y);
		this.x /= len;
		this.y /= len;
		return this;
	}

	public add(a: SharedVec2): SharedVec2 {
		this.x += a.x;
		this.y += a.y;
		return this;
	}

	public sub(a: SharedVec2): SharedVec2 {
		this.x -= a.x;
		this.y -= a.y;
		return this;
	}

	public scale(a: number): SharedVec2 {
		this.x *= a;
		this.y *= a;
		return this;
	}

	public div(a: number): SharedVec2 {
		this.x /= a;
		this.y /= a;
		return this;
	}

	public serialize(): ArrayBuffer {
		const ret: ArrayBuffer = new ArrayBuffer(8);
		const view: DataView = new DataView(ret);
		view.setFloat32(0, this.x, true);
		view.setFloat32(4, this.y, true);
		return ret;
	}

	static deserialize(array: ArrayBuffer, offset: number = 0):
		{ vec: SharedVec2, offset: number }
	{
		const view = new DataView(array);
		const x = view.getFloat32(offset, true);
		const y = view.getFloat32(offset + 4, true);
		return { vec: new SharedVec2(x, y), offset: offset + 8 };
	}
}
