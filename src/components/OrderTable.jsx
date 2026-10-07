import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter, 
  Trash2, 
  User, 
  Check, 
  X, 
  Info, 
  Sparkles,
  ArrowUpDown,
  Tag,
  PhoneCall
} from 'lucide-react';

export default function OrderTable({ 
  orders = [], 
  onUpdateOrder, 
  onDeleteOrder, 
  onSelectCustomer 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, 7days, thisMonth, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, settled, pending, returned

  // Month & Year Picker Popup State
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [activePeriodLabel, setActivePeriodLabel] = useState('');
  const [showAdvancedDateInputs, setShowAdvancedDateInputs] = useState(false);
  
  // Temporary state for inline editing cells
  const [editingSettled, setEditingSettled] = useState({}); // { [orderId]: value }
  const [editingNote, setEditingNote] = useState({});       // { [orderId]: value }

  // Filter logic
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);

    const currentYearMonth = todayStr.slice(0, 7);

    return orders.filter(order => {
      // 1. Text Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = (order.tracking_code || '').toLowerCase();
        const orderId = (order.order_id || '').toLowerCase();
        const custName = (order.customer_name || '').toLowerCase();
        const custPhone = (order.customer_phone || '').toLowerCase();
        const prodName = (order.product_name || '').toLowerCase();
        const sku = (order.sku || '').toLowerCase();
        const note = (order.note || '').toLowerCase();

        const matchesSearch = (
          tracking.includes(q) ||
          orderId.includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q) ||
          prodName.includes(q) ||
          sku.includes(q) ||
          note.includes(q)
        );
        if (!matchesSearch) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'settled' && !order.is_settled) return false;
      if (statusFilter === 'pending' && order.is_settled) return false;
      if (statusFilter === 'returned') {
        const isRet = (order.note && /hoàn|hủy|tra lai|trả lại|bom/i.test(order.note)) ||
                      (order.settled_amount !== null && order.settled_amount < 0);
        if (!isRet) return false;
      }

      // 3. Date Filter
      const ordDate = (order.order_date || '').slice(0, 10);
      if (dateFilter === 'today' && ordDate !== todayStr) return false;
      if (dateFilter === 'yesterday' && ordDate !== yesterdayStr) return false;
      if (dateFilter === '7days' && ordDate < sevenDaysStr) return false;
      if (dateFilter === 'thisMonth' && !ordDate.startsWith(currentYearMonth)) return false;
      if (dateFilter === 'custom') {
        if (customStartDate && ordDate < customStartDate) return false;
        if (customEndDate && ordDate > customEndDate) return false;
      }

      return true;
    });
  }, [orders, searchQuery, dateFilter, customStartDate, customEndDate, statusFilter]);

  // Handlers for Month & Year Quick Filtering
  const handleSelectMonth = (monthNumber, year = pickerYear) => {
    const mm = String(monthNumber).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateFilter('custom');
    setActivePeriodLabel(`Tháng ${monthNumber}/${year}`);
    setIsMonthPickerOpen(false);
  };

  const handleSelectQuarter = (quarter, year = pickerYear) => {
    let startMonth = 1;
    let endMonth = 3;
    if (quarter === 2) { startMonth = 4; endMonth = 6; }
    if (quarter === 3) { startMonth = 7; endMonth = 9; }
    if (quarter === 4) { startMonth = 10; endMonth = 12; }

    const start = `${year}-${String(startMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    const end = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateFilter('custom');
    setActivePeriodLabel(`Quý ${quarter}/${year}`);
    setIsMonthPickerOpen(false);
  };

  const handleSelectFullYear = (year = pickerYear) => {
    setCustomStartDate(`${year}-01-01`);
    setCustomEndDate(`${year}-12-31`);
    setDateFilter('custom');
    setActivePeriodLabel(`Cả Năm ${year}`);
    setIsMonthPickerOpen(false);
  };

  const handleResetDateFilter = () => {
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setActivePeriodLabel('');
  };

  // Handle inline settled amount commit
  const handleSettledAmountBlur = (orderId, originalValue) => {
    if (editingSettled[orderId] !== undefined) {
      const valStr = editingSettled[orderId].trim();
      const numVal = valStr === '' ? null : Number(valStr);
      if (numVal !== originalValue) {
        onUpdateOrder(orderId, {
          settled_amount: numVal,
          is_settled: numVal !== null ? true : false,
        });
      }
      setEditingSettled(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Handle inline note commit
  const handleNoteBlur = (orderId, originalValue) => {
    if (editingNote[orderId] !== undefined) {
      const val = editingNote[orderId].trim();
      if (val !== (originalValue || '')) {
        onUpdateOrder(orderId, { note: val });
      }
      setEditingNote(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
      {/* Table Toolbar & Filters */}
      <div className="p-4 border-b border-slate-700/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã vận đơn, khách hàng, SĐT, SKU, ghi chú..."
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-rose-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="settled">Đã tất toán</option>
            <option value="pending">Chưa tất toán</option>
            <option value="returned">Đơn hoàn / Số âm</option>
          </select>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                dateFilter === 'all' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                dateFilter === 'today' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                dateFilter === 'yesterday' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hôm qua
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                dateFilter === '7days' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => { setDateFilter('thisMonth'); setActivePeriodLabel(''); }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                dateFilter === 'thisMonth' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tháng này
            </button>
          </div>

          {/* Quick Month & Year Picker Button */}
          <button
            onClick={() => setIsMonthPickerOpen(true)}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all flex items-center gap-1.5 border shadow-sm ${
              activePeriodLabel || (dateFilter === 'custom' && customStartDate)
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-rose-400" />
            <span>{activePeriodLabel || 'Chọn Tháng / Năm'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Active Period Badge with quick Clear (X) */}
          {activePeriodLabel && (
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-xl text-xs font-mono">
              <span>{customStartDate.slice(8, 10)}/{customStartDate.slice(5, 7)} - {customEndDate.slice(8, 10)}/{customEndDate.slice(5, 7)}</span>
              <button 
                onClick={handleResetDateFilter}
                className="hover:text-white hover:bg-rose-500/20 rounded p-0.5"
                title="Bỏ lọc ngày này"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spreadsheet Data Grid */}
      <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-700 text-slate-300 font-semibold tracking-wider uppercase">
            <tr>
              <th className="py-3 px-3 w-12 text-center">STT</th>
              <th className="py-3 px-3 min-w-[170px]">Mã Vận Đơn</th>
              <th className="py-3 px-3 min-w-[130px]">Thời Gian</th>
              <th className="py-3 px-3 min-w-[200px]">Sản Phẩm & SKU</th>
              <th className="py-3 px-2 w-12 text-center">SL</th>
              <th className="py-3 px-3 min-w-[170px]">Khách Hàng & SĐT</th>
              <th className="py-3 px-3 min-w-[110px] text-right">Vốn NVL</th>
              <th className="py-3 px-3 w-28 text-center">Tất Toán?</th>
              <th className="py-3 px-3 min-w-[140px] text-right">Tiền Tất Toán</th>
              <th className="py-3 px-3 min-w-[130px] text-right">Lợi Nhuận</th>
              <th className="py-3 px-3 min-w-[180px]">Ghi Chú</th>
              <th className="py-3 px-2 w-12 text-center">Xoá</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 opacity-40 text-slate-400" />
                    <p className="text-sm font-medium">Không tìm thấy đơn hàng nào</p>
                    <p className="text-xs text-slate-500">Hãy nhấn "Quét Ảnh Đơn" hoặc "Tạo Đơn Tay" để thêm đơn mới.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, idx) => {
                const qty = order.quantity || 1;
                const cogsUnit = order.cogs_snapshot || 0;
                const totalCogs = cogsUnit * qty;
                const isSettled = Boolean(order.is_settled);
                const settledAmount = order.settled_amount;
                const actualProfit = settledAmount !== null && settledAmount !== undefined
                  ? Number(settledAmount) - totalCogs
                  : null;

                const isReturn = (
                  (order.note && /hoàn|hủy|tra lai|trả lại|bom/i.test(order.note)) ||
                  (settledAmount !== null && settledAmount < 0)
                );

                return (
                  <tr 
                    key={order.id} 
                    className={`hover:bg-slate-750/50 transition-colors group ${
                      isReturn ? 'bg-rose-950/15' : idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'
                    }`}
                  >
                    {/* STT */}
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>

                    {/* Tracking Code & Order ID */}
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-white tracking-wide text-xs">
                        {order.tracking_code || '-'}
                      </div>
                      {order.order_id && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]" title={order.order_id}>
                          ID: {order.order_id}
                        </div>
                      )}
                    </td>

                    {/* Order Date */}
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {order.order_date || '-'}
                    </td>

                    {/* Product Name & SKU */}
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-200 line-clamp-1 max-w-[220px]" title={order.product_name}>
                        {order.product_name || 'Chưa đặt tên'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {order.sku && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {order.sku}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {cogsUnit > 0 ? `${cogsUnit.toLocaleString('vi-VN')}₫/sp` : 'Chưa có vốn'}
                        </span>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-2 text-center font-bold text-slate-200">
                      {qty}
                    </td>

                    {/* Customer & Phone with Intelligent Profile click */}
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onSelectCustomer(order.customer_name, order.customer_phone)}
                        className="group/cust text-left flex items-start gap-1.5 hover:text-cyan-400 transition-colors"
                        title="Bấm để kiểm tra chi tiết khách hàng và phân tích mẫu SĐT"
                      >
                        <User className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0 group-hover/cust:scale-110 transition-transform" />
                        <div>
                          <div className="font-semibold text-slate-200 group-hover/cust:text-cyan-300 group-hover/cust:underline underline-offset-2 flex items-center gap-1">
                            <span>{order.customer_name || 'Khách lẻ'}</span>
                            <Sparkles className="w-3 h-3 text-cyan-400 opacity-60" />
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {order.customer_phone || 'Không có SĐT'}
                          </div>
                        </div>
                      </button>
                    </td>

                    {/* Total COGS (Snapshot) */}
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                      {formatMoney(totalCogs)}
                    </td>

                    {/* Settled Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onUpdateOrder(order.id, { is_settled: !isSettled })}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isSettled
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/30'
                            : 'bg-slate-900 border-slate-700 text-transparent hover:border-slate-500'
                        }`}
                        title={isSettled ? 'Đã tất toán' : 'Bấm để đánh dấu đã tất toán'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>

                    {/* Settled Amount (Inline Editable, can be negative) */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            editingSettled[order.id] !== undefined
                              ? editingSettled[order.id]
                              : (settledAmount !== null && settledAmount !== undefined ? String(settledAmount) : '')
                          }
                          onChange={(e) => {
                            setEditingSettled(prev => ({ ...prev, [order.id]: e.target.value }));
                          }}
                          onBlur={() => handleSettledAmountBlur(order.id, settledAmount)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                          }}
                          placeholder="Nhập tiền..."
                          className={`w-28 text-right font-mono text-xs px-2 py-1 rounded-lg border focus:outline-none transition-colors ${
                            settledAmount !== null && settledAmount < 0
                              ? 'bg-rose-950/40 border-rose-700/60 text-rose-300 font-bold'
                              : isSettled
                              ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300 font-bold'
                              : 'bg-slate-900/60 border-slate-700 text-slate-300 focus:border-rose-500'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Actual Profit */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {actualProfit !== null ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          actualProfit >= 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {formatMoney(actualProfit)}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Note (Inline Editable) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={
                          editingNote[order.id] !== undefined
                            ? editingNote[order.id]
                            : (order.note || '')
                        }
                        onChange={(e) => {
                          setEditingNote(prev => ({ ...prev, [order.id]: e.target.value }));
                        }}
                        onBlur={() => handleNoteBlur(order.id, order.note)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                        }}
                        placeholder="Ghi chú (đơn hoàn, vỡ...)"
                        className={`w-full text-xs px-2 py-1 rounded-lg border bg-slate-900/60 focus:outline-none transition-colors ${
                          isReturn
                            ? 'border-rose-500/50 text-rose-300 font-medium'
                            : 'border-slate-700/80 text-slate-300 focus:border-rose-500'
                        }`}
                      />
                    </td>

                    {/* Delete button */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xoá đơn hàng ${order.tracking_code || order.id}?`)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-700/50 transition-colors"
                        title="Xoá đơn hàng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-700/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span>Hiển thị <strong className="text-white">{filteredOrders.length}</strong> / {orders.length} đơn</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span>Tổng vốn: <strong className="text-amber-300">{formatMoney(filteredOrders.reduce((sum, o) => sum + ((o.cogs_snapshot || 0) * (o.quantity || 1)), 0))}</strong></span>
          <span>Tất toán: <strong className="text-emerald-300">{formatMoney(filteredOrders.reduce((sum, o) => sum + (o.settled_amount ? Number(o.settled_amount) : 0), 0))}</strong></span>
        </div>
      </div>

      {/* Month & Year Filter Modal */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header (Fixed) */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Lọc Theo Tháng & Năm</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsMonthPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Year Selector with 2 Arrows */}
              <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-2.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPickerYear(y => y - 1)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center gap-1.5 text-xs font-semibold"
                  title="Năm trước"
                >
                  <ChevronLeft className="w-5 h-5 text-rose-400" />
                  <span className="hidden sm:inline">Năm trước</span>
                </button>
                <div className="text-center px-4">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Năm</div>
                  <div className="text-2xl font-black text-white font-mono tracking-wide">{pickerYear}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerYear(y => y + 1)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center gap-1.5 text-xs font-semibold"
                  title="Năm sau"
                >
                  <span className="hidden sm:inline">Năm sau</span>
                  <ChevronRight className="w-5 h-5 text-rose-400" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2.5">
                  Các tháng trong năm {pickerYear}:
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                    const isCurrentMonthNow = new Date().getMonth() + 1 === m && new Date().getFullYear() === pickerYear;
                    const isSelected = activePeriodLabel === `Tháng ${m}/${pickerYear}`;

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMonth(m, pickerYear)}
                        className={`py-2.5 sm:py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                          isSelected
                            ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30 ring-1 ring-rose-400'
                            : isCurrentMonthNow
                            ? 'bg-slate-800 border-rose-500/40 text-rose-300 hover:bg-slate-700'
                            : 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">Tháng {m}</span>
                        {isCurrentMonthNow && (
                          <span className="text-[9px] text-rose-400 font-normal">Hiện tại</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectFullYear(pickerYear)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 py-2 rounded-xl border border-cyan-500/30 text-xs font-semibold transition-colors"
                >
                  Cả Năm {pickerYear}
                </button>
                <button
                  type="button"
                  onClick={handleResetDateFilter}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 rounded-xl border border-slate-700 text-xs font-medium transition-colors"
                >
                  Xem Tất Cả
                </button>
              </div>
            </div>

            {/* Custom Day Range Toggle */}
            <div className="border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowAdvancedDateInputs(prev => !prev)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-between w-full"
              >
                <span>Khoảng ngày cụ thể (Từ ngày - Đến ngày)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedDateInputs ? 'rotate-180' : ''}`} />
              </button>

              {showAdvancedDateInputs && (
                <div className="mt-2.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Từ ngày:</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setDateFilter('custom');
                          setActivePeriodLabel('Tùy chỉnh ngày');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Đến ngày:</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setDateFilter('custom');
                          setActivePeriodLabel('Tùy chỉnh ngày');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
