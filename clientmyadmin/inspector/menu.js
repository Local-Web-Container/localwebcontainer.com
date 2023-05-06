const menu = /** @type {HTMLDivElement} */ (document.querySelector('#menu'))
const title = /** @type {HTMLDivElement} */ (document.querySelector('#title'))
const li = document.createElement('li')
const a = document.createElement('a')
const dropdown = document.createElement('button')
const dropdownMenu = document.createElement('ul')
a.className = 'px-2 btn btn-dark btn-sm text-start'
a.innerHTML = '<i class="bi bi-table me-2"></i> '
li.className = 'm'
dropdown.className = 'btn btn-dark dropdown-toggle dropdown-toggle-split'
dropdown.setAttribute('data-bs-popper-config', '{"placement": "bottom-end"}')
dropdown.setAttribute('data-bs-toggle', 'dropdown')
dropdown.setAttribute('aria-expanded', 'false')
dropdown.innerHTML = '<span class="visually-hidden">Toggle Dropdown</span>'
dropdownMenu.className = 'dropdown-menu'
dropdownMenu.innerHTML = `<li><button class="dropdown-item"></button></li>`
li.append(a, dropdown, dropdownMenu)

/*
<ul class="list-unstyled small">
  <li class="m">
    <a :href="table.link" class="px-2 btn btn-dark btn-sm text-start">
      <i class="bi bi-table me-2"></i>
      <span x-text="table.name"></span>
    </a>
    <button type="button" class="btn btn-dark dropdown-toggle dropdown-toggle-split" data-bs-popper-config='{"placement": "bottom-end"}' data-bs-toggle="dropdown" aria-expanded="false">
      <span class="visually-hidden">Toggle Dropdown</span>
    </button>
    <ul class="dropdown-menu">
      <li><button class="dropdown-item" @click="addRow(table)">Add row</button></li>
      <li><button class="dropdown-item" @click="addColumn(table)">Add column</button></li>
      <li><button class="dropdown-item" @click="rename(table)">Rename</button></li>
      <li><hr class="dropdown-divider"></li>
      <li><button class="dropdown-item" @click="clearTable(table)">Delete all rows</button></li>
      <li><button class="dropdown-item" @click="drop(table)">Drop (remove table)</button></li>
    </ul>
  </li>
  <li><a :href="database.link + '/table'" class="nav-link text-white text-decoration-none rounded"><i class="bi bi-plus-lg me-2"></i> New Table</a></li>
</ul>
*/


export default new class Menu {
  /** Just an simple id for describing what page you are on */
  id = 'home'
  items = new Map()
  details = document.createElement('details')
  summary = document.createElement('summary')

  constructor (title) {
    this.summary.innerText = title
    this.details.appendChild(this.summary)
    this.details.open = true
    this.ul = document.createElement('ul')
    this.ul.className = 'list-unstyled small'
    this.details.appendChild(this.ul)
    menu.appendChild(this.details)
  }

  setDocTitle (heading, icon) {
    title.innerText = heading
    document.title = heading + ' - ClientMyAdmin'
  }

  addItem(title, link, icon, subMenu) {
    const clone = li.cloneNode(true)
    const a = clone.querySelector('a')
    a.href = link
    a.insertAdjacentText('beforeend', title)
    this.ul.appendChild(clone)
    a.querySelector('i').className = 'bi bi-' + icon + ' me-2'
    if (!subMenu) clone.querySelectorAll('button, ul').forEach(e => e.remove())
  }

  createSubMenu (title) {
    const menu = new Menu(title)
    this.items.set(title, menu)
    return menu
  }

  destroy() {
    title.innerText = menu.innerHTML = ''
    this.items.clear()
  }
}