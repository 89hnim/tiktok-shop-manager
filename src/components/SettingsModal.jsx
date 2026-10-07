import React, { useState } from 'react';
import { 
  Settings, 
  X, 
  Save, 
  FileSpreadsheet, 
  Folder, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  ShieldCheck,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { exportToExcelFile } from '../services/excelService';

export default function SettingsModal({
  isOpen,
  onClose,
  settings = {},
  onSaveSettings,
  orders = [],
  products = [],
  onOpenExcel,
  onTriggerUpdateModal
}) {
  const [formData, setFormData] = useState({
    tiktok_fee_percent_default: settings.tiktok_fee_percent_default ?? 5.0,
    tiktok_fixed_fee_default: settings.tiktok_fixed_fee_default ?? 3000,
    auto_sync_excel: settings.auto_sync_excel ?? true,
    github_repo: settings.github_repo || '89hnim/tiktok-shop-manager',
  });

  const [excelPath, setExcelPath] = useState('Đang lấy đường dẫn...');
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  React.useEffect(() => {
    if (window.electronAPI && window.electronAPI.getExcelPath) {
      window.electronAPI.getExcelPath().then(p => setExcelPath(p));
    } else {
      setExcelPath('Trình duyệt: Tải trực tiếp file TikTok_Shop_Orders.xlsx');
    }

    if (window.electronAPI && window.electronAPI.getVersion) {
      window.electronAPI.getVersion().then(v => setCurrentVersion(v || '1.0.0'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  const handleManualExport = async () => {
    await exportToExcelFile(orders, products);
  };

  const handleChangePath = async () => {
    if (window.electronAPI && window.electronAPI.setExcelPath) {
      const newPath = await window.electronAPI.setExcelPath();
      if (newPath) setExcelPath(newPath);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);

    if (window.electronAPI && window.electronAPI.checkUpdate) {
      try {
        const res = await window.electronAPI.checkUpdate(formData.github_repo);
        setCheckingUpdate(false);
        setUpdateResult(res);
      } catch (err) {
        setCheckingUpdate(false);
        setUpdateResult({ success: false, error: err.message });
      }
    } else {
      setCheckingUpdate(false);
      setUpdateResult({ success: false, error: 'Chức năng chỉ hỗ trợ trên ứng dụng Desktop Electron.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Cài Đặt Hệ Thống & Lưu Trữ</h3>
              <p className="text-xs text-slate-400">Đồng bộ Excel và cấu hình biểu phí sàn</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Excel Auto-Sync Box */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-sm">Đồng Bộ File Excel Song Song</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.auto_sync_excel} 
                  onChange={(e) => setFormData({ ...formData, auto_sync_excel: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Mỗi khi bạn thêm đơn, tích tất toán, sửa giá... dữ liệu sẽ tự động ghi ra file Excel để bạn có thể xem hoặc gửi cho kế toán bất cứ lúc nào mà không lo xung đột file.
            </p>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 break-all">
              {excelPath}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenExcel}
                className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-semibold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở File Excel</span>
              </button>

              <button
                type="button"
                onClick={handleManualExport}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File Excel Mới</span>
              </button>

              {window.electronAPI && (
                <button
                  type="button"
                  onClick={handleChangePath}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl transition-all"
                  title="Thay đổi đường dẫn lưu file"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Đổi Vị Trí</span>
                </button>
              )}
            </div>
          </div>

          {/* Default Platform Fees */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3">
            <span className="font-bold text-white text-sm block">Biểu Phí Sàn TikTok Mặc Định</span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">% Chiết khấu sàn mặc định</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.tiktok_fee_percent_default}
                  onChange={(e) => setFormData({ ...formData, tiktok_fee_percent_default: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Phí cố định mặc định (₫)</label>
                <input
                  type="number"
                  step="500"
                  value={formData.tiktok_fixed_fee_default}
                  onChange={(e) => setFormData({ ...formData, tiktok_fixed_fee_default: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* GitHub Release & Software Updates Box */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-sm">Cập Nhật Phiên Bản (GitHub Releases)</span>
              </div>
              <span className="text-[11px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-lg">
                v{currentVersion}
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Kiểm tra bản cập nhật mới từ kho GitHub của bạn. Khi có bản mới, hệ thống chỉ thông báo để bạn chọn cập nhật (không tự động ép tải). Dữ liệu cũ bảo toàn 100%.
            </p>

            <div>
              <label className="text-slate-300 block mb-1">Kho GitHub lưu bản phát hành (owner/repo):</label>
              <input
                type="text"
                value={formData.github_repo}
                onChange={(e) => setFormData({ ...formData, github_repo: e.target.value })}
                placeholder="VD: JunNguyen/TiktokShopManager"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={checkingUpdate}
                onClick={handleCheckUpdate}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                {checkingUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{checkingUpdate ? 'Đang Kiểm Tra...' : 'Kiểm Tra Bản Cập Nhật Mới'}</span>
              </button>
            </div>

            {/* Check Results */}
            {updateResult && (
              <div className="mt-2 text-xs">
                {updateResult.success && updateResult.updateAvailable && (
                  <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-2 text-amber-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Đã có phiên bản mới: <strong className="text-white font-mono">{updateResult.latestVersion}</strong>
                      </span>
                    </div>
                    {onTriggerUpdateModal && (
                      <button
                        type="button"
                        onClick={() => onTriggerUpdateModal(updateResult)}
                        className="bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs hover:bg-amber-400 transition-colors shrink-0"
                      >
                        Xem & Cập Nhật
                      </button>
                    )}
                  </div>
                )}

                {updateResult.success && !updateResult.updateAvailable && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Bạn đang sử dụng phiên bản mới nhất (v{updateResult.currentVersion})!</span>
                  </div>
                )}

                {!updateResult.success && (
                  <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{updateResult.error || 'Kiểm tra cập nhật thất bại.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-5 py-2 rounded-xl shadow-lg shadow-rose-500/25 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Cài Đặt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
