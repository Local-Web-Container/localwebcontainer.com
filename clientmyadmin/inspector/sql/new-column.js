const url = new URL('./new-column.html', import.meta.url)
const res = await fetch(url)

export const template = await res.text()