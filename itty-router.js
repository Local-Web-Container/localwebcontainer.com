function Router({ routes = [] } = {}) {
  return {
    __proto__: new Proxy({}, {
      get: (target, prop, receiver) => (matcher, ...handlers) => {
        if (typeof matcher !== 'function') {
          const pattern = typeof matcher === 'object' || matcher?.startsWith('http')
            ? new URLPattern(matcher)
            : new URLPattern({ pathname: matcher })
          matcher = o => (o.match = pattern.exec(o.url))
        }
        return routes.push([
          prop.toUpperCase(),
          matcher,
          handlers,
        ]) && receiver
      }
    }),
    routes,
    async handle (event, ctx = {}) {
      let response
      ctx.url = new URL(event.request.url)
      ctx.event = event
      ctx.request = event.request
      ctx.match = undefined
      ctx.response = {
        status: 200,
        headers: new Headers(),
        body: null
      }
      ctx.metadata = {}
      for (let [method, matcher, handlers] of routes) {
        const matchMethod = method === 'ALL' || method === ctx.request.method
        if (matchMethod && matcher(ctx)) {
          for (let handler of handlers) {
            if ((response = await handler(ctx)) !== undefined) return response
          }
        }
      }

      // All url that ain't for this subdomain should make a normal request
      return fetch(ctx.request)
    }
  }
}

export { Router }