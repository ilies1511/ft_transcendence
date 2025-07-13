import * as BABYLON from '@babylonjs/core/Legacy/legacy';
//import * as BABYLON from 'babylonjs';
import type {
	ServerToClientMessage,
	GameStartInfo,
	ClientToServerMessage,
	GameOptions
} from '../game_shared/message_types.ts';

//import { GridMaterial } from '@babylonjs/materials/Grid';
import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';


// import { Effects, GameState }
// 	from '../game_shared/serialization.ts';

import { Effects, GameState }
	from '../../../../game_shared/serialization.ts';

import { ClientVec2 } from '../objects/ClientVec2.ts';
import { ClientWall } from '../objects/ClientWall.ts';
import { ClientBall } from '../objects/ClientBall.ts';
import { ClientClient } from '../objects/ClientClient.ts';


export abstract class BaseScene extends BABYLON.Scene {
	protected _engine: BABYLON.Engine;
	protected _canvas: HTMLCanvasElement;

	constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
		super(engine);
		this._engine = engine;
		this._canvas = canvas;
		window.addEventListener("keydown", (ev) => {
			if ((ev.key === "I" || ev.key === "i"))
			{
				if (this.debugLayer.isVisible()) {
					this.debugLayer.hide();
				} else {
					this.debugLayer.show();
				}
			}
		});
	}

	abstract loop(): void;
};

