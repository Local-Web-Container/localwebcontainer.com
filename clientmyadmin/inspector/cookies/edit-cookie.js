const res = await fetch(new URL('./edit-cookie.html', import.meta.url))
const text = await res.text()

/**
 * @template T
 * @param {T} v
 */
const nn = v => { if (v == null) throw v; return v}
const div = document.createElement('div')
div.innerHTML = text
const dialog = nn(div.querySelector('dialog'))
const form = nn(div.querySelector('form'))

function assignForm (form, values, { setAsDefault = false } = {}) {
  const { elements } = form

  for (let [name, value] of Object.entries(values)) {
    const field = elements.namedItem(name)
    if (!field || value == null) continue
    if (field.type === 'select-one') {
      const option = field.querySelector(`option[value="${value}"]`)
      if (option) option.selected = true
      if (setAsDefault) field.defaultValue = value
    } else if (field.type === 'checkbox') {
      setAsDefault ? field.defaultChecked = value : field.checked = value
    } else {
      if (typeof value === 'number' || value instanceof Date) field.valueAsNumber = value
      else field.value = value
      if (setAsDefault) field.defaultValue = field.value
    }
  }
}

export const template = text
export function edit(cookie) {
  Alpine.store('cookie', cookie)
  document.body.append(dialog)
  assignForm(form, cookie)
  dialog.showModal()
  dialog.onsubmit = evt => {
    const obj = Object.fromEntries(new FormData(form))
    if (obj.domain === '') delete obj.domain
    console.log(obj)
    if (cookie.name !== obj.name) {
      cookieStore.delete(cookie)
    } else {
      cookieStore.set(obj)
    }
  }
}