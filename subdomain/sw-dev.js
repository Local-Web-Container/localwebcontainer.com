ReadableStream.prototype[Symbol.asyncIterator] ??= function () {
  const reader = this.getReader()
  return {
    next: _ => reader.read(),
    return: _ => { reader.releaseLock() },
    throw: err => {
      this.return()
      throw err
    },
    [Symbol.asyncIterator] () {
      return this
    }
  }
}

globalThis.URLPattern || importScripts('http://localhost:4445/urlpattern.min.js')
importScripts('http://localhost:4445/sw-container.min.js')