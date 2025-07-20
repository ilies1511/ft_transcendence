// src/utils/statusDot.ts
export function updateDot(userId: number, live: number | boolean) {
	const online = live === 1 || live === true

	document
		.querySelectorAll<HTMLSpanElement>(`[data-user-id="${userId}"]`)
		.forEach(dot => {
			dot.classList.toggle('bg-[#0bda8e]', online)
			dot.classList.toggle('bg-[#D22B2B]', !online)
		})
}
