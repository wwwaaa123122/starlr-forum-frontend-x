/**
 * 图片裁剪弹窗：上传头像 / 背景图时让用户框选裁剪区域。
 *
 * - 头像：1:1 圆形裁剪框
 * - 背景图：3:1 横幅裁剪框 + 底部「主页效果」实时预览条
 * - 确认后在 canvas 上按裁剪区域导出文件（PNG 保持透明，其余导出 JPEG）
 */
import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2, RotateCcw, ZoomIn } from 'lucide-react';
import { Button, Modal } from './primitives';

export function ImageCropDialog({
  open,
  file,
  title,
  aspect,
  circular = false,
  preview = false,
  maxEdge = 0,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  file: File | null;
  title: string;
  aspect: number;
  /** 圆形裁剪框（头像） */
  circular?: boolean;
  /** 底部显示所见即所得预览条（背景图） */
  preview?: boolean;
  /** 导出长边上限（px），0 = 不限制。头像 512 / 背景图 1920，避免上传原图尺寸的大文件 */
  maxEdge?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // file 变化时创建 object URL
  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
    const img = new Image();
    img.src = url;
    imgRef.current = img;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 背景图预览条：把当前裁剪区域画进固定尺寸的画布
  useEffect(() => {
    if (!preview || !open || !src || !areaPixels || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = getComputedStyle(canvas).color || '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(
        img,
        areaPixels.x,
        areaPixels.y,
        areaPixels.width,
        areaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }
  }, [preview, open, src, areaPixels]);

  /** 按当前裁剪区域导出 */
  const confirm = async () => {
    if (!file || !src || !areaPixels) return;
    setBusy(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片读取失败'));
        img.src = src;
      });
      // 长边超限时等比缩小导出（头像显示最大 124px，512 已有 4x 余量）
      const rawW = Math.max(1, Math.round(areaPixels.width));
      const rawH = Math.max(1, Math.round(areaPixels.height));
      const scale = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(rawW, rawH)) : 1;
      const w = Math.max(1, Math.round(rawW * scale));
      const h = Math.max(1, Math.round(rawH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('裁剪失败');
      const keepPng = file.type === 'image/png';
      if (!keepPng) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, areaPixels.x, areaPixels.y, areaPixels.width, areaPixels.height, 0, 0, w, h);
      const mime = keepPng ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.9));
      if (!blob) throw new Error('裁剪失败');
      const base = file.name.replace(/\.[a-z0-9]+$/i, '') || 'image';
      const ext = keepPng ? 'png' : 'jpg';
      onConfirm(new File([blob], `${base}-cropped.${ext}`, { type: mime }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onCancel} closeOnBackdrop={false} className="w-[94vw] max-w-lg p-0">
      <div className="p-5 pb-0">
        <h3 className="text-lg font-extrabold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted">拖动选框或缩放图片，调整要保留的区域</p>
      </div>

      <div className="relative mx-5 mt-4 h-[300px] touch-none overflow-hidden rounded-xl bg-black/80 sm:h-[340px]">
        {src && (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={circular ? 'round' : 'rect'}
            showGrid={false}
            restrictPosition
            minZoom={1}
            maxZoom={4}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setAreaPixels(pixels)}
          />
        )}
      </div>

      <div className="flex items-center gap-3 px-5 pt-4">
        <ZoomIn size={16} className="shrink-0 text-muted" />
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1.5 w-full accent-[var(--sl-brand)]"
          aria-label="缩放"
        />
        <button
          type="button"
          onClick={() => {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
          }}
          className="flex shrink-0 items-center gap-1 text-xs text-muted transition hover:text-ink"
          aria-label="重置"
        >
          <RotateCcw size={14} /> 重置
        </button>
      </div>

      {preview && (
        <div className="px-5 pt-4">
          <p className="mb-1.5 text-xs font-semibold text-muted">主页效果预览</p>
          <canvas
            ref={previewCanvasRef}
            width={640}
            height={Math.round(640 / aspect)}
            className="w-full rounded-xl border border-line"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 p-5">
        <Button variant="outline" pill onClick={onCancel}>
          取消
        </Button>
        <Button pill disabled={busy || !areaPixels} onClick={() => void confirm()}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null} 确认裁剪
        </Button>
      </div>
    </Modal>
  );
}
