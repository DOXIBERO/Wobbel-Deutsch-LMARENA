/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — EventBus (Part 005)
 * ============================================================
 * Tiny pub/sub singleton: on / off / emit / once.
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) { this.listeners.get(event)?.delete(cb); }

  once(event, cb) {
    const wrap = (data) => { this.off(event, wrap); cb(data); };
    this.on(event, wrap);
  }

  emit(event, data = null) {
    for (const cb of [...(this.listeners.get(event) ?? [])]) cb(data);
  }
}

export const eventBus = new EventBus();
