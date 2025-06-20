import { ServerVec2 } from './objects/ServerVec2.ts';
import { ServerWall } from './objects/ServerWall.ts';
import { ServerBall } from './objects/ServerBall.ts';
import { ServerClient } from './objects/ServerClient.ts';

export const EPSILON: number = 1e-6;

export function dot(a: ServerVec2, b: ServerVec2): number {
	return (a.x * b.x + a.y * b.y);
}

export type intersection_point = {
	p: ServerVec2,
	time: number,
	wall: ServerVec2,
};

