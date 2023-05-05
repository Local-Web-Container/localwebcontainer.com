if (!globalThis.URLPattern) await import('../../urlpattern.min.js')

/**
@typedef {{
  branch: string|undefined,
  filepath: string|undefined,
  repo: string|undefined,
  type: string|undefined,
  user: string|undefined
}} GithubPatternResult
*/

/** @return {Promise<GithubPatternResult>} */
export async function parseGithubURL(url) {
  let b = '[a-z0-9]*',
  p = a => new URLPattern({baseURL: url, pathname: `/:user/:repo/:type?/:branch(${a})?/:filepath(.*)?`}).exec(url).pathname.groups,
  r = p(b)
  if (r.type === 'pull') {
    p = await fetch(`https://api.github.com/repos/${r.user}/${r.repo}/pulls/${r.branch}`).then(r => r.json())
    r.branch = p.head.sha
    return r
  }
  if (!['raw', 'blob', 'tree', 'commit'].includes(r.type)) {
    r.branch = undefined
    r.filepath = undefined
    return r
  }
  r = p([
    ...await fetch(`https://api.github.com/repos/${r.user}/${r.repo}/branches`)
      .then(r => r.json())
      .then(r => r.map(e => e.name)),
    b
  ].join('|'))
  return r
}