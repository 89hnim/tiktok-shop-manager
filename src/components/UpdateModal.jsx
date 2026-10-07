import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileBox, 
  ArrowRight 
} from 'lucide-react';

export default function UpdateModal({ 
  isOpen, 
  onClose, 
  updateInfo, 
  onOpenExternal 
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [downloadedPath, setDownloadedPath] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadComplete(false);
      setDownloadError('');
      setDownloadedPath('');
      return;
    }

    // Subscribe to electron download progress
    if (window.electronAPI && window.electronAPI.onDownloadProgress) {
      const unsub = window.electronAPI.onDownloadProgress((prog) => {
        setDownloadProgress(prog.percent || 0);
      });
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen || !updateInfo) return null;

  const {
    currentVersion = '1.0.0',
    latestVersion = '1.0.0',
    releaseName = '',
    releaseNotes = '',
    downloadUrl = '',
    htmlUrl = '',
    assetName = '',
    assetSize = 0,
    publishedAt = '',
  } = updateInfo;

  const handleStartDownload = async () => {
    if (!window.electronAPI || !window.electronAPI.downloadUpdate) {
      // Running in browser fallback: open link directly
      if (htmlUrl) window.open(htmlUrl, '_blank');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadError('');

    try {
      const res = await window.electronAPI.downloadUpdate({
        downloadUrl,
        assetName,
      });

      if (res.success) {
        setDownloading(false);
        setDownloadComplete(true);
        setDownloadedPath(res.filePath || '');
      } else {
        setDownloading(false);
        setDownloadError(res.error || 'Tải file thất bại. Vui lòng tải trực tiếp từ GitHub.');
      }
    } catch (err) {
      setDownloading(false);
      setDownloadError(err.message || 'Lỗi tải bản cập nhật');
    }
  };

  const formattedDate = publishedAt ? new Date(publishedAt).toLocaleDateString('vi-VN') : '';
  const sizeMb = assetSize ? (assetSize / (1024 * 1024)).toFixed(1) + ' MB' : '';

  return (
    <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Đã Có Phiên Bản Mới!</h3>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                  {latestVersion}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Phiên bản hiện tại: <span className="font-mono text-slate-300">v{currentVersion}</span>
              </p>
            </div>
          </div>

          {!downloading && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Version Compare Banner */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className="text-[10px] text-slate-500 block uppercase">Bản hiện tại</span>
              <span className="font-mono font-bold text-slate-300">v{currentVersion}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <div className="text-center">
              <span className="text-[10px] text-amber-400 block uppercase font-bold">Bản mới nhất</span>
              <span className="font-mono font-bold text-emerald-400">{latestVersion}</span>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-400">
            {formattedDate && <div>Phát hành: {formattedDate}</div>}
            {sizeMb && <div className="text-slate-500">Dung lượng: {sizeMb}</div>}
          </div>
        </div>

        {/* Release Notes */}
        <div>
          <span className="text-xs font-semibold text-slate-300 block mb-1">
            Nội dung cập nhật & Tính năng mới:
          </span>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 max-h-44 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
            {releaseNotes || releaseName || 'Bản cập nhật tối ưu hiệu năng và sửa lỗi hệ thống.'}
          </div>
        </div>

        {/* Download Progress */}
        {downloading && (
          <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải gói cập nhật ({downloadProgress}%)...</span>
              </span>
              <span className="font-mono text-slate-400">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              File sẽ tự động được mở khi tải xong để bạn cài đè. Dữ liệu cũ giữ nguyên 100%.
            </p>
          </div>
        )}

        {/* Download Complete Notification */}
        {downloadComplete && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Đã tải xong file cài đặt!</p>
              <p className="text-emerald-300/90 mt-0.5 leading-relaxed">
                Hệ thống đã tự động mở bộ cài. Bạn chỉ cần <strong>kéo đè / bấm cài đặt</strong> để hoàn tất. Toàn bộ đơn hàng và sản phẩm hiện tại của bạn được bảo toàn nguyên vẹn.
              </p>
            </div>
          </div>
        )}

        {/* Download Error Message */}
        {downloadError && (
          <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-3 flex items-start gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">{downloadError}</p>
              {htmlUrl && (
                <button
                  type="button"
                  onClick={() => onOpenExternal(htmlUrl)}
                  className="mt-1.5 text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Bấm vào đây để tải trực tiếp từ GitHub Releases &rarr;</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
          {htmlUrl && (
            <button
              type="button"
              onClick={() => onOpenExternal(htmlUrl)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Xem trên GitHub</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {!downloadComplete ? (
              <>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Để Sau
                </button>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleStartDownload}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>{downloading ? 'Đang Tải...' : 'Tải Về & Cập Nhật Ngay'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-500/20"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
