import kv from './shared/kv.js'

const sw = /** @type {ServiceWorkerGlobalScope & typeof globalThis} */ (globalThis)

class EventTargetPolyfill {
  #listeners = {}
  #deferredEvents = []
  #init

  addEventListener(type, callback) {
    this.#listeners[type] ??= new Set()
    const callbacks = this.#listeners[type]
    callbacks.add(callback)
    console.log(`Adding event listener for "${type}"`, this.#listeners)
  }

  removeEventListener(type, callback) {
    const callbacks = this.#listeners[type];
    if (!callbacks) return;

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      delete this.#listeners[type]
    }
  }

  dispatchEvent (event) {
    const { type } = event;
    const callbacks = this.#listeners[type];

    if (callbacks?.size) {
      for (const callback of callbacks) {
        callback.call(this, event);
      }
    } else {
      const deferredEvents = this.#deferredEvents;

      if (deferredEvents) {
        console.log(`Event "${type}" is not yet registered, deferring...`, event);
        deferredEvents.push(event)

        event.waitUntil((async () => {
          // If the service worker is not yet initialized, we need to wait for it, once
          this.#init ??= loadLocalServiceWorker()
          await this.#init
          // If the service worker is initialized, then we no longer need to defer events, so we clear it
          this.#deferredEvents = undefined

          // Dispatch all deferred events
          for (const evt of deferredEvents) {
            console.log(`Dispatching deferred event "${evt.type}"`, evt)
            const calls = this.#listeners[evt.type]
            console.log(`Found ${calls?.size || 0} listeners for "${evt.type}"`, calls)
            if (calls) {
              for (const callback of calls) {
                await callback.call(this, evt)
              }
            }
          }
        })())
      }
    }

    return true
  }
}

const ET = new EventTargetPolyfill()

Object.keys(sw).forEach(eventName => {
  if (!eventName.startsWith('on')) return

  // We can't dispatch an already dispatched event, so we need to clone it.
  // We listen to every event here on out and dispatch the clone to a new
  // overwritten EventTarget that can attach listeners after the service worker
  // have been installed. cuz the service worker can't listen to events after.
  sw.addEventListener(eventName.slice(2), evt => {
    // kv('put', evt.type, `event:${eventName.slice(2)}:${evt.timeStamp}:${Math.random()}`)
    ET.dispatchEvent(evt)
  })
})

// Overwrite the global EventTarget to allow adding listeners after installation
globalThis.addEventListener = ET.addEventListener.bind(ET)
globalThis.removeEventListener = ET.removeEventListener.bind(ET)
globalThis.dispatchEvent = ET.dispatchEvent.bind(ET)
