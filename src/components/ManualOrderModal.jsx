import React, { useState } from 'react';
import { PlusCircle, X, Save, Package, Calendar, User, Phone, DollarSign, Plus, Trash2 } from 'lucide-react';
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
    items: [
      {
        id: generateUUID(),
        selectedProductId: '',
        product_name: '',
        sku: '',
        quantity: 1,
      }
    ],
    customer_name: '',
    customer_phone: '',
    is_settled: false,
    settled_amount: '',
    note: '',
  });

  if (!isOpen) return null;

  // Add a new product/SKU row to order
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: generateUUID(),
          selectedProductId: '',
          product_name: '',
          sku: '',
          quantity: 1,
        }
      ]
    }));
  };

  // Remove a product/SKU row from order
  const handleRemoveItem = (itemId) => {
    if (formData.items.length <= 1) return; // Keep at least 1 item
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== itemId)
    }));
  };

  // Handle product selection for a specific row
  const handleItemProductSelect = (itemId, prodId) => {
    const prod = products.find(p => p.id === prodId);
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id !== itemId) return it;
        if (!prod) {
          return {
            ...it,
            selectedProductId: '',
            product_name: '',
            sku: '',
          };
        }
        const firstSku = Array.isArray(prod.skus) && prod.skus.length > 0 ? prod.skus[0] : null;
        return {
          ...it,
          selectedProductId: prodId,
          product_name: prod.name,
          sku: firstSku ? firstSku.sku : (prod.sku || ''),
        };
      })
    }));
  };

  // Handle SKU change for a specific row
  const handleItemSkuChange = (itemId, skuCode) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === itemId ? { ...it, sku: skuCode } : it)
    }));
  };

  // Handle quantity change for a specific row
  const handleItemQtyChange = (itemId, qty) => {
    const val = Math.max(1, parseInt(qty, 10) || 1);
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === itemId ? { ...it, quantity: val } : it)
    }));
  };

  // Calculate estimated totals
  let totalEstimatedCogs = 0;
  let totalItemCount = 0;
  formData.items.forEach(it => {
    const qty = Math.max(1, Number(it.quantity) || 1);
    totalItemCount += qty;
    const prod = products.find(p => p.id === it.selectedProductId);
    const skuVar = (prod?.skus || []).find(s => s.sku === it.sku) || prod?.skus?.[0];
    const cogs = skuVar ? (skuVar.cogs_total || 0) : (prod?.cogs_total || 0);
    totalEstimatedCogs += cogs * qty;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.tracking_code.trim()) {
      alert('Vui lòng nhập Mã Vận Đơn');
      return;
    }

    const processedItems = formData.items.map(it => {
      const matchedProd = products.find(p => p.id === it.selectedProductId);
      const matchedSku = (matchedProd?.skus || []).find(s => s.sku === it.sku) || matchedProd?.skus?.[0];
      return {
        id: it.id || generateUUID(),
        product_id: matchedProd ? matchedProd.id : null,
        sku_id: matchedSku ? matchedSku.id : null,
        product_name: it.product_name || (matchedProd ? matchedProd.name : ''),
        sku: it.sku || (matchedSku ? matchedSku.sku : ''),
        quantity: Math.max(1, Number(it.quantity) || 1),
      };
    });

    const primaryProd = products.find(p => p.id === processedItems[0]?.product_id);

    onCreateOrder({
      id: generateUUID(),
      tracking_code: formData.tracking_code.trim(),
      order_id: formData.order_id.trim(),
      order_date: formData.order_date,
      items: processedItems,
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      is_settled: formData.is_settled,
      settled_amount: formData.settled_amount !== '' ? Number(formData.settled_amount) : null,
      note: formData.note.trim(),
    }, primaryProd);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Tạo Đơn Hàng Thủ Công</h3>
              <p className="text-xs text-slate-400">Hỗ trợ đơn 1 sản phẩm hoặc nhiều sản phẩm / SKU khác nhau</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Tracking Code & Order ID */}
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

          {/* Multi-product & Multi-SKU Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Danh Sách Sản Phẩm & SKU Trong Đơn ({formData.items.length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-colors font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm sản phẩm</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const selProd = products.find(p => p.id === item.selectedProductId);
                const skuList = Array.isArray(selProd?.skus) && selProd.skus.length > 0 ? selProd.skus : [];

                return (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-slate-850 border border-slate-750 hover:border-slate-650 rounded-2xl transition-all"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center font-mono text-[10px] text-amber-400 border border-slate-700">
                          #{index + 1}
                        </span>
                        <span>Mặt hàng {index + 1}</span>
                      </span>

                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
                          title="Xóa mặt hàng này khỏi đơn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      {/* Dropdown 1: Chọn Sản Phẩm Kho (Span 6) */}
                      <div className="sm:col-span-6">
                        <label className="text-[11px] font-semibold text-amber-300 block mb-1">
                          Sản phẩm kho
                        </label>
                        <select
                          value={item.selectedProductId}
                          onChange={(e) => handleItemProductSelect(item.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 truncate"
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown 2: Phân Loại SKU (Span 4) */}
                      <div className="sm:col-span-4">
                        <label className="text-[11px] font-semibold text-rose-400 block mb-1">
                          Phân loại SKU
                        </label>
                        {skuList.length > 0 ? (
                          <select
                            value={item.sku}
                            onChange={(e) => handleItemSkuChange(item.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                          >
                            {skuList.map(s => (
                              <option key={s.id || s.sku} value={s.sku}>
                                {s.sku} ({Number(s.cogs_total || 0).toLocaleString()}₫)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleItemSkuChange(item.id, e.target.value)}
                            placeholder="VD: 10g"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono text-rose-400 font-bold focus:outline-none focus:border-rose-500"
                          />
                        )}
                      </div>

                      {/* Quantity (Span 2) */}
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1 text-center">
                          Số lượng
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemQtyChange(item.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-bold text-center focus:outline-none focus:border-rose-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Estimated Order Summary Banner */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Tổng cộng: <strong className="text-white font-mono">{formData.items.length}</strong> mặt hàng (<strong className="text-white font-mono">{totalItemCount}</strong> món)
              </span>
              <span className="text-slate-400">
                Ước tính vốn NVL: <strong className="text-amber-300 font-mono text-sm">{totalEstimatedCogs.toLocaleString('vi-VN')} ₫</strong>
              </span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
