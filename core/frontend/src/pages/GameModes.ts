import type { PageModule } from '../router'

const card = (img: string, label: string, desc: string) => /*html*/`
	<div class="flex flex-col gap-3">
		<div class="relative group w-full aspect-square rounded-xl overflow-hidden">
			<!-- image -->
			<div class="absolute inset-0 bg-center bg-cover"
				style='background-image:url("${img}")'></div>

			<!-- overlay + play button -->
			<div class="absolute inset-0 flex items-center justify-center
						bg-black/0 group-hover:bg-black/50 transition-colors duration-200">
				<button
					class="h-10 px-6 rounded-xl bg-[#f22667] text-white font-bold
						opacity-0 group-hover:opacity-100
						transition-opacity duration-200 cursor-pointer">
					Play
				</button>
			</div>
		</div>

		<p class="text-white text-base font-medium">${label}</p>
		<p class="text-[#b99da6] text-sm">${desc}</p>
	</div>
`

const modes = [
	{ img: '/1v1.jpg', label: '1v1 Local',
	  desc: 'Play against a friend on the same device' },

	{ img: '/1v1.jpg', label: '1v1 Online',
	  desc: 'Challenge players from around the world' },

	{ img: '/2v2.jpg', label: '4 Players',
	  desc: 'Engage in a fast-paced match with four players' },

	{ img: '/3v3.jpg', label: '6 Players',
	  desc: 'Experience the ultimate ping-pong challenge with six players' },

	{ img: '/tournament.jpg', label: 'Tournament',
	  desc: 'Compete in a structured tournament format' },
]

const template = /*html*/`
	<div class="w-full max-w-6xl mx-auto p-6">
		<h1 class="text-4xl font-bold text-white mt-6 mb-16 text-center">
			Select Game Mode
		</h1>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
			${modes.map(m => card(m.img, m.label, m.desc)).join('')}
		</div>
	</div>
`

const GameModes: PageModule = {
	render(root) {
		root.innerHTML = template
	}
}

export default GameModes
