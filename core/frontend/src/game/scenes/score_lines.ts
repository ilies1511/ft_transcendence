import * as GUI from "@babylonjs/gui";
import * as BABYLON from "@babylonjs/core/Legacy/legacy";

class ScoreLine {
	public id: number;
	public textBlock: GUI.TextBlock;
	public display_name: string = "Loading name..";

	constructor(id: number, score: number, color: BABYLON.Color3, display_name?: string) {
		this.id = id;
		this.textBlock = new GUI.TextBlock();
		this.update(score, color);
		this.textBlock.fontSize = 28;
		this.textBlock.height = "32px";
		this.textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
		if (display_name) {
			this.display_name = display_name;
		}
	}

	public update(score: number, color: BABYLON.Color3, name?: string) {
		this.textBlock.text = `${name ?? this.display_name}: ${score}`;
		this.textBlock.color = color.toHexString();
	}
}


export class ScorePanel {
	private panel: GUI.StackPanel;
	private lines: Map<number, ScoreLine>;

	constructor(gui: GUI.AdvancedDynamicTexture) {
		this.panel = new GUI.StackPanel();
		this.panel.width = "2200px";
		this.panel.isVertical = true;
		this.panel.top = "0px";
		this.panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
		gui.addControl(this.panel);

		this.lines = new Map<number, ScoreLine>();
	}

	public update_display_name(id: number, display_name: string) {
		const line: ScoreLine | undefined = this.lines.get(id);
		if (!line) {
			return ;
		}
		line.display_name = display_name;
	}

	public cleanup() {
	}

	public update_score(id: number, score: number, color: BABYLON.Color3, name?: string) {
		//console.log("Game: update score", id);
		let line = this.lines.get(id);
		if (!line) {
			line = new ScoreLine(id, score, color, name);
			this.lines.set(id, line);
			this.panel.addControl(line.textBlock);
		} else {
			line.update(score, color, name);
		}
	}

	public remove_score(id: number) {
		const line = this.lines.get(id);
		if (line) {
			this.panel.removeControl(line.textBlock);
			this.lines.delete(id);
		}
	}

	public clear() {
		this.panel.clearControls();
		this.lines.clear();
	}
}

