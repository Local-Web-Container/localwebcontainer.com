import kv from './shared/kv.js'

const root = await kv('get', 'root')
// globalThis.root = root

const permission = await root?.queryPermission({mode: 'read'})
if (permission === 'prompt') {

}

// globalThis[Symbol()] = root
