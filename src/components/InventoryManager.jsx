import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Warehouse, 
  ShoppingBag, 
  Fish, 
  Box, 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  DollarSign, 
  Check, 
  Sparkles,
  Layers,
  ArrowDown,
  CheckCircle2,
  Clock,
  Calculator,
  X,
  MousePointerClick
} from 'lucide-react';
import { 
  getInventoryExpenses, 
  saveInventoryExpenses, 
  getInventoryTotals,
  generateUUID 
} from '../services/dbService';

export default function InventoryManager({ onOpenExcel }) {
  const [expenses, setExpenses] = useState({
    tiktok_shop: [],
    fish: [],
    supplies: [],
  });

  const [savedBadge, setSavedBadge] = useState(false);
  const nameInputRefs = useRef({});

  // Selection / Highlight (Bôi đen) state for live Excel-like sum
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragCategory, setDragCategory] = useState(null);
  const [dragStartIndex, setDragStartIndex] = useState(null);

  // Load data on mount and listen to changes
  useEffect(() => {
    const data = getInventoryExpenses();
    setExpenses(data);

    const handleDbChange = () => {
      setExpenses(getInventoryExpenses());
    };
    window.addEventListener('database-changed', handleDbChange);
    return () => window.removeEventListener('database-changed', handleDbChange);
  }, []);

  // Window listeners for mouse up & Escape key to stop drag / clear selection
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute live financial totals
  const totals = getInventoryTotals(expenses);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const handleUpdateItem = (category, id, field, val) => {
    const currentList = expenses[category] || [];
    const updatedList = currentList.map(it => {
      if (it.id !== id) return it;
      if (field === 'amount') {
        const num = val === '' ? '' : Number(val.replace(/[^0-9]/g, ''));
        return { ...it, [field]: num };
      }
      return { ...it, [field]: val };
    });

    const newExpenses = { ...expenses, [category]: updatedList };
    setExpenses(newExpenses);
    saveInventoryExpenses(newExpenses);
    showSavedFeedback();
  };

  const handleToggleSettled = (category, id) => {
    const currentList = expenses[category] || [];
    const updatedList = currentList.map(it => {
      if (it.id !== id) return it;
      return { ...it, is_settled: !it.is_settled };
    });

    const newExpenses = { ...expenses, [category]: updatedList };
    setExpenses(newExpenses);
    saveInventoryExpenses(newExpenses);
    showSavedFeedback();
  };

  const handleAddItem = (category, focusName = true) => {
    const newId = generateUUID();
    const newItem = {
      id: newId,
      name: '',
      amount: '',
      is_settled: false,
    };
    const currentList = expenses[category] || [];
    const newExpenses = {
      ...expenses,
      [category]: [newItem, ...currentList], // Insert new row at the TOP!
    };
    setExpenses(newExpenses);
    saveInventoryExpenses(newExpenses);
    showSavedFeedback();

    if (focusName) {
      setTimeout(() => {
        if (nameInputRefs.current[newId]) {
          nameInputRefs.current[newId].focus();
        }
      }, 50);
    }
  };

  const handleRemoveItem = (category, id) => {
    const currentList = expenses[category] || [];
    const newExpenses = {
      ...expenses,
      [category]: currentList.filter(it => it.id !== id),
    };
    setExpenses(newExpenses);
    saveInventoryExpenses(newExpenses);
    showSavedFeedback();

    if (selectedIds.has(id)) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const showSavedFeedback = () => {
    setSavedBadge(true);
    setTimeout(() => {
      setSavedBadge(false);
    }, 1500);
  };

  // Selection Logic (Drag-to-select & Click-to-select for live calculation)
  const handleStartSelect = (category, index, id, e) => {
    // If clicking directly into input text or delete button, do not initiate drag selection
    if (e.target.tagName === 'INPUT' || e.target.closest('button')) {
      return;
    }

    setIsDragging(true);
    setDragCategory(category);
    setDragStartIndex(index);

    if (e.shiftKey && dragStartIndex !== null && dragCategory === category) {
      // Range select
      const list = expenses[category] || [];
      const minIdx = Math.min(dragStartIndex, index);
      const maxIdx = Math.max(dragStartIndex, index);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (let i = minIdx; i <= maxIdx; i++) {
          if (list[i]) next.add(list[i].id);
        }
        return next;
      });
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle single item
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      // Normal click select
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const handleMouseEnterRow = (category, index, id) => {
    if (!isDragging || dragCategory !== category || dragStartIndex === null) return;

    const list = expenses[category] || [];
    const minIdx = Math.min(dragStartIndex, index);
    const maxIdx = Math.max(dragStartIndex, index);

    setSelectedIds(prev => {
      const next = new Set(prev);
      for (let i = minIdx; i <= maxIdx; i++) {
        if (list[i]) next.add(list[i].id);
      }
      return next;
    });
  };

  const handleSelectEntireColumn = (category) => {
    const list = expenses[category] || [];
    const allIds = list.map(it => it.id);
    const allSelected = allIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allIds.forEach(id => next.delete(id));
      } else {
        allIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Compute live calculations for selected items
  const selectedStats = useMemo(() => {
    if (selectedIds.size === 0) return null;

    const allItems = [
      ...(expenses.tiktok_shop || []),
      ...(expenses.fish || []),
      ...(expenses.supplies || []),
    ];

    const selectedList = allItems.filter(it => selectedIds.has(it.id));
    const totalAmount = selectedList.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const settledAmount = selectedList.filter(it => it.is_settled).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const pendingAmount = totalAmount - settledAmount;
    const avgAmount = selectedList.length > 0 ? Math.round(totalAmount / selectedList.length) : 0;

    return {
      count: selectedList.length,
      totalAmount,
      settledAmount,
      pendingAmount,
      avgAmount,
    };
  }, [selectedIds, expenses]);

  const categoriesConfig = [
    {
      key: 'tiktok_shop',
      title: 'Vốn Nhập TikTok Shop',
      subtitle: 'Bao bì, thùng carton, tem in, phụ liệu đóng đơn',
      icon: ShoppingBag,
      accentColor: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      bgHeader: 'from-rose-500/15 via-rose-500/5 to-transparent',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      btnColor: 'hover:bg-rose-500/20 text-rose-400 border-rose-500/30',
      placeholder: 'VD: Thùng carton 15x10, Giấy in A6...',
    },
    {
      key: 'fish',
      title: 'Vốn Nhập Cá Cảnh',
      subtitle: 'Cá giống, bầy cá bột, các lô cá nhập về nuôi bán',
      icon: Fish,
      accentColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      bgHeader: 'from-cyan-500/15 via-cyan-500/5 to-transparent',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      btnColor: 'hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      placeholder: 'VD: 10 cặp Guppy Dumbo, 50 Betta...',
    },
    {
      key: 'supplies',
      title: 'Vốn Vật Tư Khác',
      subtitle: 'Muối sinh học, vi sinh, thuốc cá, sủi oxy, phụ kiện',
      icon: Box,
      accentColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      bgHeader: 'from-amber-500/15 via-amber-500/5 to-transparent',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      btnColor: 'hover:bg-amber-500/20 text-amber-400 border-amber-500/30',
      placeholder: 'VD: Vi sinh Extra Bio, Muối hột 25kg...',
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-750 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/25">
            <Warehouse className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Quản Lý Nhập Kho & Chi Phí</h2>
              {savedBadge && (
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Đã lưu tự động</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hạch toán vốn 3 cột, theo dõi trạng thái tất toán & Bôi đen số tiền để tính tổng nhanh như Excel.
            </p>
          </div>
        </div>

        {onOpenExcel && (
          <button
            type="button"
            onClick={onOpenExcel}
            className="self-start sm:self-auto flex items-center gap-2 bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Mở Excel (Sheet 3)</span>
          </button>
        )}
      </div>

      {/* 4 Financial Stat Cards (Proper p-5 padding & settlement indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: TikTok Shop */}
        <div className="bg-slate-900/90 border border-slate-750 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Vốn TikTok Shop</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-rose-400 font-mono tracking-tight">
              {formatMoney(totals.totalTiktok)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-slate-800 flex justify-between items-center font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Đã TT: {formatMoney(totals.tiktokSettled)}</span>
            </span>
            <span className="text-amber-400/90 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Chờ: {formatMoney(totals.tiktokPending)}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Fish */}
        <div className="bg-slate-900/90 border border-slate-750 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Vốn Nhập Cá Cảnh</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Fish className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-cyan-400 font-mono tracking-tight">
              {formatMoney(totals.totalFish)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-slate-800 flex justify-between items-center font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Đã TT: {formatMoney(totals.fishSettled)}</span>
            </span>
            <span className="text-amber-400/90 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Chờ: {formatMoney(totals.fishPending)}</span>
            </span>
          </div>
        </div>

        {/* Card 3: Supplies */}
        <div className="bg-slate-900/90 border border-slate-750 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Vốn Vật Tư Khác</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Box className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
              {formatMoney(totals.totalSupplies)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-slate-800 flex justify-between items-center font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Đã TT: {formatMoney(totals.suppliesSettled)}</span>
            </span>
            <span className="text-amber-400/90 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Chờ: {formatMoney(totals.suppliesPending)}</span>
            </span>
          </div>
        </div>

        {/* Card 4: GRAND TOTAL */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-lg shadow-emerald-500/10 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tổng Vốn Toàn Kho</span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/40">
              <DollarSign className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {formatMoney(totals.grandTotal)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 pt-2.5 border-t border-emerald-500/20 flex justify-between items-center font-mono">
            <span className="text-emerald-300 font-medium">Đã trả: {formatMoney(totals.grandSettled)}</span>
            <span className="text-amber-400/90 font-medium">Còn nợ: {formatMoney(totals.grandPending)}</span>
          </div>
        </div>

      </div>

      {/* 3-Column Excel-like Spreadsheet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {categoriesConfig.map((col) => {
          const items = expenses[col.key] || [];
          const colTotal = items.reduce((sum, it) => sum + (Number(it?.amount) || 0), 0);
          const colSettled = items.filter(it => it.is_settled).reduce((sum, it) => sum + (Number(it?.amount) || 0), 0);
          const colPending = colTotal - colSettled;
          const IconComp = col.icon;

          return (
            <div 
              key={col.key}
              className="bg-slate-900/90 border border-slate-750 rounded-2xl shadow-xl overflow-hidden flex flex-col backdrop-blur-md"
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-slate-800 bg-gradient-to-r ${col.bgHeader} flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center">
                    <IconComp className={`w-4.5 h-4.5 ${col.accentColor}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm tracking-tight">{col.title}</h3>
                    <p className="text-[10px] text-slate-400">{col.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Select Entire Column Quick Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectEntireColumn(col.key)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                    title="Bôi đen toàn bộ cột này để tính tổng"
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Table Headers */}
              <div className="grid grid-cols-12 px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="col-span-1 text-center text-slate-500">#</span>
                <span className="col-span-5">Mặt Hàng / Chi Phí</span>
                <span className="col-span-3 text-right">Số Tiền</span>
                <span className="col-span-2 text-center" title="Tất toán (Đã thanh toán chưa?)">TT</span>
                <span className="col-span-1 text-center"></span>
              </div>

              {/* Add Row Button at the TOP */}
              <div className="p-2 bg-slate-950/60 border-b border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleAddItem(col.key)}
                  className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-750 hover:border-slate-500 hover:bg-slate-800/60 text-slate-400 hover:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Dòng Mới Vào Đầu Cột (Enter)</span>
                </button>
              </div>

              {/* Spreadsheet Rows */}
              <div className="divide-y divide-slate-800/80 max-h-[480px] overflow-y-auto select-none">
                {items.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <p className="text-xs">Chưa có khoản chi nào</p>
                    <button
                      type="button"
                      onClick={() => handleAddItem(col.key)}
                      className={`mt-2 text-xs font-semibold hover:underline ${col.accentColor} flex items-center justify-center gap-1 mx-auto`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm dòng đầu tiên</span>
                    </button>
                  </div>
                ) : (
                  items.map((it, idx) => {
                    const isSelected = selectedIds.has(it.id);

                    return (
                      <div 
                        key={it.id} 
                        onMouseDown={(e) => handleStartSelect(col.key, idx, it.id, e)}
                        onMouseEnter={() => handleMouseEnterRow(col.key, idx, it.id)}
                        className={`grid grid-cols-12 items-center px-3 py-1.5 transition-colors group text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50 border-l-4 border-l-cyan-400'
                            : 'hover:bg-slate-800/50 border-l-4 border-l-transparent'
                        }`}
                        title="Bấm hoặc kéo chuột để bôi đen tính tổng nhiều dòng"
                      >
                        {/* Row Index */}
                        <span className="col-span-1 text-center text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </span>

                        {/* Item Name Input */}
                        <div className="col-span-5 pr-2">
                          <input
                            ref={(el) => { nameInputRefs.current[it.id] = el; }}
                            type="text"
                            value={it.name || ''}
                            onChange={(e) => handleUpdateItem(col.key, it.id, 'name', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddItem(col.key);
                              }
                            }}
                            placeholder={col.placeholder}
                            className="w-full bg-transparent border-0 border-b border-transparent focus:border-slate-500 px-1.5 py-1 text-slate-200 font-medium placeholder:text-slate-600 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* Item Amount Input */}
                        <div className="col-span-3 text-right pr-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={it.amount !== '' && it.amount !== undefined ? Number(it.amount).toLocaleString('vi-VN') : ''}
                            onChange={(e) => handleUpdateItem(col.key, it.id, 'amount', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddItem(col.key);
                              }
                            }}
                            placeholder="0 ₫"
                            className={`w-full bg-transparent border-0 border-b border-transparent focus:border-slate-500 px-1 py-1 text-right font-mono font-bold placeholder:text-slate-600 focus:outline-none transition-colors ${
                              isSelected ? 'text-cyan-300 font-black' : 'text-white'
                            }`}
                          />
                        </div>

                        {/* Settlement Checkbox (Tất Toán hay Chưa) */}
                        <div className="col-span-2 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={Boolean(it.is_settled)}
                            onChange={() => handleToggleSettled(col.key, it.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded cursor-pointer accent-emerald-500 bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 transition-all"
                            title={it.is_settled ? 'Đã tất toán (Bỏ tích để chuyển thành Chưa)' : 'Chưa tất toán (Tích chọn để xác nhận Đã tất toán)'}
                          />
                        </div>

                        {/* Delete Action (visible on hover) */}
                        <div className="col-span-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(col.key, it.id);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column Summary Footer */}
              <div className="p-3 bg-slate-950 border-t-2 border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px] block">
                    Tổng {col.title.replace('Vốn Nhập ', '')}:
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>Đã TT: {formatMoney(colSettled)}</span>
                  </div>
                </div>
                <span className={`font-mono font-black text-sm ${col.accentColor}`}>
                  {formatMoney(colTotal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Excel-style Live Summary Bar (Hiển thị khi bôi đen các dòng) */}
      {selectedStats && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-2xl border border-cyan-500/50 rounded-2xl px-6 py-3.5 shadow-2xl shadow-black/90 flex flex-wrap items-center gap-5 text-xs text-slate-200 animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Badge icon */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center">
              <Calculator className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider block">
                Đang Bôi Đen (Excel Sum)
              </span>
              <strong className="text-white text-xs font-mono font-bold">
                {selectedStats.count} dòng đã chọn
              </strong>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          {/* Tổng tiền bôi đen */}
          <div>
            <span className="text-[10px] text-slate-400 block">Tổng Tiền Đã Bôi Đen:</span>
            <span className="text-base font-black text-emerald-400 font-mono tracking-tight">
              {formatMoney(selectedStats.totalAmount)}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          {/* Đã tất toán & Chưa */}
          <div className="hidden md:flex flex-col text-[11px] font-mono">
            <span className="text-emerald-400">
              Đã tất toán: <strong>{formatMoney(selectedStats.settledAmount)}</strong>
            </span>
            <span className="text-amber-400">
              Chưa tất toán: <strong>{formatMoney(selectedStats.pendingAmount)}</strong>
            </span>
          </div>

          <div className="h-6 w-px bg-slate-700 hidden md:block" />

          {/* Trung bình */}
          <div className="hidden lg:block">
            <span className="text-[10px] text-slate-400 block">Trung Bình:</span>
            <span className="text-xs font-bold text-cyan-300 font-mono">
              {formatMoney(selectedStats.avgAmount)}
            </span>
          </div>

          {/* Nút hủy bôi đen */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold transition-all ml-auto"
            title="Bỏ chọn (Phím Escape)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Bỏ bôi đen (Esc)</span>
          </button>
        </div>
      )}

    </div>
  );
}
