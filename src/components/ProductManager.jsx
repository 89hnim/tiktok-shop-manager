import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Zap, 
  Percent, 
  Sparkles
} from 'lucide-react';
import ProductModal from './ProductModal';

export default function ProductManager({
  products = [],
  settings = {},
  onSaveProduct,
  onDeleteProduct,
  onApplyFeesToAll,
  onUpdateSettings
}) {
  // Modal state
  const [productModalConfig, setProductModalConfig] = useState({
    isOpen: false,
    initialProduct: null,
  });
  const [productToDelete, setProductToDelete] = useState(null);

  // Global default fees state
  const [globalFeePercent, setGlobalFeePercent] = useState(settings.tiktok_fee_percent_default ?? 5.0);
  const [globalFixedFee, setGlobalFixedFee] = useState(settings.tiktok_fixed_fee_default ?? 3000);
  const [applySuccessMessage, setApplySuccessMessage] = useState('');

  // Start creating new product
  const handleStartCreate = () => {
    setProductModalConfig({
      isOpen: true,
      initialProduct: null,
    });
  };

  // Start editing existing product
  const handleStartEdit = (prod) => {
    setProductModalConfig({
      isOpen: true,
      initialProduct: prod,
    });
  };

  // Apply fees to all products
  const handleApplyGlobalFees = () => {
    const feeP = Number(globalFeePercent);
    const feeF = Number(globalFixedFee);
    if (confirm(`Bạn có chắc muốn áp dụng mức phí sàn: ${feeP}% + ${feeF.toLocaleString('vi-VN')}₫ cho TẤT CẢ sản phẩm và các SKU hiện có không?\n\nLưu ý: Các đơn hàng cũ đã tạo sẽ KHÔNG bị ảnh hưởng nhờ cơ chế Snapshot.`)) {
      onApplyFeesToAll(feeP, feeF);
      onUpdateSettings({
        tiktok_fee_percent_default: feeP,
        tiktok_fixed_fee_default: feeF,
      });
      setApplySuccessMessage('Đã đồng bộ biểu phí sàn cho toàn bộ sản phẩm và các SKU!');
      setTimeout(() => setApplySuccessMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Cost Snapshot Explanation */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Quản Lý Sản Phẩm & Đa Phân Loại SKU</h2>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                Cost Snapshot
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Mỗi sản phẩm có thể chứa <strong>nhiều phân loại SKU</strong> (ví dụ: 10g, 20g, 50g), mỗi SKU có cấu thành giá vốn và giá bán riêng biệt. Bạn có thể <strong>nhân bản (Duplicate) SKU</strong> chỉ với 1 click để tạo nhanh các phân loại khác!
            </p>
          </div>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-rose-500/25 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Sản Phẩm Mới</span>
        </button>
      </div>

      {/* Global Default TikTok Fees Panel */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cấu hình Phí Sàn TikTok Mặc Định</h3>
              <p className="text-xs text-slate-400">
                Tự động áp dụng cho các SKU mới tạo. Có thể đồng bộ hàng loạt cho toàn bộ danh mục sản phẩm.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400">% Chiết khấu sàn:</span>
              <input
                type="number"
                step="0.1"
                value={globalFeePercent}
                onChange={(e) => setGlobalFeePercent(e.target.value)}
                className="w-16 bg-transparent text-right font-mono text-slate-200 font-bold focus:outline-none"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400">Phí cố định (hạ tầng):</span>
              <input
                type="number"
                step="500"
                value={globalFixedFee}
                onChange={(e) => setGlobalFixedFee(e.target.value)}
                className="w-20 bg-transparent text-right font-mono text-slate-200 font-bold focus:outline-none"
              />
              <span className="text-slate-400">₫</span>
            </div>

            <button
              onClick={handleApplyGlobalFees}
              className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
              title="Cập nhật biểu phí này cho toàn bộ sản phẩm và SKU hiện có"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Áp Dụng Cho Tất Cả SP</span>
            </button>
          </div>
        </div>

        {applySuccessMessage && (
          <div className="mt-3 p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{applySuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {products.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl">
            <Package className="w-12 h-12 mx-auto opacity-30 text-slate-400 mb-3" />
            <p className="text-base font-medium text-slate-300">Chưa có sản phẩm nào trong hệ thống</p>
            <p className="text-xs text-slate-500 mt-1">Bấm "Thêm Sản Phẩm Mới" để tạo sản phẩm và các phân loại SKU.</p>
          </div>
        ) : (
          products.map(prod => {
            const skus = Array.isArray(prod.skus) && prod.skus.length > 0
              ? prod.skus
              : [{ id: prod.id, sku: prod.sku, name: prod.name, expected_price: prod.expected_price, cogs_total: prod.cogs_total, estimated_profit: prod.estimated_profit, components: prod.components || [] }];

            return (
              <div 
                key={prod.id}
                className="bg-slate-800/80 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all backdrop-blur-sm group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md">
                          {skus.length} phân loại SKU
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Phí sàn: {prod.tiktok_fee_percent}% + {(prod.tiktok_fixed_fee || 0).toLocaleString()}₫
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-base mt-1.5 leading-snug" title={prod.name}>
                        {prod.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(prod)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Chỉnh sửa sản phẩm & các SKU"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProductToDelete(prod)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Xoá sản phẩm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* SKU Variants Sub-Cards / Table */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Chi tiết các phân loại SKU ({skus.length}):
                    </span>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {skus.map((s, sIdx) => (
                        <div 
                          key={s.id || sIdx}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                              {s.sku}
                            </span>
                            <span className="text-slate-200 font-medium truncate max-w-[120px] sm:max-w-[160px]" title={s.name}>
                              {s.name || s.sku}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                            <div>
                              <span className="text-slate-500 block text-[9px] text-right">Vốn NVL</span>
                              <span className="text-amber-300 font-semibold">{Number(s.cogs_total || 0).toLocaleString()}₫</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] text-right">Giá bán</span>
                              <span className="text-white font-bold">{Number(s.expected_price || 0).toLocaleString()}₫</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] text-right">Lãi dự tính</span>
                              <span className={`font-bold ${s.estimated_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {Number(s.estimated_profit || 0).toLocaleString()}₫
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Multi-SKU Modal */}
      <ProductModal
        isOpen={productModalConfig.isOpen}
        onClose={() => setProductModalConfig({ isOpen: false, initialProduct: null })}
        initialProduct={productModalConfig.initialProduct}
        defaultFeePercent={Number(globalFeePercent)}
        defaultFixedFee={Number(globalFixedFee)}
        onSaveProduct={onSaveProduct}
      />

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Xác Nhận Xoá Sản Phẩm</h3>
                <p className="text-xs text-slate-400">Hành động này sẽ gỡ bỏ sản phẩm khỏi danh mục quản lý</p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-xs space-y-2 mb-4">
              <div>
                <span className="text-slate-400">Tên sản phẩm: </span>
                <span className="font-semibold text-white block mt-0.5">{productToDelete.name || 'Chưa đặt tên'}</span>
              </div>
              <div>
                <span className="text-slate-400">Số lượng SKU bị gỡ: </span>
                <span className="font-semibold text-rose-400 font-mono">
                  {Array.isArray(productToDelete.skus) ? productToDelete.skus.length : 1} phân loại SKU
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 mb-5 flex items-start gap-2.5 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <strong className="text-emerald-400">Đơn hàng cũ hoàn toàn không bị ảnh hưởng:</strong> Toàn bộ các đơn hàng đã tạo trong lịch sử vẫn được lưu trữ độc lập nguyên vẹn 100% (gồm tên sản phẩm, mã SKU và chi phí vốn Cost Snapshot lúc tạo).
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xoá</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
