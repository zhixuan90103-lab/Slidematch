/**
 * First-finger ownership + iOS pointercancel continue via touch.
 * Borrowed from SlidetoWord mount.ts — not ray geometry.
 */

export type SwipeInputHandlers = {
  onSample: (clientX: number, clientY: number, kind: 'down' | 'move' | 'up') => void;
  onTrueCancel: () => void;
};

export function bindSwipeInput(target: HTMLElement, handlers: SwipeInputHandlers): () => void {
  let ownerPointerId: number | null = null;
  let ownerTouchId: number | null = null;
  let pointerLost = false;
  let pendingEnter = false;
  const liveTouches = new Map<number, { x: number; y: number }>();

  const ignoreExtra = (ev: Event) => {
    ev.preventDefault();
    ev.stopImmediatePropagation();
  };

  const clearOwner = () => {
    ownerPointerId = null;
    ownerTouchId = null;
    pointerLost = false;
    pendingEnter = false;
  };

  const capturePointer = (id: number) => {
    try {
      target.setPointerCapture(id);
    } catch {
      /* not a capture target */
    }
  };

  const releaseCaptured = (id: number) => {
    try {
      target.releasePointerCapture(id);
    } catch {
      /* already released */
    }
  };

  const nearestLiveTouch = (clientX: number, clientY: number): number | null => {
    let best: number | null = null;
    let bestD = Infinity;
    for (const [id, p] of liveTouches) {
      const d = (p.x - clientX) ** 2 + (p.y - clientY) ** 2;
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  };

  const rememberTouches = (ev: TouchEvent, drop: boolean) => {
    for (const t of ev.changedTouches) {
      if (drop) liveTouches.delete(t.identifier);
      else liveTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  };

  const touchById = (list: TouchList, id: number): Touch | null => {
    for (const t of list) {
      if (t.identifier === id) return t;
    }
    return null;
  };

  const onDown = (ev: PointerEvent) => {
    if (ownerPointerId !== null && ev.pointerId !== ownerPointerId) {
      ignoreExtra(ev);
      return;
    }
    if (ownerPointerId !== null) {
      ignoreExtra(ev);
      return;
    }
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    ownerPointerId = ev.pointerId;
    pointerLost = false;
    pendingEnter = true;
    ownerTouchId = nearestLiveTouch(ev.clientX, ev.clientY);
    capturePointer(ev.pointerId);
    handlers.onSample(ev.clientX, ev.clientY, 'down');
    ev.preventDefault();
  };

  const emitMoves = (ev: PointerEvent) => {
    const extra =
      typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : [];
    if (extra.length === 0) {
      handlers.onSample(ev.clientX, ev.clientY, 'move');
      return;
    }
    for (const e of extra) handlers.onSample(e.clientX, e.clientY, 'move');
  };

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== ownerPointerId) {
      if (ownerPointerId !== null) ignoreExtra(ev);
      return;
    }
    emitMoves(ev);
    ev.preventDefault();
  };

  const finish = (clientX: number, clientY: number) => {
    handlers.onSample(clientX, clientY, 'up');
    if (ownerPointerId !== null) releaseCaptured(ownerPointerId);
    clearOwner();
  };

  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== ownerPointerId) return;
    finish(ev.clientX, ev.clientY);
  };

  const onCancel = (ev: PointerEvent) => {
    if (ev.pointerId !== ownerPointerId) return;
    pointerLost = true;
    releaseCaptured(ev.pointerId);
    if (ownerTouchId === null) {
      handlers.onTrueCancel();
      clearOwner();
    }
  };

  const onTouchStart = (ev: TouchEvent) => {
    rememberTouches(ev, false);
    if (ownerPointerId === null && !pendingEnter) return;
    if (ownerTouchId === null) {
      ownerTouchId = nearestLiveTouch(ev.changedTouches[0]!.clientX, ev.changedTouches[0]!.clientY);
    }
    let extra = false;
    for (const t of ev.changedTouches) {
      if (t.identifier !== ownerTouchId) extra = true;
    }
    if (extra) ignoreExtra(ev);
  };

  const onTouchMove = (ev: TouchEvent) => {
    rememberTouches(ev, false);
    if (ownerPointerId === null && ownerTouchId === null) return;
    let extra = false;
    for (const t of ev.changedTouches) {
      if (t.identifier !== ownerTouchId) extra = true;
    }
    if (extra) ignoreExtra(ev);
    if (ownerTouchId === null && ev.touches.length > 0) {
      ownerTouchId = nearestLiveTouch(ev.touches[0]!.clientX, ev.touches[0]!.clientY);
    }
    const mine =
      ownerTouchId === null
        ? null
        : (touchById(ev.touches, ownerTouchId) ?? touchById(ev.changedTouches, ownerTouchId));
    if (pointerLost && mine) handlers.onSample(mine.clientX, mine.clientY, 'move');
  };

  const onTouchEnd = (ev: TouchEvent) => {
    let ownerEnded = false;
    let extra = false;
    for (const t of ev.changedTouches) {
      if (t.identifier === ownerTouchId) ownerEnded = true;
      else extra = true;
    }
    rememberTouches(ev, true);
    if (ownerTouchId === null && ownerPointerId === null) return;
    if (extra) ignoreExtra(ev);
    if (!ownerEnded) return;
    const mine = touchById(ev.changedTouches, ownerTouchId!);
    if (mine) finish(mine.clientX, mine.clientY);
    else {
      handlers.onTrueCancel();
      if (ownerPointerId !== null) releaseCaptured(ownerPointerId);
      clearOwner();
    }
  };

  const touchOpt: AddEventListenerOptions = { capture: true, passive: false };
  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onCancel);
  document.addEventListener('touchstart', onTouchStart, touchOpt);
  document.addEventListener('touchmove', onTouchMove, touchOpt);
  document.addEventListener('touchend', onTouchEnd, touchOpt);
  document.addEventListener('touchcancel', onTouchEnd, touchOpt);

  return () => {
    target.removeEventListener('pointerdown', onDown);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
    target.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('touchstart', onTouchStart, touchOpt);
    document.removeEventListener('touchmove', onTouchMove, touchOpt);
    document.removeEventListener('touchend', onTouchEnd, touchOpt);
    document.removeEventListener('touchcancel', onTouchEnd, touchOpt);
  };
}
