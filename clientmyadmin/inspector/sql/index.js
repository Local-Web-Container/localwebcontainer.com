import { encodeParam } from './util.js'

export class Index {
  constructor (row, db) {
    const a = encodeParam(db.name)
    const b = encodeParam(row.name)

    this.name = row.name
    this.tableName = row.tableName
    this.sql = row.sql
    this.link = `/clientmyadmin/inspector/websql/${a}/index/${b}`
  }
}
