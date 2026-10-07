import React, { useState } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Trash2,
  Image as ImageIcon,
  ArrowRight,
  Package,
  Plus,
  HelpCircle,
  Layers,
  Percent,
  Save,
  AlertTriangle,
  ZoomIn
} from 'lucide-react';
import { scanOrderImage } from '../services/ocrService';
import { 
  generateUUID, 
  findSkuVariant, 
  findBestProductMatch, 
  calculateProductSimilarity,
  saveProduct, 
  getProducts 
} from '../services/dbService';
import ProductModal from './ProductModal';

export default function ScanModal({ 
  isOpen, 
  onClose, 
  products = [], 
  orders = [],
  settings = {},
  onSaveProduct,
  onBatchCreateOrders 
}) {
  const [imagesQueue, setImagesQueue] = useState([]);
  const [localSavedProducts, setLocalSavedProducts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [zoomImageUrl, setZoomImageUrl] = useState(null);

  // Unified Product Modal state (dùng chung cho cả Tạo mới SP & Cập nhật SKU thiếu)
  const [productModalConfig, setProductModalConfig] = useState({
    isOpen: false,
    initialProduct: null,
    prefilledSku: '',
    targetTempId: null,
  });

  if (!isOpen) return null;

  // Merge products from dbService, localSavedProducts, and props to ensure immediate availability
  const displayProducts = (() => {
    let list = [];
    try {
      list = getProducts();
    } catch (e) {}

    // Overwrite or prepend any newly saved products from current session
    for (const lp of localSavedProducts) {
      const idx = list.findIndex(p => p.id === lp.id);
      if (idx >= 0) {
        list[idx] = lp;
      } else {
        list.unshift(lp);
      }
    }

    for (const p of (products || [])) {
      if (!list.some(existing => existing.id === p.id)) {
        list.push(p);
      }
    }
    return list;
  })();

  const getProductById = (prodId) => {
    if (!prodId) return null;
    return displayProducts.find(p => p.id === prodId) || null;
  };

  // Open full product modal to create new product from scanned item
  const handleOpenCreateProductModal = (item) => {
    setProductModalConfig({
      isOpen: true,
      initialProduct: {
        name: item.product_name || '',
        sku: item.sku || '',
      },
      prefilledSku: item.sku || '',
      targetTempId: item.tempId,
    });
  };

  // Open full product modal to add/update missing SKU to existing product
  const handleOpenUpdateSkuModal = (existingProduct, newSku, tempId) => {
    setProductModalConfig({
      isOpen: true,
      initialProduct: existingProduct,
      prefilledSku: newSku || '',
      targetTempId: tempId,
    });
  };

  // Handle files selected via file input or drag-drop
  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newItems = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setProgressText(`Đang xử lý ảnh ${i + 1}/${total}: ${file.name || 'Ảnh đơn'}...`);
      setCurrentProgress(Math.round(((i) / total) * 100));

      const ocrResult = await scanOrderImage(file, { shopName: settings?.shop_name });
      const parsed = ocrResult.data || {};

      // 1. Fuzzy match product & SKU from catalog
      let matchedProd = null;
      let matchedSku = null;

      const fuzzyMatch = findBestProductMatch(displayProducts, parsed.product_name, parsed.sku);
      if (fuzzyMatch) {
        matchedProd = fuzzyMatch.product;
        // Check if matchedProd actually has the scanned SKU
        const normOcrSku = parsed.sku ? parsed.sku.toLowerCase().trim() : '';
        const exactSku = (matchedProd.skus || []).find(s => (s.sku || '').toLowerCase().trim() === normOcrSku);
        if (exactSku) {
          matchedSku = exactSku;
        }
      } else if (parsed.sku) {
        const found = findSkuVariant(displayProducts, parsed.sku);
        if (found) {
          matchedProd = found.product;
          matchedSku = found.skuVariant;
        }
      }

      newItems.push({
        tempId: generateUUID(),
        file,
        previewUrl: ocrResult.previewUrl || (typeof file === 'string' ? file : URL.createObjectURL(file)),
        success: ocrResult.success,
        tracking_code: parsed.tracking_code || '',
        order_id: parsed.order_id || '',
        order_date: parsed.order_date || '',
        product_name: parsed.product_name || (matchedProd ? matchedProd.name : ''),
        sku: parsed.sku || (matchedSku ? matchedSku.sku : ''),
        quantity: parsed.quantity || 1,
        customer_name: parsed.customer_name || '',
        customer_phone: parsed.customer_phone || '',
        selectedProductId: matchedProd ? matchedProd.id : '',
      });
    }

    setCurrentProgress(100);
    setProgressText('Hoàn thành quét toàn bộ ảnh!');
    setImagesQueue(prev => [...prev, ...newItems]);
    setIsProcessing(false);
  };

  // Update a field in the review item
  const handleUpdateItem = (tempId, field, val) => {
    setImagesQueue(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  // Handle Product change from dropdown
  const handleProductChange = (tempId, prodId) => {
    const prod = getProductById(prodId);
    setImagesQueue(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const skus = Array.isArray(prod?.skus) ? prod.skus : [];
        const matchingSku = skus.find(s => s.sku.toLowerCase() === (item.sku || '').toLowerCase()) || skus[0];
        return {
          ...item,
          selectedProductId: prodId,
          sku: matchingSku ? matchingSku.sku : item.sku,
        };
      }
      return item;
    }));
  };

  // Handle SKU change from dropdown
  const handleSkuChange = (tempId, skuCode) => {
    setImagesQueue(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return { ...item, sku: skuCode };
      }
      return item;
    }));
  };

  // Remove single item from queue
  const handleRemoveItem = (tempId) => {
    setImagesQueue(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Create single order
  const handleCreateSingle = (item) => {
    const isAlreadyInDb = Boolean(
      (item.tracking_code && orders.some(o => o.tracking_code && o.tracking_code.trim() === item.tracking_code.trim())) ||
      (item.order_id && orders.some(o => o.order_id && o.order_id.trim() === item.order_id.trim()))
    );

    if (isAlreadyInDb) {
      alert(`Đơn hàng với mã vận đơn ${item.tracking_code || item.order_id} đã tồn tại trong hệ thống! Không thể tạo lại.`);
      return;
    }

    let matchedProd = getProductById(item.selectedProductId);
    let matchedSku = (matchedProd?.skus || []).find(s => s.sku === item.sku) || matchedProd?.skus?.[0];

    if (!matchedProd && item.sku) {
      const found = findSkuVariant(products, item.sku);
      if (found) {
        matchedProd = found.product;
        matchedSku = found.skuVariant;
      }
    }
    if (!matchedProd && item.product_name) {
      const fuzzy = findBestProductMatch(products, item.product_name, item.sku);
      if (fuzzy) {
        matchedProd = fuzzy.product;
        matchedSku = fuzzy.skuVariant;
      }
    }

    onBatchCreateOrders([{
      tracking_code: item.tracking_code,
      order_id: item.order_id,
      order_date: item.order_date,
      product_name: item.product_name,
      sku: item.sku,
      quantity: Number(item.quantity) || 1,
      customer_name: item.customer_name,
      customer_phone: item.customer_phone,
      product_id: matchedProd ? matchedProd.id : null,
      sku_id: matchedSku ? matchedSku.id : null,
    }]);

    handleRemoveItem(item.tempId);
  };

  // Create all valid orders
  const handleCreateAll = () => {
    // 1. Filter out orders that already exist in the database
    const nonDbItems = imagesQueue.filter(item => {
      const inDb = Boolean(
        (item.tracking_code && orders.some(o => o.tracking_code && o.tracking_code.trim() === item.tracking_code.trim())) ||
        (item.order_id && orders.some(o => o.order_id && o.order_id.trim() === item.order_id.trim()))
      );
      return !inDb;
    });

    if (nonDbItems.length === 0) {
      alert('Tất cả các đơn trong danh sách quét đều đã tồn tại trong hệ thống. Không có đơn mới nào để tạo!');
      return;
    }

    // 2. Deduplicate within the current batch (keep first occurrence if user scanned same image multiple times)
    const seenBatchCodes = new Set();
    const finalItemsToCreate = [];
    let batchDupCount = 0;

    for (const item of nonDbItems) {
      const key = (item.tracking_code?.trim()) || (item.order_id?.trim());
      if (key) {
        if (seenBatchCodes.has(key)) {
          batchDupCount++;
          continue;
        }
        seenBatchCodes.add(key);
      }
      finalItemsToCreate.push(item);
    }

    const skippedDbCount = imagesQueue.length - nonDbItems.length;
    if (skippedDbCount > 0 || batchDupCount > 0) {
      const msgs = [];
      if (skippedDbCount > 0) msgs.push(`bỏ qua ${skippedDbCount} đơn đã tồn tại trong hệ thống`);
      if (batchDupCount > 0) msgs.push(`loại trừ ${batchDupCount} đơn bị quét trùng lặp trong cùng đợt`);
      alert(`Hệ thống đã tự động ${msgs.join(' và ')}.`);
    }

    const ordersToCreate = finalItemsToCreate.map(item => {
      let matchedProd = getProductById(item.selectedProductId);
      let matchedSku = (matchedProd?.skus || []).find(s => s.sku === item.sku) || matchedProd?.skus?.[0];

      if (!matchedProd && item.sku) {
        const found = findSkuVariant(displayProducts, item.sku);
        if (found) {
          matchedProd = found.product;
          matchedSku = found.skuVariant;
        }
      }
      if (!matchedProd && item.product_name) {
        const fuzzy = findBestProductMatch(displayProducts, item.product_name, item.sku);
        if (fuzzy) {
          matchedProd = fuzzy.product;
          matchedSku = fuzzy.skuVariant;
        }
      }

      return {
        tracking_code: item.tracking_code,
        order_id: item.order_id,
        order_date: item.order_date,
        product_name: item.product_name,
        sku: item.sku,
        quantity: Number(item.quantity) || 1,
        customer_name: item.customer_name,
        customer_phone: item.customer_phone,
        product_id: matchedProd ? matchedProd.id : null,
        sku_id: matchedSku ? matchedSku.id : null,
      };
    });

    onBatchCreateOrders(ordersToCreate);
    setImagesQueue([]);
    onClose();
  };

  // Callback when ProductModal successfully saves a new or updated product
  const handleProductModalSavedSuccess = (savedProduct, activeSku) => {
    if (!savedProduct) return;
    const prodId = savedProduct.id;
    const prodName = savedProduct.name;
    const skuCode = activeSku?.sku || '';

    // Target item that initiated this modal action
    const targetItem = imagesQueue.find(it => it.tempId === productModalConfig.targetTempId);

    // Save into local immediate cache to guarantee instant availability across the modal
    setLocalSavedProducts(prev => {
      const filtered = prev.filter(p => p.id !== prodId);
      return [savedProduct, ...filtered];
    });

    // Auto-link to target item AND any other items in queue with same product name or same SKU
    setImagesQueue(prev => prev.map(it => {
      const isTarget = it.tempId === productModalConfig.targetTempId;
      const isAlreadyThisProd = it.selectedProductId === prodId;

      // Check if unlinked item belongs to this product:
      // 1. Same SKU as the one just saved
      const isSameSku = it.sku && skuCode && it.sku.toLowerCase().trim() === skuCode.toLowerCase().trim();
      // 2. Similarity between item's scanned product name and the saved product name
      const isSimilarToSavedProd = it.product_name && (
        calculateProductSimilarity(it.product_name, prodName) >= 0.28 ||
        Boolean(findBestProductMatch([savedProduct], it.product_name, it.sku))
      );
      // 3. Similarity to target item's scanned product name (if both came from the same batch/scan)
      const isSimilarToTargetItem = targetItem?.product_name && it.product_name && (
        calculateProductSimilarity(it.product_name, targetItem.product_name) >= 0.28
      );

      const isUnlinkedMatchingProd = !it.selectedProductId && (isSimilarToSavedProd || isSimilarToTargetItem);

      if (isTarget || isSameSku || isAlreadyThisProd || isUnlinkedMatchingProd) {
        // If this item has a SKU that exists in savedProduct, use the standardized SKU case
        const exactSku = (savedProduct.skus || []).find(s => 
          (s.sku || '').toLowerCase().trim() === (it.sku || '').toLowerCase().trim()
        );

        let finalSku = it.sku;
        if (isTarget) {
          finalSku = skuCode || it.sku;
        } else if (exactSku) {
          finalSku = exactSku.sku;
        } else if (isSameSku) {
          finalSku = skuCode;
        }
        // If exactSku is not in savedProduct (e.g. Image 2 had '20g' while Image 1 had '10g'):
        // Keep finalSku as '20g'!
        // Because it.selectedProductId will be prodId, and '20g' is not in savedProduct.skus,
        // isMissingSku evaluates to true, rendering "+ Thêm SKU '20g'" instead of "Tạo SP mới"!

        return {
          ...it,
          selectedProductId: prodId,
          product_name: prodName,
          sku: finalSku,
        };
      }
      return it;
    }));

    setProductModalConfig({ isOpen: false, initialProduct: null, prefilledSku: '', targetTempId: null });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Quét Ảnh Đơn Hàng TikTok (OCR Offline)</h3>
              <p className="text-xs text-slate-400">
                Tự động bóc tách Mã vận đơn, Ngày giờ, Tên SP, SKU, Số lượng, Người nhận & SĐT
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-750 hover:border-rose-500/50 bg-slate-850/50 rounded-2xl p-6 text-center transition-colors">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <label htmlFor="file-upload" className="cursor-pointer block space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Kéo thả nhiều ảnh phiếu in hoặc <span className="text-rose-400 underline underline-offset-2">bấm để chọn ảnh</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Hỗ trợ JPG, PNG, ảnh chụp màn hình TikTok Seller</p>
              </div>
            </label>
          </div>

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span>{progressText}</span>
                </span>
                <span className="font-mono font-bold text-rose-400">{currentProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Scanned Items Review List */}
          {imagesQueue.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Xem Lại & Xác Nhận Đơn Hàng</span>
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs px-2 py-0.5 rounded-full font-mono">
                    {imagesQueue.length} đơn
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Kiểm tra lại các ô thông tin đã được điền sẵn từ ảnh trước khi bấm tạo đơn.
                </p>
              </div>

              <div className="space-y-4">
                {imagesQueue.map((item, index) => {
                  const selProd = getProductById(item.selectedProductId);
                  const hasMatchedProduct = Boolean(selProd);
                  const skuList = Array.isArray(selProd?.skus) ? selProd.skus : [];
                  const normItemSku = (item.sku || '').trim().toLowerCase();
                  const hasExactSkuInProd = Boolean(normItemSku && skuList.some(s => (s.sku || '').trim().toLowerCase() === normItemSku));
                  const isMissingSku = Boolean(hasMatchedProduct && !hasExactSkuInProd && item.sku);

                  const isAlreadyInDb = Boolean(
                    (item.tracking_code && orders.some(o => o.tracking_code && o.tracking_code.trim() === item.tracking_code.trim())) ||
                    (item.order_id && orders.some(o => o.order_id && o.order_id.trim() === item.order_id.trim()))
                  );
                  const isBatchDuplicate = Boolean(
                    item.tracking_code && imagesQueue.filter(it => it.tracking_code && it.tracking_code.trim() === item.tracking_code.trim()).length > 1
                  );

                  return (
                    <div 
                      key={item.tempId}
                      className={`rounded-2xl p-4 shadow-md flex flex-col md:flex-row gap-4 items-start transition-all ${
                        isAlreadyInDb 
                          ? 'border-2 border-rose-500 bg-rose-950/40 text-rose-100 shadow-rose-950/50 ring-1 ring-rose-500/50' 
                          : isBatchDuplicate 
                            ? 'border-2 border-rose-500/80 bg-rose-950/25 text-slate-100 ring-1 ring-rose-500/30' 
                            : !hasMatchedProduct || isMissingSku
                              ? 'border border-amber-500/40 bg-slate-800/95' 
                              : 'border border-slate-700/80 bg-slate-800/90'
                      }`}
                    >
                      {/* Thumbnail Image with Click-to-Zoom */}
                      <div 
                        onClick={() => setZoomImageUrl(item.previewUrl)}
                        className={`w-full md:w-36 shrink-0 aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden border relative group cursor-pointer hover:border-cyan-500/60 transition-all shadow-md ${
                          isAlreadyInDb || isBatchDuplicate ? 'border-rose-500/60' : 'border-slate-800'
                        }`}
                        title="Bấm để phóng to xem rõ phiếu in"
                      >
                        <img 
                          src={item.previewUrl} 
                          alt="Đơn hàng" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
                          <ZoomIn className="w-4 h-4 text-cyan-400" />
                          <span>Phóng to</span>
                        </div>
                        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-white ${
                          isAlreadyInDb || isBatchDuplicate ? 'bg-rose-600 font-bold' : 'bg-black/70'
                        }`}>
                          #{index + 1}
                        </div>
                      </div>

                      {/* Pre-filled Editable Form */}
                      <div className="flex-1 w-full space-y-3">
                        {/* Duplicate Alert Banners */}
                        {isAlreadyInDb && (
                          <div className="bg-rose-950/80 border-2 border-rose-500 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200 animate-in fade-in duration-200 shadow-md">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-bold text-rose-200 text-sm flex items-center gap-1.5">
                                <span>🚫 ĐƠN HÀNG ĐÃ TỒN TẠI TRONG HỆ THỐNG</span>
                              </p>
                              <p className="text-rose-300 mt-0.5 leading-relaxed">
                                Mã vận đơn <span className="font-mono font-bold text-white bg-rose-900/90 px-1.5 py-0.5 rounded border border-rose-500/50">{item.tracking_code}</span> đã có trong danh sách đơn hàng đã lưu. Hệ thống <strong>không cho phép</strong> tạo lại đơn này để tránh trùng lặp.
                              </p>
                            </div>
                          </div>
                        )}

                        {!isAlreadyInDb && isBatchDuplicate && (
                          <div className="bg-rose-950/60 border-2 border-rose-500/70 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200 animate-in fade-in duration-200 shadow-md">
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-bold text-rose-300 flex items-center gap-1.5">
                                <span>⚠️ PHÁT HIỆN TRÙNG MÃ VẬN ĐƠN TRONG ĐỢT QUÉT NÀY</span>
                              </p>
                              <p className="text-rose-200/90 mt-0.5 leading-relaxed">
                                Mã vận đơn <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-rose-500/40">{item.tracking_code}</span> xuất hiện nhiều lần trong các ảnh vừa quét. Vui lòng kiểm tra lại ảnh hoặc bấm "Bỏ qua" ở đơn thừa.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Unmatched Product Warning & Quick Create Button */}
                        {!hasMatchedProduct && (
                          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 text-amber-300">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                              <span>Chưa tìm thấy sản phẩm này trong kho. Bạn có muốn tạo mới không?</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenCreateProductModal(item)}
                              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:from-amber-400 hover:to-orange-400 transition-all shadow-md shadow-amber-500/20 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Tạo Sản Phẩm Mới Ngay</span>
                            </button>
                          </div>
                        )}

                        {/* Matched Product but Missing Scanned SKU Warning */}
                        {isMissingSku && (
                          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 text-amber-300">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                              <span>
                                Sản phẩm <strong>"{selProd?.name || 'Sản phẩm'}"</strong> chưa có phân loại SKU <span className="font-mono font-bold text-rose-400">"{item.sku}"</span>.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenUpdateSkuModal(selProd, item.sku, item.tempId)}
                              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:from-amber-400 hover:to-orange-400 transition-all shadow-md shadow-amber-500/20 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Thêm SKU "{item.sku}" Vào Sản Phẩm</span>
                            </button>
                          </div>
                        )}

                        {/* Row 1: Tracking Code & Order Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-rose-400 block mb-1">
                              Mã Vận Đơn (Dãy số to) *
                            </label>
                            <input
                              type="text"
                              value={item.tracking_code}
                              onChange={(e) => handleUpdateItem(item.tempId, 'tracking_code', e.target.value)}
                              placeholder="VD: 862521283460"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              Thời Gian Đặt Hàng
                            </label>
                            <input
                              type="text"
                              value={item.order_date}
                              onChange={(e) => handleUpdateItem(item.tempId, 'order_date', e.target.value)}
                              placeholder="YYYY-MM-DD HH:mm"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                            />
                          </div>
                        </div>

                        {/* Row 2: Customer Name & Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-cyan-400 block mb-1">
                              Tên Người Nhận (Khách Hàng)
                            </label>
                            <input
                              type="text"
                              value={item.customer_name}
                              onChange={(e) => handleUpdateItem(item.tempId, 'customer_name', e.target.value)}
                              placeholder="VD: Tăng Tiến Tài"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-cyan-400 block mb-1">
                              Số Điện Thoại (Có thể có sao *)
                            </label>
                            <input
                              type="text"
                              value={item.customer_phone}
                              onChange={(e) => handleUpdateItem(item.tempId, 'customer_phone', e.target.value)}
                              placeholder="VD: (+84)98*****97"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        {/* Row 3: Product Mapping, SKU & Quantity */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          {/* Dropdown 1: Chọn Sản Phẩm (Span 6) */}
                          <div className="sm:col-span-6">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-amber-300">
                                1. Liên Kết Sản Phẩm Kho
                              </label>
                              {!hasMatchedProduct && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreateProductModal(item)}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 font-medium"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Tạo SP mới</span>
                                </button>
                              )}
                            </div>
                            <select
                              value={item.selectedProductId || ''}
                              onChange={(e) => handleProductChange(item.tempId, e.target.value)}
                              className={`w-full bg-slate-900 border rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none ${
                                hasMatchedProduct ? 'border-slate-700 focus:border-amber-400' : 'border-amber-500/60'
                              }`}
                            >
                              <option value="">-- Chưa liên kết sản phẩm (Bấm tạo mới bên cạnh) --</option>
                              {displayProducts.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Dropdown 2: Phân Loại SKU (Span 4) */}
                          <div className="sm:col-span-4">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-rose-400 block">
                                2. Phân Loại SKU
                              </label>
                              {isMissingSku && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenUpdateSkuModal(selProd, item.sku, item.tempId)}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 font-bold"
                                  title={`Thêm SKU "${item.sku}" vào sản phẩm`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Thêm SKU "{item.sku}"</span>
                                </button>
                              )}
                            </div>
                            {skuList.length > 0 ? (
                              <select
                                value={item.sku}
                                onChange={(e) => handleSkuChange(item.tempId, e.target.value)}
                                className={`w-full bg-slate-900 border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                                  isMissingSku
                                    ? 'border-amber-500/80 text-amber-300 focus:border-amber-400'
                                    : 'border-slate-700 text-rose-400 focus:border-rose-500'
                                }`}
                              >
                                {isMissingSku && (
                                  <option value={item.sku}>
                                    ⚠️ {item.sku} (Chưa lưu SKU - Bấm thêm ở trên)
                                  </option>
                                )}
                                {skuList.map(s => (
                                  <option key={s.id || s.sku} value={s.sku}>
                                    {s.sku} (Vốn: {Number(s.cogs_total || 0).toLocaleString()}₫)
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => handleUpdateItem(item.tempId, 'sku', e.target.value)}
                                placeholder="10g"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-rose-400 font-bold focus:outline-none focus:border-rose-500"
                              />
                            )}
                          </div>

                          {/* Quantity (Span 2) */}
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Số Lượng</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.tempId, 'quantity', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white text-center focus:outline-none focus:border-rose-500"
                            />
                          </div>
                        </div>

                        {/* Row 4: Raw Product Name from scan */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Tên sản phẩm trên phiếu in:</label>
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => handleUpdateItem(item.tempId, 'product_name', e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none"
                          />
                        </div>

                        {/* Actions for this item */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.tempId)}
                            className="text-slate-400 hover:text-rose-400 text-xs px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            Bỏ qua
                          </button>
                          <button
                            type="button"
                            disabled={isAlreadyInDb}
                            onClick={() => handleCreateSingle(item)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                              isAlreadyInDb
                                ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            }`}
                            title={isAlreadyInDb ? 'Đơn hàng này đã tồn tại trong hệ thống, không thể tạo lại!' : 'Tạo đơn này'}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isAlreadyInDb ? 'Đã Tồn Tại (Không thể tạo)' : 'Tạo Đơn Này'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Đóng
          </button>

          {imagesQueue.length > 0 && (() => {
            const existingDbCount = imagesQueue.filter(it => 
              (it.tracking_code && orders.some(o => o.tracking_code && o.tracking_code.trim() === it.tracking_code.trim())) ||
              (it.order_id && orders.some(o => o.order_id && o.order_id.trim() === it.order_id.trim()))
            ).length;
            const validCount = imagesQueue.length - existingDbCount;

            return (
              <button
                type="button"
                disabled={validCount === 0}
                onClick={handleCreateAll}
                className={`flex items-center gap-2 font-medium px-5 py-2.5 rounded-xl text-xs transition-all ${
                  validCount === 0
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25'
                }`}
                title={validCount === 0 ? 'Tất cả đơn đã tồn tại trong hệ thống!' : 'Tạo tất cả các đơn hợp lệ'}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {existingDbCount > 0 
                    ? `Tạo ${validCount} Đơn Hợp Lệ (Bỏ qua ${existingDbCount} đơn trùng)`
                    : `Xác Nhận Tạo Tất Cả ${imagesQueue.length} Đơn Hàng`
                  }
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* UNIFIED FULL PRODUCT MODAL */}
      <ProductModal
        isOpen={productModalConfig.isOpen}
        onClose={() => setProductModalConfig({ isOpen: false, initialProduct: null, prefilledSku: '', targetTempId: null })}
        initialProduct={productModalConfig.initialProduct}
        prefilledSku={productModalConfig.prefilledSku}
        defaultFeePercent={Number(settings.tiktok_fee_percent_default ?? 5.0)}
        defaultFixedFee={Number(settings.tiktok_fixed_fee_default ?? 3000)}
        onSaveProduct={onSaveProduct}
        onSavedSuccess={handleProductModalSavedSuccess}
      />

      {/* LIGHTBOX MODAL: FULL IMAGE ZOOM PREVIEW */}
      {zoomImageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomImageUrl(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[92vh] flex flex-col items-center" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomImageUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-rose-400 bg-slate-800/90 hover:bg-slate-700 p-2 rounded-full transition-all border border-slate-700 shadow-xl"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-auto max-h-[85vh] rounded-2xl border border-slate-700/80 shadow-2xl bg-slate-950">
              <img 
                src={zoomImageUrl} 
                alt="Chi tiết phiếu in phóng to" 
                className="max-h-[85vh] max-w-full object-contain mx-auto" 
              />
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">
              Bấm bất kỳ đâu bên ngoài hoặc nút đóng để quay lại
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
