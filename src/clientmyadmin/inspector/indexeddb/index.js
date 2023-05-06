export class Index {
  /** @param {IDBIndex} index */
  constructor (index) {
    this.name = index.name
    this.keyPath = index.keyPath
    this.unique = index.unique
    this.multiEntry = index.multiEntry
  }
}