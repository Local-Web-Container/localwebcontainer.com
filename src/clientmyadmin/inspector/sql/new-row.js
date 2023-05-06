const res = await fetch(new URL('./new-row.html', import.meta.url))
const text = await res.text()

export const template = text

Alpine.data('newRow', () => ({
  table: undefined,
  inputType(column) {
    const { $el } = this
    $el.type = column.type === 'integer' ? 'number' : 'text'
    $el.placeholder = column.defaultValue ?? ''
    $el.name = column.name
    if (column.type === 'integer') {
      $el.step = 1
    }
    if (column.autoIncrement) {
      $el.placeholder = '( Auto Increment )'
    }
    if (column.notNull && !column.autoincrement) {
      $el.required = true
    }
  },
  init() {
    this.table = globalThis.table
    this.$el.showModal()
    Alpine.nextTick(() => {
      this.$el.querySelector('input:not([placeholder="( Auto Increment )"])')?.focus()
    })

    this.$el.onsubmit = evt => {
      evt.preventDefault()

      const values = this.table.columns.map(column => [
        column.name,
        evt.target.elements[column.name].type === 'number'
          ? evt.target.elements[column.name].valueAsNumber
          : evt.target.elements[column.name].value
      ])
      const obj = Object.fromEntries(values)

      database.insertRow(this.table, obj)
        .then(() => {
          this.$el.remove()
        }, err => {
          console.error(err)
        })
    }
  }
}))