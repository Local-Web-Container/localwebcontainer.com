import { Router } from './itty-router.js'
import sw from './extern.js'
import kv from './clientmyadmin/shared/kv.js'
import fsa from './clientmyadmin/shared/fs.js'
import mime from './clientmyadmin/mime/mod.js'
import readzip, { Entry } from './clientmyadmin/shared/zip64/read.js'
import getDir from 'native-file-system-adapter/src/getOriginPrivateDirectory.js'
import jsdelivr from 'native-file-system-adapter/src/adapters/jsdelivr.js'
import postcss from 'postcss'
import postcssNested from 'postcss-nested'

import { shimport } from './shimport.js'

// const autoprefixer = require('autoprefixer')
// const postcss = require('postcss')
// const postcssNested = require('postcss-nested')

const { hasOwn } = Object

const base = location.origin.includes('localhost')
  ? 'http://localhost:4445'
  : 'https://localwebcontainer.com'

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
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

sw.addEventListener('install', () => {
  caches.open('v1').then(cache =>
    cache.addAll([
      'https://sindresorhus.com/github-markdown-css/github-markdown.css',
      // base + '/esbuild.wasm',
      base + '/clientmyadmin/index.html',
      base + '/clientmyadmin/json.html',
      base + '/clientmyadmin/style.css',
      base + '/clientmyadmin/markdown.html',
      base + '/clientmyadmin/style.html',
      base + '/clientmyadmin/allowread.html',
      base + '/clientmyadmin/shared/kv.js',
      base + '/clientmyadmin/shared/fs.js',
    ])
  )
})

function isPlainObject (o) {
  var ctor,prot;
  if (isObject(o) === false) return false
  ctor = o.constructor
  if (ctor === undefined) return true
  prot = ctor.prototype
  if (isObject(prot) === false) return false
  return hasOwn(prot, 'isPrototypeOf')
};


const origFetch = globalThis.fetch
/** @return {Promise<Response>} */
globalThis.fetch = async function fetch(...a) {
  if (!(a[0] instanceof Request)) return fetch(new Request(...a))
  if (a[0].url.startsWith(origin)) {
    const pathname = new URL(a[0].url).pathname.replace(/^\/+/, '')
    /** @type {Map<string, Entry|File>} */
    const entries = new Map()
    const x = await kv('get', 'root')
    root ??= x
    if (root?.type === 'jsdelivr') {
      root = await getDir(jsdelivr, root.root)
    }
    if (root) {
      globalThis.x = root
      const x = await root.queryPermission({ mode: 'read' })
      if (x === 'prompt') return fetch(`${base}/clientmyadmin/allowread.html`)
      let p = ''
      try {
        p = decodeURIComponent(pathname)
      } catch (e) {
        return new Response('Not Found.', {
          status: 404,
          statusText: 'Not found',
        })
      }
      try {
        const handle = await fsa.open(root, p)
        if (handle.kind === 'file') {
          return handle.getFile().then(renderFile)
        } else {
          for await (const [name, entry] of handle) {
            entries.set(`${pathname}/${name}`.replace(/^\//, ''), entry)
          }
          return renderTreeList(entries)
        }
      } catch (e) {
        return new Response('Not Found.', {
          status: 404,
          statusText: 'Not found',
        })
      }
    }

    /** @type {Blob} */
    const zipBlob = await kv('get', 'zip-file')
    if (!zipBlob) return Response.redirect('/clientmyadmin')

    for await (const entry of readzip(zipBlob)) {
      if (!entry.directory) entries.set(entry.name, entry)
    }
    const entry = entries.get(pathname)
    return entry
      ? renderFile(entry)
      : renderTreeList(entries)
  }
  return caches.match(a[0]).then(res => {
    return res || origFetch(a[0])
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
async function _import (url, opts) {
  // if (cache.has(url)) return cache.get(url)
  await (p ??= init())
  const { build, httpPlugin } = await shimport(base + '/esbuild.min.js')
  const options = {
    entryPoints: [url],
    format: 'esm',
    minify: true,
    // format: 'iife',
    globalName: 'xyz',
    sourcemap: true,
    // bundle: true,
    plugins: [ httpPlugin ],
    ...opts
  }

  console.groupCollapsed('esbuild building ' + url)
  console.info('options', options)
  console.groupEnd()

  const result = await build(options)
  return new TextDecoder().decode(result.outputFiles[0].contents)
}

const router = Router()
let root

router.all('*', o => {
  // return true
}, ctx => {
  ctx.headers
})

router.get(o => ['script', 'worker'].includes(o.request.destination), ctx => {
  const ext = ctx.request.url.split('.').pop()
  if (['jsx', 'ts', 'tsx'].includes(ext)) {
    return _import(ctx.request.url).then(str => new Response(str, {
      headers: { 'content-type': 'application/javascript' }
    }))
  }
})



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
router.get(o =>
  o.request.destination === 'document' &&
  o.request.url.includes('/clientmyadmin/inspector'),
  ctx => fetch(`${base}/clientmyadmin/inspector.html`)
)

// Redirect all clientmyadmin/* request to top domain being matched on subdomain
router.get(location.origin + '/clientmyadmin/*', ctx => {
  ctx.request = new Request(ctx.request.url.replace(location.origin, base))
  ctx.url = new URL(ctx.request.url)
})

const singleton = {}

// All url that ain't for this subdomain should make a normal request
router.all('/functions/*', async ctx => {
  const url = new URL(ctx.url.pathname, location.origin)
  const path = url.toString()
  let module
  if (url.pathname.endsWith('.ts')) {
    singleton[path] ??= _import(path, { format: 'iife' }).then(load)
    module = await singleton[path]
  } else {
    module = await shimport(path)
  }
  let method = ctx.request.method
  method = method[0].toUpperCase() + method.slice(1).toLowerCase()
  const fn = module[`onRequest${method}`]
  return fn?.(ctx)
})

router.all(o =>
  o.request.destination === 'document' &&
  o.url.pathname.toLowerCase().endsWith('.md'),
  _ => fetch(`${base}/clientmyadmin/markdown.html`)
)

router.all(o =>
  o.request.destination === 'document' &&
  o.url.pathname.toLowerCase().endsWith('.json'),
  _ => fetch(`${base}/clientmyadmin/json.html`)
)


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
    const { build, httpPlugin } = await shimport(base + '/esbuild.min.js')
    const options = {
      entryPoints: [ctx.request.url],
      minify: true,
      sourcemap: true,
      // bundle: true,
      plugins: [ httpPlugin ],
    }

    // console.time('esbuild')
    const result2 = await build(options)
    // console.timeEnd('esbuild')
    const esbuildCSS = new TextDecoder().decode(result2.outputFiles[0].contents)
    // console.log('sizes', {
    //   css: new Blob([css]).size,
    //   lightningcss: new Blob([code]).size,
    //   postcss: new Blob([result.css]).size,
    //   esbuild: new Blob([esbuildCSS]).size
    // })
    return new Response(esbuildCSS, {
      headers: { 'content-type': 'text/css' }
    })
  }
)

// All url that ain't for this subdomain should make a normal request
router.all({}, async ctx => {
  // return new Response('hej')
  return fetch(ctx.request)
})

// A generic error handler
function errorHandler (error) {
  console.error(error)
  return new Response(error.stack || 'Server Error', {
    status: error.status || 200
  })
}

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
sw.addEventListener('fetch', evt =>
  evt.respondWith(router
    .handle(evt)
    .then(convertToResponse)
    .catch(errorHandler)
  )
)

// Simple helper use waitUntil and logging any errors that occur.
const t = (evt, fn) => evt.waitUntil(fn().catch(console.error))

sw.onactivate = evt => t(evt, () => sw.clients.claim())
sw.onmessage = async evt => {
  const { data, ports } = evt
  if (data !== 'claimMe') return

  t(evt, async () => {
    await sw.clients.claim()
    ports[0].postMessage('claimed')
  })
}

function renderTreeList(entries) {
  // render a list of files that can be opened
  const files = Array.from(entries.keys()).sort()
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name='viewport' content='width=device-width, initial-scale=1'>
        <link rel="stylesheet" href="/clientmyadmin/style.css">
        <style>
          body {
            margin: 20px;
            max-width: initial;
          }
        </style>
      </head>
      <body>
        <ul>
          ${files.map(file => {
            return entries.get(file).crc32
              ? `<li><a href="/${file}">${file}</a> ${entries.get(file).size.toString().padStart(6, ' ')}b </li>`
              : `<li><a href="/${file}">${file}</a></li>`
          }).join('')}
        </ul>
      </body>
    </html>`
  return new Response(html, {
    headers: { 'content-type': 'text/html' },
    status: 404,
    statusText: 'Not found'
  })
}

function load(str) {
  const body = `${str}; \n return xyz`
  const mod = new Function(body)()
  const result = mod?.default || mod
  return result
}

/** @param {File|Entry} file */
async function renderFile (file) {
  const headers = {
    'content-type': mime.getType(file.name) || file.type,
    'content-length': file.size
  }

  return new Response(file.stream(), { headers })
}