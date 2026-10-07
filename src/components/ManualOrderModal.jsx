import React, { useState } from 'react';
import { PlusCircle, X, Save, Package, Calendar, User, Phone, DollarSign } from 'lucide-react';
import { generateUUID } from '../services/dbService';

export default function ManualOrderModal({
  isOpen,
  onClose,
  products = [],
  onCreateOrder
}) {
  const [formData, setFormData] = useState({
    tracking_code: '',
    order_id: '',
    order_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    selectedProductId: '',
    product_name: '',
    sku: '',
    quantity: 1,
    customer_name: '',
    customer_phone: '',
    is_settled: false,
    settled_amount: '',
    note: '',
  });

  if (!isOpen) return null;

  const handleProductSelect = (prodId) => {
    if (!prodId) {
      setFormData(prev => ({
        ...prev,
        selectedProductId: '',
        product_name: '',
        sku: '',
      }));
      return;
    }

    const prod = products.find(p => p.id === prodId);
    if (prod) {
      const firstSku = Array.isArray(prod.skus) && prod.skus.length > 0 ? prod.skus[0] : null;
      setFormData(prev => ({
        ...prev,
        selectedProductId: prodId,
        product_name: prod.name,
        sku: firstSku ? firstSku.sku : (prod.sku || ''),
      }));
    }
  };

  const handleSkuSelect = (skuCode) => {
    setFormData(prev => ({
      ...prev,
      sku: skuCode,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.tracking_code.trim()) {
      alert('Vui lòng nhập Mã Vận Đơn');
      return;
    }

    const matchedProd = products.find(p => p.id === formData.selectedProductId);
    const matchedSku = (matchedProd?.skus || []).find(s => s.sku === formData.sku) || matchedProd?.skus?.[0];

    onCreateOrder({
      id: generateUUID(),
      tracking_code: formData.tracking_code.trim(),
      order_id: formData.order_id.trim(),
      order_date: formData.order_date,
      product_id: matchedProd ? matchedProd.id : null,
      sku_id: matchedSku ? matchedSku.id : null,
      product_name: formData.product_name || (matchedProd ? matchedProd.name : ''),
      sku: formData.sku || (matchedSku ? matchedSku.sku : ''),
      quantity: Number(formData.quantity) || 1,
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      is_settled: formData.is_settled,
      settled_amount: formData.settled_amount !== '' ? Number(formData.settled_amount) : null,
      note: formData.note.trim(),
    }, matchedProd);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Tạo Đơn Hàng Thủ Công</h3>
              <p className="text-xs text-slate-400">Nhập thông tin đơn khi không dùng tính năng quét ảnh</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-rose-400 block mb-1">Mã Vận Đơn *</label>
              <input
                type="text"
                required
                value={formData.tracking_code}
                onChange={(e) => setFormData({ ...formData, tracking_code: e.target.value })}
                placeholder="VD: 862521283460"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Order ID TikTok (Phụ)</label>
              <input
                type="text"
                value={formData.order_id}
                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                placeholder="VD: 586374703921268324"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Thời Gian Đặt Hàng</label>
            <input
              type="text"
              value={formData.order_date}
              onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Product mapping with 2 separate dropdowns: Product & SKU & Quantity in 1 row */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Dropdown 1: Chọn Sản Phẩm Kho (Span 6) */}
              <div className="sm:col-span-6">
                <label className="text-xs font-semibold text-amber-300 block mb-1">
                  1. Chọn Sản Phẩm Kho
                </label>
                <select
                  value={formData.selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Chọn sản phẩm trong kho --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Phân Loại SKU (Span 4) */}
              <div className="sm:col-span-4">
                <label className="text-xs font-semibold text-rose-400 block mb-1">
                  2. Phân Loại SKU
                </label>
                {(() => {
                  const selProd = products.find(p => p.id === formData.selectedProductId);
                  const skuList = Array.isArray(selProd?.skus) && selProd.skus.length > 0 ? selProd.skus : [];
                  if (skuList.length > 0) {
                    return (
                      <select
                        value={formData.sku}
                        onChange={(e) => handleSkuSelect(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                      >
                        {skuList.map(s => (
                          <option key={s.id || s.sku} value={s.sku}>
                            {s.sku} (Vốn: {Number(s.cogs_total || 0).toLocaleString()}₫)
                          </option>
                        ))}
                      </select>
                    );
                  }
                  return (
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="VD: 10g"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-rose-400 font-bold focus:outline-none focus:border-rose-500"
                    />
                  );
                })()}
              </div>

              {/* Quantity (Span 2) */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Số Lượng</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold text-center focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cyan-400 block mb-1">Tên Khách Hàng</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-cyan-400 block mb-1">Số Điện Thoại</label>
              <input
                type="text"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="VD: 098*****97"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Settlement & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tiền Tất Toán (Có thể âm)</label>
              <input
                type="number"
                value={formData.settled_amount}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  settled_amount: e.target.value,
                  is_settled: e.target.value !== '' ? true : formData.is_settled
                })}
                placeholder="VD: 85000 hoặc -30000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Ghi Chú</label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="VD: đơn hoàn, khách hẹn giao lại..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-medium px-5 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Tạo Đơn Hàng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
