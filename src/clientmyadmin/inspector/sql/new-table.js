const res = await fetch(new URL('./new-table.html', import.meta.url))
const text = await res.text()

export const template = text

Alpine.data('newTable', () => ({
  columns: [{id: Math.random()}],
  query: '',
  mode: 'new',
  init() {
    const { $el, columns } = this
    const { elements } = $el
    const f = x => columns.length > 1 ? [...elements[x]] : [elements[x]]
    this.mode = $el.dataset.mode || 'new'
    $el.onsubmit = evt => {
      evt.preventDefault()
      database.db.transaction(tx => {
        console.log(this.query)
        tx.executeSql(this.query, [], () => {
          location.reload()
        })
      })
    }
    $el.oninput = evt => {
      const array = ['columnName', 'type', 'prim', 'auto', 'null', 'dVal'].map(f)
      const rows = []
      let primaryKeys = []
      array.forEach((_, i, col) => {
        _.forEach((el, j) => {
          rows[j] ??= {}
          rows[j][el.name] = el.type === 'checkbox' ? el.checked : el.value
          if (el.name === 'prim' && el.checked) primaryKeys.push(j)
        })
      })

      this.query = `CREATE TABLE "${elements.tableName.value}" (\n  ${rows.map(row => `"${row.columnName}" ${row.type}${row.auto ? ' AUTOINCREMENT' : ''}${row.null ? ' NOT NULL' : ''}${row.dVal ? ` DEFAULT ${row.dVal}` : ''}`).join(',\n  ')}${primaryKeys.length ? `,\n  PRIMARY KEY (${primaryKeys.map(i => `"${rows[i].columnName}"`).join(', ')})` : ''}\n)`
    }
    document.querySelector('#tableName').focus()
  },
  remove(column) {
    const index = this.columns.indexOf(column)
    if (index > -1) this.columns.splice(index, 1)
  },
  add() {
    this.columns.push({id: Math.random()})
  }
}))

// setTimeout(() => {
//   const dropdownElementList = document.querySelectorAll('.dropdown')[1]
//   const dropdownList = new bootstrap.Dropdown(dropdownElementList)
//   console.log(dropdownList.show())
// })