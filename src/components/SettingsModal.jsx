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
  AlertCircle,
  Store,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Zap,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { exportToExcelFile } from '../services/excelService';
import { testGeminiApiKey, clearGeminiModelCache } from '../services/geminiService';
import {
  getOrderImagesMetadata,
  cleanupExpiredOrderImages,
  clearAllOrderImages
} from '../services/imageStorageService';

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
    shop_name: settings.shop_name || 'Nuôi cá cùng Jun',
    tiktok_fee_percent_default: settings.tiktok_fee_percent_default ?? 5.0,
    tiktok_fixed_fee_default: settings.tiktok_fixed_fee_default ?? 3000,
    auto_sync_excel: settings.auto_sync_excel ?? true,
    github_repo: settings.github_repo || '89hnim/tiktok-shop-manager',
    ocr_engine: settings.ocr_engine || 'gemini',
    gemini_api_key: settings.gemini_api_key || '',
    image_retention_days: settings.image_retention_days ?? 30,
  });

  const [excelPath, setExcelPath] = useState('Đang lấy đường dẫn...');
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [imageStorageStats, setImageStorageStats] = useState({ count: 0, totalSizeBytes: 0 });
  const [cleaningImages, setCleaningImages] = useState(false);

  const loadImageStats = async () => {
    try {
      const meta = await getOrderImagesMetadata();
      setImageStorageStats({ count: meta.count || 0, totalSizeBytes: meta.totalSizeBytes || 0 });
    } catch (e) {}
  };

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        shop_name: settings.shop_name || 'Nuôi cá cùng Jun',
        tiktok_fee_percent_default: settings.tiktok_fee_percent_default ?? 5.0,
        tiktok_fixed_fee_default: settings.tiktok_fixed_fee_default ?? 3000,
        auto_sync_excel: settings.auto_sync_excel ?? true,
        github_repo: settings.github_repo || '89hnim/tiktok-shop-manager',
        ocr_engine: settings.ocr_engine || 'gemini',
        gemini_api_key: settings.gemini_api_key || '',
        image_retention_days: settings.image_retention_days ?? 30,
      });
      loadImageStats();
    }

    if (window.electronAPI && window.electronAPI.getExcelPath) {
      window.electronAPI.getExcelPath().then(p => setExcelPath(p));
    } else {
      setExcelPath('Trình duyệt: Tải trực tiếp file TikTok_Shop_Orders.xlsx');
    }

    if (window.electronAPI && window.electronAPI.getVersion) {
      window.electronAPI.getVersion().then(v => setCurrentVersion(v || '1.0.0'));
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.gemini_api_key !== settings.gemini_api_key) {
      clearGeminiModelCache();
    }
    const retention = Number(formData.image_retention_days) || 30;
    cleanupExpiredOrderImages(retention).catch(() => {});
    onSaveSettings({ ...formData, image_retention_days: retention });
    onClose();
  };

  const handleCleanupExpiredNow = async () => {
    setCleaningImages(true);
    try {
      const retention = Number(formData.image_retention_days) || 30;
      const res = await cleanupExpiredOrderImages(retention);
      await loadImageStats();
      alert(`Đã dọn dẹp ${res.deletedCount || 0} ảnh vận đơn quá hạn (> ${retention} ngày).`);
    } finally {
      setCleaningImages(false);
    }
  };

  const handleClearAllSavedImages = async () => {
    if (!confirm('Bạn có chắc muốn xoá toàn bộ ảnh nhãn vận đơn đang lưu trong bộ nhớ không? (Dữ liệu đơn hàng và doanh thu vẫn giữ nguyên 100%)')) {
      return;
    }
    setCleaningImages(true);
    try {
      await clearAllOrderImages();
      await loadImageStats();
    } finally {
      setCleaningImages(false);
    }
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

  const handleTestGeminiKey = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiApiKey(formData.gemini_api_key);
      setGeminiTestResult(res);
      if (res.success && res.model) {
        setFormData(prev => ({
          ...prev,
          gemini_active_model: res.model,
          gemini_active_version: res.apiVersion || 'v1',
        }));
      }
    } catch (err) {
      setGeminiTestResult({ success: false, message: err.message });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleOpenAiStudio = () => {
    const url = 'https://aistudio.google.com/app/apikey';
    if (window.electronAPI && window.electronAPI.openExternalUrl) {
      window.electronAPI.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
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

          {/* Custom Shop Name for OCR */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-sm">Tên Shop Của Bạn (Người Gửi Đơn Hàng)</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tên Shop được bộ máy OCR sử dụng làm mốc chặn dòng người gửi để định vị chính xác khu vực Tên & SĐT khách hàng bên dưới, tránh quét nhầm thông tin của người gửi.
            </p>
            <div>
              <label className="text-slate-300 block mb-1">Tên Shop / Tên người gửi trên phiếu in:</label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                placeholder="VD: Nuôi cá cùng Jun"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* AI OCR & Gemini Engine Configuration */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-white text-sm">Công Nghệ Nhận Diện Đơn Hàng (OCR)</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                formData.ocr_engine === 'gemini' 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-slate-750 text-slate-400 border border-slate-700'
              }`}>
                {formData.ocr_engine === 'gemini' ? 'AI Cloud' : 'Offline'}
              </span>
            </div>

            {/* Engine Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, ocr_engine: 'gemini' })}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  formData.ocr_engine === 'gemini'
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>Google Gemini AI</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Khuyên dùng. AI hiểu ngữ cảnh, tách chuẩn nhiều SP/SKU. Free 1.500 đơn/ngày.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, ocr_engine: 'tesseract' })}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  formData.ocr_engine === 'tesseract'
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tesseract OCR</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Chạy nội bộ trên máy, hoàn toàn không cần kết nối mạng internet.
                </p>
              </button>
            </div>

            {/* Gemini API Key Config (when gemini selected) */}
            {formData.ocr_engine === 'gemini' && (
              <div className="pt-2 border-t border-slate-800 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Google Gemini API Key:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAiStudio}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                  >
                    <span>Lấy Key Free tại AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.gemini_api_key}
                    onChange={(e) => {
                      setFormData({ ...formData, gemini_api_key: e.target.value });
                      setGeminiTestResult(null);
                    }}
                    placeholder="Dán API Key (bắt đầu bằng AIzaSy...)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    title={showApiKey ? 'Ẩn API Key' : 'Hiện API Key'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-400">
                    💡 Hạn mức miễn phí: <strong className="text-emerald-400">1.500 đơn/ngày</strong> và <strong className="text-emerald-400">15 đơn/phút</strong>.
                  </p>
                  <button
                    type="button"
                    disabled={testingGemini || !formData.gemini_api_key.trim()}
                    onClick={handleTestGeminiKey}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    {testingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>{testingGemini ? 'Đang thử...' : 'Kiểm Tra API Key'}</span>
                  </button>
                </div>

                {geminiTestResult && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    geminiTestResult.success 
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}>
                    {geminiTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{geminiTestResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Label Image Storage & 30-Day Auto Cleanup Box */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white text-sm">Lưu Trữ Ảnh Nhãn Vận Đơn (IndexedDB)</span>
              </div>
              <span className="text-[11px] font-mono font-bold bg-sky-500/10 border border-sky-500/30 text-sky-300 px-2.5 py-0.5 rounded-lg">
                {imageStorageStats.count} ảnh ({(imageStorageStats.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Ảnh phiếu gửi hàng được tự động nén thông minh (~60KB/ảnh) và lưu tách biệt trong IndexedDB để bạn có thể bấm xem lại hoặc tải xuống bất cứ lúc nào từ bảng đơn hàng mà không làm nặng ứng dụng.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <label className="text-slate-300 text-xs font-medium">
                Tự động xóa ảnh cũ sau:
              </label>
              <select
                value={formData.image_retention_days}
                onChange={(e) => setFormData({ ...formData, image_retention_days: Number(e.target.value) })}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-sky-300 focus:outline-none focus:border-sky-400"
              >
                <option value={7}>7 ngày</option>
                <option value={15}>15 ngày</option>
                <option value={30}>30 ngày (Khuyên dùng)</option>
                <option value={60}>60 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={cleaningImages}
                onClick={handleCleanupExpiredNow}
                className="flex items-center gap-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 px-3 py-1.5 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cleaningImages ? 'animate-spin' : ''}`} />
                <span>Dọn Ảnh Quá Hạn Ngay</span>
              </button>

              {imageStorageStats.count > 0 && (
                <button
                  type="button"
                  disabled={cleaningImages}
                  onClick={handleClearAllSavedImages}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 px-3 py-1.5 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xoá Tất Cả Ảnh ({imageStorageStats.count})</span>
                </button>
              )}
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
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="flex items-center justify-end gap-3 p-4 bg-slate-900 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
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
