"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

export function Cropper({ file, aspect, maxWidth, onCropped, onCancel }) {
  const { t } = useI18n();
  const imgRef  = useRef(null);
  const dragRef = useRef(null);

  const [url,    setUrl]    = useState(null);
  const [nat,    setNat]    = useState(null);
  const [frame,  setFrame]  = useState({ fw: 320, fh: 400 });
  const [zoom,   setZoom]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy,   setBusy]   = useState(false);
  // "cover" = fill frame & crop edges · "contain" = show the whole image (letterboxed)
  const [mode,   setMode]   = useState("cover");

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    setNat(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (typeof window !== "undefined") {
      const avW = Math.min(window.innerWidth - 80, 420);
      const avH = Math.max(200, window.innerHeight - 300);
      let fw = avW;
      let fh = Math.round(fw / aspect);
      if (fh > avH) { fh = avH; fw = Math.round(fh * aspect); }
      fw = Math.max(fw, 80);
      fh = Math.round(fw / aspect);
      setFrame({ fw, fh });
    }
    return () => URL.revokeObjectURL(u);
  }, [file, aspect]);

  const { fw, fh } = frame;

  const bs = nat
    ? (mode === "contain" ? Math.min(fw / nat.w, fh / nat.h) : Math.max(fw / nat.w, fh / nat.h))
    : 1;
  const ds = bs * zoom;

  function clamp(x, y, scale) {
    if (!nat) return { x, y };
    const iW = nat.w * scale;
    const iH = nat.h * scale;
    return {
      x: iW <= fw ? (fw - iW) / 2 : Math.min(0, Math.max(fw - iW, x)),
      y: iH <= fh ? (fh - iH) / 2 : Math.min(0, Math.max(fh - iH, y)),
    };
  }

  function onImgLoad(e) {
    const nw = e.currentTarget.naturalWidth;
    const nh = e.currentTarget.naturalHeight;
    setNat({ w: nw, h: nh });
    const bsInit = mode === "contain" ? Math.min(fw / nw, fh / nh) : Math.max(fw / nw, fh / nh);
    setZoom(1);
    setOffset({ x: (fw - nw * bsInit) / 2, y: (fh - nh * bsInit) / 2 });
  }

  // Toggle crop/fit, re-centering the image at the new base scale.
  function switchMode(m) {
    if (m === mode) return;
    setMode(m);
    if (!nat) return;
    const base = m === "contain" ? Math.min(fw / nat.w, fh / nat.h) : Math.max(fw / nat.w, fh / nat.h);
    setZoom(1);
    setOffset({ x: (fw - nat.w * base) / 2, y: (fh - nat.h * base) / 2 });
  }

  function onPointerDown(e) {
    if (!nat) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragRef.current) return;
    setOffset(clamp(
      dragRef.current.ox + e.clientX - dragRef.current.x,
      dragRef.current.oy + e.clientY - dragRef.current.y,
      ds,
    ));
  }
  function onPointerUp() { dragRef.current = null; }

  function onZoom(z) {
    if (!nat) return;
    const oldDs = bs * zoom;
    const newDs = bs * z;
    const cx = fw / 2;
    const cy = fh / 2;
    setOffset(clamp(
      cx - ((cx - offset.x) / oldDs) * newDs,
      cy - ((cy - offset.y) / oldDs) * newDs,
      newDs,
    ));
    setZoom(z);
  }

  async function apply() {
    if (!nat || busy) return;
    setBusy(true);
    try {
      // Render the frame exactly as shown: output matches the crop frame's
      // aspect, the image is drawn at its on-screen position/scale, and any
      // area not covered (fit mode letterbox) is filled white.
      const outW = maxWidth;
      const outH = Math.round(outW / aspect);
      const s = outW / fw; // frame px → output px

      const canvas = document.createElement("canvas");
      canvas.width  = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        imgRef.current,
        0, 0, nat.w, nat.h,
        offset.x * s, offset.y * s, nat.w * ds * s, nat.h * ds * s,
      );

      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));
      if (!blob) throw new Error("crop failed");
      onCropped(blob, URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-ink-100 w-full max-w-md flex flex-col max-h-[95vh]">

        <div className="px-5 pt-4 pb-3 border-b border-ink-100 flex items-center justify-between shrink-0">
          <h3 className="serif text-[16px] font-bold text-ink-800">{t("imageCrop.title")}</h3>
          <button onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-600 hover:bg-ink-50 transition">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-xl touch-none select-none cursor-grab active:cursor-grabbing"
              style={{ width: fw, height: fh, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.25)" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
                  src={url}
                  alt=""
                  onLoad={onImgLoad}
                  draggable={false}
                  className="absolute max-w-none pointer-events-none"
                  style={{
                    width:  nat ? nat.w * ds : "auto",
                    height: nat ? nat.h * ds : "auto",
                    left: offset.x,
                    top:  offset.y,
                  }}
                />
              )}

              {nat && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-black/15" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-black/15" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-black/15" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-black/15" />
                </div>
              )}

              {!nat && (
                <div className="absolute inset-0 bg-ink-100 flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-ink-200 border-t-ink-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Crop / Fit toggle */}
          <div className="flex items-center justify-center">
            <div className="inline-flex bg-ink-100 rounded-lg p-1 gap-1">
              <button type="button" onClick={() => switchMode("cover")}
                className={`px-3 h-8 rounded-md text-[12px] font-semibold transition ${mode === "cover" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400 hover:text-ink-700"}`}>
                {t("imageCrop.cropToFill")}
              </button>
              <button type="button" onClick={() => switchMode("contain")}
                className={`px-3 h-8 rounded-md text-[12px] font-semibold transition ${mode === "contain" ? "bg-white text-ink-800 shadow-sm" : "text-ink-400 hover:text-ink-700"}`}>
                {t("imageCrop.fitWhole")}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-ink-400 text-center">
            {mode === "contain" ? t("imageCrop.fitHint") : t("imageCrop.hint")}
          </p>

          <div className="flex items-center gap-3">
            <Icon name="search" size={14} className="text-ink-400 shrink-0" />
            <input
              type="range" min="1" max="4" step="0.01"
              value={zoom}
              disabled={!nat}
              onChange={(e) => onZoom(Number(e.target.value))}
              className="flex-1 accent-gold-500"
            />
            <span className="text-[11px] text-ink-400 w-8 text-right">{zoom.toFixed(1)}×</span>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel}
              className="flex-1 h-11 rounded-xl border border-ink-200 text-ink-600 text-[13px] hover:bg-ink-50 transition">
              {t("common.cancel")}
            </button>
            <button onClick={apply} disabled={busy || !nat}
              className="flex-1 h-11 rounded-xl btn-primary text-[13px] font-semibold disabled:opacity-50">
              {busy ? t("imageCrop.cropping") : t("imageCrop.cropAndUse")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageCropUploader({
  value,
  label,
  aspect   = 4 / 5,
  maxWidth = 1000,
  onCrop,
}) {
  const { t } = useI18n();
  const resolvedLabel = label ?? t("imageCrop.defaultLabel");
  const fileRef = useRef(null);
  const [cropFile, setCropFile] = useState(null);

  function pickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCropFile(file);
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative rounded-xl border-2 border-dashed border-ink-200 hover:border-gold-400 bg-ink-50 flex flex-col items-center justify-center overflow-hidden transition group w-full"
        style={{ aspectRatio: aspect }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-ink-300 group-hover:text-ink-500 transition pointer-events-none">
            <Icon name="upload" size={24} />
            <span className="text-[11px] font-medium">{resolvedLabel}</span>
          </div>
        )}
        {value && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <Icon name="edit" size={20} className="text-white" />
          </div>
        )}
      </button>

      {cropFile && (
        <Cropper
          file={cropFile}
          aspect={aspect}
          maxWidth={maxWidth}
          onCropped={(blob, preview) => { setCropFile(null); onCrop(blob, preview); }}
          onCancel={() => setCropFile(null)}
        />
      )}
    </>
  );
}
