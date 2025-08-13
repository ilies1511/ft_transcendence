// src/ui/friendRequestToast.ts
import { showToast } from './toast-interface';

export function friendRequestToast(requestId:number, from:string) {
	const acceptURL = `/api/requests/${requestId}/accept`;
	const rejectURL = `/api/requests/${requestId}/reject`;

	showToast({
		title : 'FRIEND REQUEST',
		from : from,

		async onAccept() {
			const res = await fetch(acceptURL, { method:'POST' });
			return res.ok;
		},

		async onReject() {
			const res = await fetch(rejectURL, { method:'POST' });
			return res.ok;
		}
	});
}
