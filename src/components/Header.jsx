import React from 'react';
import { 
  Camera, 
  PlusCircle, 
  Package, 
  FileSpreadsheet, 
  Settings, 
  ExternalLink,
  Sparkles,
  Bug
} from 'lucide-react';

export default function Header({ 
  onOpenScan, 
  onOpenManualOrder, 
  onOpenProducts, 
  onOpenSettings, 
  onOpenExcel,
  onOpenErrorLog,
  unreadErrorsCount = 0,
  updateInfo = null,
  onOpenUpdateModal,
  activeTab,
  setActiveTab 
}) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-cyan-400 p-[2px] flex items-center justify-center shadow-lg shadow-rose-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-rose-400 text-lg">
                TT
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl text-white tracking-tight">TikTok Shop Manager</h1>
              <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
                Mac & Windows
              </span>
            </div>
            <p className="text-xs text-slate-400">Quản lý đơn hàng, OCR bóc tách phiếu in & Lợi nhuận tức thời</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Quản Lý Đơn Hàng</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Sản Phẩm & Giá Vốn</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Scan Button */}
          <button
            onClick={onOpenScan}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-lg shadow-rose-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span>Quét Ảnh Đơn</span>
          </button>

          {/* Manual Order Button */}
          <button
            onClick={onOpenManualOrder}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium transition-all hover:border-slate-600"
            title="Tạo đơn hàng thủ công"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Tạo Đơn Tay</span>
          </button>

          {/* Open Excel */}
          <button
            onClick={onOpenExcel}
            className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
            title="Mở file Excel đã đồng bộ"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden md:inline">Mở Excel</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>

          {/* New Version Available Button */}
          {updateInfo?.updateAvailable && (
            <button
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-lg shadow-amber-500/25 animate-pulse transition-all hover:scale-105"
              title={`Có bản cập nhật mới ${updateInfo.latestVersion}! Bấm để xem`}
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Có bản mới</span>
              <span>{updateInfo.latestVersion}</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all"
            title="Cài đặt phí sàn & hệ thống"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* System Error Log Button */}
          <button
            onClick={onOpenErrorLog}
            className={`relative p-2 rounded-xl transition-all border ${
              unreadErrorsCount > 0
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent hover:border-slate-700'
            }`}
            title={unreadErrorsCount > 0 ? `Có ${unreadErrorsCount} lỗi hệ thống mới chưa xem!` : 'Nhật ký báo lỗi hệ thống'}
          >
            <Bug className="w-5 h-5" />
            {unreadErrorsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold font-mono text-white ring-2 ring-slate-900 animate-pulse">
                {unreadErrorsCount > 9 ? '9+' : unreadErrorsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
