import { ServerVec2 } from './ServerVec2.ts'
import { SharedBall } from '@game_shared/objects/SharedBall.ts';
import { ServerWall } from './ServerWall.ts';
import * as ft_math from '../math.ts';

let i: number = 0;

export class ServerBall extends SharedBall {
	constructor(obj_id?: number, dispose?: boolean) {
		super(obj_id, dispose);
	}

	public reflect(walls: ServerWall[], hit_points: ServerVec2[]) {
		console.log("reflecting ball.. ", i++);
		console.log("initial ball speed: ", this.speed);
		console.log("walls hit: ", walls.length);
		console.log("ball pos: ", this.pos);
		
		for (let i = 0; i < walls.length; i++) {
			const wall: ServerWall = walls[i];
			const hit_point: ServerVec2 = hit_points[i];
			const normal = wall.normal.clone();
			console.log("wall normal: ", normal);
			if (wall.angular_vel) {
				const r: ServerVec2 = hit_point.clone().sub(wall.center);
				const wall_velocity: ServerVec2 = new ServerVec2(-wall.angular_vel * r.y, wall.angular_vel * r.x);
				const rel_velocity: ServerVec2 = this.speed.clone().sub(wall_velocity);
				const dot_p: number = ft_math.dot(rel_velocity, normal);
				normal.scale(2 * dot_p);
				rel_velocity.sub(normal);
				this.speed = rel_velocity.add(wall_velocity);
			} else {
				const dot_p: number = ft_math.dot(this.speed, normal);
				normal.scale(2 * dot_p);
				this.speed.sub(normal);
			}
			console.log("intermediate ball speed: ", this.speed);
		}
		console.log("ball speed after: ", this.speed);
		console.log("****************");
	}

	public intersec(wall: ServerWall, delta_time: number):
		ft_math.intersection_point | undefined
	{
		if (this.last_collision_obj_id.includes(wall.obj_id)) {
			//return undefined;
		}
		//if (wall.angular_vel) {
		//	return undefined;
		//}
		const ball_direct: ServerVec2 = this.speed.clone();
		ball_direct.unit();
		if (Math.abs(ft_math.dot(ball_direct, wall.normal)) < 1e-12) {
			return (undefined);
		}
		const dist_rate: number = ft_math.dot(this.speed, wall.normal);
		//console.log("dist_rate:", dist_rate);

		//if (Math.abs(dist_rate) < ft_math.EPSILON) {
		//	return (undefined);
		//}
	
		/* this can be used for walls that have no hitbox on one side */
		//if (dist_rate >= 0) { 
		//	return undefined;
		//}
	
		const center_diff = new ServerVec2(this.pos.x - wall.center.x, this.pos.y - wall.center.y);
		const signed_dist: number = ft_math.dot(center_diff, wall.normal);

		if (signed_dist * dist_rate >= 0) {
			return (undefined); // ball flying away from the wall
		}
	
		//let impact_time: number;
		//if (signed_dist != 0) {
		//	impact_time = (signed_dist) / (-dist_rate);
		//} else {
		//	impact_time = 0;
		//}
		const signed_dist_to_surface =
			signed_dist - this.radius * Math.sign(signed_dist);
		let impact_time = signed_dist_to_surface / (-dist_rate);
		if (impact_time < 0) {
			return (undefined);
		}
		if (impact_time < ft_math.EPSILON) {
			impact_time = ft_math.EPSILON;
		}
		if (impact_time > delta_time - ft_math.EPSILON) {
			return (undefined);
		}
	
		const ball_movement: ServerVec2 = new ServerVec2(this.speed.x, this.speed.y);
		ball_movement.scale(impact_time);
		const ball_impact_pos: ServerVec2 = new ServerVec2(this.pos.x, this.pos.y);
		ball_impact_pos.add(ball_movement);
	
		const vec_from_wall_center = new ServerVec2(wall.center.x, wall.center.y);
		vec_from_wall_center.sub(ball_impact_pos);
		const dist_from_center = Math.abs(ft_math.dot(vec_from_wall_center, wall.get_direct()));
		if (dist_from_center <= (wall.length / 2 + this.radius) + ft_math.EPSILON) {
			return {p: ball_impact_pos, time: impact_time, wall};
		}
		return (undefined);
	}
};
