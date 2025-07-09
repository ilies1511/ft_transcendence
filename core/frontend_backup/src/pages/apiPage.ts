// export function apiPage() {
//   return `
//   <button id="test-api-btn">Test API</button>
//   <pre id="api-result"></pre>
//   `;
// }


// export function setupApiPage() {
//   document.getElementById('test-api-btn')?.addEventListener('click', async () => {
//     const response = await fetch('/api/hello');
//     const data = await response.json();
//     document.getElementById('api-result')!.textContent = JSON.stringify(data);
//   });
// }


export function apiPage(): string {
	return `
	  <section>
		<h2>Zufallszahl aus DB</h2>
		<div id="random">Lädt…</div>
		<button id="reload">Neu laden</button>
	  </section>
	`
  }

// export function setupApiPage() {
//   async function load() {
//     const res = await fetch('/api/random')
//     const { random } = await res.json();
//     (document.getElementById('random-btn') as HTMLButtonElement)
//       .textContent = `Zahl: ${random}`
//   }
//   document.getElementById('reload')!
//     .addEventListener('click', load)
// 	load()
// }
export function setupApiPage() {
	async function load() {
	  const res = await fetch('/api/random')
	  const { random } = await res.json()          // Semikolon optional, da nun separate Zeile

	  const btn = document.getElementById('random-btn') as HTMLButtonElement
	  btn.textContent = `Zahl: ${random}`
	}

	const btn = document.getElementById('reload') as HTMLButtonElement
	btn.addEventListener('click', load)
	load()

  }

  export function setupApiPage3() {
	async function load() {
	  const res = await fetch('/api/random')
	  if (!res.ok) {
		document.getElementById('random')!.textContent = 'Fehler'
		return
	  }
	  const { random } = await res.json()
	  document.getElementById('random')!.textContent = String(random)
	}

	document.getElementById('reload')!
	  .addEventListener('click', load)

	load()
  }

