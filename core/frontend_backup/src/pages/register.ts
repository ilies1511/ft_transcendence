// src/frontend/src/pages/register.ts
export function registerPage(): string {
	return `
	  <h2>Registrieren</h2>
	  <input id="username" placeholder="Username" />
	  <input id="password" type="password" placeholder="Password" />
	  <button id="submit">Registrieren</button>
	  <pre id="result"></pre>
	`
  }

  export function setupRegister() {
	document.getElementById('submit')!.addEventListener('click', async () => {
	  const username = (document.getElementById('username') as HTMLInputElement).value
	  const password = (document.getElementById('password') as HTMLInputElement).value
	  const res = await fetch('/api/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	  })
	  const data = await res.json()
	  document.getElementById('result')!.textContent = JSON.stringify(data)
	})
  }
