import parse from './es-lexer.js'

/**
 * Parsar en import-sats och returnerar dess komponenter
 * @param {string} importStatement - Import-satsen som ska parsas
 * @returns {{ defaultImport: string|null, namedImports: string[]|null, path: string, withClause: string|null }} Parsed import data
 */
function parseImport(importStatement) {
  const importRegex = /import\s+(?:(\w+)|\{([^}]+)\})?\s*from\s+["']([^"']+)["'](?:\s+with\s+({[^}]+}))?/
  const match = importStatement.match(importRegex)

  if (!match) {
    throw new Error("Invalid import statement")
  }

  return {
    defaultImport: match[1] || null,
    namedImports: match[2] ? match[2].split(',').map(item => item.trim()) : null,
    path: match[3],
    withClause: match[4] || null
  }
}

const AsyncFunction = (async () => {}).constructor
const cache = {}

async function Import (url, assert = {}) {
  if (cache[url]) return cache[url]
  const resolver = Promise.withResolvers()
  cache[url] = resolver.promise

  const res = await fetch(url)
  let source = await res.text()

  const base = res.url

  const [imports, exports, facade, hasModuleSyntax] = parse(source)

  const dependencies = []

  for (const x of imports) {
    // The dependency it's trying to import.
    let dependency = x.n

    // The hole import statement.
    const statement = source.slice(x.ss, x.se);

    // Assertion
    const assertion = source.slice(x.a, x.se);

    // It's a `import.meta` statement
    // import.meta ==> Import.meta
    if (x.d === -2) {
      source = source.slice(0, x.ss) + 'I' + source.slice(x.ss + 1, x.se) + source.slice(x.se)
      continue
    }

    // It's a dynamic import
    // import('./xyz') ==> Import('./xyz')
    else if (x.d > 0) {
      source = source.slice(0, x.ss) + 'I' + source.slice(x.ss + 1, x.se) + source.slice(x.se)
      continue
    }

    // import 'https://esm.sh/xyz'
    else if (x.d === -1) {
      // strip the import statement
      const prefix = source.slice(0, x.ss)
      const sufix = source.slice(x.se)
      const padding = ' '.repeat(x.se - x.ss)
      source = prefix + padding + sufix
    } else {
      console.log('cant parse', assertion)
    }

    const npmPackageRegex = /^(?!https?:\/\/)([\w@].*)$/;

    const meta = parseImport(statement)
    // Add the dependency to the list of things to import.
    dependencies.push({
      namedImports: meta.namedImports,
      defaultImport: meta.defaultImport,
      dependency,
      assertion,
      statement
    })
  }

  for (const x of exports.reverse()) {
    const exportStart = source.lastIndexOf('export', x.s)

    if (x.n === 'default') {
      source = source.slice(0, exportStart) + 'var _default_ =' + source.slice(exportStart + 14)
    } else {
      source = source.slice(0, exportStart) + // spara allt fram till export
      console.log('export', x)
      source.slice(x.e)
    }
  }

  source = `with(Module){\n${source}}`

  console.log(source)

  const wrapper = new AsyncFunction('Module', source)
  const resolve = url => new URL(url, base).toString()
  // console.log(wrapper.toString())

  const libs = await Promise.all(dependencies.map(e => {
    const fullUrl = resolve(e.dependency)
    return Import(fullUrl)
  }))

  const get = Object.assign(
    url => Import(Import.meta.resolve(url)),
    { meta: { url: base, resolve } }
  )

  const Module = Object.create(null)
  const bag = {}

  libs.forEach(lib => {
    Object.keys(lib).forEach(key => {
      const propertyKey = key === 'default' ? '_default_' : key
      Object.defineProperty(Module, key, {
        get() { return Reflect.get(lib, propertyKey) },
        set(value) { return value },
        enumerable: true,
      })
    })
  })

  exports.forEach(mod => {
    const propertyKey = mod.n === 'default' ? '_default_' : mod.n
    Object.defineProperty(Module, mod.n, {
      get () { return Reflect.get(bag, propertyKey) },
      set (val) { return Reflect.set(bag, propertyKey, val) },
      enumerable: true,
    })
  })

  await wrapper(Module)
  resolver.resolve()
  return Module
}

globalThis.Import = Import

/** @param {string} str */
async function rewriteImports (str) {
  const [imports] = await parse(str)

  for (const x of imports.reverse()) {
    let dependency = x.n
    const npmPackageRegex = /^(?!https?:\/\/)([\w@].*)$/;

    /** @type {*} */
    let meta = str.slice(x.a, x.se)
    if (meta) {
      console.log('cant parse', meta)
      try {
        meta = JSON.parse(meta)
      } catch (err) {
        // not json like... eg: {type: 'css'}
        // So use eval instead...
        meta = eval(`(${meta})`)
      }
      if (meta.type === 'css') delete meta.type
      meta = JSON.stringify(meta)
      console.log('new meta', meta)
      str = str.slice(0, x.a) + meta + str.slice(x.se)
    }

    if (npmPackageRegex.test(dependency)) {
      str = str.slice(0, x.s) + 'https://esm.sh/' + dependency + str.slice(x.e)
    }
  }

  console.log(str)

  return str
}


// var createBlob = (source, type = 'text/javascript') => URL.createObjectURL(new Blob([source], { type }))
// await import(createBlob('true', 'application/json'), { with: { type: 'json'} }).then(console.log)
