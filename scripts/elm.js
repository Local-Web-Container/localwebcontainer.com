/**
 * Skapar ett HTML-element med angivna attribut och barn.
 *
 * @template {keyof HTMLElementTagNameMap} T - En typ som representerar ett taggnamn från `HTMLElementTagNameMap`.
 * @param {T} tag - HTML-taggnamn för elementet (t.ex. 'div', 'span').
 * @param {Partial<HTMLElementTagNameMap[T]> | Element[]} [propsOrChildren] - Attribut för elementet eller barn-element.
 * @param {Element[]} [children] - En lista med barn-element att lägga till.
 * @returns {HTMLElementTagNameMap[T]} Det skapade HTML-elementet.
 */
function el (tag, propsOrChildren, children) {
  const element = document.createElement(tag)

  if (Array.isArray(propsOrChildren)) {
    children = propsOrChildren
  } else if (propsOrChildren && typeof propsOrChildren === 'object') {
    for (let [key, value] of Object.entries(propsOrChildren)) {
      if (key.startsWith('on')) {
        element.addEventListener(key.slice(2), value)
      } else if (key in element) {
        element[key] = value
      } else {
        element.setAttribute(key, String(value))
      }
    }
  }

  if (Array.isArray(children)) {
    element.append(...children)
  }

  return element
}

export default el