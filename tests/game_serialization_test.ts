import { describe, it, expect } from 'vitest';
// or for jest: import { describe, it, expect } from '@jest/globals';
import { Effects, vec2, Client, Ball, Wall, GameState }
	from '../game_shared/serialization';
import {Game} from '../server/game/game_server'

function eqVec2(a: vec2, b: vec2) {
  expect(a.x).toBeCloseTo(b.x);
  expect(a.y).toBeCloseTo(b.y);
}

describe('Serialization', () => {
  it('Client round-trip', () => {
    const c1 = new Client(new vec2(1.5, 2.5), 42, undefined, new vec2(0.1, 0.2));
    c1.effects = [Effects.FIRE];
    const buf = c1.serialize();
    const { client: c2 } = Client.deserialize(buf);
    expect(c2.id).toBe(c1.id);
    eqVec2(c2.pos, c1.pos);
    eqVec2(c2.direct, c1.direct);
    expect(c2.effects).toEqual(c1.effects);
  });

  it('Ball round-trip', () => {
    const b1 = new Ball();
	b1.pos = new vec2(-1, 7.77);
    b1.effects = [Effects.FIRE];
    b1.lifetime = 9.99;
    const buf = b1.serialize();
    const { ball: b2 } = Ball.deserialize(buf);
    eqVec2(b2.pos, b1.pos);
    expect(b2.effects).toEqual(b1.effects);
    expect(b2.lifetime).toBeCloseTo(b1.lifetime);
  });

  it('Wall round-trip', () => {
    const w1 = new Wall(new vec2(3, 5), new vec2(-1, 0), 7.5, [Effects.FIRE]);
    const buf = w1.serialize();
    const { wall: w2 } = Wall.deserialize(buf);
    eqVec2(w2.center, w1.center);
    eqVec2(w2.normal, w1.normal);
    expect(w2.length).toBeCloseTo(w1.length);
    expect(w2.effects).toEqual(w1.effects);
  });

  it('GameState round-trip', () => {
    // Create a fake game with all the objects
    const g = new Game({});
    g.clients.push(new Client(new vec2(1, 2), 1, undefined, new vec2(1, 0)));
    g.clients[0].effects = [Effects.FIRE];
    g.balls.push(new Ball());
    g.balls[0].pos = new vec2(3, 4);
    g.balls[0].lifetime = 1.5;
    g.balls[0].effects = [];
    g.walls.push(new Wall(new vec2(1, 1), new vec2(0, 1), 10, [Effects.FIRE]));

    const serialized = g.serialize_game_state();
    const gs = GameState.deserialize(serialized);

    expect(gs.clients.length).toBe(1);
    expect(gs.balls.length).toBe(1);
    expect(gs.walls.length).toBe(1);
    // Compare first client
    eqVec2(gs.clients[0].pos, g.clients[0].pos);
    eqVec2(gs.clients[0].direct, g.clients[0].direct);
    expect(gs.clients[0].id).toBe(g.clients[0].id);
    expect(gs.clients[0].effects).toEqual(g.clients[0].effects);
    // Compare first ball
    eqVec2(gs.balls[0].pos, g.balls[0].pos);
    expect(gs.balls[0].lifetime).toBeCloseTo(g.balls[0].lifetime);
    expect(gs.balls[0].effects).toEqual(g.balls[0].effects);
    // Compare first wall
    eqVec2(gs.walls[0].center, g.walls[0].center);
    eqVec2(gs.walls[0].normal, g.walls[0].normal);
    expect(gs.walls[0].length).toBeCloseTo(g.walls[0].length);
    expect(gs.walls[0].effects).toEqual(g.walls[0].effects);
  });
});

