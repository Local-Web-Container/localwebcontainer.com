import { encodeParam } from './util.js'
import sqlAstParser from 'https://cdn.jsdelivr.net/npm/@appland/sql-parser@1.5.1/+esm'

export class View {
  type = 'view'

  constructor (row, db) {
    const a = encodeParam(db.name)
    const b = encodeParam(row.name)

    this.name = row.name
    this.sql = row.sql
    const i = row.sql.toLocaleLowerCase().indexOf(' as select')
    this.query = row.sql.slice(i + 4)
    this.link = `/clientmyadmin/inspector/sql/${a}/view/${b}`
  }
}