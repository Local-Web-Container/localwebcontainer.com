const
  ALT = 8,
  CTRL = 4,
  META = 2,
  SHIFT = 1,
  COPY = Symbol('copy'),
  CUT = Symbol('cut'),
  PASTE = Symbol('paste'),
  commands = new Map(),
  on = window.addEventListener

  console.log(commands)
on('keydown', e => {
  // annoying datalist bug
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1146729
  if (!(e instanceof KeyboardEvent)) return
  const key = e.key.toLocaleLowerCase()
  const mask = +`0b${+e.altKey}${+e.ctrlKey}${+e.metaKey}${+e.shiftKey}`
  console.log(`${mask}${key}`)
  const [fn, scope] = commands.get(`${mask}${key}`) || []
  if (fn) {
    if (scope && !e.composedPath().includes(scope)) return
    e.preventDefault()
    fn(e)
  }
})
on('copy', e => commands.get(COPY)?.(e))
on('paste', e => commands.get(PASTE)?.(e))
on('cut', e => commands.get(CUT)?.(e))

export default {
  /** @param {string} [scope] */
  register(obj, scope) {
    commands.clear()
    for (let [key, fn] of Object.entries(obj)) {
      key = key.toLocaleLowerCase()
      // prepend 0 to key if key[0] isn't a number
      ;/[0-9]/.test(key[0]) || (key = `0${key}`)
      commands.set(key, [fn, scope])
    }
    for (const key of Object.getOwnPropertySymbols(obj)) {
      commands.set(key, obj[key])
    }
  },
  commands,
  ALT,
  CTRL,
  META,
  SHIFT,
  PASTE,
  COPY,
  CUT,
}