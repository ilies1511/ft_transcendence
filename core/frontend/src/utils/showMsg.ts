// ok = true - green (“msg-ok”)
// ok = false - red (“msg-error”)

export function showMsg(
	el: HTMLElement,
	text: string,
	ok = false,
): void {
	el.textContent = text
	el.className = `form-msg ${ ok ? 'msg-ok' : 'msg-error' }`
}
