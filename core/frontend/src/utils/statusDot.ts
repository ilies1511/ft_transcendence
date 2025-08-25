// src/utils/statusDot.ts
export function updateDot(userId: number, live: number | boolean) {
	const online = live === 1 || live === true

	document
		.querySelectorAll<HTMLSpanElement>(`[data-user-id="${userId}"]`)
		.forEach(dot => {
			if (dot.classList.contains('status-dot')) {
				// Users list uses .status-dot.online/.offline
				dot.classList.toggle('online', online)
				dot.classList.toggle('offline', !online)
			} else {
				// Profile dot uses Tailwind bg classes
				dot.classList.toggle('bg-[#0bda8e]', online)
				dot.classList.toggle('bg-[#D22B2B]', !online)
			}
		})
}
