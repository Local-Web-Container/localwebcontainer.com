import { encodeParam } from './util.js'
import { Index } from './index.js'

export class Table {
  #dbName

  /** @param {IDBObjectStore} store  */
  constructor(store) {
    const tbl_name = encodeParam(store.name)
    const dbName = encodeParam(store.transaction.db.name)
    this.#dbName = dbName
    this.primaryKey = store.keyPath
    this.autoIncrement = store.autoIncrement
    this.name = tbl_name
    this.link = `/clientmyadmin/inspector/indexeddb/${dbName}/store/${tbl_name}?limit=10&offset=0`
    this.type = 'table'
    /** @type {Object<string, Index>} */
    this.indexes = {}
    Array.from(store.indexNames).forEach(name => {
      this.indexes[name] = new Index(store.index(name))
    })
  }
}