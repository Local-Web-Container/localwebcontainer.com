import kv from './shared/kv.js'
import Alpine_ from 'https://cdn.jsdelivr.net/npm/alpinejs@3.9.1/dist/module.esm.min.js'
globalThis.kv = kv
/** @type {import('alpinejs').default} */
const Alpine = Alpine_

const { quota, usage, usageDetails = {} } = await navigator.storage?.estimate() || {}
const { self: clientId, clients } = await fetch('/clientmyadmin/clients').then(r => r.json())

const APPLICATION_KEYS = {"privateKey":"AulTcVxJuSeJjiDpadUjmjTigFVeZV1nw75NpxYkubI","publicKey":"BH6poH0k7sCu7STw8BelDa38OE-gnLoHK2HzF63-DJ_qQDDFijQpDiKmvAbjbLFLThJ196cx_0lNDqMfMR9Lg0Y"}

const pushPermission = await navigator.permissions.query({
  name: 'push',
  userVisibleOnly: true
})

const geoPermission = await navigator.permissions.query({
  name: 'geolocation',
})

const notificationPermission = await navigator.permissions.query({
  name: 'notifications',
})

const swReg = globalThis.swReg = await navigator.serviceWorker.ready;
const sub = await swReg.pushManager.getSubscription()
console.log(sub)
window.onclick = async () => await swReg.pushManager.subscribe({
  userVisibleOnly: false, // a chrome requirement...
  applicationServerKey: APPLICATION_KEYS.publicKey
})

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
const clear = document.querySelector('#clearSiteData')
const root = await kv('get', 'root')

if (root && root.type !== 'jsdelivr') {
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
  const dir = await globalThis.showDirectoryPicker({ mode: 'readwrite' })
  if (dir) await kv('put', dir, 'root')
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
