// src/ui/friendRequestToast.ts
import { showToast } from './toast-interface';
import { token as CSRFToken } from '../services/session';

export function friendRequestToast(requestId:number, from:string) {
	const acceptURL = `/api/requests/${requestId}/accept`;
	const rejectURL = `/api/requests/${requestId}/reject`;

	showToast({
		title : 'FRIEND REQUEST',
		from : from,

		async onAccept() {
			const headers = new Headers();
			if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
			const res = await fetch(acceptURL, {
				method: 'POST',
				headers,
				credentials: 'include',
			});
			return res.ok;
		},

		async onReject() {
			const headers = new Headers();
			if (CSRFToken) headers.set('X-CSRF-Token', CSRFToken);
			const res = await fetch(rejectURL, {
				method: 'POST',
				headers,
				credentials: 'include',
			});
			return res.ok;
		},
	});
}
