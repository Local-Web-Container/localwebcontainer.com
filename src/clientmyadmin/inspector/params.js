// class that extends URLSearchParams to add some useful methods
// like case insensitive getter and setter
class Param extends URLSearchParams {
  constructor(...args) {
    super(...args)
    // Get all entries as an array of [key, value] pairs where key is lowercased
    const entries = [...this].map(x => [x[0].toLowerCase(), x[1]])
    // Remove all entries
    for (const key of this.keys()) this.delete(key)
    // Add all entries again but with lowercased keys
    for (const [key, value] of entries) this.append(key, value)
  }

  /** @param {string} key */
  getAsBoolean (key) {
    return ['true','1',''].includes(this.get(key))
  }

  /** @param {string} key */
  getAsNumber (key) {
    return this.get(key) === null ? 0 : Number(this.get(key))
  }

  getAsDate (key) {
    const v = this.get(key)
    return v === null ? null : new Date(v)
  }

  /**
   * @param {string} key
   * @param {any} value (use any cuz typescript is dumb)
   */
  set (key, value) {
    super.set(key.toLowerCase(), value)
  }

  /** @param {string} key */
  get (key) {
    return super.get(key.toLowerCase())
  }
}