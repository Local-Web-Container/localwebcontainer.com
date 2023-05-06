let p
let query = (method, ...args) => (p ??= new Promise(rs => {
  const open = indexedDB.open('clientmyadmin-kv')
  open.onupgradeneeded = () => open.result.createObjectStore('kv')
  open.onsuccess = () => {
    const db = open.result
    query = (method, ...args) => {
      const q = db.transaction('kv', 'readwrite').objectStore('kv')[method](...args)
      return new Promise((rs, rj) => {
        q.onsuccess = () => rs(q.result)
        q.onerror = () => rj(q.error)
      })
    }
    rs()
  }
})).then(() => query(method, ...args))

/**
 * @typedef {keyof IDBObjectStore} IDBObjectStoreMethods
 * @type {<M extends IDBObjectStoreMethods>(method: M, ...args: Parameters<IDBObjectStore[M]>) => Promise<ReturnType<IDBObjectStore[M]['result']>>}
 */
export default (...args) => query(...args)