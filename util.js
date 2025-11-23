// pointless identity template literal tag to get syntax highlighting in VSCode
const html = (str, ...val) => str.reduce((acc, str, i) => acc + str + (val[i] ?? ''), '')


function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function isPlainObject (o) {
  var ctor,prot;
  if (isObject(o) === false) return false
  ctor = o.constructor
  if (ctor === undefined) return true
  prot = ctor.prototype
  if (isObject(prot) === false) return false
  return Object.hasOwn(prot, 'isPrototypeOf')
}

export { html, isPlainObject }