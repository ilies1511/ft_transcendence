// frontend/src/pages/home.ts
import type { PageModule } from '../router'

const rows = [
	{
		title:'Profile',
		href:'/profile',
		img:'/home_profile.png',
		body:`Lorem Ipsum is simply dummy text of the printing and typesetting industry.\
			Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,\
			when an unknown printer took a galley of type and scrambled it to make a type specimen book.\
			It has survived not only five centuries, but also the leap into electronic typesetting,\
			remaining essentially unchanged.`
	},
	{
		title:'Play the Pong',
		href:'/modes',
		img:'/home_play.png',
		body:`Lorem Ipsum is simply dummy text of the printing and typesetting industry.\
			Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,\
			when an unknown printer took a galley of type and scrambled it to make a type specimen book.\
			It has survived not only five centuries, but also the leap into electronic typesetting,\
			remaining essentially unchanged.`
	},
	{
		title:'Friends',
		href:'/friendlist',
		img:'/home_friend_list.png',
		body:`Lorem Ipsum is simply dummy text of the printing and typesetting industry.\
			Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,\
			when an unknown printer took a galley of type and scrambled it to make a type specimen book.\
			It has survived not only five centuries, but also the leap into electronic typesetting,\
			remaining essentially unchanged.`
	},
	{
		title:'All Users',
		href:'/users',
		img:'/home_all_users.png',
		body:`Lorem Ipsum is simply dummy text of the printing and typesetting industry.\
			Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,\
			when an unknown printer took a galley of type and scrambled it to make a type specimen book.\
			It has survived not only five centuries, but also the leap into electronic typesetting,\
			remaining essentially unchanged.`
	},
	{
		title:'Settings',
		href:'/settings',
		img:'/home_settings.png',
		body:`Lorem Ipsum is simply dummy text of the printing and typesetting industry.\
			Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,\
			when an unknown printer took a galley of type and scrambled it to make a type specimen book.\
			It has survived not only five centuries, but also the leap into electronic typesetting,\
			remaining essentially unchanged.`
	},
] as const

const row = (
	{ title, href, img, body }:
	{ title:string; href:string; img:string; body:string },
	i:number
) => {
	const imgPart = /*html*/`
		<a href="${href}" data-route
			class="relative shrink-0 flex items-center justify-center
				rounded-lg overflow-hidden
				bg-[#2b171e]/60 hover:bg-[#392029]
				border-[5px] border-white/40 hover:border-[#824155]
				shadow-sm hover:shadow transition-colors duration-150">
			<img src="${img}" alt="${title}"
				class="w-72 h-72 md:w-80 md:h-80 object-cover pointer-events-none" />
			<span class="absolute inset-0
				bg-[#824155]/40 group-hover:bg-[#824155]/20
				mix-blend-multiply pointer-events-none transition">
			</span>
		</a>`

	const textPart = /*html*/`
		<div class="flex-1 text-center sm:text-left">
			<a href="${href}" data-route
				class="text-4xl md:text-5xl font-extrabold text-white hover:underline">
				${title}
			</a>
			<p class="mt-2 text-[#b99da6] leading-relaxed">${body}</p>
		</div>`;

	const isEven = i % 2 === 1;
	const sidePad = isEven ? 'lg:pl-24 md:pl-12 sm:pl-6' : 'lg:pr-24 md:pr-12 sm:pr-6';
	const dir = isEven ? 'sm:flex-row-reverse' : '';

	return /*html*/`
	<li class="flex flex-col sm:flex-row items-center gap-6 ${dir} ${sidePad}">
		${imgPart}
		${textPart}
	</li>`
}
const HomePage:PageModule = {
	render(root){
		const renderedRows = rows
			.map((rowObj, index) => {
				return row(rowObj, index);
			})
			.join('');
		root.innerHTML = /*html*/`
		<div class="min-h-screen bg-[#221116] flex flex-col items-center p-6 space-y-10">
			<div class="w-full max-w-6xl mx-auto space-y-10">
				<h1 class="text-6xl text-white font-semibold text-center">
					Welcome to Ping-Pong Revolution
				</h1>
				<p class="text-[#ca91a3] text-center leading-relaxed">
					Challenge friends, climb the ladder, and master every spin.
				</p>
				<hr class="border-white/40"/>
				<ul class="space-y-14 px-4">
					${renderedRows}
				</ul>
			</div>
		</div>`
	},
	afterRender(){ /* nothing for now */ }
}

export default HomePage