import x from 'https://cdn.jsdelivr.net/npm/sql.js@1.7.0/dist/sql-wasm.js'

const root = await navigator.storage.getDirectory()
const file = await root.getFileHandle('dumdum.db').then(h => h.getFile())
const ab = await file.arrayBuffer()
const uint8 = new Uint8Array(ab)
const code = await fetch('https://cdn.jsdelivr.net/npm/sql.js@1.7.0/dist/worker.sql-wasm.js').then(res => res.text())
const blob = new Blob([
  code.replace('var sqlModuleReady = initSqlJs();', `var sqlModuleReady = initSqlJs({
    locateFile: file => 'https://cdn.jsdelivr.net/npm/sql.js@1.7.0/dist/' + file
  });`)
], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));

// create simple json rpc interface for the worker
const callbacks = {}
let i = 0
const rpc = {
  call: (obj, trans) => new Promise((resolve, reject) => {
    const id = i++
    callbacks[id] = { resolve, reject }
    worker.postMessage({ ...obj, id }, trans);
  })
}

worker.onmessage = e => {
  const { id, ...rest } = e.data
  callbacks[id].resolve(rest)
  delete callbacks[id]
};

const ready = await rpc.call({ action: 'open', buffer: uint8 }, [uint8.buffer])
const { results } = await rpc.call({ action: 'exec', sql: 'SELECT * from sqlite_master WHERE name NOT LIKE "sqlite_%"' })

function * it (row) {
  const cols = row.columns
  for (const item of row.values) {
    yield Object.fromEntries(cols.map((col, i) => [col, item[i]]))
  }
}

const tables = []

for (const row of it(results[0])) {
  tables.push(row)
}

await database.dropAll([
  ...Object.values(database.triggers),
  ...Object.values(database.views),
  ...Object.values(database.tables),
])

// First create all tables
await new Promise((rs, rj) => {
  database.db.transaction(tx => {
    tables.forEach(table => {
      tx.executeSql(table.sql, [], console.log, err => {
        console.group('error')
        console.info(table.sql)
        console.error(err)
        console.groupEnd()
      })
    })
  }, rj, rs)
})

// Then insert data
for (const row of tables) {
  if (row.type === 'table') {
    const { results } = await rpc.call({ action: 'exec', sql: `SELECT * from ${row.name}` })
    const n = results[0]
    const val = `(${n.columns.map(() => '?').join(', ')})`
    const columns = n.columns.join(', ')
    const values = Array(n.values.length).fill(val).join(', ')
    const sql = `INSERT INTO ${row.name} (${columns}) VALUES ${values}`

    await new Promise((rs, rj) => {
      database.db.transaction(tx => {
        tx.executeSql(sql, n.values.flat(), rs, err => {
          console.group('error')
          console.info(sql, n.values)
          console.error(err)
          console.groupEnd()
          rj(err)
        })
      })
    })
  }
}