export function setupCounter(element: HTMLButtonElement) {
    element.classList.add('bg-blue-600', 'text-white', 'px-4', 'py-2', 'rounded', 'hover:bg-blue-700', 'transition');
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    element.innerHTML = `count is no ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(111)
}

