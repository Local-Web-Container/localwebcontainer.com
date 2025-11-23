// import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.2/dist/dexie.mjs'
import grid from '../../../scripts/grid/data-grid.js'
import {
  initDatabase,
  encodeParam,
  decodeParam,
  alasql
} from './Database.js'
import menu from '../menu.js'

let database, subPage, selected, cachedIDB = {}

// const dexieDTSurl = 'https://cdn.jsdelivr.net/npm/dexie@3.2.2/dist/dexie.d.ts'
// const container = document.createElement('div')
const root = document.querySelector('main')
// const dexieDTS = fetch(dexieDTSurl).then(r => r.text())
// container.style.width = '100%'
// const s = document.createElement('script')
// s.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/loader.js'
// document.body.append(s)
// await new Promise(resolve => s.onload = resolve)
// s.remove()

// const require = globalThis.require
// require.config({
//   paths: {
//     vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs'
//   }
// })

// await new Promise(resolve => require(["vs/editor/editor.main"], resolve))

// const monaco = globalThis.monaco

// monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
//   noSemanticValidation: false,
//   noSyntaxValidation: false
// });

// monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
//   // target: monaco.languages.typescript.ScriptTarget.ESNext,
//   moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
//   allowJs: true,
//   checkJs: true,
//   allowNonTsExtensions: true
// });

// monaco.languages.typescript.typescriptDefaults.addExtraLib(
//   await dexieDTS,
//   'file:///node_modules/@types/dexie/index.d.ts'
// );

// monaco.languages.typescript.typescriptDefaults.addExtraLib(`
// import Dexie from "dexie";
// const db = new Dexie("test");

// declare global {
//   var db: Dexie;
// }`, 'file:///node_modules/@types/std/index.ts')

// const model = monaco.editor.createModel(
//   '',
//   'typescript',
//   monaco.Uri.parse('file:///main.js')
// )

// const editor = monaco.editor.create(container, {
//   model,
//   theme: 'vs-dark',
//   wordWrap: 'off',
//   wrappingStrategy: 'advanced',
//   overviewRulerLanes: 0,
//   scrollBeyondLastLine: false,
//   lineNumbers: 'off',
//   glyphMargin: false,
//   folding: false,
//   lineDecorationsWidth: 0,
//   scrollbar: {
//       vertical:"hidden",
//       horizontal: "hidden",
//       handleMouseWheel:false,
//   },
//   contextmenu: false,
//   minimap: { enabled: false },
//   language: "javascript"
// })
// globalThis.editor = editor

// async function runScript() {
//   const code = editor.getValue()
//   const result = await eval(code)
//   let data = []
//   let columns = []

//   if (Array.isArray(result)) {
//     data = result
//     columns = Object.keys(data[0]).map(key => ({ property: key, label: key }))
//       .filter(col => !(typeof data[0][col.property] === 'function' || col.property.startsWith('_')))
//   } else if (result.each) {
//     columns = [
//       { property: 'key', label: 'Key' },
//       { property: 'value', label: 'Value' },
//     ]
//     await result.each((val, cursor) => {
//       data.push({
//         key: cursor.key,
//         value: cursor.value,
//       })
//     })
//   } else if (typeof result === 'object') {
//     data = [result]
//     columns = Object.keys(result).map(key => ({ property: key, label: key }))
//   } else if (Object(result) !== result){
//     // result is primitive
//     data = [{ value: result }]
//     columns = [{ property: 'value', label: 'Value' }]
//   }

//   grid.setConfig({
//     columns,
//     data,
//     onRemove() {},
//   })
// }
window.alasql = alasql
Alpine.data('idb', () => ({
  init() {
    this.database = database
    this.subPage = subPage
    this.selected = selected
  },
  dropTrigger(name) {
    // database.dropTrigger(name)
  },
  addRow (table) {
    // globalThis.table = table
    // this.$root.insertAdjacentHTML('beforeend', `<x x-import="inspector/sql/new-row.js"></x>`)
  },
  rename (table) {
    const oldName = table.name
    const newName = prompt(`Rename table "${oldName}"`, oldName)
    if (!newName) return
    this.database.renameTable(oldName, newName, this.database)
  },
  drop (table) {
    confirm(
      `Are you sure you want to remove the table: "${table.name}"?`
    ) && this.database.dropTable(table.name)
  },
  clearTable (table) {
    confirm(`Are you sure you want to delete all rows in "${table.name}"?`) &&
    this.database.clearTable(table)
  }
}))

/*
AutoTypings.create(editor, mon)
window.onresize = () => editor.layout()
editor.onDidChangeModelDecorations(() => {
  updateEditorHeight() // typing
})
let prevHeight = 0
const updateEditorHeight = () => {
  const editorElement = editor.getDomNode()
  if (!editorElement) return
  const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
  const lineCount = editor.getModel()?.getLineCount() || 1
  const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight
  if (prevHeight !== height) {
    prevHeight = height
    editorElement.style.height = `${height + 10}px`
    editor.layout()
    editor.setScrollPosition({ scrollTop: 0 });
  }
}
editor.addCommand(monaco.KeyCode.Enter | monaco.KeyMod.CtrlCmd, runScript);
editor.addCommand(monaco.KeyCode.Enter | monaco.KeyMod.WinCtrl, runScript);
updateEditorHeight()
*/

async function renderTable (database, table) {
  const _table = database.tables[table]
  const params = new URLSearchParams(location.search)
  const pick = []
  const limit = params.get('limit')
  const offset = params.get('offset')
  let order = (params.get('orderby') || '').split(',').filter(Boolean)

  let numberOfRows = 0
  let rows = []

  {
    const q = new URLSearchParams(location.search)
    const where = []
    const params = []

    for (const [key, value] of q) {
      if (value === 'null') {
        if (key.endsWith('.eq')) {
          where.push(`${key.replace('.eq', '')} IS NULL`)
        } else if (key.endsWith('.neq')) {
          where.push(`${key.replace('.neq', '')} IS NOT NULL`)
        }
        continue
      }
      if (key.endsWith('.eq')) {
        where.push(`${key.slice(0, -3)} = ?`)
        params.push(value)
      }
      if (key.endsWith('.neq')) {
        where.push(`${key.slice(0, -4)} != ?`)
        params.push(value)
      }
      if (key.endsWith('.like')) {
        where.push(`${key.slice(0, -5)} LIKE ?`)
        params.push(value)
      }
      if (key.endsWith('.gt')) {
        where.push(`${key.slice(0, -3)} > ?`)
        params.push(+value)
      }
      if (key.endsWith('.gte')) {
        where.push(`${key.slice(0, -4)} >= ?`)
        params.push(+value)
      }
      if (key.endsWith('.lt')) {
        where.push(`${key.slice(0, -3)} < ?`)
        params.push(+value)
      }
      if (key.endsWith('.lte')) {
        where.push(`${key.slice(0, -4)} <= ?`)
        params.push(+value)
      }
      if (key.endsWith('.in')) {
        where.push(`${key.slice(0, -3)} IN (?)`)
        params.push(value.split(','))
      }
      if (key.endsWith('.not')) {
        where.push(`${key.slice(0, -4)} NOT IN (?)`)
        params.push(value.split(','))
      }
    }

    const count = await alasql.promise(`SELECT COUNT(*) as n FROM [${table}] ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`)

    order = order.map(o => {
      return o.startsWith('-')
        ? o.slice(1) + ' DESC'
        : ' ASC'
    })

    const sql =
    `SELECT ${pick.length ? pick.join(', ') : '*'}` +
    ` FROM [${table}]` +
    ` ${where.length ? 'WHERE ' + where.join(' AND ') : ''}` +
    ` ${order.length ? 'ORDER BY ' + order.join(', ') : ''}` +
    ` ${limit ? `LIMIT ${+limit}` : ''}` +
    ` ${offset ? `OFFSET ${+offset}` : ''}`

    rows = await alasql.promise(sql, params)
  }

  const pks = Array.isArray(_table.primaryKey)
    ? _table.primaryKey
    : [_table.primaryKey]

  const keys = {}
  for (const x of rows) {
    Object.keys(x).forEach(key => {
      keys[key] = true
    })
  }

  const columnNames = Object.keys(keys).sort().sort((a, b) => {
    if (pks.includes(a) && !pks.includes(b)) return -1
    if (!pks.includes(a) && pks.includes(b)) return 1
    return 0
  }).map(e => ({ name: e }))

  const columns = columnNames.map(column => ({
    property: column.name,
    label: pks.includes(column.name) ? '🔑 ' + column.name : column.name,
    primaryKey: pks.includes(column.name),
    sortable: true,
    sortDirection: order.includes(column.name)
      ? 'ascending'
      : order.includes('-' + column.name)
        ? 'descending'
        : 'none',
    sortIndex: 0,
  }))

  grid.setConfig({
    columns,
    // formatResult: false,
    data: rows,
    onSort(property, direction) {
      const params = new URLSearchParams(location.search)
      let order = (params.get('orderby') || '').split(',').filter(Boolean)
      const s = new Set(order)
      s.delete('-' + property)
      s.delete(property)
      order = [direction === 'descending' ? '-' + property : property, ...s]
      params.set('orderby', order.join(','))
      const u = new URL(location.href)
      u.search = params+''
      navigate(u)
    }
  })
  const d = document.createElement('x')
  d.setAttribute('x-import', 'pagination.js')
  d.setAttribute('data-rows', numberOfRows)
  root?.append(grid.gridNode, d)
  grid.gridNode.classList.add('table-bordered')
}

export default async function render (ctx) {
  let db = ctx.match.pathname.groups[0]

  if (db) {
    ;[database, subPage, selected] = db.split('/').map(x => x && decodeParam(x))
    globalThis.database = database = (cachedIDB[database] ??= await initDatabase(database))

    Alpine.store('idb', globalThis.database)

    if (menu.id !== 'idb') {
      menu.destroy()
      menu.id = 'idb'
      menu.setDocTitle(`${database.name} ${database.version}`)
      const tables = menu.createSubMenu('Tables')

      const subMenu = ['addRow', 'addColumn', 'rename', null, 'clearTable', 'drop']
      for (const table of Object.values(database.tables)) {
        tables.addItem(table.name, table.link, 'table', subMenu)
      }

      tables.addItem('New table', database.link + '/table', 'plus-lg')
    }

    if (subPage && selected) {
      if (subPage === 'store') {
        renderTable(database, selected)
      } else if (subPage === 'index') {
        // renderIndex()
      }
    } else if (subPage === 'store' && !selected) {
      main.innerHTML = `<x x-import="inspector/sql/new-store.js"></x>`
    }
  } else {
    menu.id = 'Select Database'
    menu.destroy()
    menu.setDocTitle('IndexedDB')

    Alpine.store('idb', false)
    const dbs = await indexedDB.databases()
    const dbList = dbs.map(db => ({
      name: db.name,
      version: db.version
    }))

    globalThis.all = []

    for await (const db of dbs) {
      const idb = await initDatabase(db.name)
      globalThis.all.push(await idb.export())
    }

    const columns = [
      { property: 'name', label: 'Name', sortable: true, sortDirection: 'ascending' },
      { property: 'version', label: 'Version', sortable: true, sortDirection: 'ascending' }
    ]

    grid.setConfig({
      columns,
      data: dbList,
      onDBclick() {
        const [row] = grid.getSelectedRows()
        globalThis.navigate(new URL(`./indexeddb/${encodeParam(row.data.name)}`, location.href).href)
      }
    })

    root.append(grid.gridNode)
  }

  // if ('databases' in indexedDB) {
  //   const { listDatabases } = await import('./listDatabases.js')
  //   listDatabases()
  //   root?.append(grid.gridNode)
  // }
}

    // grid.setConfig({
    //   indexBy: 'key',
    //   columns: [
    //     { property: 'key', label: 'Key' },
    //     { property: 'value', label: 'Value' },
    //   ],
    //   data: db.tables.map(table => ({ key: table.name, value: '' })),
    // })
    // root.prepend(container, grid.gridNode)