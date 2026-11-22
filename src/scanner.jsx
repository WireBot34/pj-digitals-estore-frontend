import React, { useEffect, useRef, useState } from "react";
import { Keyboard, X } from "lucide-react";

/**
 * Camera barcode scanning with the browser's built-in BarcodeDetector (Chrome/Edge on Android and
 * desktop). Safari/iPhone and Firefox don't have it yet, so canScan() is false there and the app
 * shows only the typing / USB-or-Bluetooth-scanner path (a hardware scanner just types the code
 * and presses Enter into the focused box, which works everywhere).
 */
export const canScan = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

const WANTED = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar", "qr_code"];

/** continuous = keep scanning after each hit (for receiving a whole box of items). */
export function ScanModal({ onCode, onClose, continuous = false, title = "Scan a barcode" }) {
  const video = useRef(null);
  const [error, setError] = useState("");
  const [last, setLast] = useState("");
  const seen = useRef({ code: "", at: 0 });
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    let stream, timer, stopped = false;
    (async () => {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const detector = new window.BarcodeDetector({ formats: WANTED.filter((f) => supported.includes(f)) });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = video.current;
        v.srcObject = stream;
        await v.play();
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(v);
            const code = found[0]?.rawValue;
            const now = Date.now();
            // same code again within 2.5s is the same item still in view, not a second scan
            if (code && !(seen.current.code === code && now - seen.current.at < 2500)) {
              seen.current = { code, at: now };
              navigator.vibrate?.(60);
              setLast(code);
              cb.current(code);
              if (!continuous) return;
            } else if (code) {
              seen.current.at = now;
            }
          } catch { /* a frame that fails to decode is normal */ }
          timer = setTimeout(tick, 220);
        };
        tick();
      } catch (e) {
        setError(e?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow the camera for this site in your browser settings, or type the code instead."
          : "The camera could not be started. You can type the code instead.");
      }
    })();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [continuous]);

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4" role="dialog" aria-label={title}>
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white">
      <div className="flex items-center justify-between px-4 py-3"><p className="font-extrabold">{title}</p><button onClick={onClose} aria-label="Close"><X/></button></div>
      {error ? <div className="px-4 pb-5"><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p></div> : <>
        <div className="relative aspect-[4/3] bg-black">
          <video ref={video} playsInline muted className="h-full w-full object-cover"/>
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80"/>
        </div>
        <p className="px-4 py-3 text-xs text-slate-500">Hold the barcode inside the frame, steady and well lit.{last && <> Last scanned: <b className="text-ink">{last}</b></>}</p></>}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"><span className="flex items-center gap-2 text-xs text-slate-500"><Keyboard size={14}/> A USB or Bluetooth scanner also works: click the code box and scan.</span><button onClick={onClose} className="btn-secondary px-3 py-2 text-xs">{continuous ? "Done" : "Cancel"}</button></div>
    </div></div>;
}
