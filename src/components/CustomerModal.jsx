import React, { useMemo, useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  ShoppingBag, 
  TrendingUp, 
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { analyzeCustomerIdentity } from '../services/phoneMatcher';

export default function CustomerModal({
  isOpen,
  onClose,
  customerName = '',
  customerPhone = '',
  allOrders = []
}) {
  const [activeTab, setActiveTab] = useState('all'); // all, case1, case2, case3

  // Deep customer & phone pattern analysis
  const analysis = useMemo(() => {
    if (!isOpen || !customerName) return null;
    return analyzeCustomerIdentity(customerName, customerPhone, allOrders);
  }, [isOpen, customerName, customerPhone, allOrders]);

  if (!isOpen || !analysis) return null;

  const {
    resolvedPhones,
    phoneVariations,
    totalOrdersCount,
    returnCount,
    returnRatePercent,
    totalSpent,
    settledSpent,
    customerOrders,
    cases
  } = analysis;

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' ₫';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-2xl shadow-lg shadow-cyan-500/10">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{customerName}</h3>
                <span className="text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Hồ sơ khách hàng</span>
                </span>
              </div>

              {/* Phones List & Resolved Indicator */}
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                  <Phone className="w-3 h-3 text-cyan-400" />
                  <span>SĐT ghi nhận: {customerPhone || 'Không có'}</span>
                </div>

                {resolvedPhones.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã giải mã SĐT đầy đủ: <strong>{resolvedPhones.join(', ')}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Customer Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Tổng đơn đã mua</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">{totalOrdersCount} đơn</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Đã tất toán</span>
              <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">{formatMoney(settledSpent)}</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Đơn hoàn / bom</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${returnCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {returnCount} đơn ({returnRatePercent}%)
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400 block">Mức độ uy tín</span>
              <span className={`text-sm font-bold mt-1 block ${
                returnRatePercent > 30 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {returnRatePercent > 30 ? '⚠️ Tỷ lệ hoàn cao' : '✅ Khách hàng tin cậy'}
              </span>
            </div>
          </div>

          {/* Identity Resolution Cases Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Kết quả Phân Tích & Đối Soát SĐT Đa Chiều</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Case 1: Match */}
              <button
                onClick={() => setActiveTab('case1')}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  activeTab === 'case1'
                    ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Case 1: Khớp Chuẩn</span>
                  </span>
                  <span className="font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">
                    {cases.case1_matchingOrders.length} đơn
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Cùng tên khách & khớp pattern SĐT (đầu/đuôi/số che).
                </p>
              </button>

              {/* Case 2: Same Name Different Phone */}
              <button
                onClick={() => setActiveTab('case2')}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  activeTab === 'case2'
                    ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/50'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Case 2: Cùng Tên Khác SĐT</span>
                  </span>
                  <span className="font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">
                    {cases.case2_sameNameDifferentPhone.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Có đơn trùng tên nhưng mẫu SĐT khác hẳn (nguy cơ 2 người khác nhau).
                </p>
              </button>

              {/* Case 3: Same Phone Different Name */}
              <button
                onClick={() => setActiveTab('case3')}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  activeTab === 'case3'
                    ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/50'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Case 3: Cùng SĐT Khác Tên</span>
                  </span>
                  <span className="font-mono bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full text-[10px]">
                    {cases.case3_samePhoneDifferentName.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  SĐT này từng đặt dưới tên người nhận khác (nhận hộ / đổi nick).
                </p>
              </button>
            </div>
          </div>

          {/* Detailed Lists based on active tab */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                {activeTab === 'case2'
                  ? 'Danh sách đơn cùng tên nhưng khác SĐT'
                  : activeTab === 'case3'
                  ? 'Danh sách đơn khác tên nhưng dùng chung SĐT'
                  : 'Lịch sử tất cả đơn hàng của khách hàng này'}
              </h5>
              <button 
                onClick={() => setActiveTab('all')}
                className={`text-xs ${activeTab === 'all' ? 'text-cyan-400 font-semibold underline' : 'text-slate-400 hover:text-white'}`}
              >
                Xem tất cả ({customerOrders.length})
              </button>
            </div>

            {/* Case 3 special view */}
            {activeTab === 'case3' ? (
              cases.case3_samePhoneDifferentName.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-800 text-xs">
                  Không tìm thấy đơn hàng của người nhận khác sử dụng số điện thoại này.
                </div>
              ) : (
                <div className="space-y-2">
                  {cases.case3_samePhoneDifferentName.map((c, i) => (
                    <div key={i} className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-300">{c.customerName}</span>
                          <span className="text-slate-400 font-mono">({c.phone})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Đơn: <span className="font-mono text-slate-300">{c.trackingCode}</span> • Ngày: {c.date}
                        </div>
                      </div>
                      <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        {c.matchDetail}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Standard Orders Table */
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 border-b border-slate-700 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Mã Vận Đơn</th>
                      <th className="py-2.5 px-3">Ngày Đặt</th>
                      <th className="py-2.5 px-3">Sản Phẩm & SKU</th>
                      <th className="py-2.5 px-2 text-center">SL</th>
                      <th className="py-2.5 px-3 text-right">Tất Toán</th>
                      <th className="py-2.5 px-3">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-xs">
                    {(activeTab === 'case1' ? cases.case1_matchingOrders : customerOrders).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-750/40 transition-colors">
                        <td className="py-2.5 px-3 text-white font-bold">{ord.tracking_code || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-400">{ord.order_date || '-'}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="text-slate-200 line-clamp-1">{ord.product_name}</span>
                          {ord.sku && <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded mr-1">{ord.sku}</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-200">{ord.quantity || 1}</td>
                        <td className="py-2.5 px-3 text-right">
                          {ord.settled_amount !== null && ord.settled_amount !== undefined ? (
                            <span className={ord.settled_amount >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {formatMoney(ord.settled_amount)}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-sans">Chưa</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px] truncate max-w-[150px]">
                          {ord.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
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
