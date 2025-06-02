//const ws: any = new WebSocket("ws://localhost:8080");
//const messages: any = document.getElementById("messages");
//const input: any = document.getElementById("input");
//const button: any = document.getElementById("send");
//
//ws.onopen = () => {
//  console.log("Connected to server");
//};
//
//ws.onmessage = (event: any) => {
//  const msg = document.createElement("p");
//  msg.textContent = "Server: " + event.data;
//  messages.appendChild(msg);
//};
//
//button.onclick = () => {
//  const text = input.value;
//  ws.send(text);
//  const msg = document.createElement("p");
//  msg.textContent = "You: " + text;
//  messages.appendChild(msg);
//  input.value = "";
//};



import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder } from "babylonjs";

// Get the canvas element
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

// Create the Babylon engine and scene
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

// Create a camera and attach controls
const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 4, Vector3.Zero(), scene);
camera.attachControl(canvas, true);

// Add a light
const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);

// Create a box
const box = MeshBuilder.CreateBox("box", {}, scene);

// Rotate box every frame
scene.onBeforeRenderObservable.add(() => {
  box.rotation.y += 0.01;
});

// Run the render loop
engine.runRenderLoop(() => {
  scene.render();
});

// Resize on window resize
window.addEventListener("resize", () => {
  engine.resize();
});

