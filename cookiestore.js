const decode = decodeURIComponent
const pairSplitRegExp = /; */
// Try decoding a string using a decoding function.
function tryDecode (str, decode) {
  try {
    return typeof decode === 'boolean' ? decodeURIComponent(str) : decode(str)
  } catch (e) {
    return str
  }
}

/**
@typedef {Object} Cookie
@property {string} [domain] - The domain of the cookie.
@property {number} [expires] - The expiration date of the cookie.
@property {string} name - The name of the cookie.
@property {string} [path] - The path of the cookie.
@property {boolean} [secure] - Whether the cookie is secured.
@property {CookieSameSite} [sameSite] - The SameSite attribute of the cookie.
@property {string} value - The value of the cookie.

@typedef {Object} CookieStoreDeleteOptions
@property {string} name - The name of the cookie to delete.
@property {string} [domain] - The domain of the cookie to delete.
@property {string} [path] - The path of the cookie to delete.

@typedef {Object} CookieStoreGetOptions
@property {string} [name] - The name of the cookie to retrieve.
@property {string} [url] - The URL of the cookie to retrieve.
@property {CookieMatchType} [matchType] - The match type of the cookie to retrieve.

@typedef {Object} CookieListItem {
@property {string} [name]
@property {string} [value]
@property {string | null} domain
@property {string} [path]
@property {number | null} expires
@property {boolean} [secure]
@property {CookieSameSite} [sameSite]

@typedef {Object} ParseOptions
@property {boolean} [decode]
*/

let CookieSameSite = {
  strict: 'strict',
  lax: 'lax',
  none: 'none'
}

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 * @param {string} str
 * @param {ParseOptions} [options]
 */
function parse (str, options = {}) {
  const obj = []
  const opt = options
  const pairs = str.split(pairSplitRegExp)
  const dec = opt.decode || decode
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    let eqIdx = pair.indexOf('=')
    // skip things that don't look like key=value
    if (eqIdx < 0) {
      continue
    }
    const key = pair.slice(0, eqIdx).trim()
    let val = pair.slice(++eqIdx, pair.length).trim()
    // quoted values
    if (val[0] == '"') {
      val = val.slice(1, -1)
    }
    // only assign once
    if (undefined == obj[key]) {
      obj.push({
        name: key,
        value: tryDecode(val, dec)
      })
    }
  }
  return obj
}

class CookieChangeEvent extends Event {
  constructor (type, eventInitDict = { changed: [], deleted: [] }) {
    super(type, eventInitDict)
    this.changed = eventInitDict.changed
    this.deleted = eventInitDict.deleted
  }
}

class CookieStore extends EventTarget {
  onchange = null

  constructor () {
    super()
    throw new TypeError('Illegal Constructor')
  }

  get [Symbol.toStringTag] () {
    return 'CookieStore'
  }

  /**
   * @param {CookieListItem | string} init
   */
  async get (init) {
    if (init == null) {
      throw new TypeError('CookieStoreGetOptions must not be empty')
    } else if (init instanceof Object && !Object.keys(init).length) {
      throw new TypeError('CookieStoreGetOptions must not be empty')
    }
    return (await this.getAll(init))[0]
  }

  /**
   * @param {CookieListItem | string} init
   * @param {string} [possibleValue]
   */
  async set (init, possibleValue) {
    const item = {
      name: '',
      value: '',
      path: '/',
      secure: false,
      sameSite: CookieSameSite.strict,
      expires: null,
      domain: null
    }
    if (typeof init === 'string') {
      item.name = init
      item.value = possibleValue
    } else {
      Object.assign(item, init)
      if (item.path && !item.path.startsWith('/')) {
        throw new TypeError('Cookie path must start with "/"')
      }
      if (item.domain?.startsWith('.')) {
        throw new TypeError('Cookie domain cannot start with "."')
      }
      if (item.domain && item.domain !== globalThis.location.hostname) {
        throw new TypeError('Cookie domain must domain-match current host')
      }
      if (item.name === '' && item.value && item.value.includes('=')) {
        throw new TypeError("Cookie value cannot contain '=' if the name is empty")
      }
      if (item.path && item.path.endsWith('/')) {
        item.path = item.path.slice(0, -1)
      }
      if (item.path === '') {
        item.path = '/'
      }
    }

    let cookieString = `${item.name}=${encodeURIComponent(item.value)}`
    if (item.domain)
      cookieString += '; Domain=' + item.domain
    if (item.path !== '/')
      cookieString += '; Path=' + item.path
    if (typeof item.expires === 'number')
      cookieString += '; Expires=' + new Date(item.expires).toUTCString()
    if (item.secure)
      cookieString += '; Secure'
    switch (item.sameSite) {
      case CookieSameSite.lax:
        cookieString += '; SameSite=Lax'
        break
      case CookieSameSite.strict:
        cookieString += '; SameSite=Strict'
        break
      case CookieSameSite.none:
        cookieString += '; SameSite=None'
        break
    }
    const previousCookie = this.get(item)
    document.cookie = cookieString
    if (this.onchange) {
      const changed = []
      const deleted = []
      if (previousCookie && !(await this.get(item))) {
        deleted.push({ ...item, value: undefined })
      } else {
        changed.push(item)
      }
      const event = new CookieChangeEvent('change', { changed, deleted })
      this.onchange(event)
    }
  }

  /** @param {CookieStoreGetOptions['name'] | CookieStoreGetOptions} init */
  async getAll (init) {
    const cookies = parse(document.cookie)
    if (!init || Object.keys(init).length === 0) {
      return cookies
    }
    if (!init) {
      throw new TypeError('CookieStoreGetOptions must not be empty')
    } else if (init instanceof Object && !Object.keys(init).length) {
      throw new TypeError('CookieStoreGetOptions must not be empty')
    }
    const name = typeof init === 'string' ? init : init.name
    const url = typeof init === 'string' ? 0 : init.url
    if (url) {
      const parsedURL = new URL(url, location.origin)
      if (location.href !== parsedURL.href || location.origin !== parsedURL.origin) {
        throw new TypeError('URL must match the document URL')
      }
      return cookies.slice(0, 1)
    }
    return cookies.filter(cookie => cookie.name === name)
  }

  /**
   * @param {CookieStoreDeleteOptions['name'] | CookieStoreDeleteOptions} init
   */
  async delete (init) {
    const item = {
      name: '',
      value: '',
      path: '/',
      secure: false,
      sameSite: CookieSameSite.strict,
      expires: 0,
      domain: null
    }

    typeof init === 'string'
      ? item.name = init
      : Object.assign(item, init)

    item.expires = 0
    await this.set(item)
  }
}

globalThis.CookieStore ??= CookieStore
globalThis.cookieStore ??= Object.create(CookieStore.prototype)
globalThis.CookieChangeEvent ??= CookieChangeEvent

export {}
