import * as BABYLON from '@babylonjs/core/Legacy/legacy';
//import * as BABYLON from 'babylonjs';
import type { ServerToClientMessage, GameStartInfo } from '../../../../game_shared/message_types.ts';
import type { ClientToServerMessage } from '../../../../game_shared/message_types';
import type { GameOptions } from '../../../../game_shared/message_types';

import { GridMaterial } from '@babylonjs/materials/Grid';
import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';
import * as GUI from '@babylonjs/gui';

import { Effects, vec2, Wall, Ball, Client, GameState }
	from './../game_shared/serialization.ts';

import { BaseScene } from './base.ts';


export class GameScene extends BaseScene {
	private _camera: BABYLON.ArcRotateCamera;
	private _light: BABYLON.PointLight;
	private _ground: BABYLON.Mesh;

	private _meshes: Map<number, BABYLON.Mesh> = new Map<number, BABYLON.Mesh>;


	constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
		super(engine, canvas);
		this._camera = new BABYLON.ArcRotateCamera(
			"Camera",
			-Math.PI / 2,
			Math.PI / 2,
			70,
			BABYLON.Vector3.Zero(),
			this
		);
		this._camera.attachControl(this._canvas, true);

		this._light = new BABYLON.PointLight(
				"pointLight", new BABYLON.Vector3(10, 10, -5), this);

		this._ground = BABYLON.MeshBuilder.CreateGround("ground", {
			width: 50,
			height: 50
			}, this
		);

		this._ground.material = new BABYLON.StandardMaterial("fireMat", this);
		this._ground.material.ambientTexture = new FireProceduralTexture(
			"fireTex",
			256,
			this
		);
		this._ground.rotate(BABYLON.Axis.X, -Math.PI / 2, BABYLON.Space.LOCAL);


const gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this);
const text = new GUI.TextBlock();
text.text = "Hello!";
text.color = "white";
text.fontSize = 32;
gui.addControl(text);

	}

	loop(): void {
	}

	update(game_state: GameState): void {
		game_state.balls.forEach((b: Ball) => {
			if (this._meshes.has(b.obj_id)) {
				const cur: BABYLON.Mesh = this._meshes.get(b.obj_id);
				if (!b.dispose) {
					cur.position.x = b.pos.x;
					cur.position.y = b.pos.y;
					cur.position.z = 0;
				} else {
					cur.dispose(true);
					this._meshes.delete(b.obj_id);
					// todo: clean up object from data structs?
				}
			} else {
				const ball: BABYLON.Mesh = BABYLON.MeshBuilder.CreateSphere(
					`sphere_${b.obj_id}`, {diameter: 1}, this);
				ball.position.x = b.pos.x;
				ball.position.y = b.pos.y;
				ball.position.z = 0;
				this._meshes.set(b.obj_id, ball);
			}
		});
		game_state.walls.forEach((w: Wall) => {
			if (this._meshes.has(w.obj_id)) {
				const wall: BABYLON.Mesh = this._meshes.get(w.obj_id);
				wall.position.x = w.center.x;
				wall.position.y = w.center.y;
				//console.log(wall);
			} else {
				const wall: BABYLON.Mesh = BABYLON.MeshBuilder.CreateBox(
					`wall_${w.obj_id}`,
					{
						width: w.length,
						height: 1,
						depth: 0.5
					},
					this
				);
				wall.position.x = w.center.x;
				wall.position.y = w.center.y;
				wall.position.z = 0;
				const default_normal: vec2 = new vec2(0, 1);
				default_normal.unit();
				//todo: rotation
				const normal: vec2 = w.normal;
				normal.unit();
				const dot: number = default_normal.x * normal.x
					+ default_normal.y * normal.y;
				const rot: number = Math.acos(dot);
				wall.rotation.z = rot;
				this._meshes.set(w.obj_id, wall);
			}
		});
		game_state.clients.forEach((c: Client) => {
		});
	}
};
