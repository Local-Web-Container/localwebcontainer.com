import { q, encodeParam } from './util.js'
import { Table } from './table.js'
import { Index } from './index.js'
import { View } from './view.js'
import { Trigger } from './trigger.js'

const MasterInfo = "SELECT * FROM sqlite_master WHERE name NOT LIKE '%WebKitDatabaseInfoTable%'"

export * from './util.js'
export * from './table.js'
export * from './index.js'
export * from './view.js'
export * from './trigger.js'

/**
 * @typedef {Object} DB
 * @property {string} version
 * @property {function} transaction
 * @property {function} readTransaction
 * @property {function} changeVersion
 */

export class Database {
  name = ''
  /** @type {Object<string, Table>} */
  tables = {}
  /** @type {Object<string, View>} */
  views = {}
  /** @type {Object<string, Trigger>} */
  triggers = {}
  link = ''
  /** @type {DB} */
  db

  async export (config = {}) {
    let result = ''
    const tables = Object.values(this.tables)

    for (const table of tables) result += `${table.sql};\n`
    result += `\n`
    for (const view of this.views) result += `${view.sql};\n`
    result += `\n`
    for (const trigger of this.triggers) result += `${trigger.sql};\n`
    result += `\n`

    await q(this.db, 'readTransaction', function *() {
      for (const table of tables) {
        const rows = yield `SELECT * FROM "${table.name}"`
        const fields = Object.keys(rows[0] || {}).join(', ')

        rows.map.row(row => {
          Object.values(o)
        })
        for (const row of rows) {
          result += `INSERT INTO "${table.name}" (${fields}) VALUES (${Object.values(row).join(', ')});\n`
        }
      }
    })

    return result
  }

  async migrateToIndexedDB () {
    const tables = Object.values(this.tables).filter(x => !x.name.startsWith('sqlite_'))
    const del = indexedDB.deleteDatabase(this.name)
    await new Promise(resolve => del.onsuccess = resolve)
    const request = indexedDB.open(this.name, +this.db.version)
    const onupgradeneeded = () => {
      // This will
      // - Creates collections for each table
      // - make idb index of each Database.indexes

      const db = request.result
      for (const table of tables) {
        // get the primary key column name
        const pk = table.columns.filter(c => c.primaryKey)
        const options = {}
        if (pk.length === 1) {
          options.keyPath = pk[0].name
          if (pk[0].autoIncrement) options.autoIncrement = true
        } else if (pk.length > 1) {
          options.keyPath = pk.map(c => c.name)
        }
        db.createObjectStore(table.name, options)
      }
    }
    request.onupgradeneeded = onupgradeneeded
    request.onsuccess = async () => {
      // Now that all object stores and indexes are created, we can insert rows
      const db = request.result
      for (const table of tables) {
        const rows = await q(this.db, 'readTransaction', function *() {
          return yield `SELECT * FROM "${table.name}"`
        })
        const tx = db.transaction(table.name, 'readwrite')
        const store = tx.objectStore(table.name)
        console.log('adding stuff to store', table.name)
        for (const row of rows) store.add(row)
        await new Promise(resolve => tx.oncomplete = resolve)
      }
    }
  }

  dropTable (table) {
    q(this.db, 'transaction', function *() {
      yield `DROP TABLE IF EXISTS "${table}"`
    })
    delete this.tables[table]
  }

  dropTrigger (trigger) {
    const {name} = trigger
    q(this.db, 'transaction', function *() {
      yield `DROP TRIGGER IF EXISTS "${name}"`
    })
    delete this.triggers[name]
  }

  insertRow (table, obj) {
    return q(this.db, 'transaction', function* (tx) {
      yield [
        `INSERT INTO "${table.name}" (${Object.keys(obj)}) VALUES (${Object.keys(obj).map(x => `?`).join(', ')})`,
        Object.values(obj)
      ]
    })
  }

  clearTable (table) {
    q(this.db, 'transaction', function *() {
      yield `DELETE FROM "${table}"`
    })
  }

  /** @param {(Table|View|Trigger)[]} stuff */
  dropAll (stuff) {
    q(this.db, 'transaction', function *() {
      for (const thing of stuff) {
        if (thing.name.startsWith('sqlite_')) continue
        yield `DROP ${thing.type} IF EXISTS "${thing.name}"`
      }
    })
  }
}

export async function initDatabase(dbName) {
  const database = new Database()
  const db = globalThis.openDatabase(dbName, '', '', 0)
  database.name = dbName
  database.db = db
  database.tables.sqlite_master = new Table({
    name: 'sqlite_master',
    sql: 'CREATE TABLE sqlite_master (name text, type text, tbl_name text, rootpage integer, sql text)',
  }, database)
  database.link = `/clientmyadmin/inspector/websql/${encodeParam(dbName)}`

  await q(db, 'readTransaction', function * () {
    const sortingArr = ['table']
    const info = (yield MasterInfo).sort((a,b) =>
      b.tbl_name.startsWith('sqlite_') ? 1 : sortingArr.indexOf(a.tbl_name) - sortingArr.indexOf(b.tbl_name)
    )
    for (const row of info) {
      if (row.type === 'table') {
        database.tables[row.name] = new Table(row, database)
      } else if (row.type === 'index') {
        database.tables[row.tbl_name].indexes.push(new Index(row, database))
      } else if (row.type === 'trigger') {
        database.triggers[row.name] = new Trigger(row, database)
      } else if (row.type === 'view') {
        database.views[row.tbl_name] = new View(row, database)
      } else {
        console.warn(`unknown type: ${row.type}`)
      }
    }
  })

  // database.migrateToIndexedDB()
  return database
}


// await import('https://cdn.jsdelivr.net/npm/sql.js@1.7.0/dist/worker.sql-wasm.js')
// var worker = new Worker('https://cdn.jsdelivr.net/npm/sql.js@1.7.0/dist/worker.sql-wasm.js');

// const config = {
//   locateFile: filename => `https://cdn.jsdelivr.net/npm/sql.js@1.7.0/dist/${filename}`
// }

// // The `initSqlJs` function is globally provided by all of the main dist files if loaded in the browser.
// // We must specify this locateFile function if we are loading a wasm file from anywhere other than the current html page's folder.
// const sql = await globalThis.initSqlJs(config)
// console.log(sql)
// //Create the database
// const db = new SQL.Database();
// // Run a query without reading the results
// db.run("CREATE TABLE test (col1, col2);");
// // Insert two rows: (1,111) and (2,222)
// db.run("INSERT INTO test VALUES (?,?), (?,?)", [1,111,2,222]);

// // Prepare a statement
// const stmt = db.prepare("SELECT * FROM test WHERE col1 BETWEEN $start AND $end");
// stmt.getAsObject({$start:1, $end:1}); // {col1:1, col2:111}

// // Bind new values
// stmt.bind({$start:1, $end:2});

// while(stmt.step()) { //
//   const row = stmt.getAsObject();
//   console.log('Here is a row: ' + JSON.stringify(row));
// }