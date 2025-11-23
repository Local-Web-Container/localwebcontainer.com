export class Column {
  #definition
  #dataType

  notNull = false
  unique = false
  primaryKey = false
  autoIncrement = false
  defaultValue = undefined
  foreignKey = undefined

  constructor (ast) {
    this.name = ast.name
    this.#dataType = ast.datatype || {}
    this.#definition = ast.definition
    this.type = this.#dataType.affinity

    ast.definition.forEach(def => {
      console.assert(def.type === 'constraint')
      console.assert(typeof def.variant === 'string')

      if (def.variant === 'not null') {
        this.notNull = true
      } else if (def.variant === 'unique') {
        this.unique = true
      } else if (def.variant === 'primary key') {
        if (def.autoIncrement) this.autoIncrement = true
        this.primaryKey = true
        // A column declared INTEGER PRIMARY KEY will autoincrement.
        if (this.type === 'integer') this.autoIncrement = true
      } else if (def.variant === 'autoincrement') {
        this.autoIncrement = true
      } else if (def.variant === 'default') {
        this.defaultValue = def.value.value
      } else {
        console.warn(`unknown constraint variant: ${def.variant}`)
      }
    })
  }
}
