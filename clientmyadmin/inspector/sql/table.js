import sqlAstParser from 'https://cdn.jsdelivr.net/npm/@appland/sql-parser@1.5.1/+esm'
import { Column } from './column.js'
import { encodeParam } from './util.js'

export class Table {
  #db
  indexes = []
  /** @type {Column[]} */
  columns = []
  type = 'table'

  constructor (row, db) {
    const a = encodeParam(db.name)
    const b = encodeParam(row.name)

    for (const def of sqlAstParser(row.sql).statement[0].definition) {
      if (def.variant === 'column') {
        this.columns.push(new Column(def))
      } else if (def.variant === 'constraint') {
        def.definition.forEach((d) => {
          if (d.type === 'constraint' && d.variant === 'primary key') {
            def.columns.forEach((c) => {
              this.columns.find(x => x.name === c.name).primaryKey = true
            })
          } else if (d.type === 'constraint' && d.variant === 'foreign key') {
            def.columns.forEach((c) => {
              this.columns.find(x => x.name === c.name).foreignKey = {
                table: d.references.name,
                column: d.references.columns[0].name
              }
            })
          } else {
            console.warn('unknown type', d)
          }
        })
      } else {
        console.warn(`unknown variant: ${def}`)
      }
    }

    this.name = row.name
    this.sql = row.sql
    this.#db = db
    this.link = `/clientmyadmin/inspector/sql/${a}/table/${b}?limit=10&offset=0`
  }

  drop() {
    return this.#db.dropTable(this.name)
  }
}
