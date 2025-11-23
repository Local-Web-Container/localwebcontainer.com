import './clientmyadmin/event-handler.js'
import { Router } from './itty-router.js'
import kv from './clientmyadmin/shared/kv.js'
import fsa from './clientmyadmin/shared/fs.js'
import mime from './clientmyadmin/mime/mod.js'
import readzip, { Entry } from './clientmyadmin/shared/zip64/read.js'
import getDir from 'native-file-system-adapter/src/getOriginPrivateDirectory.js'
import jsdelivr from 'native-file-system-adapter/src/adapters/jsdelivr.js'
import crossOrigion from './clientmyadmin/cross-origion.js'
import { shimport } from './shimport.js'
import { html, isPlainObject } from './util.js'
import parseRange from 'range-parser'

globalThis.parseRange = parseRange

// import postcss from 'postcss'
// import postcssNested from 'postcss-nested'
const sw = /** @type {ServiceWorkerGlobalScope & typeof globalThis} */ (globalThis)

let target = `es${ new Date().getFullYear() - 2 }`

const chromeVersion = navigator.userAgentData
  ?.brands.find(e => e.brand === 'Chromium')
  ?.version

const firefoxVersion = navigator.userAgent.match(/Firefox\/([0-9]+)\./)?.[1]
const safariVersion = navigator.userAgent.match(/Version\/(\d+)\.\d+ Safari/)?.[1]

if (chromeVersion) {
  target = 'chrome' + chromeVersion
} else if (firefoxVersion) {
  target = 'firefox' + firefoxVersion
} else if (safariVersion) {
  target = 'safari' + safariVersion
}

const base = new URL('/', import.meta.url).origin

globalThis.loadLocalServiceWorker = async () => {
  root ??= await kv('get', 'root').then(dir =>
    dir?.type === 'jsdelivr' ? getDir(jsdelivr, dir.root) : dir
  )

  console.log('loading local service worker from', root)
  try {
    await shimport('/sw.js')
  } catch (e) {
    console.info('Failed to load local sw.js', e)
  }
}

/** look for request in cache, if not found, fetch and cache  */
async function cacheFirst (req) {
  const cache = await caches.open('v1')
  const cached = await cache.match(req)
  if (cached) return cached
  const res = await fetch(req)
  await cache.put(req, res.clone())
  return res
}

const origFetch = globalThis.fetch
/** @return {Promise<Response>} */
globalThis.fetch = async function fetch(...args) {
  // recursive loopback
  if (!(args[0] instanceof Request)) return fetch(new Request(...args))

  if (args[0].url.startsWith(origin)) {
    const pathname = new URL(args[0].url).pathname.replace(/^\/+/, '')
    /** @type {Map<string, Entry|File>} */
    const entries = new Map()
    root ??= await kv('get', 'root')
    if (root?.type === 'jsdelivr') {
      root = await getDir(jsdelivr, root.root)
    }

    if (root) {
      const permission = await root.queryPermission?.({ mode: 'read' })
      if (permission === 'prompt') return fetch(`${base}/clientmyadmin/allowread.html`)
      let p = ''
      try {
        p = decodeURIComponent(pathname)
      } catch (e) {
        return new Response('Not Found.', {
          status: 404,
          statusText: 'Not found',
        })
      }

      // This will be used in case of firefox when using a local folder from drag and drop
      if (root.type === 'client') {
        const client = await sw.clients.get(root.root)
        if (!client) {
          await kv('delete', 'root')
          return Response.redirect(`/clientmyadmin/?client-not-found`)
        }
        const mc = new MessageChannel()
        client.postMessage({
          cmd: 'open', path: p, port: mc.port1
        }, [mc.port1])
        const evt = await new Promise(rs => mc.port2.onmessage = rs)
        const data = evt.data
        if (data instanceof File) {
          return renderFile(data)
        } else if (data instanceof Error) {
          return new Response(data.message, {
            status: 500,
            statusText: 'Internal Server Error',
          })
        } else {
          return renderTreeList(new Map(data))
        }
      }
      try {
        const handle = await fsa.open(root, p)
        if (handle.kind === 'file') {
          const file = await handle.getFile()
          return renderFile(file, args[0])
        } else {
          for await (const [name, entry] of handle) {
            entries.set(`${pathname}/${name}`.replace(/^\//, ''), entry)
          }
          return renderTreeList(entries)
        }
      } catch (e) {
        console.log(e)
        return new Response('Not Found.', {
          status: 404,
          statusText: 'Not found',
        })
      }
    }

    /** @type {Blob} */
    const zipBlob = await kv('get', 'zip-file')
    if (!zipBlob) {
      // return new Response('Not Found.')
      return Response.redirect('/clientmyadmin')
    }

    for await (const entry of readzip(zipBlob)) {
      if (!entry.directory) entries.set(entry.name, entry)
    }
    const entry = entries.get(pathname)
    return entry
      ? renderFile(entry)
      : renderTreeList(entries)
  }
  return caches.match(args[0]).then(res => {
    return res || origFetch(args[0])
  })
}

let p

// Lazy initialization of ESbuild wasm module as needed.
async function init () {
  const { initialize } = await shimport(base + '/esbuild.min.js')
  const res = await cacheFirst(base + '/esbuild.wasm')
  await initialize({
    worker: false,
    wasmModule: await WebAssembly.compileStreaming(res)
  })
}

// A simple ts bundler with remote http resolver FTW!
/**
 *
 * @param {string} url
 * @param {*} opts
 * @returns {Promise<Uint8Array>}
 */
async function _import (url, opts) {
  // if (cache.has(url)) return cache.get(url)
  await (p ??= init())
  const { build, httpPlugin, sveltePlugin } = await shimport(base + '/esbuild.min.js')
  console.log([ httpPlugin, sveltePlugin ])
  const options = {
    entryPoints: [url],
    format: 'esm',
    minify: true,
    // format: 'iife',
    globalName: 'xyz',
    sourcemap: true,
    // bundle: true,
    target,
    plugins: [
      sveltePlugin, httpPlugin ],
    ...opts
  }

  console.groupCollapsed('esbuild building ' + url)
  console.info('options', options)
  console.groupEnd()

  const result = await build(options)
  return result.outputFiles[0].contents
}

const router = Router()
let root

router.get(o =>
  ctx => ['script', 'worker'].includes(ctx.request.destination),
  async ctx => {
    const ext = ctx.request.url.split('.').pop()


    if (ext === 'html' && ctx.request.destination === 'script') {
      const html = await fetch(ctx.request.url).then(res => res.text())

      return new Response(`
        const t = document.createElement('template')
        t.innerHTML = ${JSON.stringify(html)}
        export default t.content
      `, {
        headers: { 'content-type': 'text/javascript' }
      })
    }

    if (ext === 'css' && ctx.request.destination === 'script') {
      await (p ??= init())
      const { build, httpPlugin } = await shimport(base + '/esbuild.min.js')
      const options = {
        entryPoints: [ctx.request.url],
        minify: true,
        sourcemap: false,
        target,
        plugins: [ httpPlugin ],
        // @import should not be allowed in CSS modules?
        // https://github.com/WICG/construct-stylesheets/issues/119#issuecomment-588352418
        bundle: false,
      }

      const result = await build(options)
      const esbuildCSS = new TextDecoder().decode(result.outputFiles[0].contents)

      return new Response(`
        const sheet = new CSSStyleSheet()
        await sheet.replace(${JSON.stringify(esbuildCSS)}, {
          baseURL: ${JSON.stringify(ctx.request.url)}
        })
        export default sheet
      `, {
        headers: { 'content-type': 'text/javascript' }
      })
    }

    if (['jsx', 'ts', 'tsx', 'svelte'].includes(ext)) {
      const { rewriteImports } = await shimport(base + '/esbuild.min.js')
      const uint8 = await _import(ctx.request.url)
      let str = new TextDecoder().decode(uint8)
      str = await rewriteImports(str)
      const res = new Response(str, {
        headers: { 'content-type': 'text/javascript' }
      })
      return res
    }
  }
)

// router.get(o => ['script', 'worker'].includes(o.request.destination), ctx => {
//   const ext = ctx.request.url.split('.').pop()
//   if (['jsx', 'ts', 'tsx'].includes(ext)) {
//     console.log('dah')
//     return _import(ctx.request.url).then(str => new Response(str, {
//       headers: { 'content-type': 'application/javascript' }
//     }))
//   }
// })

// Just to render install page upon specifying 'installFrom'
router.get(o => o.url.searchParams.get('installFrom'), async (ctx) => {
  root = undefined
  return fetch(`${base}/clientmyadmin/installfrom.html`)
})

// Add trailing slash to clientmyadmin if not present
router.get('/clientmyadmin', ctx => {
  return Response.redirect('/clientmyadmin/', 302)
})

router.get('/clientmyadmin/clients', async o => {
  const clients = await sw.clients.matchAll()
  const m = clients.map(client => {
    const res = {}
    // Convert client to plain object
    for (const key in client) {
      if (typeof client[key] !== 'function') {
        res[key] = client[key]
      }
    }
    return res
  })

  return Response.json({
    self: o.event.clientId,
    clients: m
  })
})

// Redirect all clientmyadmin/* request to top domain being matched on subdomain
router.get(evt =>
  evt.request.destination === 'document' &&
  evt.request.url.includes('/clientmyadmin/inspector'),
  ctx => fetch(`${base}/clientmyadmin/inspector.html`)
)

// Redirect all clientmyadmin/* request to top domain being matched on subdomain
router.get(location.origin + '/clientmyadmin/*', ctx => {
  ctx.request = new Request(ctx.request.url.replace(location.origin, base))
  ctx.url = new URL(ctx.request.url)
})

const singleton = {}

// All url that ain't for this subdomain should make a normal request
router.all('/functions/*', async evt => {
  const url = new URL(evt.url.pathname, location.origin)
  const path = url.toString()
  let module
  if (url.pathname.endsWith('.ts')) {
    singleton[path] ??= _import(path, { format: 'iife' }).then(load)
    module = await singleton[path]
  } else {
    module = await shimport(path)
  }
  let method = evt.request.method
  method = method[0].toUpperCase() + method.slice(1).toLowerCase()
  const fn = module[`onRequest${method}`]
  return fn?.(evt)
})

router.all(evt =>
  evt.request.destination === 'document' &&
  evt.url.pathname.toLowerCase().endsWith('.md'),
  _ => fetch(`${base}/clientmyadmin/markdown.html`)
)

router.all(evt =>
  evt.request.destination === 'document' &&
  evt.url.pathname.toLowerCase().endsWith('.json'),
  _ => fetch(`${base}/clientmyadmin/json.html`)
)

router.all(evt =>
  evt.request.destination === 'script' &&
  evt.url.pathname.toLowerCase().endsWith('.ce.vue'),
  async ctx => {
    const { compile } = await shimport(`${base}/clientmyadmin/vue-resolver.js`)
    return compile(ctx.request)
  }
)

router.all(evt =>
  evt.request.destination === 'document' &&
  evt.url.pathname.toLowerCase().endsWith('.svelte'),
  async ctx => {
    const { compile } = await shimport('https://cdn.jsdelivr.net/npm/svelte@4.0.0/compiler.cjs/+esm')
    const { create_ssr_component } = await shimport('https://esm.sh/stable/svelte@4.0.0/es2022/src/runtime/internal/ssr.js')
    const options = { generate: 'ssr' }
    const source = await fetch(ctx.request.url).then(res => res.text())
    let code = compile(source, options).js.code

    code = code
      .slice(code.indexOf(';')) // strip out import statement
      .replace('export default', 'return') // replace export with return

    // evaluate the code and render the component
    const result = new Function('create_ssr_component', code)(create_ssr_component).render()

    const str = html`<!DOCTYPE html>
    <html>
      <head>
        <style>${result.css.code}</style>
      </head>
      <body>${result.html}</body>
    </html>`

    return new Response(str, {
      headers: { 'content-type': 'text/html' },
      status: 200,
      statusText: 'OK'
    })
  }
)

globalThis.router = router
router.get(o =>
  o.request.destination === 'style',
  async ctx => {
    // const { napi, Environment } = await shimport('https://cdn.jsdelivr.net/npm/napi-wasm')
    // const importObject = { env: napi };
    // const res = fetch('https://cdn.jsdelivr.net/npm/lightningcss-wasm@1.20.0/lightningcss_node.wasm')
    // const { instance } = await WebAssembly.instantiateStreaming(res, importObject)
    // const lightningcss = new Environment(instance).exports

    // const css = await fetch(ctx.request).then(res => res.text())
    // const ab = await fetch(ctx.request).then(res => res.arrayBuffer())
    // console.time('lightningcss')
    // let {code, map} = lightningcss.transform({
    //   filename: 'style.css',
    //   code: new Uint8Array(ab),
    //   minify: true,
    //   sourceMap: false,
    //   drafts: {
    //     nesting: true,
    //     customMedia: true
    //   }
    // })

    // console.timeEnd('lightningcss')
    // console.log('lightningcss !')

    // console.time('postcss')
    // const result = await postcss([ postcssNested ])
    //   .process(css, {
    //     from: ctx.request.url,
    //     to: 'dest/app.css',
    //     // generate a sourcemap
    //     map: {
    //       inline: true
    //     }
    //   })
    // console.timeEnd('postcss')

    await (p ??= init())
    const { build, httpPlugin, sveltePlugin } = await shimport(base + '/esbuild.min.js')
    const options = {
      entryPoints: [ctx.request.url],
      minify: true,
      sourcemap: true,
      target,
      // bundle: true,
      plugins: [ httpPlugin, sveltePlugin ],
    }

    const result2 = await build(options)
    const esbuildCSS = result2.outputFiles[0].text

    return new Response(esbuildCSS, {
      headers: { 'content-type': 'text/css; charset=utf-8' }
    })
  }
)

// A generic error handler
function errorHandler (error, evt) {
  console.groupCollapsed('⚠️ Failed to handle request: ' + evt.request.url)
  console.error(error)
  console.log(evt.request)
  console.groupEnd()
  return new Response(error.stack || 'Server Error', {
    status: error.status || 200
  })
}

/**
 * Convert anything to a response
 * @return {Response}
 */
function convertToResponse (thing) {
  if (thing instanceof Response) return thing
  if (typeof thing === undefined) {
    return new Response('Not Found.', { status: 404 })
  }
  if (Array.isArray(thing) || isPlainObject(thing)) {
    return Response.json(thing)
  }
  return new Response(thing)
}

// attach the router "handle" to the event handler
sw.addEventListener('fetch', evt => {
  // if (evt.request.url.startsWith('https://fonts.googleapis.com')) {
  //   evt.respondWith(fetch(evt.request))
  //   return
  // }
  evt.respondWith(router
    .handle(evt)
    .then(convertToResponse)
    .catch(err => errorHandler(err, evt))
  )
})

// Simple helper use waitUntil and logging any errors that occur.
const t = (evt, fn) => evt.waitUntil(fn().catch(console.error))

sw.onactivate = evt => t(evt, () => sw.clients.claim())
sw.onmessage = async evt => {
  const { data, ports } = evt

  if (data === 'unload') {
    kv('delete', 'root')
    root = null
  }

  // Kontrollera om det är ett meddelande för att överföra en MessageChannel
  if (data?.type === 'TRANSFER_CHANNEL' && data.targetClientId) {
    t(evt, async () => {
      const targetClient = await sw.clients.get(data.targetClientId)
      targetClient.postMessage({ type: 'CHANNEL_TRANSFER' }, ports)
    })
  }

  if (data === 'claimMe') {
    t(evt, async () => {
      await sw.clients.claim()
      ports[0].postMessage('claimed')
    })
  }
}

function renderTreeList(entries) {
  // render a list of files that can be opened
  const files = Array.from(entries.keys()).sort()
  const str = html`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name='viewport' content='width=device-width, initial-scale=1'>
        <link rel="stylesheet" href="/clientmyadmin/style.css">
        <script type="module" src="/clientmyadmin/prompt.js"></script>
        <style>body { margin: 20px; max-width: initial; }</style>
      </head>
      <body>
        <h1>Files</h1>
        <ul>
          ${files.map(file => {
            return entries.get(file).crc32
              ? `<li><a href="/${file}">${file}</a> ${entries.get(file).size.toString().padStart(6, ' ')}b </li>`
              : `<li><a href="/${file}">${file}</a></li>`
          }).join('')}
        </ul>
      </body>
    </html>`

  return new Response(str, {
    headers: { 'content-type': 'text/html' },
    status: 404,
    statusText: 'Not found'
  })
}

/**
 * @param {Uint8Array} uint8
 */
function load(uint8) {
  const str = new TextDecoder().decode(uint8)
  const body = `${str}; \n return xyz`
  const mod = new Function(body)()
  const result = mod?.default || mod
  return result
}

/** @param {File|Entry} file */
async function renderFile (file, request) {

  const rangeHeader = request?.headers.get('range')
  if (rangeHeader) {
    const [ range ] = parseRange(file.size, rangeHeader, { combine: true })
    const sliced = file.slice(range.start, range.end + 1)
    const headers = {
      'content-type': mime.getType(file.name) || file.type,
      'content-length': sliced.size,
      'accept-ranges': 'bytes',
      'content-range': `bytes ${range.start}-${range.end}/${file.size}`
    }

    return new Response(sliced.stream(), {
      headers,
      status: 206
    })
  }

  const headers = {
    'content-type': mime.getType(file.name) || file.type,
    'content-length': file.size
  }

  return new Response(file.stream(), { headers })
}

// onfetch = evt => {
//   if (
//     evt.request.destination === 'script' &&
//     evt.request.assertion?.type === 'css'
//   ) {
//     evt.waitUntil(async function () {
//       const { request } = evt
//       const css = await fetch(request).then(res => res.text())

//       return new Response(`
//         const sheet = new CSSStyleSheet()
//         await sheet.replace(${JSON.stringify(css)}, {
//           baseURL: ${JSON.stringify(ctx.request.url)}
//         })
//         export default sheet
//       `, {
//         headers: { 'content-type': 'text/javascript' }
//       })
//     })
//   }
// }


/*
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  src: url(https://fonts.gstatic.com/icon/font?kit=kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsLjBuVYLA7lrt8zWsgTgR00mg&skey=b8dc2088854b122f&v=v247) format('woff2');
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}


access-control-allow-origin: *
alt-svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
cache-control: private, max-age=86400, stale-while-revalidate=604800
content-encoding: gzip
content-type: text/css; charset=utf-8
cross-origin-opener-policy: same-origin-allow-popups
cross-origin-resource-policy: cross-origin
date: Fri, 30 May 2025 16:53:12 GMT
expires: Fri, 30 May 2025 16:53:12 GMT
last-modified: Fri, 30 May 2025 16:53:12 GMT
link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin
server: ESF
strict-transport-security: max-age=31536000
timing-allow-origin: *
vary: Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
x-xss-protection: 0

*/