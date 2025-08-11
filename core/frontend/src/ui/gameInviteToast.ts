// src/ui/gameInviteToast.ts
import { showToast } from './toast-interface';

export function gameInviteToast(fromName:string) {
	// const acceptURL = `/api/requests/${requestId}/accept`;
	// const rejectURL = `/api/requests/${requestId}/reject`;
	
	showToast({
		title : 'Game invite',
		from : fromName,

		onAccept() {
			console.log('[GameInvite TOAST] accepted');
			// TODO: add logic
			return true;
		},

		onReject() {
			console.log('[GameInvite TOAST] declined');
			// TODO: add logic
			return true;
		}
	});
}
