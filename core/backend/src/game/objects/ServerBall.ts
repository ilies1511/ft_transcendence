import { ServerVec2 } from './ServerVec2.ts'
import { SharedBall } from '../game_shared/objects/SharedBall.ts';
import { ServerWall } from './ServerWall.ts';
import * as ft_math from '../math.ts';
import { Effects } from '../game_shared/serialization.ts';

let i: number = 0;


function rotate_vec(v: ServerVec2, angle: number) {
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	return new ServerVec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

export class ServerBall extends SharedBall {
	public init_pos: SharedBall;
	public last_collision_obj_id: number[] = [];
	public cur_collision_obj_id: number[] = [];

	constructor(obj_id?: number, dispose?: boolean) {
		super(obj_id, dispose);
		this.init_pos = this.clone();
		this.cur_collision_obj_id = [];
		this.last_collision_obj_id = [];
	}

	// when ball is bugged
	public reset() {
		//console.log("resetting ball from: ", this);
		this.cur_collision_obj_id = [];
		this.last_collision_obj_id = [];
		this.pos = this.init_pos.pos.clone();
		this.speed = this.init_pos.speed.clone();
		this.effects = this.init_pos.effects.slice();
		this.lifetime = this.init_pos.lifetime;
		this.obj_id = this.init_pos.obj_id;
		this.dispose = this.init_pos.dispose;
		this.radius = this.init_pos.radius;
		if (this.init_pos.acceleration) {
			this.acceleration = this.init_pos.acceleration.clone();
		}
		//this.last_collision_obj_id = this.init_pos.last_collision_obj_id.slice();
		//this.cur_collision_obj_id = this.init_pos.cur_collision_obj_id.slice();
		//console.log("to: ", this);
	}

	public reflect(walls: ServerWall[], hit_points: ServerVec2[]) {
		//console.log("reflecting ball.. ", i++);
		//console.log("initial ball speed: ", this.speed);
		//console.log("walls hit: ", walls.length);
		//console.log("ball pos: ", this.pos);

		for (let i = 0; i < walls.length; i++) {
			const wall: ServerWall = walls[i];
			const hit_point: ServerVec2 = hit_points[i];
			let normal = wall.normal.clone();
			if (wall.interp_normal) {
				normal = wall.interp_normal;
				wall.interp_normal = undefined;
			}
			//console.log("wall normal: ", normal);
			if (wall.angular_vel) {
				if (!this.last_collision_obj_id.includes(wall.obj_id) 
					|| wall.effects.includes(Effects.PADDLE)
				) {
					const r: ServerVec2 = hit_point.clone().sub(wall.center);
					const wall_velocity: ServerVec2 = new ServerVec2(-wall.angular_vel * r.y, wall.angular_vel * r.x);
					const rel_velocity: ServerVec2 = this.speed.clone().sub(wall_velocity);
					const dot_p: number = ft_math.dot(rel_velocity, normal);
					normal.scale(2 * dot_p);
					rel_velocity.sub(normal);
					this.speed = rel_velocity.add(wall_velocity);
				}

			} else {
				const dot_p: number = ft_math.dot(this.speed, normal);
				normal.scale(2 * dot_p);
				this.speed.sub(normal);
			}
			//console.log("intermediate ball speed: ", this.speed);
		}
		const max_speed: number = 20;
		const ball_speed: number = this.speed.length();
		if (max_speed < ball_speed) {
			this.speed.scale(max_speed / ball_speed)
		}
		if (this.speed.length() > ball_speed) {
			console.log("Error: speed: ", this.speed.length(), "; old speed: ", ball_speed);
			//process.exit(123);
		}
		//console.log("ball speed after: ", this.speed);
		//console.log("****************");
	}

	public intersec(wall: ServerWall, delta_time: number):
		ft_math.intersection_point | undefined
	{
		//wall.update();
		if (wall.angular_vel == 0 && this.last_collision_obj_id.includes(wall.obj_id)) {
			return undefined;
		}
		wall.interp_normal = undefined;
	
		const center_diff = new ServerVec2(this.pos.x - wall.center.x, this.pos.y - wall.center.y);
	
		if (wall.angular_vel === 0) {
			//todo: hit detection is longer than the walls(current hotfix: radius / 2)
			//wall.normal.unit();
			const dist_rate: number = ft_math.dot(this.speed, wall.normal);
			const signed_dist: number = ft_math.dot(center_diff, wall.normal);
			const signed_dist_to_surface = signed_dist - this.radius * Math.sign(signed_dist);
	
			const impact_time = signed_dist_to_surface / (-dist_rate);
			if (impact_time >= 0 && impact_time <= delta_time) {
				const ball_movement: ServerVec2 = this.speed.clone().scale(impact_time);
				const ball_impact_pos: ServerVec2 = this.pos.clone().add(ball_movement);
	
				const vec_from_wall_center = wall.center.clone().sub(ball_impact_pos);
				const dist_from_center = Math.abs(ft_math.dot(vec_from_wall_center, wall.get_direct()));
				if (dist_from_center <= (wall.length / 2 + (this.radius / 2)) + ft_math.EPSILON) {
					//console.log('impact: ', ball_impact_pos, '; time: ', impact_time, '; wall: ', wall);
					//console.log('ball: ', this);
					return { p: ball_impact_pos, time: impact_time, wall };
				}
			}
			return undefined;
		}
	
		//rotating wall
		const signed_dist: number = ft_math.dot(center_diff, wall.normal);
		let side = Math.sign(signed_dist);
		if (side === 0) {
			const dv = ft_math.dot(this.speed, wall.normal);
			if (dv === 0) {
				return undefined;
			}
			side = Math.sign(dv);
		}
	
		const wall_normal_perp = new ServerVec2(-wall.normal.y, wall.normal.x);
	
		const A = ft_math.dot(center_diff, wall.normal) - side * this.radius;
		const B = ft_math.dot(this.speed, wall.normal) + wall.angular_vel * ft_math.dot(center_diff, wall_normal_perp);
	
		if (Math.abs(B) <= ft_math.EPSILON) {
			// nearly parallel / no crossing in this frame under the linear model
			return undefined;
		}
	
		const impact_time = -A / B;
		if (impact_time < 0 || impact_time > delta_time) {
			return undefined;
		}
	
		const ball_impact_pos: ServerVec2 = this.pos.clone().add(this.speed.clone().scale(impact_time));
	
		// orientation at impact
		const theta = wall.angular_vel * impact_time;
		const normal_hit = rotate_vec(wall.normal, theta);
		normal_hit.unit();
		const tangent_dir = new ServerVec2(-normal_hit.y, normal_hit.x);
	
		const vec_from_wall_center = wall.center.clone().sub(ball_impact_pos);
		const dist_from_center = Math.abs(ft_math.dot(vec_from_wall_center, tangent_dir));
		if (dist_from_center <= (wall.length / 2 + this.radius) + ft_math.EPSILON) {
			wall.interp_normal = normal_hit;
			return { p: ball_impact_pos, time: impact_time, wall };
		}
	
		return undefined;
	}

};
