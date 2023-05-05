const css = `
/**
 * Contextmenu v3.3.0
 * Author: paul.hodel@gmail.com
 * https://github.com/paulhodel/jsuites
 */

 .jcontextmenu {
  position:fixed;
  z-index:10000;
  background:#fff;
  color: #555;
  font-size: 11px;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-box-shadow: 2px 2px 2px 0px rgba(143, 144, 145, 1);
  -moz-box-shadow: 2px 2px 2px 0px rgba(143, 144, 145, 1);
  box-shadow: 2px 2px 2px 0px rgba(143, 144, 145, 1);
  border: 1px solid #C6C6C6;
  padding: 0px;
  padding-top:4px;
  padding-bottom:4px;
  margin:0px;
  outline:none;
  display:none;
}

.jcontextmenu.jcontextmenu-focus {
  display:inline-block;
}

.jcontextmenu > div {
  box-sizing: border-box;
  display: block;
  padding: 8px 8px 8px 28px;
  width: 250px;
  position: relative;
  cursor: default;
  font-size: 11px;
  font-family:sans-serif;
}

.jcontextmenu > div a {
  color: #555;
  text-decoration: none;
}

.jcontextmenu > div span {
  float: right;
  margin-right:10px;
}

.jcontextmenu .jcontextmenu-disabled * {
  color: #ccc !important;
}

.jcontextmenu > div:not(.jcontextmenu-disabled):hover {
  background: #ebebeb;
}

.jcontextmenu hr {
  border: 1px solid #e9e9e9;
  border-bottom: 0;
  margin-top:5px;
  margin-bottom:5px;
}

.jcontextmenu > hr:hover {
  background: transparent;
}

.jcontextmenu .jcontextmenu-submenu > div {
  position: absolute;
  top: -4px;
  right: -252px;
  display: none;
}

.jcontextmenu .jcontextmenu-submenu:hover > div {
  display: block;
}
`

const style = document.createElement('style')
style.innerHTML = css
document.head.appendChild(style)

export default class Contextmenu {
  constructor (el, options) {
    this._items = null
    this._el = null

    el = el || document.createElement('div')

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
