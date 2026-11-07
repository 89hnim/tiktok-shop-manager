import React from 'react';
import { 
  ShoppingBag, 
  Warehouse, 
  Fish, 
  FileSpreadsheet, 
  Settings, 
  Bug, 
  Sparkles 
} from 'lucide-react';

export default function SidebarDock({
  activeTab,
  setActiveTab,
  onOpenExcel,
  onOpenSettings,
  onOpenErrorLog,
  unreadErrorsCount = 0,
  updateInfo = null,
  onOpenUpdateModal
}) {
  const tabs = [
    {
      id: 'tiktok',
      title: 'Đơn TikTok Shop',
      subtitle: 'Đơn hàng, OCR & Giá vốn NVL',
      icon: ShoppingBag,
      activeStyle: 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/40 ring-1 ring-white/25 scale-105',
      hoverStyle: 'hover:text-rose-400 hover:bg-rose-500/10',
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'inventory',
      title: 'Quản Lý Nhập Kho',
      subtitle: 'Chi phí 3 cột & Tổng vốn kho',
      icon: Warehouse,
      activeStyle: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/40 ring-1 ring-white/25 scale-105',
      hoverStyle: 'hover:text-amber-400 hover:bg-amber-500/10',
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'fish_orders',
      title: 'Đơn Bán Cá Cảnh',
      subtitle: 'Bán cá trực tiếp & Lọc theo tháng',
      icon: Fish,
      activeStyle: 'bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/40 ring-1 ring-white/25 scale-105',
      hoverStyle: 'hover:text-cyan-400 hover:bg-cyan-500/10',
      badgeColor: 'bg-cyan-500',
    },
  ];

  return (
    <aside className="fixed left-3.5 top-1/2 -translate-y-1/2 z-40 select-none">
      {/* Floating Glassmorphic Capsule */}
      <nav 
        aria-label="Thanh điều hướng chính" 
        className="flex flex-col items-center gap-3 p-2 bg-slate-900/90 backdrop-blur-2xl border border-slate-750/90 rounded-[28px] shadow-2xl shadow-black/80"
      >
        {/* Main Level-1 Navigation Tabs */}
        <div className="flex flex-col items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <div key={tab.id} className="relative group flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-label={tab.title}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? tab.activeStyle
                      : `text-slate-400 hover:text-white hover:bg-slate-800/90 ${tab.hoverStyle}`
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2] transition-transform duration-200 group-hover:scale-110" />
                  
                  {/* Subtle active pill indicator on left border */}
                  {isActive && (
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-white/80 shadow-sm" />
                  )}
                </button>

                {/* Floating Tooltip to the right */}
                <div className="pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 absolute left-full ml-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl shadow-2xl border border-slate-700/80 whitespace-nowrap z-50 flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${tab.badgeColor} shrink-0`} />
                  <div>
                    <p className="text-xs font-bold leading-tight text-white">{tab.title}</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{tab.subtitle}</p>
                  </div>
                  {/* Arrow pointing back */}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700/80" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Separator Divider */}
        <div className="w-6 h-px bg-slate-800 my-0.5" />

        {/* Utilities: Excel Sync, Settings, Error Logs */}
        <div className="flex flex-col items-center gap-2">
          {/* Open Excel */}
          <div className="relative group flex items-center">
            <button
              type="button"
              onClick={onOpenExcel}
              aria-label="Mở File Excel đồng bộ (4 Sheet)"
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition-all duration-200"
            >
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2] transition-transform group-hover:scale-110" />
            </button>
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 absolute left-full ml-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-emerald-400 rounded-xl shadow-2xl border border-emerald-500/30 whitespace-nowrap z-50 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight text-emerald-300">Mở File Excel</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Đồng bộ tự động 4 Sheet</p>
              </div>
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-emerald-500/30" />
            </div>
          </div>

          {/* Software Update indicator (if available) */}
          {updateInfo?.updateAvailable && (
            <div className="relative group flex items-center">
              <button
                type="button"
                onClick={onOpenUpdateModal}
                aria-label="Có bản cập nhật mới"
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 animate-pulse transition-all duration-200"
              >
                <Sparkles className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 absolute left-full ml-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-amber-300 rounded-xl shadow-2xl border border-amber-500/40 whitespace-nowrap z-50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-xs font-bold leading-tight text-amber-300">Có bản cập nhật mới</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Phiên bản v{updateInfo.latestVersion}</p>
                </div>
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-amber-500/40" />
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="relative group flex items-center">
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Cài đặt hệ thống"
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/90 transition-all duration-200"
            >
              <Settings className="w-5 h-5 stroke-[2.2] transition-transform group-hover:rotate-45" />
            </button>
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 absolute left-full ml-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl shadow-2xl border border-slate-750 whitespace-nowrap z-50 flex items-center gap-2">
              <Settings className="w-4 h-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs font-bold leading-tight text-white">Cài Đặt Hệ Thống</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Cấu hình phí sàn & Gemini API</p>
              </div>
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-750" />
            </div>
          </div>

          {/* Error Log */}
          <div className="relative group flex items-center">
            <button
              type="button"
              onClick={onOpenErrorLog}
              aria-label="Nhật ký báo lỗi hệ thống"
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                unreadErrorsCount > 0
                  ? 'text-rose-400 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 shadow-lg shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/90'
              }`}
            >
              <Bug className="w-5 h-5 stroke-[2.2] transition-transform group-hover:scale-110" />
              {unreadErrorsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold font-mono text-white ring-2 ring-slate-900 animate-pulse">
                  {unreadErrorsCount > 9 ? '9+' : unreadErrorsCount}
                </span>
              )}
            </button>
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 absolute left-full ml-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-rose-300 rounded-xl shadow-2xl border border-rose-500/40 whitespace-nowrap z-50 flex items-center gap-2">
              <Bug className="w-4 h-4 shrink-0 text-rose-400" />
              <div>
                <p className="text-xs font-bold leading-tight text-rose-400">Nhật Ký Lỗi</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {unreadErrorsCount > 0 ? `${unreadErrorsCount} lỗi chưa xem` : 'Hệ thống ổn định'}
                </p>
              </div>
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-rose-500/40" />
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
