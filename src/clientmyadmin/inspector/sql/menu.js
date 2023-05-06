export const template = await fetch(
  new URL('./menu.html', import.meta.url)
).then(r => r.text())