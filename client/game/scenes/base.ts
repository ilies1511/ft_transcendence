import * as BABYLON from '@babylonjs/core/Legacy/legacy';
//import * as BABYLON from 'babylonjs';
import type { ServerToClientMessage, GameStartInfo } from '../../../../game_shared/message_types.ts';
import type { ClientToServerMessage } from '../../../../game_shared/message_types';
import type { GameOptions } from '../../../../game_shared/message_types';

import { GridMaterial } from '@babylonjs/materials/Grid';
import { FireProceduralTexture } from '@babylonjs/procedural-textures/fire';

import { Effects, vec2, Wall, Ball, Client, GameState }
	from './../game_shared/serialization.ts';


export abstract class BaseScene extends BABYLON.Scene {
	public active: boolean = false;
	public static active_scenes: BaseScene[] = [];

	protected _engine: BABYLON.Engine;
	protected _canvas: HTMLCanvasElement;

	constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
		super(engine);
		this._engine = engine;
		this._canvas = canvas;
	}

	abstract loop(): void;
};

