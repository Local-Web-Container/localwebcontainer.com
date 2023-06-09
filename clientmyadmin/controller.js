import kv from './shared/kv.js'
import Alpine_ from 'https://cdn.jsdelivr.net/npm/alpinejs@3.9.1/dist/module.esm.min.js'
import { showDirectoryPicker } from 'https://cdn.jsdelivr.net/npm/native-file-system-adapter@3.0.0/src/es6.js'

globalThis.kv = kv
/** @type {import('alpinejs').default} */
const Alpine = Alpine_
const { quota, usage, usageDetails = {} } = await navigator.storage?.estimate?.() || {}
const { self: clientId, clients } = await fetch('/clientmyadmin/clients').then(r => r.json())

// const APPLICATION_KEYS = {
//   privateKey: 'AulTcVxJuSeJjiDpadUjmjTigFVeZV1nw75NpxYkubI',
//   publicKey: 'BH6poH0k7sCu7STw8BelDa38OE-gnLoHK2HzF63-DJ_qQDDFijQpDiKmvAbjbLFLThJ196cx_0lNDqMfMR9Lg0Y'
// }

const pushPermission = await navigator.permissions.query({
  name: 'push',
  userVisibleOnly: true
}).catch(() => ({ state: 'denied' }))

const geoPermission = await navigator.permissions.query({
  name: 'geolocation'
})

const notificationPermission = await navigator.permissions.query({
  name: 'notifications'
})

// const swReg = globalThis.swReg = await navigator.serviceWorker.ready;
// const sub = await swReg.pushManager.getSubscription()
// console.log(sub)
// window.onclick = async () => await swReg.pushManager.subscribe({
//   userVisibleOnly: false, // a chrome requirement...
//   applicationServerKey: APPLICATION_KEYS.publicKey
// })

let permissions = Alpine.reactive({
  push: pushPermission.state,
  notification: notificationPermission.state,
  geo: geoPermission.state,
})

pushPermission.onchange = () => { permissions.push = pushPermission.state }
geoPermission.onchange = () => { permissions.geo = geoPermission.state }
notificationPermission.onchange = () => { permissions.notification = notificationPermission.state }

Alpine.directive('uppercase', el => {
  el.textContent = el.textContent + ' (uppercase)'
})

const unit = 'B0KiB0MiB0GiB0TiB0PiB0EiB0ZiB0YiB'.split('0')
/** @param {number} size */
const bytes = (size, i = 0) => {
  for (;1024<=size;i++)size/=1024;
  return `${Math.round(size*10)/10} ${unit[i]}`
}

Alpine.data('dropdown', () => ({
  open: false,
  quota,
  usage,
  usageDetails,
  clients,
  permissions,

  bytes,

  async init () {
    this.open = true
  },

  toggle() {
    this.open = !this.open
  },

  trigger: {
    ['@click']() {
      this.open = !this.open
    },
  },

  dialogue: {
    ['x-show']() {
      return this.open
    },
  },
}))

Alpine.start()

const picker = document.querySelector('#pick')
const warning = document.querySelector('#warning')
const clear = document.querySelector('#clearSiteData')
const root = await kv('get', 'root')

if (root && root.type === 'directory') {
  /** @type {FileSystemDirectoryHandle}  */
  const canRead = await root.queryPermission({ mode: 'read' })
  if (!canRead) {
    // show a button and ask for permission to read the folder
    const button = document.createElement('button')
    button.innerText = 'Grant permission to read the folder'
    button.onclick = async () => {
      await root.requestPermission({ mode: 'read' })
      button.remove()
    }
  }

  // show the filename before the picker element
  picker.insertAdjacentText('beforebegin', `Root: ${root.name}`)
}

picker.onclick = async (e) => {
  e.preventDefault()
  const dir = await showDirectoryPicker({ mode: 'readwrite' })
  if (dir) await kv('put', dir, 'root')
}

if (!globalThis.showDirectoryPicker) {
  picker.remove()
}

// drag and drop in files
const drop = document.documentElement
drop.ondragover = drop.ondragenter = (e) => {
  e.preventDefault()
  drop.classList.add('dragover')
}
drop.ondragleave =
drop.ondragend = (e) => {
  e.preventDefault()
  drop.classList.remove('dragover')
}
drop.ondrop = async (e) => {
  e.preventDefault()
  drop.classList.remove('dragover')
  const items = e.dataTransfer.items
  if (items.length === 0) {
    alert('No files were dropped')
  }
  if (items.length > 1) {
    alert('Only one folder can be dropped')
  }
  items[0].getAsFileSystemHandle().then(async root => {
    if (root.kind !== 'directory') {
      return alert('Only folders can be dropped')
    }
    if (false && root instanceof globalThis.FileSystemDirectoryHandle) {
      // it's a real FileSystemDirectoryHandle object
      kv('put', root, 'root')
    } else {
      // it's a polyfilled object, tell sw we control this.
      kv('put', { type: 'client', root: clientId }, 'root')

      const reg = await navigator.serviceWorker.getRegistration()

      addEventListener('beforeunload', () => {
        reg.active.postMessage('unload')
      })

      warning.hidden = false

      const {default: fsa} = await import('./shared/fs.js')

      navigator.serviceWorker.addEventListener('message', async evt => {
        if (evt.data.cmd === 'open') {
          try {
            const handle = await fsa.open(root, evt.data.path)
            if (handle.kind === 'file') {
              const file = await handle.getFile()
              evt.data.port.postMessage(file)
            } else {
              /** @type {Map<string, Entry|File>} */
              const entries = new Map()
              for await (const [name, entry] of handle) {
                entries.set(`${evt.data.path}/${name}`.replace(/^\//, ''), entry)
              }
              evt.data.port.postMessage([...entries])
            }
          } catch (err) {
            // console.log(err)
            evt.data.port.postMessage(err)
          }
        }
      })
    }
  })
}

clear.onclick = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map(reg => reg.unregister()))
  // location.reload()
  // const clients = self.clients.matchAll()
  // clients.forEach(client => {
  //   if (client.url && 'navigate' in client) {
  //     client.navigate(client.url)
  //   }
  // })
}
