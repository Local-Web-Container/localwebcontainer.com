import grid from '../../../scripts/grid/data-grid.js'
import { initDatabase, q, decodeParam, queryInfo } from './database.js'
import 'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.5/dist/umd/popper.min.js'

const cachedDb = {}
const main = document.querySelector('main')
let database, subPage, selected

async function renderTable (database, table) {
  const _table = database.tables[table]
  const params = new URLSearchParams(location.search)
  const pick = []
  const limit = params.get('limit')
  const offset = params.get('offset')
  let order = (params.get('orderby') || '').split(',').filter(Boolean)

  if (params.get('pick')) {
    pick.push(...params.get('pick').split(',').map(x => `${x.trim()}`))
  }

  const columns = _table.columns.filter(col => (
    pick.length ? pick.includes(col.name) : true
  )).map(column => ({
    property: column.name,
    label: column.primaryKey ? '🔑 ' + column.name : column.name,
    primaryKey: column.primaryKey,
    type: column.type,
    sortable: true,
    sortDirection: order.includes(column.name)
      ? 'ascending'
      : order.includes('-' + column.name)
        ? 'descending'
        : 'none',
    sortIndex: 0,
    render: column.foreignKey ? (value, row) => {
      const a = document.createElement('a')
      const url = new URL(database.tables[column.foreignKey.table].link, location)
      url.searchParams.set(column.foreignKey.column + '.eq', value)
      a.href = url
      a.innerText = value
      return a
    }:0,
  }))

  let numberOfRows = 0
  const rows = await q(database.db, 'readTransaction', function* (x) {
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

    const [{n: count}] = yield [
      `SELECT COUNT(*) as n FROM ${table} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params
    ]

    order = order.map(o => {
      if (o.startsWith('-')) {
        return o.slice(1) + ' DESC'
      } else {
        return o + ' ASC'
      }
    })

    if (limit) {
      params.push(+limit)
    }

    if (offset) {
      params.push(+offset)
    }

    const sql =
    `SELECT ${pick.length ? pick.join(', ') : '*'}` +
    ` FROM ${table}` +
    ` ${where.length ? 'WHERE ' + where.join(' AND ') : ''}` +
    `${order.length ? 'ORDER BY ' + order.join(', ') : ''}` +
    ` ${limit ? 'LIMIT ?' : ''}` +
    ` ${offset ? 'OFFSET ?' : ''}`

    numberOfRows = count
    return yield [sql, params]
  })
  console.log(queryInfo.t)
  grid.setConfig({
    // formatResult: false,
    columns,
    data: rows,
    onSort(property, direction) {
      const params = new URLSearchParams(location.search)
      let order = (params.get('orderby') || '').split(',').filter(Boolean)
      const s = new Set(order)
      s.delete('-' + property)
      s.delete(property)
      order = [direction === 'descending' ? '-' + property : property, ...s]
      params.set('orderby', order.join(','))
      console.log(order.join(','))
      const u = new URL(location.href)
      u.search = params+''
      navigate(u)
    }
  })
  const d = document.createElement('x')
  d.setAttribute('x-import', 'pagination.js')
  d.setAttribute('data-rows', numberOfRows)
  main?.append(grid.gridNode, d)
}

async function renderView (database, view) {
  const rows = await q(database.db, 'readTransaction', function * (tx) {
    return yield view.query
  })

  const columns = Object.keys(rows[0]).map(column => ({
    property: column,
    label: column
  }))

  grid.setConfig({
    formatResult: false,
    columns,
    data: rows,
  })

  main?.append(grid.gridNode)
}

Alpine.data('WebSQL', () => ({
  init() {
    this.database = database
    this.subPage = subPage
    this.selected = selected
  },
  dropTrigger(name) {
    database.dropTrigger(name)
  },
  addRow (table) {
    globalThis.table = table
    this.$root.insertAdjacentHTML('beforeend', `<x x-import="inspector/sql/new-row.js"></x>`)
  },
  addColumn() {
    main.innerHTML = `<x x-import="inspector/sql/new-table.js" data-mode="addColumn"></x>`
  },
  rename (table) {
    const oldName = table.name
    const newName = prompt(`Rename table\nALTER TABLE "${oldName}" RENAME TO "__x__"`, oldName)
    if (!newName) return
    q(database.db, 'transaction', function* (tx) {
      yield `ALTER TABLE "${oldName}" RENAME TO "${newName}"`
    })
    table.name = newName
    database.tables[newName] = database.tables[oldName]
    delete database.tables[oldName]
  },
  drop (table) {
    confirm(
      `Are you sure you want to remove the table: "${table.name}"?\n\n` +
      `Query that will be executed:\ndrop "${table.name}"`
    ) && this.database.dropTable(table.name)
  },
  clearTable (table) {
    confirm(
      `Are you sure you want to delete all rows in "${table.name}"?\n\n` +
      `Query that will be executed:\n` +
      `DELETE FROM "${table.name}"`
    ) && this.database.clearTable(table.name)
  }
}))

export default async function (ctx) {
  const dialog = document.createElement('dialog')
  dialog.onsubmit = evt => {
    const fd = new FormData(evt.target)
    globalThis.navigate('./websql/' + fd.get('database'))
  }

  dialog.innerHTML = `
    <form method="dialog">
      <label>Database name</label>
      <input name="database" autofocus required>
      <menu style="padding: 0; text-align: center">
        <button value="other">Open / Create</button>
      </menu>
    </form>
  `

  document.querySelector('main')?.append(dialog)

  // main.innerHTML = `<x x-import="inspector/sql/new-table.js"></x>`


  let db = ctx.match.pathname.groups[0]
  if (db) {
    [database, subPage, selected] = db.split('/').map(x => x && decodeParam(x))
    database = cachedDb[database] ??= await initDatabase(database)
    globalThis.database = database

    if (!document.querySelector('#menu [x-data="WebSQL"]')) {
      document.querySelector('#menu').innerHTML = `<x x-import="inspector/sql/menu.js"></x>`
    }

    Alpine.nextTick(() => {
      document.querySelector('#menu .active')?.classList.remove('active')
      document.querySelector(`a[href="${location.pathname}"]`)?.classList.add('active')
    })
    if (subPage && selected) {
      if (subPage === 'table') {
        renderTable(database, selected)
      } else if (subPage === 'view') {
        renderView(database, database.views[selected])
      } else if (subPage === 'trigger') {
        const pre = document.createElement('pre')
        pre.innerText = database.triggers[selected].sql
        main.innerHTML = ''
        main.append(pre)
      }
    } else if (subPage === 'table' && !selected) {
      main.innerHTML = `<x x-import="inspector/sql/new-table.js"></x>`
    }
  } else {
    document.querySelector('#menu').innerHTML = ''
    dialog.show()
  }
}