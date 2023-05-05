const AsyncFunction = (async () => {}).constructor
const cache = Object.create(null)

/**
 * The glorias stream-able template engine
 *
 * @param  {Array} strings All static content in a template string
 * @param  {Array} values  All items in the array that needs evaluating
 * @return {ReadableStream<Uint8Array>}
 */
function tpl (strings, ...values) {
  // The stream api accepts only Uint8Array
  // so we use this to convert string to a buffer
  const encoder = new TextEncoder()

  // used to loop over each string and values
  let i = 0

  return new ReadableStream({
    async pull (controller) {
      // Close stream when everything is done
      if (i === strings.length) {
        return controller.close()
      }

      // flush string
      controller.enqueue(encoder.encode(strings[i]))

      const value = await (values.length ? values.shift() : '')

      // possible to merge another stream into this stream
      // e.g. if you did this in template:
      // `fetch(url).then(res => res.body)`
      // it would start to stream it's content
      // loading a partial also returns a ReadableStream
      if (value.getReader) {
        // equvulant to stream.pipeTo(dest)
        let reader = value.getReader()
        let pump = () => reader.read().then(result =>
          !result.done && pump(controller.enqueue(result.value))
        )
        await pump()
      } else {
        if (Array.isArray(value)) {
          // This behaves much like react handles array of items and you
          // map all items into a dom fragment, diffrense is this is a
          // async for loop so you can map promises also
          for (let x of value)
            controller.enqueue(encoder.encode(await x))
        } else {
          controller.enqueue(encoder.encode(await value))
        }
      }
      i++
    }
  })
}

export class Scope {
  /**
   * Escape html special chars
   *
   * @param  {String} unsafeText Unsafe text
   * @return {String}            Safe text
   */
  escape (unsafeText) {
    return unsafeText
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Load another partial (template file)
   *
   * @param  {String}  url  Absolute path
   * @return {Promise}      The template engine resolves promises
   */
  async load (url, meta = {}) {
    const template = cache[url] ??= await fetch(url).then(r => r.text())
    const args = Object.keys(meta)
    const values = Object.values(meta)
    args.push('tpl')
    args.push('return tpl`'+template+'`')
    values.push(tpl)
    return new AsyncFunction(...args).call(this, ...values)
  }
}
