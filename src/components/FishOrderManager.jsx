import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fish, 
  PlusCircle, 
  Search, 
  CalendarRange, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Edit3, 
  Trash2, 
  Phone, 
  User, 
  Truck, 
  DollarSign, 
  FileSpreadsheet, 
  RotateCcw,
  ShoppingBag,
  Calculator,
  Sparkles
} from 'lucide-react';
import { 
  getFishOrders, 
  saveFishOrder, 
  deleteFishOrder, 
  sortFishOrdersByDate 
} from '../services/dbService';
import { formatDateVN, formatMonthYearVN } from '../utils/dateUtils';
import FishOrderModal from './FishOrderModal';

export default function FishOrderManager({ onOpenExcel }) {
  const [fishOrders, setFishOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, 7days, thisMonth, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activePeriodLabel, setActivePeriodLabel] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');

  // Month Picker Popup State
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [showAdvancedDateInputs, setShowAdvancedDateInputs] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Load orders and listen for database changes
  const loadOrders = () => {
    setFishOrders(getFishOrders());
  };

  useEffect(() => {
    loadOrders();
    const handleDbChange = () => loadOrders();
    window.addEventListener('database-changed', handleDbChange);
    return () => window.removeEventListener('database-changed', handleDbChange);
  }, []);

  // Filter & Sort Logic
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

    const list = fishOrders.filter(order => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const cust = (order.customer_name || '').toLowerCase();
        const phone = (order.customer_phone || '').toLowerCase();
        const fishName = (order.fish_name || '').toLowerCase();
        const note = (order.note || '').toLowerCase();
        if (!cust.includes(q) && !phone.includes(q) && !fishName.includes(q) && !note.includes(q)) {
          return false;
        }
      }

      // 2. Date Filter
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

    return sortFishOrdersByDate(list, sortDirection);
  }, [fishOrders, searchQuery, dateFilter, customStartDate, customEndDate, sortDirection]);

  // Financial Computations
  const totalFishPrice = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const p = o.fish_price !== undefined ? Number(o.fish_price) : Math.max(0, (Number(o.total_amount) || 0) - (Number(o.shipping_fee) || 0));
      return sum + (p || 0);
    }, 0);
  }, [filteredOrders]);

  const totalShipping = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.shipping_fee) || 0), 0);
  }, [filteredOrders]);

  // Quy tắc nghiệp vụ: Tổng doanh thu shop chỉ tính Tiền Cá, tiền ship do khách tự trả shipper
  const totalRevenue = totalFishPrice;

  const totalCustomerPaid = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const p = o.fish_price !== undefined ? Number(o.fish_price) : Math.max(0, (Number(o.total_amount) || 0) - (Number(o.shipping_fee) || 0));
      const s = Number(o.shipping_fee) || 0;
      return sum + (Number(o.total_amount) || (p + s));
    }, 0);
  }, [filteredOrders]);

  const avgFishOrderValue = useMemo(() => {
    if (!filteredOrders.length) return 0;
    return Math.round(totalFishPrice / filteredOrders.length);
  }, [filteredOrders, totalFishPrice]);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const handleSelectQuickFilter = (type) => {
    setDateFilter(type);
    setShowAdvancedDateInputs(false);
    setIsMonthPickerOpen(false);

    if (type === 'all') {
      setActivePeriodLabel('');
      setCustomStartDate('');
      setCustomEndDate('');
    } else if (type === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      setActivePeriodLabel(`Hôm nay (${formatDateVN(todayStr, false)})`);
      setCustomStartDate('');
      setCustomEndDate('');
    } else if (type === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setActivePeriodLabel(`Hôm qua (${formatDateVN(yStr, false)})`);
      setCustomStartDate('');
      setCustomEndDate('');
    } else if (type === '7days') {
      setActivePeriodLabel('7 ngày gần nhất');
      setCustomStartDate('');
      setCustomEndDate('');
    } else if (type === 'thisMonth') {
      const d = new Date();
      setActivePeriodLabel(formatMonthYearVN(d.getFullYear(), d.getMonth() + 1));
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleSelectSpecificMonth = (monthIndex) => {
    const monthNum = monthIndex + 1;
    const mmStr = String(monthNum).padStart(2, '0');
    const start = `${pickerYear}-${mmStr}-01`;
    const lastDay = new Date(pickerYear, monthNum, 0).getDate();
    const end = `${pickerYear}-${mmStr}-${String(lastDay).padStart(2, '0')}`;

    setDateFilter('custom');
    setCustomStartDate(start);
    setCustomEndDate(end);
    setActivePeriodLabel(formatMonthYearVN(pickerYear, monthNum));
    setIsMonthPickerOpen(false);
    setShowAdvancedDateInputs(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setActivePeriodLabel('');
    setShowAdvancedDateInputs(false);
    setIsMonthPickerOpen(false);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa đơn cá của "${name || 'khách hàng này'}" không?`)) {
      deleteFishOrder(id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-750 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/25">
            <Fish className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Quản Lý Đơn Cá Cảnh</h2>
              <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                Bán Trực Tiếp
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi đơn bán cá, tiền ship, lọc theo tháng & Tự động đồng bộ file Excel 4 Sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {onOpenExcel && (
            <button
              type="button"
              onClick={onOpenExcel}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Mở file Excel tổng hợp"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Mở Excel (Sheet 4)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingOrder(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.2]" />
            <span>Tạo Đơn Cá Mới</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Số đơn */}
        <div className="bg-slate-900/90 border border-slate-750 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Số Lượng Đơn Cá</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono tracking-tight">{filteredOrders.length}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-slate-800 flex justify-between items-center">
            <span>Theo bộ lọc</span>
            <span className="text-slate-300 font-medium">Tổng: {fishOrders.length} đơn</span>
          </div>
        </div>

        {/* Card 2: Tiền Ship Khách Tự Trả */}
        <div className="bg-slate-900/90 border border-slate-750 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tiền Ship (Khách Tự Trả)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
              {formatMoney(totalShipping)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-slate-800 flex justify-between items-center">
            <span className="text-amber-400/80 font-medium font-mono">
              {filteredOrders.filter(o => Number(o.shipping_fee) > 0).length} đơn có ship
            </span>
            <span className="text-slate-500 text-[11px]">Tách riêng shipper</span>
          </div>
        </div>

        {/* Card 3: Doanh Thu TB / Đơn */}
        <div className="bg-slate-900/90 border border-slate-750 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Doanh Thu TB / Đơn</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Calculator className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-cyan-300 font-mono tracking-tight">
              {formatMoney(avgFishOrderValue)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-slate-800 flex justify-between items-center">
            <span className="text-cyan-400/80 font-medium">Tiền cá trung bình</span>
            <span className="text-slate-500 text-[11px]">Không gồm ship</span>
          </div>
        </div>

        {/* Card 4: TỔNG DOANH THU (Chỉ tính tiền cá) */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-lg shadow-emerald-500/10 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tổng Doanh Thu</span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/40">
              <DollarSign className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {formatMoney(totalRevenue)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-emerald-500/20 flex justify-between items-center">
            <span className="text-emerald-300 font-bold font-mono">Chỉ tính tiền cá</span>
            <span className="text-slate-400 text-[11px]">Khách tự trả ship riêng</span>
          </div>
        </div>

      </div>

      {/* Filter Toolbar & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-750 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khách hàng, số điện thoại, tên cá, ghi chú..."
              className="w-full bg-slate-950 border border-slate-750 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Range Pills */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleSelectQuickFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                dateFilter === 'all'
                  ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/25'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              Tất cả
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickFilter('today')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                dateFilter === 'today'
                  ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/25'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              Hôm nay
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickFilter('yesterday')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                dateFilter === 'yesterday'
                  ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/25'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              Hôm qua
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickFilter('7days')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                dateFilter === '7days'
                  ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/25'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              7 ngày
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickFilter('thisMonth')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                dateFilter === 'thisMonth'
                  ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/25'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              Tháng này
            </button>

            {/* Month Picker Popup Trigger Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all border ${
                  dateFilter === 'custom' && activePeriodLabel.startsWith('Tháng')
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border-slate-700 hover:text-white'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {dateFilter === 'custom' && activePeriodLabel.startsWith('Tháng')
                    ? activePeriodLabel
                    : 'Chọn Tháng'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Month Picker Dropdown Popup */}
              {isMonthPickerOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 bg-slate-900 border border-slate-750 rounded-2xl p-4 shadow-2xl w-72 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y - 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-white text-sm">Năm {pickerYear}</span>
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y + 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 12 Months Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const mNum = i + 1;
                      const label = `Tháng ${mNum}`;
                      const isCurrentActive = 
                        dateFilter === 'custom' && 
                        activePeriodLabel === formatMonthYearVN(pickerYear, mNum);

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSpecificMonth(i)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                            isCurrentActive
                              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Reset Filters Button */}
            {(searchQuery || dateFilter !== 'all' || customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Đặt lại</span>
              </button>
            )}
          </div>

        </div>

        {/* Active Filter Badge */}
        {activePeriodLabel && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">Đang lọc theo:</span>
            <span className="inline-flex items-center gap-1.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 px-2.5 py-0.5 rounded-full font-semibold font-mono">
              <span>{activePeriodLabel}</span>
              <button
                type="button"
                onClick={() => handleSelectQuickFilter('all')}
                className="text-cyan-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Spreadsheet Orders Data Table */}
      <div className="bg-slate-900/90 border border-slate-750 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-12 text-center text-slate-500">STT</th>
                <th className="py-3 px-3 min-w-[120px]">Ngày Đặt (DD/MM)</th>
                <th className="py-3 px-3 min-w-[170px]">Khách Hàng</th>
                <th className="py-3 px-3 min-w-[130px]">Số Điện Thoại</th>
                <th className="py-3 px-3 min-w-[220px]">Mặt Hàng Cá / Chi Tiết</th>
                <th className="py-3 px-3 min-w-[130px] text-right text-cyan-400">Tiền Cá</th>
                <th className="py-3 px-3 min-w-[110px] text-right text-amber-300">Tiền Ship</th>
                <th className="py-3 px-3 min-w-[140px] text-right text-emerald-400">Tổng Tiền Đơn</th>
                <th className="py-3 px-3 min-w-[180px]">Ghi Chú</th>
                <th className="py-3 px-2 w-20 text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Fish className="w-10 h-10 opacity-30 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-400">Không tìm thấy đơn cá cảnh nào</p>
                      <p className="text-xs text-slate-500">Hãy thử đổi từ khóa tìm kiếm hoặc tạo đơn bán cá mới</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrder(null);
                          setIsModalOpen(true);
                        }}
                        className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Tạo đơn cá đầu tiên</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord, idx) => {
                  const fishPrice = ord.fish_price !== undefined ? Number(ord.fish_price) : Math.max(0, (Number(ord.total_amount) || 0) - (Number(ord.shipping_fee) || 0));
                  const shippingFee = Number(ord.shipping_fee) || 0;
                  const total = Number(ord.total_amount) || (fishPrice + shippingFee);

                  return (
                    <tr 
                      key={ord.id}
                      className={`hover:bg-slate-800/70 transition-colors group ${
                        idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      {/* Ngày đặt (Strict Day/Month format: DD/MM/YYYY) */}
                      <td className="py-2.5 px-3 text-slate-200 font-mono whitespace-nowrap font-medium">
                        {formatDateVN(ord.order_date, false)}
                      </td>

                      {/* Khách hàng */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{ord.customer_name || 'Khách lẻ'}</span>
                        </div>
                      </td>

                      {/* SĐT */}
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {ord.customer_phone ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{ord.customer_phone}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Loại cá / Chi tiết */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-cyan-200 line-clamp-1" title={ord.fish_name}>
                          {ord.fish_name || 'Chưa ghi tên cá'}
                        </div>
                      </td>

                      {/* Tiền cá */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300">
                        {formatMoney(fishPrice)}
                      </td>

                      {/* Tiền ship */}
                      <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                        {shippingFee > 0 ? (
                          formatMoney(shippingFee)
                        ) : (
                          <span className="text-[11px] text-slate-500 font-normal">Miễn phí</span>
                        )}
                      </td>

                      {/* Tổng tiền đơn (Tự động tính = Tiền cá + Ship) */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400" title={`Tiền cá: ${formatMoney(fishPrice)} + Ship: ${formatMoney(shippingFee)}`}>
                        {formatMoney(total)}
                      </td>

                      {/* Ghi chú */}
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[200px]" title={ord.note}>
                        {ord.note || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOrder(ord);
                              setIsModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-750 transition-colors"
                            title="Chỉnh sửa đơn cá"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ord.id, ord.customer_name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Xóa đơn cá"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Summary Row */}
            {filteredOrders.length > 0 && (
              <tfoot className="bg-slate-950 border-t-2 border-slate-750 font-bold text-xs">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-slate-300 uppercase tracking-wider">
                    Tổng Cộng ({filteredOrders.length} Đơn):
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-cyan-300 text-sm" title="Tổng Tiền Cá (= Doanh Thu Shop)">
                    {formatMoney(totalFishPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-300" title="Tổng Tiền Ship (Khách tự trả shipper)">
                    {formatMoney(totalShipping)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-200" title="Tổng Tiền Đơn Khách Thanh Toán (Cá + Ship)">
                    {formatMoney(totalCustomerPaid)}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-right text-slate-400 font-normal">
                    <span className="text-emerald-400 font-bold block">Doanh thu = {formatMoney(totalRevenue)}</span>
                    <span className="text-slate-500 text-[11px] block">(Chỉ tính tiền cá, không gồm ship)</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Fish Order Modal (Create / Edit) */}
      <FishOrderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(null);
        }}
        initialOrder={editingOrder}
        onSave={(data) => {
          saveFishOrder(data);
          loadOrders();
        }}
      />

    </div>
  );
}
