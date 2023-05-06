/**
@typedef {{
  index: number,
  label: string,
  sortable: boolean,
  hidden: boolean,
  sort: string,
  sortType: 'string',
}} TableHeader
*/
class JSTable extends HTMLElement {
  sortable = true
  searchable = true
  /** @type {Object<string, TableHeader>} */
  headers = {}
  rows = []

  constructor() {
    super()
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = new URL('./jstable.css', import.meta.url).href
    this.root = this.attachShadow({ mode: 'closed' })
    this.table = document.createElement('table')
    this.observer = new IntersectionObserver(this.intersected, {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    })
    this.root.append(link, this.table)
  }

  /**
   * @param {object} config
   * @param {Object<string, TableHeader>} config.headers
   * @param {() => *[]} config.getData
   */
  setup(config) {
    this.headers = config.headers
    this.getData = config.getData
    this.render()
  }
  render() {
    const headers = Object.entries(this.headers)
      .sort((a, b) => a[1].index - b[1].index)
      .filter(a => !a[1].hidden)

    this.table.innerHTML = ''
    const thead = document.createElement('thead')
    const tr = document.createElement('tr')
    for (const [key, header] of headers) {
      const th = document.createElement('th')
      th.textContent = header.label
      th.dataset.key = key
      tr.append(th)
    }
    thead.append(tr)
    this.table.append(thead)
    const tbody = document.createElement('tbody')
    this.rows = this.getData()
    for (const row of this.rows) {
      const tr = document.createElement('tr')
      for (const [key, header] of headers) {
        const td = document.createElement('td')
        td.textContent = row[key]
        tr.append(td)
      }
      tbody.append(tr)
    }
    this.table.append(tbody)
    this.observer.observe(this.table)
  }
  sortTable() {

  }
  intersected(event) {
    console.log(event)
  }
}

customElements.define('js-table', JSTable)