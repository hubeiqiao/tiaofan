export type CatalogLayout = 'grid' | 'list';
export const CATALOG_LAYOUT_STORAGE_KEY = 'tiaofan-catalog-layout';
export const CATALOG_MOBILE_QUERY = '(max-width: 700px)';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;
export function isCatalogLayout(value: unknown): value is CatalogLayout {
  return value === 'grid' || value === 'list';
}

/** This separate public preference never stores catalog, query, or account data. */
export function readCatalogLayout(storage: ReadStorage): CatalogLayout | null {
  try {
    const value: unknown = JSON.parse(storage.getItem(CATALOG_LAYOUT_STORAGE_KEY) || 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    return Object.keys(record).length === 2 && record.version === 1 && isCatalogLayout(record.layout)
      ? record.layout : null;
  } catch { return null; }
}
export function saveCatalogLayout(storage: WriteStorage, layout: CatalogLayout): boolean {
  if (!isCatalogLayout(layout)) return false;
  try {
    storage.setItem(CATALOG_LAYOUT_STORAGE_KEY, JSON.stringify({version: 1, layout}));
    return true;
  } catch { return false; }
}

/** In-memory coordinates only. Never send this object to storage or a URL. */
export type CatalogAnchor = {key: string; offset: number};
export function captureCatalogAnchor(root: HTMLElement | null, viewportHeight: number, viewportTop = 0): CatalogAnchor | null {
  if (!root || !root.isConnected) return null;
  for (const element of root.querySelectorAll<HTMLElement>('[data-anime-key]')) {
    const key = element.getAttribute('data-anime-key');
    const rect = element.getBoundingClientRect();
    if (key && element.isConnected && rect.width > 0 && rect.height > 0 && rect.bottom > viewportTop && rect.top < viewportHeight) {
      return {key, offset: rect.top};
    }
  }
  return null;
}
export function restoreCatalogAnchor(root: HTMLElement | null, anchor: CatalogAnchor, scrollBy: (delta: number) => void): boolean {
  if (!root || !root.isConnected) return false;
  // Compare attributes rather than interpolating IDs into a CSS selector.
  for (const element of root.querySelectorAll<HTMLElement>('[data-anime-key]')) {
    if (element.getAttribute('data-anime-key') !== anchor.key || !element.isConnected) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const delta = rect.top - anchor.offset;
    if (!Number.isFinite(delta)) return false;
    if (Math.abs(delta) > 0.5) scrollBy(delta);
    return true;
  }
  return false;
}

type LayoutDriver = {
  requestFrame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
  onTransition: (transitioning: boolean) => void;
};
/** Coordinates only the short reflow. It never owns items, pagination, filters, or focus. */
export function createCatalogLayoutCoordinator(driver: LayoutDriver) {
  type Snapshot = {contextKey: string; anchor: CatalogAnchor | null};
  let pending: Snapshot | null = null;
  let prepared: Snapshot | null = null;
  let generation = 0;
  let frame: number | null = null;
  function stopFrame() {
    if (frame !== null) driver.cancelFrame(frame);
    frame = null;
    ++generation;
  }
  function cancel() {
    stopFrame();
    prepared = null;
    if (pending) { pending = null; driver.onTransition(false); }
  }
  return {
    /** Capture before native radio focus can scroll. Expiry must run at the input-event boundary. */
    prepare(contextKey: string, capture: () => CatalogAnchor | null) {
      const snapshot = {contextKey, anchor: capture()};
      prepared = snapshot;
      return () => { if (prepared === snapshot) prepared = null; };
    },
    discardPrepared() { prepared = null; },
    begin(contextKey: string, capture: () => CatalogAnchor | null) {
      stopFrame();
      const wasPending = pending !== null;
      // A rapid second toggle must use the pre-reflow anchor, not intermediate geometry.
      if (!pending || pending.contextKey !== contextKey) pending = {contextKey, anchor: prepared?.contextKey === contextKey ? prepared.anchor : capture()};
      prepared = null;
      if (!wasPending) driver.onTransition(true);
    },
    restore(contextKey: string, apply: (anchor: CatalogAnchor) => unknown) {
      stopFrame();
      if (!pending || pending.contextKey !== contextKey) { cancel(); return () => {}; }
      const token = generation;
      const target = pending;
      frame = driver.requestFrame(() => {
        if (generation !== token || pending !== target) return;
        frame = null;
        if (target.anchor) apply(target.anchor);
        // Keep observers suspended through the following paint, including no-anchor reflows.
        frame = driver.requestFrame(() => {
          if (generation !== token || pending !== target) return;
          frame = null;
          pending = null;
          driver.onTransition(false);
        });
      });
      // Effect replay cancels scheduled work without consuming the anchor.
      return () => { if (generation === token) stopFrame(); };
    },
    cancel,
    isTransitioning: () => pending !== null,
  };
}
