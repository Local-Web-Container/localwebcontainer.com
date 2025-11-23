let wasm
globalThis.lexerPromise = WebAssembly.instantiateStreaming(fetch(
  'https://localwebcontainer.com/lexer.wasm'
)).then(mod => {
  wasm = mod.instance.exports
})

const isLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const { ceil } = Math;

/** @param {string} str */
const decode = str => {
  try {
    return (0, eval)(str) // eval(undefined) -> undefined
  }
  catch (e) {}
}

/** @type {(src: string, outBuf16: Uint16Array) => void} */
const copy = isLE
  ? (src, outBuf16, i = 0) => {
    const len = src.length;
    while (i < len)
      outBuf16[i] = src.charCodeAt(i++);
  } :
  (src, outBuf16, i = 0) => {
    const len = src.length;
    while (i < len) {
      const ch = src.charCodeAt(i);
      outBuf16[i++] = (ch & 0xff) << 8 | ch >>> 8;
    }
  }

/**
 * Outputs the list of exports and locations of import specifiers,
 * including dynamic import and import meta handling.
 *
 * @param {string} source Source code to parser
 * @param name Optional sourcename
 * @returns Tuple contaning imports list and exports list.
 */
const parse = (source, name = '@') => {
  const len = source.length + 1;

  // need 2 bytes per code point plus analysis space so we double again
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base)
    + len * 4
    - wasm.memory.buffer.byteLength;

  if (extraMem > 0)
    wasm.memory.grow(ceil(extraMem / 65536));

  const addr = wasm.sa(len - 1);
  copy(source, new Uint16Array(wasm.memory.buffer, addr, len));

  if (!wasm.parse())
    throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, wasm.e()).split('\n').length}:${wasm.e() - source.lastIndexOf('\n', wasm.e() - 1)}`), { idx: wasm.e() });

  /** @type {ImportSpecifier[]} */
  const imports = []
  /** @type {ExportSpecifier[]} */
  const exports = []

  while (wasm.ri()) {
    const s = wasm.is(),
          e = wasm.ie(),
          a = wasm.ai(),
          d = wasm.id(),
          ss = wasm.ss(),
          se = wasm.se();

    let n;
    if (wasm.ip())
      n = decode(source.slice(d === -1 ? s - 1 : s, d === -1 ? e + 1 : e));
    imports.push({ n, s, e, ss, se, d, a });
  }
  while (wasm.re()) {
    const s = wasm.es(),
          e = wasm.ee(),
          ls = wasm.els(),
          le = wasm.ele(),
          n = source.slice(s, e), ch = n[0],
          ln = ls < 0 ? undefined : source.slice(ls, le), lch = ln ? ln[0] : ''

    exports.push({
      s, e, ls, le,
      n: (ch === '"' || ch === "'") ? decode(n) : n,
      ln: (lch === '"' || lch === "'") ? decode(ln) : ln,
    });
  }

  return [imports, exports, !!wasm.f()];
}

// let wasm: {
//   __heap_base: {value: number} | number & {value: undefined};
//   memory: WebAssembly.Memory;
//   parse(): boolean;
//   /** getAssertIndex */
//   ai(): number;
//   /** getErr */
//   e(): number;
//   /** getExportEnd */
//   ee(): number;
//   /** getExportLocalEnd */
//   ele(): number;
//   /** getExportLocalStart */
//   els(): number;
//   /** getExportStart */
//   es(): number;
//   /** facade */
//   f(): boolean;
//   /** getImportDynamic */
//   id(): number;
//   /** getImportEnd */
//   ie(): number;
//   /** getImportSafeString */
//   ip(): number;
//   /** getImportStart */
//   is(): number;
//   /** readExport */
//   re(): boolean;
//   /** readImport */
//   ri(): boolean;
//   /** allocateSource */
//   sa(utf16Len: number): number;
//   /** getImportStatementEnd */
//   se(): number;
//   /** getImportStatementStart */
//   ss(): number;
// };

export default parse;