// @ts-check

import './utils.js'
import el from '../elm.js'
import './menu-button.js'
import ContextMenu from './context-menu.js'
import AnyView from '../any-view.js'
// Create a custom element that can preview javascript objects based on details/summary

function selectTr (tr) {
  tr.ariaSelected = 'true'
  tr.classList.add('table-active')
}

function deSelectTr (tr) {
  tr.ariaSelected = 'false'
  tr.classList.remove('table-active')
}

class PlainObjectPreview extends HTMLElement {
  obj = null
  #detail = document.createElement('details')
  #summary = document.createElement('summary')

  constructor() {
    super()
    this.attachShadow({ mode: 'closed' })
    this.shadowRoot.appendChild(this.#detail)
    this.#detail.appendChild(this.#summary)
    this.#detail.addEventListener('toggle', evt => this.#toggled(evt))
  }

  init() {

  }

  #toggled (evt) {
    this.#clear()
    if (evt.target.open) {
      this.#createExpandedSummary()
      this.#createExpandedBody()
    } else {
      this.#createCollapsedSummary()
    }
  }

  #clear () {
    this.#detail.replaceChildren()
  }

  #createExpandedSummary () {
    const obj = this.obj
    const summary = this.#summary
    this.#summary.replaceChildren('{')
  }

  #createExpandedBody() {
    this.#detail.apppend(child, '}')
  }

  #createCollapsedSummary () {
    const obj = this.obj
    const summary = this.#summary
    const keys = Object.keys(obj)
    const max = keys.length > 3 ? 3 : keys.length
    const keysToShow = keys.slice(0, max)
    this.#summary.innerText = '{ .. }'
  }

  // Create a preview summary for an object showing just some of the properties
  // similar to:
  // <span class="object-properties-preview">{<span class="name">foo</span>: <span class="object-value-string">'bar'</span>, <span class="name">bool</span>: <span class="object-value-boolean">true</span>, <span class="name">numb</span>: <span class="object-value-number">312</span>, <span class="name">ab</span>: <span class="object-value-typedarray">Uint8Array(32)</span>, <span class="name">arr</span>: <span class="object-value-array">Array(1)</span>}</span>
}

globalThis.customElements.define('plain-object-preview', PlainObjectPreview);
// globalThis.customElements.define('object-preview', ObjectPreview);
// globalThis.customElements.define('string-preview', StringPreview);
// globalThis.customElements.define('number-preview', StringPreview);
// globalThis.customElements.define('array-preview', ArrayPreview);
// globalThis.customElements.define('regex-preview', RegexPreview);
// globalThis.customElements.define('boolean-preview', BooleanPreview);


/** @namespace aria */
globalThis.aria = globalThis.aria || {};

/** Values for aria-sort */
const ASCENDING = 'ascending'
const DESCENDING = 'descending'

/** DOM Selectors to find the grid components */
aria.GridSelector = {
  ROW: 'tr, [role="row"]',
  CELL: 'th, td, [role="gridcell"]',
  SCROLL_ROW: 'tr:not([data-fixed]), [role="row"]',
  SORT_HEADER: 'th[aria-sort]',
  TABBABLE: '[tabindex="0"]'
}

/** CSS Class names */
aria.CSSClass = {
  HIDDEN: 'hidden'
}

const $ = (parent, query) => parent.querySelector(query)
const $$ = (parent, query) => parent.querySelectorAll(query)
const each = (arr, cb) => {
  for (let i = 0, len = arr.length; i < len; i++) cb(arr[i])
}

class Heading {
  cell = document.createElement('th')
  hidden = false
  sortable = false
  selectable = false
  selected = false
  label = ''
  index = 0
  visibleCells = []
  type = null
  indeterminate = false
  property = ''

  constructor (heading, index) {
    this.index = index
    this.cell.ariaSort = heading.sortDirection || 'none'
    this.cell.tabIndex = -1
    const wrapper = document.createElement('span')
    const span = document.createElement('span')
    wrapper.classList.add('text-nowrap')
    wrapper.classList.add('d-flex')
    wrapper.classList.add('justify-content-between')
    wrapper.classList.add('align-items-center')
    span.innerText = heading.label
    wrapper.append(span)
    wrapper.insertAdjacentHTML('beforeend', `
    <span class="dropdown-center">
      <button class="btn btn-transparent btn-circle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-three-dots-vertical"></i>
      </button>
      <ul class="dropdown-menu" style="position: absolute; inset: auto auto 0px 0px; margin: 0px; transform: translate(-65px, -6px);" data-popper-placement="top">
        <li><a class="dropdown-item" href="#"><i class="bi bi-filter" style="visibility: hidden"></i> Unsort</a></li>
        <li><a class="dropdown-item" href="#"><i class="bi bi-sort-down-alt"></i> Sort by ASC</a></li>
        <li><a class="dropdown-item" href="#"><i class="bi bi-sort-up-alt"></i> Sort by DESC</a></li>
        <li><a class="dropdown-item" href="#"><i class="bi bi-filter"></i> Filter</a></li>
        <li><a class="dropdown-item" href="#"><i class="bi bi-eye-slash"></i> Hide</a></li>
      </ul>
    </span>`)
    this.cell.append(wrapper)
    Object.assign(this, heading)
  }
}

/** @type {WeakMap<HTMLTableRowElement, Row>} */
const rows = new WeakMap()
const getRow = tr => /** @type {Row} */ (rows.get(tr))
const getData = tr => getRow(tr).data

class Row {
  tr = document.createElement('tr')

  constructor(data) {
    this.data = data
    this.tr.tabIndex = -1
    deSelectTr(this.tr)
    rows.set(this.tr, this)
  }
}

/**
 * Grid object representing the state and interactions for a grid widget
 *
 * Assumptions:
 * All focusable cells initially have tabindex="-1"
 * Produces a fully filled in mxn grid (with no holes)
 */
class DataGrid {
  data = []
  disabled = false
  formatResult = true
  rows = []

  #ctxMenu = new ContextMenu()

  /**
   * @param {HTMLTableElement} gridNode The DOM node pointing to the grid
   */
  constructor (gridNode) {
    this.navigationDisabled = false
    this.gridNode = gridNode
    this.topIndex = 0
    console.log(gridNode)
    this.keysIndicator = $(document, '#arrow-keys-indicator')

    this.registerEvents()
  }

  forEachSelectedRow(fn) {
    each($$(this.gridNode, 'tr[aria-selected="true"]'), tr => fn(rows.get(tr)))
  }

  getSelectedRows() {
    const r = []
    each($$(this.gridNode, 'tr[aria-selected="true"]'), tr => r.push(rows.get(tr)))
    return r
  }

  setConfig (config) {
    this.clear()
    this.columns = config.columns.map((col, index) => new Heading(col, index))
    this.data = config.data
    this.indexBy = config.indexBy
    this.formatResult = config.formatResult ?? true
    this.gridNode.ariaRowCount = this.data.length + ''
    this.edit = config.edit
    this.onRemove = config.onRemove
    this.onDBclick = config.onDBclick
    this.onSort = config.onSort
    this.onContextMenu = config.onContextMenu
    const th = this.gridNode.tHead.rows[0]
    for (const col of this.columns) th.append(col.cell)

    this.fillTable()
  }

  /**
   * inserts tr elements into the tbody element until the last tr element is not
   * visible in the viewport using intersection observer.
   */
  fillTable() {
    const tbody = this.gridNode.tBodies[0]
    let i = 0

    while (true) {
      const data = this.data[i]
      if (!data) return
      const row = new Row(data)
      this.rows.push(row)
      for (const col of this.columns) {
        const cell = document.createElement('td')
        cell.append(col.render
          ? col.render(data[col.property], data)
          : this.#toHtml(data[col.property])
        )
        row.tr.append(cell)
      }
      tbody.append(row.tr)
      i++
    }
  }

  /**
   * The clear() method must mark all the rows in the data grid to be marked as
   * not selected. After a call to clear(), the length attribute will return
   * zero.
   */
  clear() {
    this.rows.splice(0, this.rows.length)
    this.gridNode.tBodies[0].replaceChildren()
    this.gridNode.tHead.rows[0].replaceChildren()
  }

  /** Register grid events */
  registerEvents () {
    const gridNode = this.gridNode
    gridNode.addEventListener('keydown', e => this.#checkFocusChange(e))
    gridNode.addEventListener('keydown', e => this.delegateButtonHandler(e))
    gridNode.addEventListener('click', e => this.focusClickedCell(e))
    gridNode.addEventListener('dblclick', e => this.#ondbclick(e))
    gridNode.addEventListener('contextmenu', e => this.#showContextMenu(e))
    gridNode.addEventListener('click', e => this.delegateButtonHandler(e))
  }

  #showContextMenu (evt) {
    evt.preventDefault()
    const tr = evt.target.closest('tr')
    if (tr.ariaSelected === 'false') {
      // clear everything else
      this.#unselectSelectedRows()
      const el = $(this.gridNode, '[tabindex="0"]')
      if (el) el.tabIndex = -1
    }

    selectTr(tr)
    tr.tabIndex = 0

    if (this.getSelectedRows().length === 0) {
      selectTr(tr)
      tr.tabIndex = 0
    }
    if (this.onContextMenu) {
      this.#ctxMenu.open(evt, this.onContextMenu())
    }
  }

  #unselectSelectedRows () {
    each($$(this.gridNode, '[aria-selected="true"]'), deSelectTr)
  }

  /**
   * Triggered on keydown. Checks if an arrow key was pressed, and (if possible)
   * moves focus to the next valid cell in the direction of the arrow key.
   *
   * @param {KeyboardEvent} event Keydown event
   */
  #checkFocusChange (event) {
    const key = event.key.toLocaleLowerCase()

    /** @type {HTMLTableCellElement} */
    const tr = document.activeElement?.closest('tr')

    const next = key === 'arrowup'
      ? tr.previousElementSibling
      : key === 'arrowdown'
        ? tr.nextElementSibling
        : 0

    if (next) {
      tr.tabIndex = -1
      deSelectTr(tr)
      next.tabIndex = 0
      selectTr(next)
      next.focus()
      event.preventDefault()
    }
  }

  get lastFocused () {
    const cell = this.active
    if (!cell) return null
    const tr = cell.closest('tr')
    const row = rows.get(tr)
    const col = this.columns[cell.cellIndex]
    return [row.data[col.property], row.data, row]
  }

  /**
   * Triggered on click. Finds the cell that was clicked on and focuses on it.
   * @param {MouseEvent} evt Keydown event
   */
  focusClickedCell (evt) {
    const row = this.findClosest(evt.target, '[tabindex]')
    const last = $(this.gridNode, '[tabindex="0"]')
    if (last) last.tabIndex = -1
    console.log(evt.target)
    if (evt.metaKey || evt.ctrlKey) {
      // toggle selection
      row.ariaSelected === 'true' ? deSelectTr(row) : selectTr(row)
    } else if (evt.shiftKey) {
      // select range
      if (last) {
        // get all rows between last and this one
        const rows = [...this.gridNode.tBodies[0].rows]
        const lastIndex = rows.indexOf(last)
        const thisIndex = rows.indexOf(row)
        const start = Math.min(lastIndex, thisIndex)
        const end = Math.max(lastIndex, thisIndex)

        for (let i = start; i <= end; i++) {
          selectTr(rows[i])
        }
      }
    } else {
      // clear all selections
      $$(this.gridNode, '[aria-selected]').forEach(deSelectTr)
      selectTr(row)
    }
    row.tabIndex = 0
    this.active = row
    row.focus()
  }

  /**
   * @param {MouseEvent} event
   */
  #ondbclick (event) {
    this.onDBclick?.(event)
  }

  /**
   * Triggered on click. Checks if user clicked on a header with aria-sort.
   * If so, it sorts the column based on the aria-sort attribute.
   * @param event Keydown event
   */
  delegateButtonHandler (event) {
    const key = event.which || event.keyCode
    const target = event.target
    const isClickEvent = event.type === 'click'

    if (!target) return
    if (target.matches('th[aria-sort]') &&
    (isClickEvent || key === aria.KeyCode.SPACE || key === aria.KeyCode.RETURN)) {
      event.preventDefault()
      this.handleSort(target)
    }

    if (target.matches('tr') && key === aria.KeyCode.BACKSPACE) {
      event.preventDefault()
      this.onRemove?.(this.getSelectedRows())
    }

    if (target.matches('tr') && key === aria.KeyCode.RETURN) {
      event.preventDefault()
      const tr = target.closest('tr')
      const row = this.rows.find(row => row.tr === tr)
      this.toggleEditMode(row, this.columns[target.cellIndex])
    }

    if (target.matches('.edit-text-input') &&
      (key === aria.KeyCode.RETURN || key === aria.KeyCode.ESC)) {
      event.preventDefault()
      this.toggleEditMode(
        this.findClosest(target, '.editable-text'),
        false,
        key === aria.KeyCode.RETURN
      )
    }
  }

  /**
   * Toggles the mode of an editable cell between displaying the edit button
   * and displaying the editable input.
   *
   * @param {Row} row The row to edit
   * @param {Heading} cell cell that was clicked on
   */
  toggleEditMode (row, cell) {
    this.edit?.(row, cell)
  }

  /**
   *  Sorts the column below the header node, based on the aria-sort attribute.
   *  aria-sort="none" => aria-sort="ascending"
   *  aria-sort="ascending" => aria-sort="descending"
   *  All other headers with aria-sort are reset to "none"
   *
   *  Note: This implementation assumes that there is no pagination on the grid.
   * @param {HTMLTableCellElement} headerNode Header DOM node
   */
  handleSort (headerNode) {
    const columnIndex = headerNode.cellIndex
    const property = this.columns[columnIndex].property

    let sortType = headerNode.ariaSort

    sortType = sortType === DESCENDING ? ASCENDING : DESCENDING

    function comparator(row1, row2) {
      const row1Text = row1.data[property]
      const row2Text = row2.data[property]

      return sortType === ASCENDING
        ? defaultSort(row2Text, row1Text)
        : defaultSort(row1Text, row2Text)
    }

    headerNode.setAttribute('aria-sort', sortType)
    if (this.onSort) {
      this.onSort(property, sortType)
    } else {
      this.sortRows(comparator)
    }
  }

  /**
   * Sorts the grid's rows according to the specified compareFn
   * @param compareFn Comparison function to sort the rows
   */
  sortRows (compareFn) {
    this.gridNode.tBodies[0]
      .append(...this.rows.sort(compareFn).map(row => row.tr))
  }

  /** Adds aria-rowindex and aria-colindex to the cells in the grid */
  setupIndices () {
    const rows = this.gridNode.tBodies[0].rows
    Array.from(this.gridNode.tHead.rows[0].cells).forEach(cell => {
      cell.ariaColIndex = `${cell.cellIndex}`
    })

    for (let row = 0; row < rows.length; row++) {
      const cells = rows[row].cells

      for (let col = 0; col < cells.length; col++) {
        cells[col].ariaColIndex = `${col + 1}`
      }
    }
  }

  #toHtml(json) {
    return this.formatResult ? new AnyView(json) : json
  }

  /**
   * Find the closest element matching the selector. Only checks parent and
   * direct children.
   * @param {any} element Element to start searching from
   * @param {string} selector Index of the column to toggle
   * @returns {object} matching element
   */
  findClosest (element, selector) {
    if (element.matches(selector)) return element

    if (element.parentNode.matches(selector)) return element.parentNode

    return $(element, selector)
  }
}

const unit = 'B0KiB0MiB0GiB0TiB0PiB0EiB0ZiB0YiB'.split('0')

/** @param {number} size */
export const bytes = size => {
  for (var i=0;1024<=size;i++)size/=1024;
  return (size*10+.5|0)/10+' '+unit[i]
}

/** @param {Date} date */
export const toLocalTime = (date) => date.toLocaleString()

const table = el('table', { id: 'ex2-grid', role: 'grid', className: 'table table-dark table-hover data' }, [
  el('thead', { className: 'table-light' }, [ el('tr') ]),
  el('tbody', { className: 'table-group-divider' })
])

const grid = new DataGrid(table)

function defaultSort(a, b) {
  var c = null == a || Number.isNaN(a),
      d = null == b || Number.isNaN(b);
  return c && d ? 0 : c ? -1 : d ? 1 : a.localeCompare ? a.localeCompare(b) : a > b ? 1 : a < b ? -1 : 0
}

export default grid