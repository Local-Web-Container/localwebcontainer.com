/// <reference lib="dom" />
javascript:(async () => {

  const identity = x => x
  const safeHtml = globalThis.trustedTypes?.createPolicy("myEscapePolicy", {
    createHTML: identity,
    createScript: identity,
    createScriptURL: identity,
  }) || {
    createHTML: identity,
    createScript: identity,
    createScriptURL: identity,
  }

  /**
   * @description Get the first static resource that are coming from the own origin
   * @description This is a helper function to get the first static resource that are coming from the own origin
   * @description This is useful to get a static resource that is not a script, like a stylesheet, manifest, icon, etc.
   *
   * @returns {Promise<string>}
   */
  async function getStaticResources() {
    // # fyi registrations can only come from the own origin
    const regs = await navigator.serviceWorker?.getRegistrations()
    const scriptURL = regs?.[0]?.active?.scriptURL

    if (scriptURL) return scriptURL

    const initiatorType = ['link', 'script', 'audio', 'img', 'other']
    const relType = ['manifest', 'stylesheet', 'icon']

    const entries = performance.getEntriesByType('resource')
      .filter(entry =>
        entry.responseStatus === 200 &&
        entry.name.startsWith(location.origin) &&
        !entry.name.includes('.svg') && // may include js executables
        initiatorType.includes(entry.initiatorType)
      )
      .sort((a,b) => a.duration > b.duration ? 1 : -1)

    if (entries.length) return entries[0].name

    const links = [...document.querySelectorAll(`head > link`)]
      .filter(link =>
        link.href.startsWith(location.origin) &&
        relType.includes(link.rel)
      )

    if (links.length) return links[0].href

    // # try any of this urls if they are available
    const nextBestThing = new Promise(rs => {
      const requests = [
        '/favicon.ico', '/robots.txt', '/manifest.json',
        '/ads.txt', '/humans.txt', '/sellers.json'
      ].map(url => {
        const ctrl = new AbortController()
        const req = fetch(url, { signal: ctrl.signal })
        req.then(response => {
          ctrl.abort()
          const ct = response.headers.get('content-type')
          if (
            response.ok &&
            ct &&
            response.url.startsWith(location.origin) &&
            !ct.toLowerCase().includes('html')
          ) {
            rs(response.url)
            requests.forEach(req => req.ctrl.abort())
          }
        }, () => {})
        return { ctrl, req }
      })

      Promise.allSettled(requests.map(req => req.req))
        .then(() => rs('/'))
    })
    return nextBestThing
  }
  const url = await getStaticResources()

  function initPage() {
    const xhr = new XMLHttpRequest()
    xhr.responseType = 'document'
    xhr.open('GET', 'http://localhost:4444/clientmyadmin/inspector.html')
    xhr.onload = () => {
      popup.document.body.innerHTML = safeHtml.createHTML('')
      const clone = xhr.response.documentElement.cloneNode(true)
      popup.document.documentElement.replaceWith(clone)
      popup.document.querySelectorAll('script').forEach(script => {
        const clone = popup.document.createElement('script')
        clone.type = script.type
        clone.src = safeHtml.createScriptURL(script.src)
        script.replaceWith(clone)
      })
    }
    xhr.send()
  }

  /**
   * @template T
   * @param {T} v
   */
  const nn = v => { if (v == null) throw v; return v}
  let popup = nn(open(url))
  let ctrl = new AbortController()
  let _call = popup.Function.prototype.call
  let _apply = popup.Function.prototype.apply
  let signal = ctrl.signal
  let noop = () => {}
  let imported = false
  let abort = evt => {
    if (!imported && popup.location.href !== 'about:blank') {
      // popup.history.replaceState('', '','/')
      abort = () => {}
      ctrl.abort()
      popup.stop()
      clearInterval(i)
      cancelAnimationFrame(fram)
      cancelIdleCallback(idleN)
      cleanUp()

      popup.Function.prototype.call = _call
      popup.Function.prototype.apply = _apply

      popup.document.documentElement.innerHTML = safeHtml.createHTML('')
      initPage()
      imported = true
    }
  }

  function cleanUp() {
    let j = 3

    while(j--) {
      popup.performance.clearMarks()
      popup.performance.clearMeasures()
      popup.performance.clearResourceTimings()

      let html = popup.document.documentElement
      for (let x of html.attributes) html.removeAttribute(x.name)
      let i = popup.setTimeout(noop, 0)
      while (i--) popup.clearTimeout(i)
      i = popup.setInterval(noop, 0)
      while (i--) popup.clearInterval(i)
      i = popup.requestAnimationFrame(noop)
      while (i--) popup.cancelAnimationFrame(i)
      i = popup.requestIdleCallback(noop)
      while (i--) popup.cancelIdleCallback(i)

      for (const root of [window, document])
        for (const t in root)
          if (t.startsWith('on') && root[t] != null)
            root[t] = null;

      html.innerHTML = safeHtml.createHTML('')
      html.replaceWith(html.cloneNode(true));
    }
  }

  for (var key in popup) {
    if (/^on/.test(key))
      popup.addEventListener(key.slice(2), abort, { signal })
  }

  for (var key in popup.document) {
    if (/^on/.test(key))
      popup.document.addEventListener(key.slice(2), abort, { signal })
  }

  function step() {
    popup.location.href === 'about:blank'
      ? (fram = requestAnimationFrame(step))
      : abort()
  }

  function idle() {
    popup.location.href === 'about:blank'
      ? (idleN = requestIdleCallback(idle))
      : abort()
  }

  var i = setInterval(abort)
  let fram = requestAnimationFrame(step)
  let idleN = requestIdleCallback(idle)

  popup.Function.prototype.call =
  popup.Function.prototype.apply = function (...args) {
    abort(...args)
    const err = new Error('abort')
    throw err
  }

  })()