import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Fish, 
  User, 
  Phone, 
  Truck, 
  DollarSign, 
  Calendar, 
  FileText,
  Calculator,
  Sparkles
} from 'lucide-react';
import { formatDateVN } from '../utils/dateUtils';

export default function FishOrderModal({
  isOpen,
  onClose,
  initialOrder = null,
  onSave
}) {
  const [formData, setFormData] = useState({
    order_date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    customer_phone: '',
    fish_name: '',
    fish_price: '',
    shipping_fee: '0',
    note: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialOrder) {
      const fishPrice = initialOrder.fish_price !== undefined && initialOrder.fish_price !== null
        ? String(initialOrder.fish_price)
        : String(Math.max(0, (Number(initialOrder.total_amount) || 0) - (Number(initialOrder.shipping_fee) || 0)));

      setFormData({
        id: initialOrder.id,
        order_date: initialOrder.order_date || new Date().toISOString().slice(0, 10),
        customer_name: initialOrder.customer_name || '',
        customer_phone: initialOrder.customer_phone || '',
        fish_name: initialOrder.fish_name || '',
        fish_price: fishPrice,
        shipping_fee: initialOrder.shipping_fee !== undefined && initialOrder.shipping_fee !== null ? String(initialOrder.shipping_fee) : '0',
        note: initialOrder.note || '',
        created_at: initialOrder.created_at,
      });
    } else {
      setFormData({
        order_date: new Date().toISOString().slice(0, 10),
        customer_name: '',
        customer_phone: '',
        fish_name: '',
        fish_price: '',
        shipping_fee: '0',
        note: '',
      });
    }
    setErrors({});
  }, [isOpen, initialOrder]);

  // Real-time calculation: Total Amount = Fish Price + Shipping Fee
  const calculatedTotal = useMemo(() => {
    const fishPriceNum = Number(formData.fish_price) || 0;
    const shippingFeeNum = Number(formData.shipping_fee) || 0;
    return fishPriceNum + shippingFeeNum;
  }, [formData.fish_price, formData.shipping_fee]);

  if (!isOpen) return null;

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const handlePriceChange = (field, rawValue) => {
    // Keep only digits
    const cleaned = rawValue.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, [field]: cleaned }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Vui lòng nhập tên khách hàng';
    }
    if (!formData.fish_name.trim()) {
      newErrors.fish_name = 'Vui lòng nhập tên loại cá hoặc mặt hàng';
    }
    if (!formData.fish_price || Number(formData.fish_price) <= 0) {
      newErrors.fish_price = 'Vui lòng nhập tiền cá hợp lệ (> 0đ)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const fishPrice = Number(formData.fish_price);
    const shippingFee = Number(formData.shipping_fee) || 0;
    const totalAmount = fishPrice + shippingFee;

    onSave({
      ...formData,
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      fish_name: formData.fish_name.trim(),
      fish_price: fishPrice,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      note: formData.note.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Fish className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">
                {initialOrder ? 'Chỉnh Sửa Đơn Cá Cảnh' : 'Tạo Đơn Cá Cảnh Mới'}
              </h3>
              <p className="text-xs text-slate-400">
                Bán trực tiếp ngoài sàn & Tự động cộng tiền cá + ship
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            
            {/* Row 1: Ngày bán (Format DD/MM/YYYY) & Số điện thoại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ngày Bán / Ngày Đặt:</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {formatDateVN(formData.order_date, false)}
                  </span>
                </label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Số Điện Thoại (Tùy chọn):</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="VD: 0987654321"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            {/* Row 2: Tên khách hàng */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Tên Khách Hàng <strong className="text-rose-400">*</strong>:</span>
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => {
                  setFormData({ ...formData, customer_name: e.target.value });
                  if (errors.customer_name) setErrors(prev => ({ ...prev, customer_name: null }));
                }}
                placeholder="VD: Anh Minh (Hà Nội)"
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none placeholder:text-slate-600 transition-colors ${
                  errors.customer_name ? 'border-rose-500 bg-rose-500/5' : 'border-slate-750 focus:border-cyan-400'
                }`}
              />
              {errors.customer_name && (
                <p className="text-rose-400 text-[11px] font-medium mt-1">{errors.customer_name}</p>
              )}
            </div>

            {/* Row 3: Mặt hàng cá / Chi tiết đơn */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <Fish className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mặt Hàng Cá / Chi Tiết Đơn <strong className="text-rose-400">*</strong>:</span>
              </label>
              <input
                type="text"
                value={formData.fish_name}
                onChange={(e) => {
                  setFormData({ ...formData, fish_name: e.target.value });
                  if (errors.fish_name) setErrors(prev => ({ ...prev, fish_name: null }));
                }}
                placeholder="VD: 2 cặp Guppy Full Gold + 1 hộp cám Inve"
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none placeholder:text-slate-600 transition-colors ${
                  errors.fish_name ? 'border-rose-500 bg-rose-500/5' : 'border-slate-750 focus:border-cyan-400'
                }`}
              />
              {errors.fish_name && (
                <p className="text-rose-400 text-[11px] font-medium mt-1">{errors.fish_name}</p>
              )}
            </div>

            {/* Financial Block: Tiền Cá + Tiền Ship = Tự Động Tính Tổng Tiền */}
            <div className="bg-slate-950/80 border border-slate-750 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-bold text-slate-200 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <span>Chi Tiết Thanh Toán</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 stroke-[2.5]" />
                  <span>Tổng tiền tự động tính</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Tiền cá (Required) */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Fish className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tiền Cá: <strong className="text-rose-400">*</strong></span>
                    </span>
                    {formData.fish_price && (
                      <span className="text-[10px] font-mono text-cyan-300">
                        {formatCurrency(formData.fish_price)}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.fish_price ? Number(formData.fish_price).toLocaleString('vi-VN') : ''}
                      onChange={(e) => handlePriceChange('fish_price', e.target.value)}
                      placeholder="VD: 250.000"
                      className={`w-full bg-slate-900 border rounded-xl pl-3 pr-8 py-2.5 text-cyan-300 font-mono font-bold text-sm focus:outline-none placeholder:text-slate-600 transition-colors ${
                        errors.fish_price ? 'border-rose-500 bg-rose-500/5' : 'border-slate-750 focus:border-cyan-400'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₫</span>
                  </div>
                  {errors.fish_price && (
                    <p className="text-rose-400 text-[11px] font-medium mt-1">{errors.fish_price}</p>
                  )}
                </div>

                {/* 2. Tiền ship */}
                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tiền Ship (Vận chuyển):</span>
                    </span>
                    {formData.shipping_fee && Number(formData.shipping_fee) > 0 ? (
                      <span className="text-[10px] font-mono text-amber-300">
                        {formatCurrency(formData.shipping_fee)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">0 ₫ (Miễn phí)</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.shipping_fee && formData.shipping_fee !== '0' ? Number(formData.shipping_fee).toLocaleString('vi-VN') : (formData.shipping_fee === '0' ? '0' : '')}
                      onChange={(e) => handlePriceChange('shipping_fee', e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-750 rounded-xl pl-3 pr-8 py-2.5 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-amber-400 placeholder:text-slate-600 transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₫</span>
                  </div>
                </div>
              </div>

              {/* 3. Tự động tính: Tổng Tiền Của Đơn = Tiền Cá + Tiền Ship */}
              <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Tổng Tiền Đơn (Tiền Cá + Tiền Ship):
                  </span>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    <span className="text-cyan-400 font-bold">{formatCurrency(formData.fish_price || 0)}</span>
                    <span className="mx-1.5 text-slate-500">+</span>
                    <span className="text-amber-400 font-bold">{formatCurrency(formData.shipping_fee || 0)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-black text-emerald-400 font-mono tracking-tight">
                    {formatCurrency(calculatedTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Ghi Chú Đơn Hàng:</span>
              </label>
              <textarea
                rows="2"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="VD: Khách đã chuyển khoản 280k, hẹn giao buổi chiều..."
                className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-slate-600 resize-none placeholder:text-slate-600 transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800 shrink-0">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Tổng thu:</span>
              <strong className="text-emerald-400 font-mono font-bold text-sm">
                {formatCurrency(calculatedTotal)}
              </strong>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save className="w-4 h-4 stroke-[2.2]" />
                <span>{initialOrder ? 'Lưu Thay Đổi' : 'Tạo Đơn Cá Cảnh'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
