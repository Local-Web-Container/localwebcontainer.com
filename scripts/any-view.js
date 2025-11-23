import css from './any-view.css' with { type: 'css' };

const wm = new WeakMap()
const tag = Symbol.toStringTag

function linkify(val) {
  if (isURL(val)) {
    const a = document.createElement('a')
    a.href = val
    a.innerText = `"${val}"`
    return a
  }
  return `"${val}"`
}

function objectPreview (key, val, topClass) {
  const details = document.createElement('details')
  const summary = document.createElement('summary')
  const isArrayOrTypedArray = Array.isArray(val) || ArrayBuffer.isView(val)
  const type = typeof val

  wm.set(details, val)
  wm.set(details.dataset, topClass)

  if (type === 'object') {
    details.ontoggle = toggleDetail
  }
  const span = document.createElement('span')
  span.className = 'value ' + type
  span.classList.add('value')
  span.classList.add(type)

  span.append(
    type === 'bigint' ? val.toString() + 'n':
    type === 'symbol' ? val.toString():
    type === 'string' ? linkify(val):
    type === 'function' ? topClass ? `(...)` : `f ${val.name}(${getArgs(val)})`:
    type === 'object' ?
      val === null ? 'null':
      val instanceof Date ? val.toString():
      ArrayBuffer.isView(val) ? `${val[tag]}(${val.length})`:
      Array.isArray(val) ? `Array(${val.length})`:
      `${val[tag] || ''} {${Object.keys(val).length}}`
    : val
  )

  if (type !== 'object') {
    details.ontoggle = null
    details.className = 'non-expandable'
  }

  details.append(summary)
  if (key) {
    summary.append(key, ': ', span)
  } else {
    // span.removeAttribute('class')
    summary.append(span)
  }

  return details
}

function isURL (value) {
  try {
    return new URL(value).protocol.startsWith('http')
  } catch (e) {
    return false
  }
}

/** @param {string} name */
function renderDisplayName(name) {
  const result = document.createElement('span')
  result.className = 'name'
  if (typeof name === 'symbol') name = name.toString()
  const needsQuotes = /^\s|\s$|^$|\n/.test(name)
  result.textContent = needsQuotes ? `"${name.replace(/\n/g, '\u21B5')}"` : name
  return result
}

function getOwnProperties (val) {
  const properties = Object.getOwnPropertyDescriptors(val)
  return Object.entries(properties)
}

function getSubClassFields (prototype) {
  const fields = []
  for (const key of Reflect.ownKeys(prototype)) {
    if (key === '__proto__') continue
    const descriptor = Reflect.getOwnPropertyDescriptor(prototype, key)
    if (typeof descriptor.value !== 'function') {
      fields.push([key, descriptor])
    }
  }
  return fields
}

// JavaScript program to get the function
// name/values dynamically
function getArgs(func) {
  // String representaation of the function code
  var str = func.toString();

  // Remove comments of the form /* ... */
  // Removing comments of the form //
  // Remove body of the function { ... }
  // removing '=>' if func is arrow function
  str = str.replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/(.)*/g, '')
          .replace(/{[\s\S]*}/, '')
          .replace(/=>/g, '')
          .trim();

  // Start parameter names after first '('
  var start = str.indexOf("(") + 1;

  // End parameter names is just before last ')'
  var end = str.length - 1;

  var result = str.substring(start, end).split(", ");

  var params = [];

  result.forEach(element => {

      // Removing any default value
      element = element.replace(/=[\s\S]*/g, '').trim();

      if(element.length > 0)
          params.push(element);
  });

  return params;
}

function getAllEmurableProperties (val, entries = []) {
  const keys = Reflect.ownKeys(val)
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(val, key)
    if (descriptor.enumerable) {
      entries.push([key, descriptor])
    }
  }
  const prototype = Reflect.getPrototypeOf(val)
  if (prototype) {
    getAllEmurableProperties(prototype, entries)
  }
  return entries
}

function toggleDetail (e) {
  const details = e.target
  let val = wm.get(details)
  const original = wm.get(details.dataset)

  const summary = details.firstElementChild
  const container = document.createElement('div')
  const prototype = Object.getPrototypeOf(val)
  details.ontoggle = null

  if (original) {
    for (const key of Reflect.ownKeys(val)) {
      const desc = Reflect.getOwnPropertyDescriptor(val, key)
      if (desc.value) {
        const span = renderDisplayName(key)
        if (!desc.enumerable) span.style.opacity = '0.5'
        const preview = objectPreview(span, desc.value, original)
        container.append(preview)
      }
      if (desc.get) {
        const span = renderDisplayName(key)
        const preview = objectPreview(span, desc.get, original)
        container.append(preview)
      }
      // if (desc.set) {
      //   const span = renderDisplayName('set ' + key)
      //   const preview = objectPreview(span, desc.set, original)
      //   container.append(preview)
      // }
    }
  } else {
    // Render all non-function properties
    for (const [key, desc] of getAllEmurableProperties(val)) {
      const value = (original || val)[key]
      if (typeof value !== 'function') {
        const span = renderDisplayName(key)
        const preview = objectPreview(span, value)
        container.append(preview)
      }
    }
  }

  if (prototype) {
    const span = renderDisplayName('[[prototype]]')
    span.style.opacity = '0.5'
    const elm = objectPreview(span, prototype, (original || val))
    container.append(elm)
  }

  if (val[Symbol.iterator]) {
    const span = renderDisplayName('[[entries]]')
    span.style.opacity = '0.5'
    const elm = objectPreview(span, [...val], (original || val))
    container.append(elm)
  }

  container.classList.add('container')
  const tab = document.createElement('span')
  tab.className = 'tab'
  tab.innerText = '\t '
  const detailBody = document.createElement('div')
  detailBody.append(tab, container)
  detailBody.classList.add('detail-body')
  details.append(detailBody)
}

class AnyPreview extends HTMLElement {
  constructor(obj) {
    super()
    const type = typeof obj
    const style = document.createElement('style')
    const root = this.attachShadow({ mode: 'closed' })
    root.adoptedStyleSheets.push(css)
    root.append(style, objectPreview(undefined, obj))
    root.addEventListener('keydown', e => {
      const key = e.key
      const isSummary = e.target.matches('summary')
      if (!isSummary || !key.startsWith('Arrow')) return
      e.preventDefault()
      e.stopPropagation()
      const detail = e.target.parentElement
      const allVisible = [...root.querySelectorAll('details')].filter(detail => {
        return !detail.matches('details:not([open]) *')
      })
      const index = allVisible.indexOf(detail)

      if (isSummary && key === 'ArrowLeft') {
        e.preventDefault()
        if (!detail.open || detail.classList.contains('non-expandable')) {
          detail.parentElement.closest('details')?.querySelector('summary').focus(e.stopPropagation())
        }
        detail.open = false
      } else if (isSummary && key === 'ArrowRight') {
        e.preventDefault()
        detail.open = true
      } else if (key === 'ArrowDown') {
        e.preventDefault()
        allVisible[index + 1]?.querySelector('summary').focus()
      } else if (key === 'ArrowUp') {
        e.preventDefault()
        allVisible[index - 1]?.querySelector('summary').focus()
      }
    })
  }
}

customElements.define('any-preview', AnyPreview)

export default AnyPreview