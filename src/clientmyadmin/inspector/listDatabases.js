import grid from '../../scripts/grid/data-grid.js'
import hotkeys from './hotkeys.js'

function deleteDatabase() {
  const rows = grid.getSelectedRows()

  for (const row of rows) {
    row.tr.remove()
    indexedDB.deleteDatabase(row.data.name)
  }
}

function showContextMenu() {
  const rows = grid.getSelectedRows()
  const n = rows.length
  return [{
    get title() {
      return n > 1
        ? `Delete ${n} databases`
        : 'Delete database'
    },
    shortcut: 'Del / ⌫',
    onclick: deleteDatabase
  }, {
    title: 'Open database',
    shortcut: '\u2B90',
    onclick: openDatabase
  }]
}

function openDatabase () {
  const [row] = grid.getSelectedRows()
  globalThis.navigate(`indexeddb/${row.data.name}`)
}

hotkeys.register({
  'delete': deleteDatabase,
  'backspace': deleteDatabase,
  'enter': openDatabase,
})

export async function listDatabases () {
  const data = await indexedDB.databases()

  grid.setConfig({
    onContextMenu: showContextMenu,
    onDBclick: openDatabase,
    columns: [
      { property: 'name', label: 'Name', render: (name, row) => `${name} - v${row.version}` },
    ],
    data,
  })
}