'use client';
import {useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {
  CATALOG_MOBILE_QUERY, captureCatalogAnchor, createCatalogLayoutCoordinator,
  isCatalogLayout, readCatalogLayout, restoreCatalogAnchor, saveCatalogLayout, type CatalogLayout,
} from '@/lib/catalog-layout';

export type CatalogLayoutOptions = {
  /** Include view/query/filter/sort/identity boundaries, but not pagination or layout. Memory only. */
  contextKey: string;
  /** Reuse Home's existing librarySurface ref without changing its identity. */
  containerRef?: RefObject<HTMLElement | null>;
  /** Optional sticky-header clearance when determining the first visible card. */
  viewportTop?: number;
};

export function useCatalogLayout({contextKey, containerRef, viewportTop = 0}: CatalogLayoutOptions) {
  const ownRef = useRef<HTMLElement | null>(null);
  const catalogRef = containerRef ?? ownRef;
  // Undefined is identical on the server and first client render. CSS supplies responsive auto.
  const [layout, setValue] = useState<CatalogLayout | undefined>(undefined);
  const [transitioning, setTransitioning] = useState(false);
  const [reflowVersion, setReflowVersion] = useState(0);
  const manual = useRef<CatalogLayout | null>(null);
  const currentLayout = useRef<CatalogLayout | undefined>(undefined);
  const currentContext = useRef(contextKey);
  // Presentation measurements may change without restarting the layout lifecycle.
  const latestViewportTop = useRef(viewportTop);
  latestViewportTop.current = viewportTop;
  const mounted = useRef(false);
  const preparationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coordinator] = useState(() => createCatalogLayoutCoordinator({
    requestFrame: callback => window.requestAnimationFrame(callback),
    cancelFrame: id => window.cancelAnimationFrame(id),
    onTransition: setTransitioning,
  }));

  const clearPreparation = useCallback(() => {
    if (preparationTimer.current !== null) clearTimeout(preparationTimer.current);
    preparationTimer.current = null;
    coordinator.discardPrepared();
  }, [coordinator]);

  const applyLayout = useCallback((next: CatalogLayout) => {
    if (!mounted.current) return;
    if (currentLayout.current === next) { clearPreparation(); return; }
    coordinator.begin(currentContext.current, () => captureCatalogAnchor(catalogRef.current, window.innerHeight, latestViewportTop.current));
    clearPreparation();
    currentLayout.current = next;
    setValue(next);
    // Even a batched grid/list/grid reversal needs a new committed restore.
    setReflowVersion(version => version + 1);
  }, [catalogRef, clearPreparation, coordinator]);

  useEffect(() => {
    mounted.current = true;
    let preference: CatalogLayout | null = null;
    try { preference = readCatalogLayout(window.localStorage); } catch { /* Storage access itself may be denied. */ }
    const media = typeof window.matchMedia === 'function' ? window.matchMedia(CATALOG_MOBILE_QUERY) : null;
    manual.current = preference;
    const initial = preference ?? 'grid';
    currentLayout.current = initial;
    setValue(initial);
    const onResize = () => {
      if (!manual.current) applyLayout('grid');
    };
    media?.addEventListener('change', onResize);
    return () => {
      mounted.current = false;
      media?.removeEventListener('change', onResize);
      clearPreparation();
      coordinator.cancel();
    };
  }, [applyLayout, clearPreparation, coordinator]);

  useLayoutEffect(() => {
    if (currentContext.current !== contextKey) clearPreparation();
    currentContext.current = contextKey;
    return coordinator.restore(contextKey, anchor => restoreCatalogAnchor(catalogRef.current, anchor, top => {
      // Scroll only. Native radio focus remains on the chosen layout control.
      window.scrollBy({top, behavior: 'instant'});
    }));
  }, [catalogRef, clearPreparation, contextKey, coordinator, layout, reflowVersion]);

  const captureBeforeChange = useCallback(() => {
    if (!mounted.current) return;
    clearPreparation();
    const expire = coordinator.prepare(currentContext.current, () => captureCatalogAnchor(catalogRef.current, window.innerHeight, latestViewportTop.current));
    // Native capture and bubble listeners can have a microtask checkpoint between them.
    // Expire in the next task, after HeroUI's change handler has had a chance to consume it.
    const timer = setTimeout(() => {
      if (preparationTimer.current !== timer) return;
      preparationTimer.current = null;
      expire();
    }, 0);
    preparationTimer.current = timer;
  }, [catalogRef, clearPreparation, coordinator]);

  const setLayout = useCallback((next: CatalogLayout) => {
    if (!mounted.current || !isCatalogLayout(next)) return;
    manual.current = next;
    try { saveCatalogLayout(window.localStorage, next); } catch { /* Choice remains usable in memory. */ }
    applyLayout(next);
  }, [applyLayout]);

  return {catalogRef, layout, setLayout, captureBeforeChange, transitioning, ready: layout !== undefined, isTransitioning: coordinator.isTransitioning};
}
