type DestinationTarget = Pick<HTMLElement, 'isConnected' | 'scrollIntoView' | 'getBoundingClientRect'> & {
 focus?: (options?: FocusOptions) => void;
};
type IntentType = 'wheel' | 'touchmove' | 'keydown' | 'scroll';
export type DestinationNavigationOptions<T extends DestinationTarget> = {
 getTarget: () => T | null;
 focusTarget?: (target: T) => void;
 onHoldChange?: (held: boolean) => void;
 /** The defaults below access the browser only during an active transaction. */
 isLocked?: () => boolean;
 isReadingTarget?: (target: T) => boolean;
 observeChanges?: (callback: () => void) => () => void;
 listen?: (type: IntentType, listener: (event: Event) => void) => () => void;
 requestFrame?: (callback: () => void) => number;
 cancelFrame?: (id: number) => void;
};

function scrollIntent(event: Event): boolean {
 if (!event.isTrusted || event.defaultPrevented) return false;
 if (event.type === 'touchmove') return true;
 if (event.type === 'wheel') {
  const wheel = event as WheelEvent;
  return !!(wheel.deltaX || wheel.deltaY);
 }
 if (event.type !== 'keydown') return false;
 const key = event as KeyboardEvent;
 if (key.altKey || key.ctrlKey || key.metaKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'].includes(key.key)) return false;
 const target = key.target as Element | null;
 if (target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="listbox"],[role="slider"],[role="spinbutton"],[role="tablist"],[role="menu"]')) return false;
 return !([' ', 'Spacebar'].includes(key.key) && target?.closest?.('button,[role="button"]'));
}

/**
 * A same-page destination temporarily owns navigation, never catalog or saved state.
 * Hold paging from begin through landing and reading. Trusted scroll input releases
 * it only after the destination leaves the viewport; explicit cancel always wins.
 * Body mutations wake lock/target checks. No polling or lifetime listeners are used.
 */
export function createDestinationNavigation<T extends DestinationTarget>(options: DestinationNavigationOptions<T>) {
 const requestFrame = options.requestFrame ?? (callback => window.requestAnimationFrame(callback));
 const cancelFrame = options.cancelFrame ?? (id => window.cancelAnimationFrame(id));
 const isLocked = options.isLocked ?? (() => document.body.hasAttribute('data-scroll-locked'));
 const isReadingTarget = options.isReadingTarget ?? (target => {
  const rect = target.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
 });
 const focusTarget = options.focusTarget ?? (target => target.focus?.({preventScroll: true}));
 const observeChanges = options.observeChanges ?? (callback => {
  const observer = new MutationObserver(callback);
  observer.observe(document.body, {attributes: true, attributeFilter: ['data-scroll-locked'], childList: true, subtree: true});
  return () => observer.disconnect();
 });
 const listen = options.listen ?? ((type, listener) => {
  window.addEventListener(type, listener, {passive: true});
  return () => window.removeEventListener(type, listener);
 });
 let held = false, closed = false, landed = false, exitArmed = false, generation = 0;
 let frame: number | null = null;
 let cleanups: Array<() => void> = [];
 function clear() {
  ++generation;
  if (frame !== null) cancelFrame(frame);
  frame = null;
  const previous = cleanups;
  cleanups = [];
  for (const cleanup of previous) cleanup();
 }
 function cancel() {
  const wasHeld = held;
  held = false;
  clear();
  if (wasHeld) options.onHoldChange?.(false);
 }
 function currentTarget() {
  const target = options.getTarget();
  if (!target || !target.isConnected) { cancel(); return null; }
  return target;
 }
 function check(token: number) {
  if (token !== generation || !held || !currentTarget()) return;
  if ((!landed && (!closed || isLocked())) || (landed && !exitArmed) || frame !== null) return;
  frame = requestFrame(() => {
   if (token !== generation || !held) return;
   frame = null;
   const target = currentTarget();
   if (!target) return;
   if (landed) {
    if (exitArmed && !isReadingTarget(target)) cancel();
    return;
   }
   if (isLocked()) return;
   landed = true;
   target.scrollIntoView({block: 'start', behavior: 'instant'});
   if (token === generation && held) focusTarget(target);
  });
 }
 function begin() {
  clear();
  closed = landed = exitArmed = false;
  if (!currentTarget()) return false;
  const wasHeld = held;
  held = true;
  const token = generation;
  cleanups.push(observeChanges(() => check(token)));
  const intent = (event: Event) => {
   if (token !== generation || !held || !scrollIntent(event)) return;
   if (!landed) { cancel(); return; }
   if (!exitArmed) {
    exitArmed = true;
    cleanups.push(listen('scroll', () => check(token)));
   }
   check(token);
  };
  for (const type of ['wheel', 'touchmove', 'keydown'] as const) cleanups.push(listen(type, intent));
  if (!wasHeld) options.onHoldChange?.(true);
  return true;
 }
 return {
  begin,
  close() {
   if (!held) return false;
   closed = true;
   check(generation);
   return held;
  },
  cancel,
  isHeld: () => held,
 };
}
