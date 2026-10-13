import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  Image as ImageIcon,
  Upload,
  Calendar,
  User,
  Package,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { getOrderImage, saveOrderImage, deleteOrderImage } from '../services/imageStorageService';

export default function OrderImageModal({
  isOpen,
  onClose,
  order,
  retentionDays = 30,
  onOrderImageChanged,
}) {
  const [imageRecord, setImageRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !order) {
      setImageRecord(null);
      setZoom(1);
      setRotation(0);
      return;
    }

    let mounted = true;
    setLoading(true);
    setZoom(1);
    setRotation(0);

    getOrderImage(order.id, order.tracking_code).then((record) => {
      if (mounted) {
        setImageRecord(record || null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleDownload = () => {
    if (!imageRecord || !imageRecord.data_url) return;
    const link = document.createElement('a');
    link.href = imageRecord.data_url;
    const safeName = (order.tracking_code || order.order_id || order.id || 'DonHang').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `VanDon_${safeName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteImage = async () => {
    if (!confirm(`Bạn có chắc muốn xóa ảnh vận đơn của mã "${order.tracking_code || order.id}" khỏi bộ nhớ?`)) {
      return;
    }
    await deleteOrderImage(order.id, order.tracking_code);
    setImageRecord(null);
    if (onOrderImageChanged) onOrderImageChanged(order.id, false);
  };

  const handleUploadNewImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ok = await saveOrderImage({
        orderId: order.id,
        trackingCode: order.tracking_code,
        fileOrUrl: file,
      });
      if (ok) {
        const rec = await getOrderImage(order.id, order.tracking_code);
        setImageRecord(rec);
        if (onOrderImageChanged) onOrderImageChanged(order.id, true);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getDaysRemaining = () => {
    if (!imageRecord?.created_at || !retentionDays || retentionDays <= 0) return null;
    const expiresAt = imageRecord.created_at + retentionDays * 24 * 60 * 60 * 1000;
    const diffDays = Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
    return diffDays;
  };

  const daysLeft = getDaysRemaining();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base font-mono">
                  {order.tracking_code || 'Chưa có mã vận đơn'}
                </h3>
                {order.order_id && (
                  <span className="text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-lg">
                    ID: {order.order_id}
                  </span>
                )}
                {imageRecord && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Đã nén ({formatBytes(imageRecord.size_bytes)})</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-cyan-300 font-medium">
                  <User className="w-3 h-3" />
                  <span>{order.customer_name || 'Khách lẻ'} ({order.customer_phone || 'Không SĐT'})</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{order.order_date || '-'}</span>
                </span>
                {daysLeft !== null && (
                  <span className="flex items-center gap-1 text-amber-300/90 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>Tự động xóa sau {daysLeft} ngày</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            title="Đóng (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Product Summary Strip */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-300 truncate">
            <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate font-medium">{order.product_name || 'Chưa có tên sản phẩm'}</span>
            {order.sku && (
              <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono font-bold text-[11px] shrink-0">
                {order.sku}
              </span>
            )}
          </div>
          <span className="text-slate-400 font-mono shrink-0">
            SL: <strong className="text-white">{order.quantity || 1}</strong>
          </span>
        </div>

        {/* Image Viewport */}
        <div className="flex-1 min-h-[340px] bg-slate-950 relative overflow-auto flex items-center justify-center p-4 select-none">
          {loading ? (
            <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải ảnh vận đơn...</span>
            </div>
          ) : imageRecord && imageRecord.data_url ? (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={imageRecord.data_url}
                alt={order.tracking_code || 'Shipping Label'}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                className="max-h-[62vh] w-auto object-contain rounded-xl shadow-2xl border border-slate-800 transition-transform duration-150 bg-white"
              />
            </div>
          ) : (
            <div className="text-center max-w-sm py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">Đơn hàng này chưa có ảnh nhãn vận đơn</p>
                <p className="text-xs text-slate-500 mt-1">
                  Đơn hàng được tạo thủ công hoặc ảnh đã tự động dọn dẹp sau {retentionDays} ngày. Bạn có thể đính kèm ảnh mới bên dưới.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Đang lưu ảnh...' : 'Đính Kèm Ảnh Vận Đơn'}</span>
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadNewImage}
            className="hidden"
          />
        </div>

        {/* Footer Controls */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Zoom & Rotate Controls */}
          <div className="flex items-center gap-1.5">
            {imageRecord && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoom(1); setRotation(0); }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
                  title="Đặt lại kích thước chuẩn"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors ml-1"
                  title="Xoay ảnh 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Right: Upload / Delete / Download / Close */}
          <div className="flex items-center gap-2">
            {imageRecord && (
              <>
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-medium transition-all"
                  title="Xóa ảnh khỏi bộ nhớ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Ảnh</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all"
                  title="Đổi sang ảnh khác"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Đổi Ảnh</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Xuống Ảnh</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
