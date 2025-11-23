/// <reference lib="dom" />
import kv from './shared/kv.js'
import { Router } from './shared/itty-router.js'
// import Alpine from './alpine.js'
import { default as bootstrap } from 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/+esm'
// import { default as bootstrap } from 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js/+esm'
import Alpine from 'https://cdn.jsdelivr.net/npm/@alpinejs/csp@3.14.9/dist/module.esm.js'
// import * as Popper from 'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/+esm'

// @ts-ignore
if (!globalThis.URLPattern) await import('../urlpattern.min.js')

// globalThis.Popper = Popper
globalThis.bootstrap = bootstrap

globalThis.kv = kv
globalThis.Alpine = Alpine

Alpine.store('page', 'home')

const noop = a => a
let ctrl = new AbortController()
const router = Router()
const titles = {
  localstorage: 'Local Storage',
  sessionstorage: 'Session Storage',
  cookies: 'Cookies',
  sql: 'WebSQL',
  indexeddb: 'IndexedDB',
  cachestorage: 'Cache Storage',
  'whatwg-fs': 'File System',
}
const cancel = ctx => ctx.event.preventDefault()
;[
  'localstorage',
  'sessionstorage',
  'cookies',
  'sql/*?',
  'indexeddb/*?',
  'cachestorage/:cache?',
  'whatwg-fs/*?',
].forEach(url => {
  router.get('/clientmyadmin/inspector/' + url, cancel, ctx => {
    const page = url.split('/').shift()
    if (!page) throw new Error('Invalid url')

    Alpine.store('pageTitle', titles[page])

    import(`./inspector/${url.split('/').shift()}/mod.js`).then(async mod => {
      if (ctx.request.signal.aborted) return
      document.querySelector('main').innerHTML = ''
      await mod.default(ctx)
      Alpine.store('page', page)
    }).catch(console.error)
  }, noop)
})

addEventListener('popstate', evt => {
  evt.preventDefault()
  ctrl.abort()
  ctrl = new AbortController()
  evt.request = new Request(location.href, { signal: ctrl.signal })
  router.handle(evt)
});

/** @param {string|URL} url */
globalThis.navigate = function navigate (url) {
  ctrl.abort()
  ctrl = new AbortController()

  router.handle({
    preventDefault: noop,
    request: new Request(url, { signal: ctrl.signal })
  }).then(() => {
    history.pushState({}, '', url)
  })
}

navigate(location.href)

addEventListener('click', evt => {
  // @ts-ignore
  const a = evt.target.closest('a')
  if (!a?.href || a.getAttribute('href') === '#') return
  console.log(evt)
  evt.preventDefault()
  ctrl.abort()
  ctrl = new AbortController()
  // @ts-ignore
  evt.request = new Request(a.href, { signal: ctrl.signal })
  router.handle(evt).then(() => {
    // @ts-ignore
    history.pushState({}, '', evt.request.url)
  })
})

// @ts-ignore
const { quota, usage, usageDetails = {} } = await navigator.storage?.estimate() || {}
// const { self: clientId, clients } = await fetch('/clientmyadmin/clients').then(r => r.json())

Alpine.directive('close', el => {
  el.addEventListener('click', evt => {
    evt.preventDefault()
    const d = el.closest('dialog')
    d.remove(d.close())
  })
})

Alpine.directive('import', el => {
  import('./' + el.getAttribute('x-import')).then(mod => {
    const temp = document.createElement('template')
    temp.innerHTML = mod.template
    const clone = temp.content.cloneNode(true)
    clone.firstChild
    // copy attributes from el to clone
    for (const attr of el.attributes) {
      attr.name.includes('import') || clone.firstChild.setAttribute(attr.name, attr.value)
    }
    el.replaceWith(clone)
  })
})

Alpine.data('app', () => ({
  open: false,
  page: 'websql',
  quota,
  usage,
  usageDetails,
  // clients,
  openDatabase(name) {
    new Dexie(name).open().then(function () {
        db.tables.forEach(function (table, i) {
            var primKeyAndIndexes = [table.schema.primKey].concat(table.schema.indexes);
            var schemaSyntax = primKeyAndIndexes.map(function (index) { return index.src; }).join(',');
            console.log("    " + table.name + ": " + "'" + schemaSyntax + "'" + (i < db.tables.length - 1 ? "," : ""));
            // Note: We could also dump the objects here if we'd like to:
            //  table.each(function (object) {
            //      console.log(JSON.stringify(object));
            //  });
        });
        console.log("});\n");
    })
  },
}))

console.log('start')
Alpine.start()

const set = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set

const identity = x => x
const safeHtml = globalThis.trustedTypes?.createPolicy("myEscapePolicy", {
  createHTML: identity,
  createScript: identity,
  createScriptURL: identity,
}) || {
  createHTML: identity,
  createScript: identity,
  createScriptURL: identity,
}

Object.defineProperty(Element.prototype, 'innerHTML', {
  set (html) {
    set.call(this, safeHtml.createHTML(html))
  }
})
Object.defineProperty(Element.prototype, 'insertAdjacentHTML', {
  value (position, html) {
    set.call(this, safeHtml.createHTML(html))
  }
})
Object.defineProperty(Element.prototype, 'outerHTML', {
  set (html) {
    set.call(this, safeHtml.createHTML(html))
  }
})