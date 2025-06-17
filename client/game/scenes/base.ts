import * as BABYLON from '@babylonjs/core/Legacy/legacy';
//import * as BABYLON from 'babylonjs';
import type {
	ServerToClientMessage,
	GameStartInfo,
	ClientToServerMessage,
	GameOptions
} from '../game_shared/message_types.ts';

import { GridMaterial } from '@babylonjs/materials/Grid';
import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';

import {
	Effects,
	vec2,
	Wall,
	Ball,
	Client,
	GameState
} from '../game_shared/serialization.ts';


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

