import { Ball, Client, Effects, GameState, vec2, Wall } from './serialization.ts';

export function dot(a: vec2, b: vec2): number {
	return (a.x * b.x + a.y * b.y);
}

export type intersection_point = {
	p: vec2,
	time: number,
	wall: Wall,
};


