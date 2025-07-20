// src/types/ws.ts
export type FriendStatusMsg = {
	type: 'friend_status_update';
	friendId: number;
	online: number;
};
