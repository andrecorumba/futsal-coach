// Screen Wake Lock while the clock runs (spec field-usability "Tela acesa durante o jogo", design.md D8).
// Feature-detected and silent: without support, or when the request is refused, nothing happens.

export interface WakeLockControl {
  /** Holds the lock when `wanted` is true and the page is visible; releases it otherwise. */
  sync(wanted: boolean): void;
  release(): void;
}

export function createWakeLock(nav: Navigator = navigator, doc: Document = document): WakeLockControl {
  const supported = 'wakeLock' in nav && typeof nav.wakeLock?.request === 'function';
  let sentinel: WakeLockSentinel | null = null;
  let pending = false;
  let wanted = false;

  const drop = (): void => {
    const s = sentinel;
    sentinel = null;
    if (s && !s.released) s.release().catch(() => undefined);
  };

  const acquire = (): void => {
    if (!supported || pending || (sentinel && !sentinel.released) || doc.visibilityState !== 'visible') return;
    pending = true;
    nav.wakeLock.request('screen').then(
      (s) => {
        pending = false;
        if (!wanted) {
          s.release().catch(() => undefined);
          return;
        }
        sentinel = s;
        // The browser releases the lock when the page is hidden; forget it so it can be re-acquired.
        s.addEventListener('release', () => {
          if (sentinel === s) sentinel = null;
        });
      },
      () => {
        pending = false;
      },
    );
  };

  return {
    sync(next) {
      wanted = next;
      if (wanted) acquire();
      else drop();
    },
    release() {
      wanted = false;
      drop();
    },
  };
}
