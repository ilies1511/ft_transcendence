import { SharedVec2 } from './SharedVec2.ts';
import { SharedWall } from './SharedWall.ts';

export class SharedClient {
	public ingame_id: number;
	public obj_id: number;
	public paddle: SharedWall;
	public base: SharedWall;

	constructor(
		paddle: SharedWall,
		base: SharedWall,
		ingame_id: number = 0,
		obj_id: number = -1
	) {
		this.paddle = paddle;
		this.base   = base;
		this.ingame_id = ingame_id;
		this.obj_id	= obj_id;
	}

	 // obj_id 2
	 // ingame_id 4
	 // paddle
	 // base
	public serialize(): ArrayBuffer {
		const paddleBuf = this.paddle.serialize();
		const baseBuf   = this.base.serialize();

		const totalSize = 2 // obj_id
			+ 4 // ingame_id
			+ paddleBuf.byteLength
			+ baseBuf.byteLength;

		const buffer = new ArrayBuffer(totalSize);
		const view   = new DataView(buffer);
		let offset   = 0;

		// obj_id
		view.setUint16(offset, this.obj_id, true);
		offset += 2;

		// ingame_id
		view.setUint32(offset, this.ingame_id, true);
		offset += 4;

		// paddle
		new Uint8Array(buffer, offset).set(new Uint8Array(paddleBuf));
		offset += paddleBuf.byteLength;

		// base
		new Uint8Array(buffer, offset).set(new Uint8Array(baseBuf));
		// offset += baseBuf.byteLength;

		return buffer;
	}

	/** Re-creates a client (plus its paddle & base) from a binary stream. */
	public static deserialize(
		array: ArrayBuffer,
		offset: number = 0
	): { client: SharedClient; offset: number }
	{
		const view = new DataView(array);

		// obj_id
		const obj_id = view.getUint16(offset, true);
		offset += 2;

		// ingame_id
		const ingame_id = view.getUint32(offset, true);
		offset += 4;

		// paddle
		const { wall: paddle, offset: offAfterPaddle } =
				SharedWall.deserialize(array, offset);
		offset = offAfterPaddle;

		// base
		const { wall: base, offset: offAfterBase } =
				SharedWall.deserialize(array, offset);
		offset = offAfterBase;

		const client = new SharedClient(paddle, base, ingame_id, obj_id);
		return { client, offset };
	}
};
