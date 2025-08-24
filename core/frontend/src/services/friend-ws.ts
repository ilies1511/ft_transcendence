// /src/friends/friend-ws.ts
import { wsEvents } from './websocket'
import { friendRequestToast } from '../ui/friendRequestToast'

function handleNewFriendRequest(ev: Event) {
	const { requestId, from } = (ev as CustomEvent).detail
	friendRequestToast(requestId, from)
}

export function initFriendRequestWs() {
	wsEvents.addEventListener('new_friend_request', handleNewFriendRequest)
}
export function destroyFriendRequestWs() {
	wsEvents.removeEventListener('new_friend_request', handleNewFriendRequest)
}
