import * as BABYLON from '@babylonjs/core/Legacy/legacy';
//import * as BABYLON from 'babylonjs';
import type { ServerToClientMessage, GameStartInfo } from '../../../../game_shared/message_types.ts';
import type { ClientToServerMessage } from '../../../../game_shared/message_types';
import type { GameOptions } from '../../../../game_shared/message_types';

import { GridMaterial } from '@babylonjs/materials/Grid';
import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';

import { Effects, vec2, Wall, Ball, Client, GameState }
	from './../game_shared/serialization.ts';

import { BaseScene } from './base.ts';


export class GameScene extends BaseScene {
	private _camera: BABYLON.ArcRotateCamera;
	private _light: BABYLON.PointLight;
	private _ground: BABYLON.Mesh;


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
	}

	loop(): void {

	}
};
