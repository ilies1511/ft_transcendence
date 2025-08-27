import { ServerVec2 } from './objects/ServerVec2.js';
import { ServerWall } from './objects/ServerWall.js';
import { ServerBall } from './objects/ServerBall.js';
import { ServerClient } from './objects/ServerClient.js';

export const EPSILON: number = 1e-6;

export function dot(a: ServerVec2, b: ServerVec2): number {
	return (a.x * b.x + a.y * b.y);
}

export type intersection_point = {
	p: ServerVec2,
	time: number,
	wall: ServerWall,
};

