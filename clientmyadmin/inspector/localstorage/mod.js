import grid from '../../../scripts/grid/data-grid.js'
import menu from '../menu.js'

const main = document.querySelector('main')

export default function (ctx) {
  const name = ctx.url.pathname.split('/').pop()

  const bc = name === 'localstorage'
    ? localStorage
    : sessionStorage

  if (menu.id !== name) {
    menu.id = name
    menu.destroy()
    menu.setDocTitle(name === 'localstorage' ? 'Local Storage' : 'Session Storage')
    const sub = menu.createSubMenu('title')
    sub.addItem('Clear everything')
  }

  const data = []
  for (let i = 0; i < bc.length; i++) {
    const key = bc.key(i)
    const value = bc.getItem(key)
    data.push({ key, value })
  }

  grid.setConfig({
    formatResult: false,
    indexBy: 'key',
    columns: [
      { property: 'key', label: 'Key' },
      { property: 'value', label: 'Value' }
    ],
    data,
    onRemove() {},
  })

  main.append(grid.gridNode)
}