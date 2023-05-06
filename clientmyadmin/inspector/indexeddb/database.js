import alasql from 'https://cdn.jsdelivr.net/npm/alasql@1.7.3/+esm'
import { q, encodeParam } from './util.js'
import { Table } from './table.js'

export { alasql }
export * from './util.js'
export * from './table.js'
export * from './index.js'


alasql.engines.INDEXEDDB.fromTable = function (databaseid, tableid, cb, idx, query) {
	var ixdbid = alasql.databases[databaseid].ixdbid
	var request = indexedDB.open(ixdbid)
	request.onsuccess = () => {
		const result = []
		const idb = request.result
		const store = idb.transaction([tableid]).objectStore(tableid)
    const cur = store.openCursor()
    const keyPath = store.keyPath
		cur.onsuccess = () =>  {
			const cursor = cur.result
			cursor
        ? (
          result.push( keyPath ? cursor.value : { key: cursor.key, value: cursor.value }),
          cursor.continue()
        )
				: (idb.close(), cb?.(result, idx, query))
    }
	}
}

alasql.engines.INDEXEDDB.intoTable = function (databaseid, tableid, value, columns, cb) {
	const ixdbid = alasql.databases[databaseid].ixdbid;
	const request1 = indexedDB.open(ixdbid);
	request1.onsuccess = () => {
		const idb = request1.result
		const tx = idb.transaction([tableid], 'readwrite')
		const os = tx.objectStore(tableid)
		const { keyPath } = os

		for (var i = 0, ilen = value.length; i < ilen; i++) {
      if (keyPath) {
        os.put(value[i])
      } else if (value[i].key) {
        os.put(value[i].value, value[i].key)
      } else {
        os.put(value[i])
      }
		}

		tx.oncomplete = () => {
			idb.close()
			cb?.(ilen)
		}
	}
}

export class Database {
  name = ''
  /** @type {Object<string, Table>} */
  tables = {}
  link = ''
  /** @type {IDBDatabase} */
  db

  get version () {
    return this.db.version
  }

  async export () {
    const data = {
      name: this.name,
      version: this.version,
      /** @type {{rows: Array, table: Table}[]} */
      tables: []
    }

    for (const [name, table] of Object.entries(this.tables)) {

      data.tables.push({
        rows: await alasql.promise(`SELECT * FROM [${name}]`),
        table
      })
    }

    // const { Encoder } = await import('https://cdn.jsdelivr.net/npm/cbor-x@1/browser.js/+esm')
    // let structure = null
    // const encoder = new Encoder({
    //   structuredClone: true,
    //   pack: true,
    //   mapsAsObjects: true,
    //   saveStructures: format => structure = format
    // })
    // const result = encoder.encode(data)
    // const pureUint8Array = new Uint8Array(result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength))
    return data
    // return [pureUint8Array, JSON.stringify(structure)]
  }

  /**
   * @param {ReturnType<Database['export']>} xdata
   */
  async import(xdata) {
    const data = await xdata
    const { tables, name, version } = data
    // check if database exists
    const databases = await indexedDB.databases()
    const exists = databases.find(x => x.name === this.name)
    if (exists) {
      const del = indexedDB.deleteDatabase(this.name)
      await new Promise(resolve => del.onsuccess = resolve)
    }
    const request = indexedDB.open(name, +version)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const table of tables) {
        const store = db.createObjectStore(table.table.name, { keyPath: table.table.primaryKey })
        for (const index of Object.values(table.table.indexes)) {
          store.createIndex(index.name, index.keyPath, { unique: index.unique, multiEntry: index.multiEntry })
        }
      }
    }

    // wait for database to be created
    await new Promise(resolve => request.onsuccess = resolve)

    // insert data
    const db = request.result
    // insert data
    if (tables.length) {
      const tx = db.transaction(tables.map(x => x.table.name), 'readwrite')
      for (const table of tables) {
        const store = tx.objectStore(table.table.name)
        const keyPath = store.keyPath
        try {
          for (const row of table.rows) {
            keyPath ? store.put(row) : store.put(row.value, row.key)
          }
        } catch (e) {
          console.log(store)
          console.error(`Error inserting row into table ${name}: ${table.table.name}: ${e.message}`)
        }
      }
      // wait for transaction to complete
      await new Promise(resolve => tx.oncomplete = resolve)
    }

    // close database
    request.result.close()
  }

  /** @param {string} table */
  async dropTable(table) {
    await alasql.promise(`DROP TABLE IF EXISTS [${table}]`)
    delete this.tables[table]
  }

  insertRow (table, obj) {
    return q(this.db, 'transaction', function* (tx) {
      yield [
        `INSERT INTO "${table.name}" (${Object.keys(obj)}) VALUES (${Object.keys(obj).map(x => `?`).join(', ')})`,
        Object.values(obj)
      ]
    })
  }

  renameTable (oldName, newName, db) {
    return new Promise((rs, rj) => {
      let request = indexedDB.open(this.name, this.db.version + 1)
      request.onupgradeneeded = () => {
        request.transaction.objectStore(oldName).name = newName
        db.tables[oldName].name = newName
        db.tables[newName] = db.tables[oldName]
        delete db.tables[oldName]
        rs()
      }
    })
  }

  clearTable (table) {
    alert(table.name)
    return new Promise((rs, rj) => {
      let request1 = indexedDB.open(this.name)
      request1.onsuccess = () => {
        const request2 = request1
          .result
          .transaction([table.name], 'readwrite')
          .objectStore(table.name)
          .clear()
        request2.onsuccess = rs
        request2.onerror = rj
      }
      request1.onerror = rj
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
  window.alasql = alasql
  await alasql.promise(
    `CREATE INDEXEDDB DATABASE IF NOT EXISTS [${dbName}];` +
    `ATTACH INDEXEDDB DATABASE [${dbName}];` +
    `USE [${dbName}];`
  )

  return new Promise(resolve => {
    const req = indexedDB.open(dbName)
    const db = new Database()
    db.link = `/clientmyadmin/inspector/indexeddb/${encodeParam(dbName)}`
    db.name = dbName
    req.onsuccess = () => {
      db.db = req.result
      const names = [...db.db.objectStoreNames]
      if (names.length) {
        const tx = db.db.transaction(names, 'readonly')
        for (const table of tx.objectStoreNames) {
          const store = tx.objectStore(table)
          db.tables[table] = new Table(store)
        }
      }
      db.db.close()
      resolve(db)
    }
  })
}
