import { icons } from '../ui/icons';

export const template = /*html*/`
	<!-- bubble -->
	<button id="allToggle"
		class="fixed bottom-[65px] left-6 z-50 flex h-14 w-14 items-center justify-center
			rounded-full bg-[#357edd] text-white shadow-lg hover:bg-[#2c69b8] cursor-pointer">
		${icons.users} 
	</button>

	<div id="allWrapper"
		class="fixed bottom-[140px] left-6 z-40 w-80 hidden flex flex-col">

		<div id="allPanel"
			class="space-y-2 rounded-xl bg-[#2b171e] p-4 shadow-lg max-h-[400px] overflow-y-auto">

			<div class="flex items-center justify-between text-white">
				<h3 class="text-lg font-bold">All users</h3>
				<button id="allClose" class="text-xl leading-none cursor-pointer">
					${icons.closeX_micro}
				</button>
			</div>

			<ul id="allList" class="mt-3 space-y-2">
				<li class="text-[#b99da6]">Loading…</li>
			</ul>
		</div>
	</div>
`;

export function showAll() {
	document.getElementById('allWrapper')!.classList.remove('hidden');
}
export function hideAll() {
	document.getElementById('allWrapper')!.classList.add('hidden');
}

function toggleHandler() {
	const wrap = document.getElementById('allWrapper')!;
	wrap.classList.toggle('hidden');
}
function closeHandler() { hideAll(); }

export function wireEvents(root: HTMLElement) {
	const toggle = root.querySelector<HTMLButtonElement>('#allToggle');
	const close	 = root.querySelector<HTMLButtonElement>('#allClose');

	if (toggle) toggle.addEventListener('click', toggleHandler);
	if (close) close.addEventListener('click', closeHandler);
}
export function unWireEvents(root: HTMLElement) {
	const toggle = root.querySelector<HTMLButtonElement>('#allToggle');
	const close = root.querySelector<HTMLButtonElement>('#allClose');

	if (toggle) toggle.removeEventListener('click', toggleHandler);
	if (close) close.removeEventListener('click', closeHandler);
}
