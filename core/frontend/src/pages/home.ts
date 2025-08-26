// frontend/src/pages/home.ts
import type { PageModule } from '../router';
import { getSession } from '../services/session';

const rows = [
	{
		title:'Profile',
		href:'/profile',
		img:'/home_profile.png',
		body:`On the Profile page, you can view detailed information about your ping pong matches.
			This includes the total number of matches you've played, as well as your wins, losses, and draws.
			You can also check your match history, which shows the date of each match, your opponent,
			the final score, and whether you won, lost, or drew. All your results are displayed in a clear, organized list,
			so you can easily track your progress and performance over time.`
	},
	{
		title:'Play the Pong',
		href:'/modes',
		img:'/home_play.png',
		body:`On the Play page, you can choose between three exciting ways to play: Matchmaking,
			Custom Lobby, or Tournament. In each mode, you set your preferred game options, like the map
			and other settings, before entering a match. In Matchmaking, you are automatically placed
			in a lobby with other players looking for the same game options, or a new lobby is created
			if none match. In Custom Lobby, you can create your own game and invite friends to join.
			Tournaments let you set up structured competitions, and everyone who joins can invite
			other players until the tournament starts!`
	},
	{
		title:'Friends',
		href:'/friendlist',
		img:'/home_friend_list.png',
		body:`The Friends page lets you manage all your friendships in one place.
			You'll see three sections here: incoming requests, outgoing requests, and your current friends list.
			At the top, you'll find your incoming friend requests, where you can choose to accept or reject
			new connection requests from other users. Below that, your outgoing requests show the people you've
			sent a friend request to-so you'll always know who hasn't replied yet!
			Finally, you can see all your current friends.`
	},
	{
		title:'Users',
		href:'/users',
		img:'/home_all_users.png',
		body:`On the Users page, you can see a list of all registered users.
			Here, you can view each user's online status, send them a friend invitation,
			or see if you have any pending requests. You also have the option to reject
			invites or block users if needed. This page makes it easy to connect with new
			people, manage your interactions, and keep your social experience just the way you like it.`
	},
	{
		title:'Settings',
		href:'/settings',
		img:'/home_settings.png',
		body:`On the Settings page, you can manage your personal account information and security preferences.
			You can update your profile details, such as your username and nickname, or change your avatar by
			uploading a new image. If you want to improve your security, you can change your password or
			enable two-factor authentication (2FA) for extra protection. The settings page also lets
			you manage your account and data. You can delete your account, anonymize your data, or export
			your match history in different formats.`
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
	async render(root){
		const session = await getSession();

		const playButtonHtml = session
			? /*html*/`
				<div class="text-center">
					<a href="/modes" data-route class="inline-block bg-green-500 text-white font-bold py-4 px-10 rounded-lg text-2xl hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl transform mb-10">
						Play Now!
					</a>
				</div>`
			: '';

		const renderedRows = rows
			.map((rowObj, index) => {
				return row(rowObj, index);
			})
			.join('');
		root.innerHTML = /*html*/`
		<div class="min-h-screen bg-[#221116] flex flex-col items-center p-6 pt-[70px] space-y-10">
			<div class="w-full max-w-6xl mx-auto space-y-5">
				<h1 class="text-6xl text-white font-semibold text-center">
					Welcome to Ping-Pong Revolution
				</h1>
				<p class="text-[#ca91a3] text-center leading-relaxed">
					Challenge friends, climb the ladder, and master every spin.
				</p>
				${playButtonHtml}
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