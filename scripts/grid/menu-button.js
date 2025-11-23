/**
 * ARIA Menu Button example
 * after page has loaded initialize all menu buttons based on the selector "[aria-haspopup][aria-controls]"
 */
window.addEventListener('load', function () {
  const menuButtons = document.querySelectorAll('[aria-haspopup][aria-controls]');

  [].forEach.call(menuButtons, function (menuButton) {
    if (
      (menuButton && menuButton.tagName.toLowerCase() === 'button') ||
      menuButton.getAttribute('role').toLowerCase() === 'button'
    ) {
      const mb = new aria.widget.MenuButton(menuButton)
      mb.initMenuButton()
    }
  })
})

/** @namespace aria */
globalThis.aria = globalThis.aria || {}

/* ---------------------------------------------------------------- */
/*                  ARIA Utils Namespace                        */
/* ---------------------------------------------------------------- */

aria.Utils = aria.Utils || {}

aria.Utils.findPos = function (element) {
  let xPosition = 0
  let yPosition = 0

  while (element) {
    xPosition += element.offsetLeft - element.scrollLeft + element.clientLeft
    yPosition += element.offsetTop - element.scrollTop + element.clientTop
    element = element.offsetParent
  }
  return { x: xPosition, y: yPosition }
}

/* ---------------------------------------------------------------- */
/*                  ARIA Widget Namespace                           */
/* ---------------------------------------------------------------- */

aria.widget = aria.widget || {}

/* ---------------------------------------------------------------- */
/*                  Menu Button Widget                              */
/* ---------------------------------------------------------------- */

/** Creates a Menu Button widget using ARIA */
aria.widget.Menu = class Menu {
  constructor (node, menuButton) {
    this.keyCode = Object.freeze({
      TAB: 9,
      RETURN: 13,
      ESC: 27,
      SPACE: 32,
      PAGEUP: 33,
      PAGEDOWN: 34,
      END: 35,
      HOME: 36,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40
    })

    // Check fo DOM element node
    if (typeof node !== 'object' || !node.getElementsByClassName) return

    this.menuNode = node
    node.tabIndex = -1

    this.menuButton = menuButton

    this.firstMenuItem = false
    this.lastMenuItem = false
  }

  /** Adds event handlers to button elements */
  initMenu () {
    let cn = this.menuNode.firstChild

    while (cn) {
      if (cn.nodeType === Node.ELEMENT_NODE) {
        if (cn.getAttribute('role') === 'menuitem') {
          cn.tabIndex = -1
          if (!this.firstMenuItem) {
            this.firstMenuItem = cn
          }
          this.lastMenuItem = cn

          const eventKeyDown = event => this.eventKeyDown(event, this)
          cn.addEventListener('keydown', eventKeyDown)

          const eventMouseClick = event => this.eventMouseClick(event, this)
          cn.addEventListener('click', eventMouseClick)

          const eventBlur = event => this.eventBlur(event, this)
          cn.addEventListener('blur', eventBlur)

          const eventFocus = event => this.eventFocus(event, this)
          cn.addEventListener('focus', eventFocus)
        }
      }
      cn = cn.nextSibling
    }
  }

  /** Moves focus to next menuItem */
  nextMenuItem (currentMenuItem) {
    let mi = currentMenuItem.nextSibling

    while (mi) {
      if (mi.nodeType === Node.ELEMENT_NODE &&
        mi.getAttribute('role') === 'menuitem') {
        mi.focus()
        break
      }
      mi = mi.nextSibling
    }

    if (!mi && this.firstMenuItem) {
      this.firstMenuItem.focus()
    }
  }

  /** Moves focus to previous menuItem */
  previousMenuItem (currentMenuItem) {
    let mi = currentMenuItem.previousSibling

    while (mi) {
      if (mi.nodeType === Node.ELEMENT_NODE &&
        mi.getAttribute('role') === 'menuitem') {
        mi.focus()
        break
      }
      mi = mi.previousSibling
    }

    if (!mi && this.lastMenuItem) {
      this.lastMenuItem.focus()
    }
  }

  /**
   * Keydown event handler for Menu Object
   * NOTE: The menu parameter is needed to provide a reference to the specific
   * menu
   */
  eventKeyDown (event, menu) {
    const ct = event.currentTarget
    let flag = false

    switch (event.keyCode) {
      case menu.keyCode.SPACE:
      case menu.keyCode.RETURN:
        menu.eventMouseClick(event, menu)
        menu.menuButton.closeMenu(true)
        flag = true
        break

      case menu.keyCode.ESC:
        menu.menuButton.closeMenu(true)
        menu.menuButton.buttonNode.focus()
        flag = true
        break

      case menu.keyCode.UP:
      case menu.keyCode.LEFT:
        menu.previousMenuItem(ct)
        flag = true
        break

      case menu.keyCode.DOWN:
      case menu.keyCode.RIGHT:
        menu.nextMenuItem(ct)
        flag = true
        break

      case menu.keyCode.TAB:
        menu.menuButton.closeMenu(true, false)
        break

      default:
        break
    }

    if (flag) {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  /**
   * onclick event handler for Menu Object
   * NOTE: The menu parameter is needed to provide a reference to the specific
   * menu
   */
  eventMouseClick (event, menu) {
    const clickedItemText = event.target.innerText
    this.menuButton.buttonNode.innerText = clickedItemText
    menu.menuButton.closeMenu(true)
  }

  /**
   * eventBlur event handler for Menu Object
   * NOTE: The menu parameter is needed to provide a reference to the specific
   * menu
   */
  eventBlur (event, menu) {
    menu.menuHasFocus = false
    setTimeout(function () {
      if (!menu.menuHasFocus) {
        menu.menuButton.closeMenu(false, false)
      }
    }, 200)
  }

  /**
   * eventFocus event handler for Menu Object
   * NOTE: The menu parameter is needed to provide a reference to the specific
   * menu
   */
  eventFocus (event, menu) {
    menu.menuHasFocus = true
  }
}

/* ---------------------------------------------------------------- */
/*                  Menu Button Widget                           */
/* ---------------------------------------------------------------- */

/** Creates a Menu Button widget using ARIA */
aria.widget.MenuButton = class MenuButton {
  constructor (node) {
    this.keyCode = Object.freeze({
      TAB: 9,
      RETURN: 13,
      ESC: 27,
      SPACE: 32,
      UP: 38,
      DOWN: 40
    })

    // Check fo DOM element node
    if (typeof node !== 'object' || !node.getElementsByClassName) return

    this.done = true
    this.mouseInMouseButton = false
    this.menuHasFocus = false
    this.buttonNode = node
    this.isLink = false

    if (node.tagName.toLowerCase() === 'a') {
      const url = node.getAttribute('href')
      if (url && url.length && url.length > 0) {
        this.isLink = true
      }
    }
  }

  /** Adds event handlers to button elements */
  initMenuButton () {
    const id = this.buttonNode.getAttribute('aria-controls')

    if (id) {
      this.menuNode = document.getElementById(id)

      if (this.menuNode) {
        this.menu = new aria.widget.Menu(this.menuNode, this)
        this.menu.initMenu()
        this.menuShowing = false
      }
    }

    this.closeMenu(false, false)

    const eventKeyDown = event => this.eventKeyDown(event, this)
    this.buttonNode.addEventListener('keydown', eventKeyDown)

    const eventMouseClick = event => this.eventMouseClick(event, this)
    this.buttonNode.addEventListener('click', eventMouseClick)
  }

  /** Opens the menu */
  openMenu () {
    if (this.menuNode) {
      this.menuNode.style.display = 'block'
      this.menuShowing = true
    }
  }

  /** Close the menu */
  closeMenu (force, focusMenuButton) {
    if (typeof force !== 'boolean') force = false
    if (typeof focusMenuButton !== 'boolean') focusMenuButton = true

    if (force ||
      (!this.mouseInMenuButton &&
        this.menuNode &&
        !this.menu.mouseInMenu &&
        !this.menu.menuHasFocus)) {
      this.menuNode.style.display = 'none'
      if (focusMenuButton) {
        this.buttonNode.focus()
      }
      this.menuShowing = false
    }
  }

  /** Close or open the menu depending on current state */
  toggleMenu () {
    if (this.menuNode) {
      if (this.menuNode.style.display === 'block') {
        this.menuNode.style.display = 'none'
      } else {
        this.menuNode.style.display = 'block'
      }
    }
  }

  /** Move keyboard focus to first menu item */
  moveFocusToFirstMenuItem () {
    if (this.menu.firstMenuItem) {
      this.openMenu()
      this.menu.firstMenuItem.focus()
    }
  }

  /** Move keyboard focus to last menu item */
  moveFocusToLastMenuItem () {
    if (this.menu.lastMenuItem) {
      this.openMenu()
      this.menu.lastMenuItem.focus()
    }
  }

  /**
   * Keydown event handler for MenuButton Object
   * NOTE: The menuButton parameter is needed to provide a reference to the specific
   * menuButton
   */
  eventKeyDown (event, menuButton) {
    let flag = false

    switch (event.keyCode) {
      case menuButton.keyCode.SPACE:
        menuButton.moveFocusToFirstMenuItem()
        flag = true
        break

      case menuButton.keyCode.RETURN:
        menuButton.moveFocusToFirstMenuItem()
        flag = true
        break

      case menuButton.keyCode.UP:
        if (this.menuShowing) {
          menuButton.moveFocusToLastMenuItem()
          flag = true
        }
        break

      case menuButton.keyCode.DOWN:
        if (this.menuShowing) {
          menuButton.moveFocusToFirstMenuItem()
          flag = true
        }
        break

      case menuButton.keyCode.TAB:
        menuButton.closeMenu(true, false)
        break

      default:
        break
    }

    if (flag) {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  /**
   * Click event handler for MenuButton Object
   * NOTE: The menuButton parameter is needed to provide a reference to the specific
   * menuButton
   */
  eventMouseClick (event, menuButtn) {
    this.moveFocusToFirstMenuItem()
  }
}
