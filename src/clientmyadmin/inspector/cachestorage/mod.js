import grid from '../../../scripts/grid/data-grid.js'
import hotkeys from '../hotkeys.js'

const main = document.querySelector('main')

/** removes selected cache buckets */
async function removeBucket () {
  const rows = grid.getSelectedRows()
  for (const { data, tr } of rows) {
    tr.remove()
    caches.delete(data.key)
  }
}

function removeEntry () {
  const rows = grid.getSelectedRows()
  for (const { data, tr } of rows) {
    tr.remove()
  }
}

function listBuckets (keys) {
  hotkeys.register({
    delete: removeBucket,
    backspace: removeBucket
  })

  grid.setConfig({
    onContextMenu: showBucketsContextMenu,
    formatResult: false,
    indexBy: 'cache',
    columns: [
      { property: 'key', label: 'Cache storage' },
    ],
    data: keys.map(key => ({ key })),
    onRemove() {},
    onDBclick() {
      const [row] = grid.getSelectedRows()
      globalThis.navigate(new URL(`./cachestorage/${row.data.key}`, location.href).href)
    }
  })
}

async function showBucket (cache) {
  const requests = await cache.keys()
  const data = []

  hotkeys.register({
    delete: removeEntry,
    backspace: removeEntry
  })

  for (const request of requests) {
    const response = await cache.match(request)
    data.push({ url: request.url, request, response })
  }

  grid.setConfig({
    indexBy: 'key',
    onContextMenu: showCachedContextMenu,
    columns: [
      { property: 'url', label: 'Url', render(url) {
        console.log(url.startsWith(location.origin))
        const a = document.createElement('a')
        a.href = url
        a.innerText = url.startsWith(location.origin) ? url.slice(location.origin.length) : url
        return a
      } },
      { property: 'request', label: 'Request' },
      { property: 'response', label: 'Response' },
    ],
    data
  })
}

export default async function (ctx) {
  const {cache} = ctx.match.pathname.groups

  if (cache) {
    const exists = await caches.has(cache)
    if (!exists) {
      // Ask if it should be created
      const yes = confirm(`The cache storage "${cache}" dose not exist.\nWould you like to create it?`)
      if (!yes) return globalThis.navigate('/clientmyadmin/inspector/cachestorage')
    }
    caches.open(cache).then(showBucket)
  } else {
    caches.keys().then(listBuckets)
  }

  main.append(grid.gridNode)
}


function showBucketsContextMenu (evt) {
  return [{
    title: 'Delete cache storage',
    shortcut: 'Del / ⌫',
    onclick: removeBucket
  }]
}

function showCachedContextMenu (evt) {
  return [{
    title: 'Delete request / response',
    shortcut: 'Del / ⌫',
    onclick: removeEntry
  }]
}
