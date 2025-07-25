export let is_unloading = false;

window.addEventListener('beforeunload', () => {
  is_unloading = true;
});

