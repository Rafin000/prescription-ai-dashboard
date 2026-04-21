/**
 * Scoped print for a single Rx sheet.
 *
 * The CSS only unhides the `.rx-print-root` that carries
 * `data-rx-print-target="true"`. This helper marks the chosen sheet as
 * the target, fires the browser print dialog, and removes the marker
 * after the dialog closes so the next print starts from a clean slate.
 *
 * @param el  Optional container. When omitted, falls back to the first
 *            `.rx-print-root` on the page — useful for flows like
 *            "Save & print" where we navigate away first and only one
 *            Rx sheet is left in the DOM.
 */
export function printRxScoped(el?: HTMLElement | null): void {
  const sheets = document.querySelectorAll<HTMLElement>('.rx-print-root');
  let target: HTMLElement | null = null;

  if (el) {
    target = el.classList.contains('rx-print-root')
      ? el
      : el.querySelector<HTMLElement>('.rx-print-root');
  }
  if (!target) target = sheets[0] ?? null;
  if (!target) {
    window.print();
    return;
  }

  applyPrintIsolation(target);
  const cleanup = () => releasePrintIsolation();
  const onAfter = () => {
    cleanup();
    window.removeEventListener('afterprint', onAfter);
  };
  window.addEventListener('afterprint', onAfter);
  window.print();
  // Safety — not every browser fires afterprint reliably.
  setTimeout(cleanup, 3000);
}

/** Isolate the Rx sheet at print time by walking from the target up to
 *  <body>: every off-path sibling is tagged `rx-print-hidden` (CSS then
 *  display:none's it) and every ancestor is tagged `rx-print-chain` so
 *  CSS can reset the dashboard's flex/grid/padding constraints. Without
 *  the chain reset, the Rx renders at the page's narrow content-column
 *  width instead of the full A4/A5 page. */
function applyPrintIsolation(target: HTMLElement): void {
  target.setAttribute('data-rx-print-target', 'true');
  let node: HTMLElement | null = target;
  while (node && node !== document.body) {
    const parent = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && sibling instanceof HTMLElement) {
        sibling.classList.add('rx-print-hidden');
      }
    }
    parent.classList.add('rx-print-chain');
    node = parent;
  }
}

function releasePrintIsolation(): void {
  document
    .querySelectorAll('.rx-print-hidden')
    .forEach((el) => el.classList.remove('rx-print-hidden'));
  document
    .querySelectorAll('.rx-print-chain')
    .forEach((el) => el.classList.remove('rx-print-chain'));
  document
    .querySelectorAll('.rx-print-root[data-rx-print-target="true"]')
    .forEach((el) => el.removeAttribute('data-rx-print-target'));
}

/** Mount once at app startup so ⌘P / Ctrl-P (keyboard print) also
 *  produces a clean single-Rx page. When the user hits the native print
 *  shortcut with no sheet explicitly tagged, we pick the first `.rx-print-root`
 *  that is actually visible in the viewport — the one the doctor is
 *  looking at — and tag it for the duration of the print. */
export function installKeyboardPrintHandler(): void {
  const onBeforePrint = () => {
    const tagged = document.querySelector<HTMLElement>(
      '.rx-print-root[data-rx-print-target="true"]',
    );
    if (tagged) return;
    const sheets = [...document.querySelectorAll<HTMLElement>('.rx-print-root')];
    const visible = sheets.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!visible) return;
    applyPrintIsolation(visible);
    visible.setAttribute('data-rx-print-auto', 'true');
  };
  const onAfterPrint = () => {
    releasePrintIsolation();
    document
      .querySelectorAll('.rx-print-root[data-rx-print-auto="true"]')
      .forEach((el) => el.removeAttribute('data-rx-print-auto'));
  };
  window.addEventListener('beforeprint', onBeforePrint);
  window.addEventListener('afterprint', onAfterPrint);
}
