import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import * as GUI from '@babylonjs/gui';
import { BaseScene } from './base.ts';
import type { GameLobbyUpdate } from '../game_shared/message_types.ts';

export class LobbyScene extends BaseScene {
	private _camera: BABYLON.ArcRotateCamera;
	private _gui: GUI.AdvancedDynamicTexture;

	private _player_count_text: GUI.TextBlock;
	private _loaded_player_count_text: GUI.TextBlock;
	private _header: GUI.TextBlock;
	private _global_player_count: GUI.TextBlock;


	constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
		super(engine, canvas);

		this._camera = new BABYLON.ArcRotateCamera(
			"LobbyCamera",
			-Math.PI / 2,
			Math.PI / 3,
			10,
			BABYLON.Vector3.Zero(),
			this
		);
		this._camera.attachControl(canvas, true);

		this.clearColor = BABYLON.Color4.FromHexString("#101010FF");

		this._gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("LobbyUI", true, this);

		const panel = new GUI.StackPanel();
		panel.width = "400px";
		panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
		panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
		panel.background = "#222222CC";
		panel.paddingTop = "20px";
		panel.paddingBottom = "20px";
		this._gui.addControl(panel);

		this._header = new GUI.TextBlock();
		this._header.text = "Loading...";
		this._header.height = "40px";
		this._header.color = "white";
		this._header.fontSize = 24;
		panel.addControl(this._header);

		this._player_count_text = new GUI.TextBlock();
		this._player_count_text.color = "white";
		this._player_count_text.height = "30px";
		panel.addControl(this._player_count_text);

		this._loaded_player_count_text = new GUI.TextBlock();
		this._loaded_player_count_text.color = "white";
		this._loaded_player_count_text.height = "30px";
		panel.addControl(this._loaded_player_count_text);

		this._global_player_count = new GUI.TextBlock();
		this._global_player_count.color = "white";
		this._global_player_count.height = "30px";
		panel.addControl(this._loaded_player_count_text);
		this._global_player_count.text = '123123213';
	}

	public update(info: GameLobbyUpdate) {
		this._player_count_text.text = `Players: ${info.player_count}/${info.target_player_count}`;
		this._loaded_player_count_text.text = `Loaded: ${info.loaded_player_count}/${info.target_player_count}`;

		this._global_player_count.text = '123123213';
		
		if (info.player_count < info.target_player_count) {
			this._header.text = "Waiting for more players to join...";
		} else if (info.loaded_player_count < info.target_player_count) {
			this._header.text = "Waiting for players to load...";
		} else {
			this._header.text = "Game starting soon!";
		}
	}

	public cleanup() {
		super.cleanup();
		this._gui.dispose();
	}
	
	loop(): void {
	}
}

