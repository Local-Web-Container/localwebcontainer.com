import css from './context-menu.css' with { type: 'css' }
import el from '../elm.js'

document.adoptedStyleSheets.push(css)

export default class Contextmenu {
  constructor (el, options) {
    this._items = null
    this._el = null

    el = el || el('div')

    // Class definition
    el.classList.add('jcontextmenu')
    el.classList.add('jcontextmenu-focus')

    // Focusable
    el.tabIndex = 0
    // On click
    // el.onclick = () => setTimeout(options.onclick, 101)
    // On blur
    el.onblur = this.close.bind(this)

    this._el = el
    el.contextmenu = this
  }

  /**
   * Open contextmenu
   *
   * @param {MouseEvent}  evt
   * @param {object[]} items
   */
  open (evt, items) {
    this.create(items || this._items)

    const { x, y } = evt
    const el = this._el

    document.body.appendChild(el)

    el.focus()

    const rect = el.getBoundingClientRect()

    el.style.top = window.innerHeight < y + rect.height
      ? `${y - rect.height}px`
      : `${y}px`

    el.style.left = window.innerWidth < x + rect.width
      ? x - rect.width > 0
        ? el.style.left = `${x - rect.width}px`
        : el.style.left = '10px'
      : `${x}px`
  }

  close () {
    this._el.innerHTML = ''
    try {
      // I have no idea why this get called twice
      this._el.parentElement && this._el.remove()
    } catch (err) {}
  }

  /**
   * Create items based on the declared objectd
   * @param {object} items - List of object
   * @param {*} [itemContainer]
   */
  create (items, itemContainer) {
    const el = itemContainer || this._el
    el.contextmenu = this
    if (!itemContainer) {
      // Update content
      el.innerHTML = ''
    }

    // Append items
    for (const item of items) {
      let itemContainer
      if (item.type && (item.type == 'line' || item.type == 'divisor')) {
        itemContainer = document.createElement('hr')
      } else {
        itemContainer = document.createElement('div')
        const itemText = document.createElement('a')
        itemText.innerText = item.title

        if (item.disabled) {
          itemContainer.className = 'jcontextmenu-disabled'
        } else if (item.onclick) {
          itemContainer.onclick = evt => {
            evt.preventDefault()
            evt.stopImmediatePropagation()
            item.onclick(evt)
            this.close()
          }
        }

        itemContainer.appendChild(itemText)

        if (Array.isArray(item.items)) {
          item.shortcut = '>'
        }

        if (item.shortcut) {
          const itemShortCut = document.createElement('span')
          itemShortCut.innerText = item.shortcut
          itemContainer.appendChild(itemShortCut)
        }

        if (Array.isArray(item.items)) {
          itemContainer.className = 'jcontextmenu-submenu'
          const div = document.createElement('div')
          div.classList.add('jcontextmenu')
          div.classList.add('jcontextmenu-focus')
          itemContainer.appendChild(div)
          this.create(item.items, div)
        }
      }

      el.appendChild(itemContainer)
    }
  }
}
