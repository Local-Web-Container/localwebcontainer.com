/**
 * find a entry recursively based on absolute path
 *
 * @param {FileSystemDirectoryHandle | FileSystemFileHandle} root
 * @param {string[]} path
 * @returns {Promise<FileSystemDirectoryHandle|FileSystemFileHandle>}
 */
async function findHandle (root, path) {
  if (path.length === 0) {
    return root
  }

  const name = /** @type {string} */ (path.shift())

  if (root.kind === 'directory') {
    const handle = await root.getDirectoryHandle(name).catch(err => {
      if (err.name === 'TypeMismatchError') {
        return root.getFileHandle(name)
      } else {
        throw err
      }
    })

    return findHandle(handle, path)
  }

  throw new Error(`'${root.name}' is a file, not a directory, cannot search for '${root.name}/${name}'`)
}

/**
 * Recursively create directories
 * @example await mkdirp(root, ['a', 'b', 'c']) // creates a/b/c
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {Array<String>} paths
 */
async function mkdirp (dirHandle, paths) {
  for (const path of paths) {
    dirHandle = await dirHandle.getDirectoryHandle(path, { create: true })
  }
  return dirHandle
}

/**
 * Recursively create a empty file if it doesn't exist.
 * If it does exist, then it will return the existing file handle
 * @example
 * // create a empty file at a/b/c/file.txt
 * await mkfile(root, ['a', 'b', 'c', 'file.txt'])
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {Array<String>} paths
 */
async function touch (dirHandle, paths) {
  const file = paths.pop()
  if (!file) throw new Error('touch: no file name provided')
  dirHandle = await mkdirp(dirHandle, paths)
  return dirHandle.getFileHandle(file, { create: true })
}

/**
 * @param {FileSystemDirectoryHandle | FileSystemFileHandle} source
 */
async function * walkHandleRecursive (source) {
  yield source
  console.log(source.kind)
  if (source.kind === 'directory') {
    for await (const [name, child] of source) {
      yield * walkHandleRecursive(child)
    }
  }
}

/**
 * Recursively deletes all files and directories in a directory.
 * @param {FileSystemDirectoryHandle | FileSystemFileHandle} source
 */
async function emptyDir (source) {
  for await (const [name, handle] of source) {
    await handle.remove({ recursive: true })
  }
  return source
}

/**
 * Recursively copies all files and directories to a destination.
 * @param {FileSystemDirectoryHandle | FileSystemFileHandle} source
 * @param {FileSystemDirectoryHandle} dest
 * @param {string} newName
 */
async function cp (source, dest, newName) {
  if (source.kind === 'file') {
    const file = await source.getFile()
    const fileHandle = await dest.getFileHandle(newName, { create: true })
    const writer = await fileHandle.createWritable()
    await writer.write(file)
    await writer.close()
  } else {
    const dirHandle = await dest.getDirectoryHandle(newName, { create: true })
    for await (const [name, child] of source) {
      await cp(child, dirHandle, name)
    }
  }
}

/**
 * @param {FileSystemDirectoryHandle | FileSystemFileHandle} root - The root directory
 * @param {string} path - The absolute path to look for (starting with /)
 */
export default {
  mkdirp,
  touch,
  cp,
  walkHandleRecursive,
  emptyDir,
  open (root, path) {
    return findHandle(root, path.split('/').filter(Boolean))
  }
}