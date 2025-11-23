import { encodeParam  } from './util.js'

export class Trigger {
  type = 'trigger'

  constructor (row, db) {
    const a = encodeParam(db.name)
    const b = encodeParam(row.name)

    this.name = row.name
    this.tableName = row.tableName
    this.sql = row.sql
    this.link = `/clientmyadmin/inspector/sql/${a}/trigger/${b}`
  }
}
