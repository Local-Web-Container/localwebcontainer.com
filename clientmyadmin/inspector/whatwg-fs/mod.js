import fs from '../../shared/fs.js'
import grid, { bytes } from '../../../scripts/grid/data-grid.js'
import relativeTime from '../../../scripts/relative-time.js'
import hotkeys from '../hotkeys.js'
import menu from '../menu.js'

const webkitRoot = await new Promise(rs => {
  try {
    webkitRequestFileSystem(0, 0, x => rs(x.root), () => rs())
  } catch (err) {rs() }
})

if (webkitRoot) {
  /** @type {Object} */
  const DirectoryEntry = Reflect.getPrototypeOf(webkitRoot)
  /** @type {Object} */
  const Entry = Reflect.getPrototypeOf(DirectoryEntry)

  DirectoryEntry.getDirectoryAsync = async function (name, options) {
    return new Promise((rs, rj) => this.getDirectory(name, options, rs, rj))
  }

  /**
   * @param {DirectoryEntry} parent
   * @param {string} newName
   */
  Entry.copyToAsync = async function copyToAsync(parent, newName) {
    return new Promise((rs, rj) => this.copyTo(parent, newName, rs, rj))
  }

  Entry.getMetadataAsync = async function getMetadataAsync () {
    return new Promise((rs, rj) => this.getMetadata(rs, rj))
  }

  /**
   * @param {DirectoryEntry} parent The parent directory
   * @param {string} [newName] The name of the new file
   */
  Entry.moveToAsync = async function moveToAsync (parent, newName) {
    return new Promise((rs, rj) => this.moveTo(parent, newName, rs, rj))
  }

  /**
   * @param {string} path The path to the file
   * @param {*} [options] The options to pass to the file system
   */
  Entry.getFileAsync = async function getFileAsync (path, options = { }) {
    return new Promise((rs, rj) => this.getFile(path, options, rs, rj))
  }

  Entry.getParentAsync = async function getParentAsync () {
    return new Promise((rs, rj) => this.getParent(rs, rj))
  }
}

async function getSandboxHandle (entry) {
  const path = (await root.resolve(entry)).join('/')
  return entry.kind === 'file' ? webkitRoot.getFileAsync(path) : webkitRoot.getDirectoryAsync(path)
}

/** @return {Promise<number>} */
async function getDate(entry) {
  console.log(entry)
  const metadata = await entry.getMetadataAsync()
  return +metadata.modificationTime
}

async function getDateFromEntry (entry) {
  const absolutePath = await root.resolve(entry)
  if (!absolutePath) throw new Error('Could not resolve path')
  return webkitRoot.getDirectoryAsync(absolutePath.join('/')).then(getDate)
}

Alpine.data('fs', () => ({
  dropTrigger(name) {

  },
}))

let cwd = {}
const doc = document
const root = await navigator.storage.getDirectory()
const main = doc.querySelector('main')

async function rename () {
  const row = grid.getSelectedRows()[0]
  if (!row) return
  let name = prompt('Enter a new name for the file', row.data.entry.name)?.trim()
  if (!name || name === row.data.entry.name) return console.info('No change')
  const handle = await getSandboxHandle(row.data.entry)
  const parent = await handle.getParentAsync()
  await handle.moveToAsync(parent, name)
  render(cwd.ctx)
}

async function onpaste (evt) {
  const dir = {...cwd}
  // const oldHandles = Array.from(evt.clipboardData.items).map(item => item.webkitGetAsEntry())
  ;[...evt.clipboardData.items].forEach(e => console.log(e))

  const handles = Promise.all(
    Array.from(evt.clipboardData.items)
      .filter(e => e.kind === 'file')
      .map(e => e.getAsFileSystemHandle())
  )

  for (const handle of await handles) {
    await copyToAsync(handle, dir.handle)
  }

  setTimeout(render, 100, cwd.ctx)
}

async function write (source, parent, newName) {
  const file = await source.getFile()
  const fileHandle = await parent.getFileHandle(newName ?? source.name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(file)
  writable.close()
}

/**
 * Works pretty much the same as Entry.copyToAsync, but it's slower.
 *
 * @param {FileSystemDirectoryHandle|FileSystemFileHandle} source
 * @param {FileSystemDirectoryHandle} parent
 * @param {string} [newName]
 */
async function copyToAsync(source, parent, newName) {
  if (source.kind === 'directory') {
    const subdir = await parent.getDirectoryHandle(newName ?? source.name, { create: true })
    for await (const [name, handle] of source) {
      copyToAsync(handle, subdir, undefined)
    }
  } else {
    write(source, parent, newName)
  }
}

export default async function render (ctx) {
  const { META, CTRL, ALT, SHIFT, PASTE } = hotkeys

  if (menu.id !== 'fs') {
    menu.destroy()
    menu.id = 'fs'
    menu.setDocTitle('Whatwg FS')
  }

  hotkeys.register({
    backspace: remove,
    enter: rename,
    delete: remove,
    [PASTE]: onpaste,
    [META + 'O']: open,
    [META + 'ArrowDown']: open,
    [META + 'ArrowUp']: openParent,
  })

  console.log('Type "cwd" to inspect')
  cwd.ctx = ctx
  let path = ctx.match.pathname.groups[0] || '/'
  try {
    path = decodeURIComponent(path)
  } catch (e) {
    return
  }
  const handle = await fs.open(root, path)
  const data = []
  const entries = []
  cwd.path = path
  cwd.handle = handle
  cwd.entries = entries
  if (handle.kind === 'file') {
    const file = await handle.getFile()
    data.push({
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } else {
    for await (const [name, entry] of handle) {
      entries.push(entry)
      if (entry.kind === 'file') {
        const file = await entry.getFile()
        data.push({
          entry: entry,
          size: file.size,
          type: file.type || '-',
          name: entry.name,
          fullPath: path + name,
          date: new Date(file.lastModified),
        })
      } else {
        data.push({
          name: entry.name,
          entry: entry,
          type: entry.kind,
          fullPath: path + name,
          date: await webkitRoot.getDirectoryAsync(`/${path}/${name}`).then(getDate),
          size: '(...)'
        })
      }
    }
  }

  grid.setConfig({
    onDBclick: open,
    formatResult: false,
    indexBy: 'key',
    columns: [
      { property: 'name', label: 'Name', render: (val, data) => data.entry.kind === 'file' ? `📄 ` + data.entry.name : `📁 ` + data.entry.name },
      { property: 'type', label: 'Type', render: (val, data) => data.type },
      { property: 'size', label: 'Size', render: (val, data) => data.type === 'directory' ? '-' : bytes(val) },
      { property: 'date', label: 'Last modified', render: e => relativeTime(e) },
    ],
    data,
    onContextMenu: showContextMenu,
    onRemove(col, data) {
      data.entry.remove({recursive: true})
    },
  })
  main.append(grid.gridNode)
  globalThis.cwd = { ...cwd }
}

async function archive () {
  const { default: Writer } = await import('../../shared/zip64/write.js')
  const rows = grid.getSelectedRows()
  const single = rows.length === 1
  const entries = rows.map(row => row.data.entry)
  const handle = cwd.handle
  const prefix = single ? '/' : '/archive/'

  async function * getFile () {
    for (const selected of entries) {
      for await (const entry of fs.walkHandleRecursive(selected)) {
        const path = await handle.resolve(entry)
        const absolutePath = prefix + path.join('/')

        if (entry.kind === 'file') {
          const b = await entry.getFile();
          const file = new File([b], absolutePath, b)
          yield file
        } else {
          yield {
            name: absolutePath,
            directory: true,
            lastModified: await getDateFromEntry(entry),
          }
        }
      }
    }
  }

  const dest = await handle.getFileHandle('archive.zip', { create: true })
  const writable = await dest.createWritable()
  const it = getFile()

  return new ReadableStream({
    async pull (ctrl) {
      return it.next().then(r => {
        r.done ? ctrl.close() : ctrl.enqueue(r.value)
      })
    }
  }).pipeThrough(new Writer()).pipeTo(writable).then(console.log)
}

async function calcSize() {
  const rows = grid.getSelectedRows()
  for (const row of rows) {
    const entry = row.data.entry
    if (entry.kind === 'directory') {
      let size = 0
      let folders = -1
      let files = 0
      for await (const handle of fs.walkHandleRecursive(entry)) {
        if (handle.kind === 'file') {
          const file = await handle.getFile()
          size += file.size
          files++
        } else {
          folders++
        }
        row.data.size = size
        row.tr.querySelector('td:nth-child(3)').innerText = bytes(size) + ' (' + files.toLocaleString() + ' files, ' + Math.max(folders, 0).toLocaleString() + ' folders)'
      }
    }
  }
}

async function download () {
  const rows = grid.getSelectedRows()

  if (rows.length === 1 && rows[0].data.entry.kind === 'file') {
    const file = await rows[0].data.entry.getFile()
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
  } else {
    const dest = await showDirectoryPicker({ mode: 'readwrite' })
    for (const row of rows) {
      const entry = row.data.entry
      await fs.cp(entry, dest, entry.name)
    }
  }
}

async function remove () {
  grid.forEachSelectedRow(async row => {
    await row.data.entry.remove({recursive: true})
    row.tr.remove()
  })
}

async function open (e) {
  const rows = grid.getSelectedRows()

  if (rows.length === 0) return

  e.preventDefault()

  if (rows.length === 1) {
    const entry = rows[0].data.entry
    if (entry.kind === 'file') {
      e.stopPropagation()
      const file = await entry.getFile()
      const url = URL.createObjectURL(file)
      // location.href = url
      window.open(url)
      return
    }
    const path = await root.resolve(rows[0].data.entry)
    const url = `/clientmyadmin/inspector/whatwg-fs/${path?.join('/')}`
    globalThis.navigate(url)
  } else {
    // open all in new tabs
    for (const row of rows) {
      const path = await root.resolve(row.data.entry)
      const url = `/clientmyadmin/inspector/whatwg-fs/${path?.join('/')}`
      window.open(url)
    }
  }
}

async function openParent () {
  globalThis.navigate(new URL('./', location.href).href.slice(0, -1))
}

async function toFolder() {
  const entries = grid.getSelectedRows().map(row => row.data.entry)
  console.log(entries)
  const dir = await cwd.handle.getDirectoryHandle('New folder with objects', { create: true })
  for (const entry of entries) {
    await entry.move(dir)
  }
  render(cwd.ctx)
}

function showContextMenu (evt) {
  const rows = grid.getSelectedRows()
  const someFolder = rows.some(row => row.data.entry.kind === 'directory')
  const makeFolderOf = rows.length > 1 ? [{
    title: 'New folder from selected items',
    onclick() {
      setTimeout(toFolder)
    }
  }] : []

  return [
    ...makeFolderOf,
  {
    title: 'Open',
    shortcut: '⌘ + O',
    onclick: open
  }, {
    type: 'line'
  }, {
    title: 'Copy',
    // shortcut: 'Ctrl + C',
    async onclick () {
      navigator.clipboard.write([
        new ClipboardItem({
          ['text/html']: new File(['asd'], 'dumdum.mp4', {type: 'text/html'})
        })
      ])
      const files = []
      const paths = grid.getSelectedRows().map(row => root.resolve(row.data.entry))
      Promise.all(grid.getSelectedRows().map(row => row.data.entry.getFile())).then(files => {
        const format2 = 'web application/octet-stream'
        const items = []
        for (const file of files) {
          const clipboardItemInput = new ClipboardItem({
            [file.type]: file,
            [format2]: new File([file], file.name, {type: format2})
          })
          items.push(clipboardItemInput)
        }
        // navigator.clipboard.write(items)
      })
      // for (const path of await Promise.all(paths)) {
      //   path && files.push(`filesystem:${origin}/temporary/${path.join('/')}`)
      // }
      // navigator.clipboard.writeText(files.join('\n'))
    }
  },{
    title: 'Paste',
    disabled: true
    // shortcut: 'Ctrl + V',
    // onclick: () => {}
  }, {
    title: 'Rename',
    shortcut: 'Enter / ⏎',
    onclick: () => setTimeout(rename)
  }, {
    title: 'Delete',
    shortcut: 'Del / ⌫',
    onclick: remove
  },{
    type: 'line'
  },{
    title: 'Archive',
    onclick: archive
  },{
    title: 'Calculate size',
    get disabled() { return !someFolder },
    onclick: calcSize
  },{
    title: 'Download',
    onclick: download
  }]
}
