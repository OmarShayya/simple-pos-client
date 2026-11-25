import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { Order } from "@/types/sale.types";
import OrderReceipt, { type ReceiptFormat } from "./OrderReceipt";

const ROOT_ID = "receipt-print-root";
const STYLE_ID = "receipt-print-style";
const FORMAT_KEY = "pos.receiptFormat";

/** Paper rules: 80 mm thermal roll (default) or A4 for office printers. Only the receipt prints. */
const printCss = (format: ReceiptFormat) => `
#${ROOT_ID} { display: none; }
@media print {
  @page { size: ${format === "thermal" ? "80mm auto" : "A4"}; margin: ${format === "thermal" ? "3mm 4mm" : "18mm"}; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(#${ROOT_ID}) { display: none !important; }
  #${ROOT_ID} { display: block !important; }
  #${ROOT_ID} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

let current: { root: Root; host: HTMLElement; style: HTMLStyleElement } | null = null;

const cleanup = () => {
  if (!current) return;
  const { root, host, style } = current;
  current = null;
  // Unmount after the print dialog is gone (never during React's render)
  window.setTimeout(() => {
    root.unmount();
    host.remove();
    style.remove();
  }, 0);
};

/** The format staff picked last time on this device. */
export const getReceiptFormat = (): ReceiptFormat => {
  try {
    return localStorage.getItem(FORMAT_KEY) === "a4" ? "a4" : "thermal";
  } catch {
    return "thermal";
  }
};

export const setReceiptFormat = (format: ReceiptFormat) => {
  try {
    localStorage.setItem(FORMAT_KEY, format);
  } catch {
    /* private mode: just don't remember */
  }
};

/**
 * Prints an order's receipt with the browser's print dialog (works with any installed printer,
 * incl. 80 mm thermal printers). No popups, no PDF library: the receipt is rendered into a hidden
 * node that is the only thing visible in print.
 */
export function printReceipt(order: Order, format: ReceiptFormat = getReceiptFormat()) {
  if (current) {
    current.root.unmount();
    current.host.remove();
    current.style.remove();
    current = null;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = printCss(format);
  document.head.appendChild(style);

  const host = document.createElement("div");
  host.id = ROOT_ID;
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => root.render(<OrderReceipt order={order} format={format} />));
  current = { root, host, style };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
