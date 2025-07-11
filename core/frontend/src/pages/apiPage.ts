export function apiPage() {
	return `
		<button id="test-api-btn">Test API</button>
		<pre id="api-result"></pre>
	`;
}


export function setupApiPage() {
	document.getElementById('test-api-btn')?.addEventListener('click', async () => {
		const response = await fetch('/api/hello');
		const data = await response.json();
		document.getElementById('api-result')!.textContent = JSON.stringify(data);
	});
}
