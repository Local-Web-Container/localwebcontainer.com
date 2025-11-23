import grid from '../../../scripts/grid/data-grid.js'
import relativeTime from '../../../scripts/relative-time.js'
import hotkeys from '../hotkeys.js'
import menu from '../menu.js'

if (!globalThis.cookieStore) await import('../../../cookiestore.js')

const main = document.querySelector('main')

function renderDate (date) {
  return date === null ? null : relativeTime(new Date(date))
}

async function showModal() {
  const [row] = grid.getSelectedRows()
  const { edit } = await import('./edit-cookie.js')
  edit({...row.data})
}

hotkeys.register({
  'enter': showModal,
}, grid.gridNode)

export default async function (ctx) {
  if (menu.id !== 'cookies') {
    menu.id = 'cookies'
    menu.destroy()
    menu.setDocTitle('Cookies')
    // const sub = menu.createSubMenu('title')
    // sub.addItem('Add cookie', showModal)
    // sub.addItem('Clear all cookies', async () => {
  }

  const cookies = await cookieStore.getAll()
  cookies.forEach(cookie => {
    if (cookie.expires) {
      const d = new Date(cookie.expires)
      d.setMilliseconds(0) // round to nearest sec
      cookie.expires = d
    }
    cookie.session = !cookie.expires
  })
  grid.setConfig({
    formatResult: true,
    indexBy: 'key',
    columns: [
      { property: 'name', label: 'Name' },
      { property: 'value', label: 'Value' },
      { property: 'domain', label: 'Domain' },
      { property: 'expires', label: 'Expires', render: renderDate },
      { property: 'partitioned', label: 'Partitioned' },
      { property: 'path', label: 'Path' },
      { property: 'sameSite', label: 'Same Site' },
      { property: 'secure', label: 'Secure' },
    ],
    data: cookies,
    onRemove(rows) {
      rows.forEach(row => {
        cookieStore.delete(row.data.name)
        row.tr.remove()
      })
    },
    onDBclick: showModal,
  })

  main.append(grid.gridNode)
}
