import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  X, 
  Trash2, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { errorLogService } from '../services/errorLogService';

export default function ErrorLogModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    if (!isOpen) return;

    // Load initial logs
    setLogs(errorLogService.getErrors());
    errorLogService.markAllAsRead();

    // Subscribe to live log updates
    const unsubscribe = errorLogService.subscribe((_, updatedList) => {
      setLogs(updatedList || errorLogService.getErrors());
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyAll = async () => {
    const text = errorLogService.exportAsText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (e) {
      alert('Chưa thể sao chép vào bộ nhớ đệm.');
    }
  };

  const handleCopySingle = async (item) => {
    const text = `[${item.formattedTime}] ${item.type}: ${item.message}\n${item.stack || ''}\n${item.componentStack || ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {}
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá toàn bộ lịch sử báo lỗi không?')) {
      errorLogService.clearErrors();
      setLogs([]);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'ALL' && log.type !== filterType) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchMsg = (log.message || '').toLowerCase().includes(q);
      const matchStack = (log.stack || '').toLowerCase().includes(q);
      const matchType = (log.type || '').toLowerCase().includes(q);
      return matchMsg || matchStack || matchType;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Nhật Ký Báo Lỗi Hệ Thống</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                  logs.length > 0 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {logs.length} lỗi
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tự động bắt toàn bộ các sự cố và crash giao diện để bạn dễ dàng tra cứu và gửi báo lỗi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm nội dung lỗi..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">Tất cả loại lỗi</option>
              <option value="REACT_CRASH">Crash Giao Diện (React)</option>
              <option value="UNCAUGHT_ERROR">Lỗi JavaScript</option>
              <option value="UNHANDLED_PROMISE">Lỗi Bất Đồng Bộ (Promise)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={logs.length === 0}
              onClick={handleCopyAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                copiedAll
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Đã Sao Chép Toàn Bộ' : 'Sao Chép Tất Cả'}</span>
            </button>

            <button
              type="button"
              disabled={logs.length === 0}
              onClick={handleClearAll}
              className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xoá Nhật Ký</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Hệ Thống Đang Ổn Định</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {logs.length === 0 
                    ? 'Không có lỗi crash hay lỗi runtime nào được ghi nhận.' 
                    : 'Không tìm thấy lỗi khớp với từ khoá tìm kiếm.'}
                </p>
              </div>
            </div>
          ) : (
            filteredLogs.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              const isCopied = copiedId === item.id;

              const isReactCrash = item.type === 'REACT_CRASH';
              const badgeColor = isReactCrash 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40';

              return (
                <div
                  key={item.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border ${badgeColor}`}>
                        {item.type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.formattedTime || item.timestamp}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopySingle(item)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Sao chép lỗi này"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {(item.stack || item.componentStack) && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                          title={isExpanded ? 'Thu gọn' : 'Xem chi tiết stack trace'}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="text-xs font-mono font-semibold text-rose-300 break-words bg-rose-950/30 border border-rose-900/40 rounded-xl px-3 py-2">
                    {item.message}
                  </div>

                  {/* Expandable Technical Details */}
                  {isExpanded && (item.stack || item.componentStack) && (
                    <div className="mt-2 pt-2 border-t border-slate-850 font-mono text-[11px] text-slate-400 space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 overflow-x-auto">
                      {item.stack && (
                        <div>
                          <span className="text-amber-400 font-bold block mb-1">Stack Trace:</span>
                          <pre className="whitespace-pre-wrap break-all text-slate-300 text-[10px] leading-relaxed">
                            {item.stack}
                          </pre>
                        </div>
                      )}
                      {item.componentStack && (
                        <div className="pt-2 border-t border-slate-800">
                          <span className="text-cyan-400 font-bold block mb-1">React Component Tree:</span>
                          <pre className="whitespace-pre-wrap break-all text-slate-300 text-[10px] leading-relaxed">
                            {item.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải Lại Trang</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
