const res = await fetch(new URL('./pagination.html', import.meta.url))

export const template = await res.text()

/** @param {URL} url */
function getAsNumber(url, name) {
  const value = url.searchParams.get(name)
  return value === null ? 0 : +value
}

Alpine.data('pagination', () => ({
  init() {
    const url = new URL(location.href)
    const offset = this.$el.querySelector('input[name="offset"]')
    const limit = this.$el.querySelector('input[name="limit"]')
    offset.min = 0
    offset.step = getAsNumber(url, 'limit') || 10
    offset.value = getAsNumber(url, 'offset') || 0
    offset.placeholder = 'offset'
    offset.max = this.$el.dataset.rows - getAsNumber(url, 'limit')
    offset.onchange = () => {
      const url = new URL(location.href)
      url.searchParams.set('offset', offset.value)
      navigate(url)
    }
    limit.min = 1
    limit.step = 1
    limit.value = getAsNumber(url, 'limit') || 10
    limit.placeholder = 'limit'
    limit.max = this.$el.dataset.rows.replace(/\d/g, '9')
    limit.onchange = () => {
      const url = new URL(location.href)
      url.searchParams.set('limit', limit.value)
      navigate(url)
    }
  }
}))