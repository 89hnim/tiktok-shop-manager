import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Copy, 
  Tag, 
  Layers 
} from 'lucide-react';
import { generateUUID, computeSkuMetrics } from '../services/dbService';

export default function ProductModal({
  isOpen,
  onClose,
  initialProduct = null,
  prefilledSku = '',
  defaultFeePercent = 5.0,
  defaultFixedFee = 3000,
  onSaveProduct,
  onSavedSuccess,
}) {
  const [productData, setProductData] = useState(null);
  const [activeSkuIndex, setActiveSkuIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProductData(null);
      return;
    }

    const feeP = Number(initialProduct?.tiktok_fee_percent ?? defaultFeePercent);
    const feeF = Number(initialProduct?.tiktok_fixed_fee ?? defaultFixedFee);

    if (initialProduct && initialProduct.id) {
      // Editing existing product
      let skus = [];
      if (Array.isArray(initialProduct.skus) && initialProduct.skus.length > 0) {
        skus = initialProduct.skus.map(s => ({
          ...s,
          components: (s.components || []).map(c => ({ ...c })),
        }));
      } else {
        skus = [computeSkuMetrics({
          id: generateUUID(),
          sku: initialProduct.sku || 'Mặc định',
          name: initialProduct.name || 'Mặc định',
          expected_price: initialProduct.expected_price || 0,
          components: (initialProduct.components || []).map(c => ({ ...c })),
        }, feeP, feeF)];
      }

      let targetIndex = 0;
      // If a prefilled SKU was requested and doesn't exist yet, automatically append it!
      if (prefilledSku && prefilledSku.trim()) {
        const cleanSku = prefilledSku.trim();
        const existingIdx = skus.findIndex(s => (s.sku || '').toLowerCase() === cleanSku.toLowerCase());
        if (existingIdx >= 0) {
          targetIndex = existingIdx;
        } else {
          // Pre-populate components from the first SKU if available for convenient duplication
          const templateSku = skus[0];
          const clonedComps = templateSku && Array.isArray(templateSku.components) && templateSku.components.length > 0
            ? templateSku.components.map(c => ({ id: generateUUID(), name: c.name, cost: c.cost }))
            : [{ id: generateUUID(), name: '', cost: '' }];

          const newSku = computeSkuMetrics({
            id: generateUUID(),
            sku: cleanSku,
            name: cleanSku,
            expected_price: templateSku ? templateSku.expected_price : '',
            components: clonedComps,
          }, feeP, feeF);

          skus.push(newSku);
          targetIndex = skus.length - 1;
        }
      }

      setProductData({
        ...initialProduct,
        tiktok_fee_percent: feeP,
        tiktok_fixed_fee: feeF,
        skus,
      });
      setActiveSkuIndex(targetIndex);
    } else {
      // Creating new product
      const targetSku = (prefilledSku && prefilledSku.trim()) ? prefilledSku.trim() : (initialProduct?.sku || '');
      const initialSku = computeSkuMetrics({
        id: generateUUID(),
        sku: targetSku,
        name: targetSku,
        expected_price: '',
        components: [
          { id: generateUUID(), name: '', cost: '' }
        ],
      }, feeP, feeF);

      setProductData({
        id: '',
        name: initialProduct?.name || '',
        tiktok_fee_percent: feeP,
        tiktok_fixed_fee: feeF,
        skus: [initialSku],
      });
      setActiveSkuIndex(0);
    }
  }, [isOpen, initialProduct, prefilledSku, defaultFeePercent, defaultFixedFee]);

  if (!isOpen || !productData) return null;

  // Active SKU
  const activeSku = productData.skus?.[activeSkuIndex] || productData.skus?.[0];

  // SKU Management inside modal
  const handleAddSku = () => {
    const feeP = Number(productData.tiktok_fee_percent || 5.0);
    const feeF = Number(productData.tiktok_fixed_fee || 3000);

    const newSku = computeSkuMetrics({
      id: generateUUID(),
      sku: '',
      name: '',
      expected_price: '',
      components: [
        { id: generateUUID(), name: '', cost: '' }
      ],
    }, feeP, feeF);

    setProductData(prev => ({
      ...prev,
      skus: [...(prev.skus || []), newSku],
    }));
    setActiveSkuIndex(productData.skus.length);
  };

  const handleDuplicateSku = (indexToDuplicate) => {
    if (!productData.skus || !productData.skus[indexToDuplicate]) return;
    const source = productData.skus[indexToDuplicate];
    const feeP = Number(productData.tiktok_fee_percent || 5.0);
    const feeF = Number(productData.tiktok_fixed_fee || 3000);

    const clonedComponents = (source.components || []).map(c => ({
      id: generateUUID(),
      name: c.name,
      cost: c.cost,
    }));

    const duplicatedSku = computeSkuMetrics({
      id: generateUUID(),
      sku: `${source.sku || 'SKU'}-Copy`,
      name: `${source.name || ''} (Bản sao)`,
      expected_price: source.expected_price,
      components: clonedComponents,
    }, feeP, feeF);

    setProductData(prev => ({
      ...prev,
      skus: [...prev.skus, duplicatedSku],
    }));
    setActiveSkuIndex(productData.skus.length);
  };

  const handleDeleteSku = (indexToDelete) => {
    if (productData.skus.length <= 1) {
      alert('Sản phẩm phải có ít nhất 1 phân loại SKU');
      return;
    }
    setProductData(prev => ({
      ...prev,
      skus: prev.skus.filter((_, i) => i !== indexToDelete),
    }));
    setActiveSkuIndex(Math.max(0, indexToDelete - 1));
  };

  const handleUpdateActiveSkuField = (field, val) => {
    setProductData(prev => {
      const nextSkus = [...prev.skus];
      nextSkus[activeSkuIndex] = {
        ...nextSkus[activeSkuIndex],
        [field]: val,
      };
      return { ...prev, skus: nextSkus };
    });
  };

  const handleAddCompToActiveSku = () => {
    setProductData(prev => {
      const nextSkus = [...prev.skus];
      const cur = nextSkus[activeSkuIndex];
      cur.components = [
        ...(cur.components || []),
        { id: generateUUID(), name: '', cost: '' },
      ];
      return { ...prev, skus: nextSkus };
    });
  };

  const handleUpdateCompInActiveSku = (cIdx, field, val) => {
    setProductData(prev => {
      const nextSkus = [...prev.skus];
      const cur = nextSkus[activeSkuIndex];
      const nextComps = [...cur.components];
      nextComps[cIdx] = { ...nextComps[cIdx], [field]: val };
      cur.components = nextComps;
      return { ...prev, skus: nextSkus };
    });
  };

  const handleDeleteCompInActiveSku = (cIdx) => {
    setProductData(prev => {
      const nextSkus = [...prev.skus];
      const cur = nextSkus[activeSkuIndex];
      cur.components = cur.components.filter((_, i) => i !== cIdx);
      return { ...prev, skus: nextSkus };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productData.name.trim()) {
      alert('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!productData.skus || productData.skus.length === 0) {
      alert('Sản phẩm phải có ít nhất 1 phân loại SKU');
      return;
    }
    for (const s of productData.skus) {
      if (!s.sku || !s.sku.trim()) {
        alert('Vui lòng điền mã SKU cho tất cả các phân loại');
        return;
      }
    }

    const feeP = Number(productData.tiktok_fee_percent || 5.0);
    const feeF = Number(productData.tiktok_fixed_fee || 3000);

    const computedSkus = productData.skus.map(s => {
      const cleanedComps = (s.components || [])
        .filter(c => (c.name || '').trim() || Number(c.cost) > 0)
        .map(c => ({
          id: c.id || generateUUID(),
          name: (c.name || '').trim() || 'Chi phí linh kiện',
          cost: Number(c.cost) || 0,
        }));

      return computeSkuMetrics({
        ...s,
        sku: s.sku.trim(),
        name: (s.name || s.sku).trim(),
        expected_price: Number(s.expected_price) || 0,
        components: cleanedComps,
      }, feeP, feeF);
    });

    const payload = {
      ...productData,
      name: productData.name.trim(),
      tiktok_fee_percent: feeP,
      tiktok_fixed_fee: feeF,
      skus: computedSkus,
    };

    let saved = null;
    if (onSaveProduct) {
      try {
        saved = onSaveProduct(payload);
      } catch (err) {
        console.error('Error saving product:', err);
      }
    }

    const curActiveSku = computedSkus[activeSkuIndex] || computedSkus[0];
    if (onSavedSuccess) {
      onSavedSuccess(saved || payload, curActiveSku);
    }

    onClose();
  };

  // Metrics for active SKU in UI
  const curCogsTotal = (activeSku?.components || []).reduce((s, c) => s + (Number(c.cost) || 0), 0);
  const curExpectedPrice = Number(activeSku?.expected_price) || 0;
  const curFeePct = Number(productData.tiktok_fee_percent || 5.0);
  const curFixFee = Number(productData.tiktok_fixed_fee || 3000);
  const curPlatFee = Math.round((curExpectedPrice * curFeePct) / 100 + curFixFee);
  const curTotalCost = curCogsTotal + curPlatFee;
  const curEstProfit = curExpectedPrice - curTotalCost;
  const curMargin = curExpectedPrice > 0 ? Math.round((curEstProfit / curExpectedPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden min-h-0 my-auto animate-in zoom-in-95 duration-150">
        {/* Header (Fixed at top) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {productData.id ? 'Chỉnh Sửa Sản Phẩm & Phân Loại SKU' : 'Tạo Sản Phẩm Mới (Nhiều SKU)'}
              </h3>
              <span className="text-[11px] text-slate-400">
                1 sản phẩm chứa nhiều SKU, mỗi SKU có vốn riêng & hỗ trợ nhân bản nhanh
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="product-modal-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Product Basic Info & Fees */}
          <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-200 block mb-1">Tên Sản Phẩm Chính *</label>
              <input
                type="text"
                required
                value={productData.name}
                onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                placeholder="VD: [MUA 1 TẶNG 3] Artemia O.S.I én đáy đỏ Petrel Brand"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-400 block mb-1">% Chiết khấu sàn TikTok</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={productData.tiktok_fee_percent}
                    onChange={(e) => setProductData({ ...productData, tiktok_fee_percent: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500 pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Phí cố định sàn (₫)</label>
                <input
                  type="number"
                  step="500"
                  value={productData.tiktok_fixed_fee}
                  onChange={(e) => setProductData({ ...productData, tiktok_fixed_fee: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* SKU Variants Tabs & Actions */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Danh Sách Phân Loại SKU ({productData.skus?.length || 0})</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* DUPLICATE SKU BUTTON */}
                <button
                  type="button"
                  onClick={() => handleDuplicateSku(activeSkuIndex)}
                  className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
                  title="Sao chép toàn bộ chi phí vốn của SKU đang chọn thành một SKU mới"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Nhân Bản SKU Này</span>
                </button>

                {/* ADD NEW SKU BUTTON */}
                <button
                  type="button"
                  onClick={handleAddSku}
                  className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm SKU Mới</span>
                </button>
              </div>
            </div>

            {/* SKU Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-850 p-1.5 rounded-2xl border border-slate-750">
              {(productData.skus || []).map((s, idx) => (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={() => setActiveSkuIndex(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                    activeSkuIndex === idx
                      ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/25'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{s.sku || `SKU ${idx + 1}`}</span>
                  {productData.skus.length > 1 && activeSkuIndex === idx && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSku(idx);
                      }}
                      className="hover:text-rose-200 text-white p-0.5 rounded"
                      title="Xoá SKU này"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active SKU Details Form */}
          {activeSku && (
            <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-750">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Đang chỉnh sửa SKU: </span>
                  <strong className="font-mono text-rose-400 font-bold">{activeSku.sku || 'Chưa đặt mã SKU'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleDuplicateSku(activeSkuIndex)}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Nhân bản sang SKU mới</span>
                </button>
              </div>

              {/* SKU Name, Code, Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-rose-400 block mb-1">Mã SKU *</label>
                  <input
                    type="text"
                    required
                    value={activeSku.sku}
                    onChange={(e) => handleUpdateActiveSkuField('sku', e.target.value)}
                    placeholder="VD: 10g, 20g, 50g..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tên Phân Loại</label>
                  <input
                    type="text"
                    value={activeSku.name}
                    onChange={(e) => handleUpdateActiveSkuField('name', e.target.value)}
                    placeholder="VD: Hũ 10g"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Giá Dự Bán (₫)</label>
                  <input
                    type="number"
                    value={activeSku.expected_price}
                    onChange={(e) => handleUpdateActiveSkuField('expected_price', e.target.value)}
                    placeholder="99000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-white font-bold focus:outline-none focus:border-rose-500 text-right"
                  />
                </div>
              </div>

              {/* Cost Components List for this SKU */}
              <div className="space-y-2 pt-2 border-t border-slate-750">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Chi Phí Vốn Cấu Thành Của SKU Này (COGS)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Hộp, thìa, bao bì, phôi hàng... riêng của phân loại này
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCompToActiveSku}
                    className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Dòng Vốn</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {(activeSku.components || []).map((comp, cIdx) => (
                    <div key={comp.id || cIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => handleUpdateCompInActiveSku(cIdx, 'name', e.target.value)}
                        placeholder="Tên chi phí (VD: Phôi 10g, Hộp, Thìa...)"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                      <div className="relative w-36">
                        <input
                          type="number"
                          step="100"
                          value={comp.cost}
                          onChange={(e) => handleUpdateCompInActiveSku(cIdx, 'cost', e.target.value)}
                          placeholder="Tiền vốn"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-6 py-1.5 text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-400 text-right"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">₫</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCompInActiveSku(cIdx)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Financial Breakdown for this SKU */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Vốn NVL (COGS)</span>
                  <span className="font-bold text-amber-300 text-sm">{curCogsTotal.toLocaleString()} ₫</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Phí sàn ({curFeePct}% + {curFixFee.toLocaleString()}₫)</span>
                  <span className="font-bold text-slate-300 text-sm">{curPlatFee.toLocaleString()} ₫</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Tổng vốn dự kiến</span>
                  <span className="font-bold text-amber-200 text-sm">{curTotalCost.toLocaleString()} ₫</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Lợi nhuận ({curMargin}%)</span>
                  <span className={`font-bold text-sm ${curEstProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {curEstProfit.toLocaleString()} ₫
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer (Sticky at Bottom) */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-950/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Huỷ Bỏ
          </button>
          <button
            type="submit"
            form="product-modal-form"
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium px-5 py-2 rounded-xl text-xs shadow-lg shadow-rose-500/25 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{productData.id ? 'Lưu Sản Phẩm & Các SKU' : 'Tạo Sản Phẩm & Các SKU'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
