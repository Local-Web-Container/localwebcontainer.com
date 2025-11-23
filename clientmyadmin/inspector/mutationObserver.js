



// This file is not actually being used atm




const watchers = []
const commentsWatcher = []
const scopes = new WeakMap()

const assign = (el, obj) => scopes.set(el, obj)
const get = (el) => scopes.get(el)

function comment(selector, fn) {
  commentsWatcher.push([selector, fn])
  return comment
}

function watch(selector, fn) {
  watchers.push([selector, fn])
  return watch
}

function scope(el, data) {
  scopes.set(el, data)
}

function getClosestScope(el) {
  let scope = get(el)
  while (!scope) {
    el = el.parentElement
    console.log(el)
    scope = get(el)
  }
  return [scope, el]
}

// create a mutation observer to listen for when dom elements are added to the page
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          watchers.forEach(([selector, fn]) => {
            if (node.matches(selector) && document.documentElement.contains(node)) fn(node)
            node.querySelectorAll(selector).forEach(el => fn(el))
          })
        }
      })
    }
    if (mutation.type === 'attributes') {
      watchers.forEach(([selector, fn]) => {
        if (mutation.target.matches(selector)) fn(mutation.target)
      })
    }
  })
}).observe(document.documentElement, {
  attributes: true,
  childList: true,
  subtree: true,
})

new MutationObserver(mutations => {
  // watchers.forEach(x => document.querySelectorAll(x[0]).forEach(x[1]))
}).observe(document.documentElement, {
  attributes: true,
  childList: true,
  subtree: true
})