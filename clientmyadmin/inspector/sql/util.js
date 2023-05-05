const { create, freeze, assign } = Object

export const nullObj = freeze(create(null))
export const plainObject = x => freeze(assign(create(null), x))
export const encodeParam = a => new URLSearchParams({a}).toString().slice(2)
export const decodeParam = a => new URLSearchParams('a='+a).get('a')

export const queryInfo = {t:0}

/**
 * create a coroutine to query the database.
 * somewhat faster than using async / await.
 * @param {import('./database.js').DB} db
 * @param {"readTransaction"|"transaction"} method
 */
export function q(db, method, f) {
  return new Promise((resolve, reject) => {
    var o = f() // instantiate the coroutine
    db[method](tx => {
      // create a recursive function to execute all the queries
      function recurse(tx, result) {
        let { done, value: query } = o.next([...result.rows].map(plainObject))
        let values = []
        if (done) return resolve(query)
        if (Array.isArray(query)) [query, values] = query
        let start = performance.now()
        tx.executeSql(query, values, recurse, (tx, error) => {
          queryInfo.t = performance.now() - start
          o.throw(error)
          reject(error)
        })
      }
      recurse(tx, { rows: []})
    })
  })
}
