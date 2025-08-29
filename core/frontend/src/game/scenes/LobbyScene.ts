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
	//private _global_player_count_text: GUI.TextBlock;

	//private _global_player_count_placeholder = 0;

	//private _global_player_count_timeout: NodeJS.Timeout;


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
		panel.width = "800px";
		panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
		panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
		panel.background = "#222222CC";
		panel.paddingTop = "40px";
		panel.paddingBottom = "40px";
		this._gui.addControl(panel);

		this._header = new GUI.TextBlock();
		this._header.text = "Loading...";
		this._header.height = "80px";
		this._header.color = "white";
		this._header.fontSize = 48;
		panel.addControl(this._header);

		this._player_count_text = new GUI.TextBlock();
		this._player_count_text.color = "white";
		this._player_count_text.height = "60px";
		this._player_count_text.fontSize = 36;
		panel.addControl(this._player_count_text);

		this._loaded_player_count_text = new GUI.TextBlock();
		this._loaded_player_count_text.color = "white";
		this._loaded_player_count_text.height = "60px";
		this._loaded_player_count_text.fontSize = 36;
		panel.addControl(this._loaded_player_count_text);

		//this._global_player_count_text = new GUI.TextBlock();
		//this._global_player_count_text.color = "white";
		//this._global_player_count_text.height = "60px";
		//this._global_player_count_text.text = '';
		//this._global_player_count_text.fontSize = 36;
		//panel.addControl(this._global_player_count_text);

		//this._update_global_player_count = this._update_global_player_count.bind(this);
		////directly fetch the data async
		//this._global_player_count_timeout = this._update_global_player_count(0);
	}

	//private _update_global_player_count(timeout_duration: number = 4000): NodeJS.Timeout {
	//	return (setTimeout(
	//		() => {
	//			this._global_player_count_text.text = `There are currently ${this._global_player_count_placeholder++} players online.`;
	//			this._global_player_count_timeout =  this._update_global_player_count();
	//		}
	//		,timeout_duration)
	//	);
	//}

	public update(info: GameLobbyUpdate) {
		this._player_count_text.text = `Players: ${info.player_count}/${info.target_player_count}`;
		this._loaded_player_count_text.text = `Loaded: ${info.loaded_player_count}/${info.target_player_count}`;

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
		//clearTimeout(this._global_player_count_timeout);
	}
	
	loop(): void {
	}
}

