// client/friendUI.ts
export function initFriendUI() {
	const root = document.getElementById('friend-ui-root')!;
	root.innerHTML = template;
	wireEvents(root);
  }

  const template = /*html*/ `
  <!-- floating button -->
  <button id="toggleBtn"
		  class="fixed bottom-[60px] right-6 z-50 flex h-14 w-14 items-center justify-center
				 rounded-full bg-[#f22667] text-white shadow-lg hover:bg-[#d71d59]">
	💬
  </button>

  <!-- wrapper (hidden at start) -->
  <div id="panelWrapper"
	   class="fixed bottom-[130px] right-6 z-40 w-72 hidden flex flex-col">

	<!-- Friends list -->
	<div id="friendsPanel" class="space-y-2 rounded-xl bg-[#2b171e] p-4 shadow-lg">
	  <div class="flex items-center justify-between text-white">
		<h3 class="text-lg font-bold">Friends</h3>
		<button id="closePanel" class="text-xl leading-none">✕</button>
	  </div>

	  <ul class="mt-3 space-y-2">
		<li data-user="liam" class="friendRow">Liam Bennett</li>
		<li data-user="ava"  class="friendRow">Ava Turner</li>
		<li data-user="noah" class="friendRow">Noah Wilson</li>
	  </ul>
	</div>

	<!-- Chat panel -->
	<div id="chatPanel"
		 class="hidden bottom-[130px] flex flex-col h-[320px] rounded-xl bg-[#2b171e] p-4 shadow-lg">

	  <div class="mb-2 flex items-center justify-between text-white">
		<button id="backBtn"   class="text-xl leading-none">←</button>
		<h3    id="chatUser"   class="font-bold"></h3>
		<button id="closeChat" class="text-xl leading-none">✕</button>
	  </div>

	  <div id="messages"
		   class="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 text-[#b99da6]">
	  </div>

	  <form id="msgForm" class="mt-2 flex">
		<input id="msgInput"
			   class="flex-1 rounded-l-lg bg-[#181113] p-2 text-white focus:outline-none" placeholder="Message…" autocomplete="off">
		<button class="rounded-r-lg bg-[#f22667] px-4 text-white">Send</button>
	  </form>
	</div>
  </div>
  `;


  function wireEvents(root: HTMLElement) {
	const toggleBtn   = root.querySelector<HTMLButtonElement>('#toggleBtn')!;
	const panelWrap   = root.querySelector<HTMLElement>        ('#panelWrapper')!;
	const friendsPan  = root.querySelector<HTMLElement>        ('#friendsPanel')!;
	const chatPanel   = root.querySelector<HTMLElement>        ('#chatPanel')!;
	const closePanel  = root.querySelector<HTMLButtonElement>('#closePanel')!;
	const backBtn     = root.querySelector<HTMLButtonElement>('#backBtn')!;
	const closeChat   = root.querySelector<HTMLButtonElement>('#closeChat')!;
	const chatUserLbl = root.querySelector<HTMLElement>        ('#chatUser')!;
	const msgForm     = root.querySelector<HTMLFormElement>    ('#msgForm')!;
	const msgInput    = root.querySelector<HTMLInputElement>   ('#msgInput')!;
	const messagesBox = root.querySelector<HTMLElement>        ('#messages')!;

	/* helpers */
	const showWrapper = () => panelWrap.classList.remove('hidden');
	const hideWrapper = () => panelWrap.classList.add   ('hidden');
	const showFriends = () => { friendsPan.classList.remove('hidden'); chatPanel.classList.add   ('hidden'); };
	const showChat    = () => { friendsPan.classList.add   ('hidden'); chatPanel.classList.remove('hidden'); };

	/* bubble toggle */
	toggleBtn.addEventListener('click', () => {
	  const closed = panelWrap.classList.contains('hidden');
	  closed ? (showFriends(), showWrapper()) : hideWrapper();
	});

	/* close icons */
	closePanel.addEventListener('click', hideWrapper);
	closeChat .addEventListener('click', hideWrapper);

	/* friend → chat view */
	root.querySelectorAll<HTMLElement>('.friendRow').forEach(li => {
	  li.className += ' cursor-pointer rounded-lg bg-[#181113] px-3 py-2 text-white hover:bg-[#3c272d]';
	  li.addEventListener('click', () => {
		chatUserLbl.textContent = li.textContent!;
		showChat();
		msgInput.focus();
	  });
	});

	backBtn.addEventListener('click', showFriends);

	/* demo echo TODO: need to replace with a real thing. */
	msgForm.addEventListener('submit', e => {
	  e.preventDefault();
	  if (!msgInput.value.trim()) return;
	  messagesBox.insertAdjacentHTML(
		'beforeend',
		`<div class="text-right"><span class="inline-block rounded-lg bg-[#f22667] px-2 py-1 text-white">${msgInput.value}</span></div>`
	  );
	  msgInput.value = '';
	  messagesBox.scrollTop = messagesBox.scrollHeight;
	});
  }
