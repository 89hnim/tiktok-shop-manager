/**
 * Database Service
 * Provides unified data access for Products, Orders, and Settings.
 * Supports both Electron IPC (desktop persistent SQLite) and local fallback.
 */

const STORAGE_KEYS = {
  SETTINGS: 'tiktok_shop_settings',
  PRODUCTS: 'tiktok_shop_products',
  ORDERS: 'tiktok_shop_orders',
};

// Default initial settings
const DEFAULT_SETTINGS = {
  tiktok_fee_percent_default: 5.0, // 5%
  tiktok_fixed_fee_default: 3000,   // 3,000 VND
  auto_sync_excel: true,
  excel_file_name: 'TikTok_Shop_Orders.xlsx',
  shop_name: 'Nuôi cá cùng Jun',
  github_repo: '89hnim/tiktok-shop-manager',
};

/**
 * Generate simple UUID v4
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Settings API
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  
  if (window.electronAPI && window.electronAPI.saveSettings) {
    window.electronAPI.saveSettings(updated);
  }
  return updated;
}

/**
 * Compute metrics for a single SKU variant
 */
export function computeSkuMetrics(skuVar, productFeePercent = 5.0, productFixedFee = 3000) {
  const components = Array.isArray(skuVar.components) ? skuVar.components : [];
  const cogs_total = components.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const expected_price = Number(skuVar.expected_price) || 0;
  const fee_percent = Number(skuVar.tiktok_fee_percent !== undefined ? skuVar.tiktok_fee_percent : productFeePercent);
  const fixed_fee = Number(skuVar.tiktok_fixed_fee !== undefined ? skuVar.tiktok_fixed_fee : productFixedFee);

  const estimated_platform_fee = Math.round((expected_price * fee_percent) / 100 + fixed_fee);
  const total_cost = cogs_total + estimated_platform_fee;
  const estimated_profit = expected_price - total_cost;

  return {
    ...skuVar,
    id: skuVar.id || generateUUID(),
    sku: (skuVar.sku || '').trim(),
    name: skuVar.name || '',
    components,
    cogs_total,
    expected_price,
    tiktok_fee_percent: fee_percent,
    tiktok_fixed_fee: fixed_fee,
    estimated_platform_fee,
    total_cost,
    estimated_profit,
  };
}

/**
 * Product Calculations Helper (with nested SKUs)
 */
export function computeProductMetrics(product) {
  const fee_percent = Number(product.tiktok_fee_percent !== undefined ? product.tiktok_fee_percent : 5.0);
  const fixed_fee = Number(product.tiktok_fixed_fee !== undefined ? product.tiktok_fixed_fee : 3000);

  let skus = [];
  if (Array.isArray(product.skus) && product.skus.length > 0) {
    skus = product.skus.map(s => computeSkuMetrics(s, fee_percent, fixed_fee));
  } else {
    // Backward compatibility: synthesize 1 SKU from legacy product root
    const defaultSku = computeSkuMetrics({
      id: generateUUID(),
      sku: product.sku || 'Mặc định',
      name: product.name || 'Mặc định',
      expected_price: product.expected_price || 0,
      components: product.components || [],
    }, fee_percent, fixed_fee);
    skus = [defaultSku];
  }

  const cogsValues = skus.map(s => s.cogs_total);
  const priceValues = skus.map(s => s.expected_price);

  return {
    ...product,
    tiktok_fee_percent: fee_percent,
    tiktok_fixed_fee: fixed_fee,
    skus,
    minCogs: Math.min(...cogsValues),
    maxCogs: Math.max(...cogsValues),
    minPrice: Math.min(...priceValues),
    maxPrice: Math.max(...priceValues),
    // Fallback for direct references
    cogs_total: skus[0]?.cogs_total || 0,
    expected_price: skus[0]?.expected_price || 0,
    sku: skus[0]?.sku || '',
  };
}

/**
 * Find matching SKU variant across all products
 */
export function findSkuVariant(products, skuQuery) {
  if (!skuQuery) return null;
  const q = String(skuQuery).trim().toLowerCase();
  for (const prod of products) {
    if (Array.isArray(prod.skus)) {
      for (const skuVar of prod.skus) {
        if (skuVar.sku && skuVar.sku.trim().toLowerCase() === q) {
          return { product: prod, skuVariant: skuVar };
        }
      }
    }
  }
  return null;
}

/**
 * Remove Vietnamese diacritics / tones for fuzzy matching
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

/**
 * Tokenize string into lowercase alphanumeric words
 */
export function tokenize(str) {
  const norm = removeVietnameseTones(str);
  return norm
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Calculates similarity between OCR text and Product Catalog
 * Handles missing diacritics, word permutations, and partial title matching
 */
export function calculateProductSimilarity(ocrText, prodName) {
  if (!ocrText || !prodName) return 0;
  const ocrTokens = tokenize(ocrText);
  const prodTokens = tokenize(prodName);

  if (ocrTokens.length === 0 || prodTokens.length === 0) return 0;

  const ocrSet = new Set(ocrTokens);
  let matchedTokens = 0;

  for (const pToken of prodTokens) {
    if (ocrSet.has(pToken)) {
      matchedTokens++;
    } else {
      const found = ocrTokens.some(oToken => {
        if (pToken.length >= 3 && oToken.length >= 3) {
          return pToken.includes(oToken) || oToken.includes(pToken);
        }
        return false;
      });
      if (found) matchedTokens += 0.8;
    }
  }

  const containment = matchedTokens / prodTokens.length;
  const dice = (2 * matchedTokens) / (ocrTokens.length + prodTokens.length);

  return Math.max(containment * 0.8 + dice * 0.2, dice);
}

/**
 * Finds best matching product and SKU variant from catalog using fuzzy similarity
 */
export function findBestProductMatch(products, ocrTitle, ocrSku) {
  if (!products || products.length === 0) return null;

  let bestMatch = null;
  let highestScore = 0;

  const normOcrSku = ocrSku ? removeVietnameseTones(ocrSku).replace(/\s+/g, '') : '';

  for (const prod of products) {
    let score = calculateProductSimilarity(ocrTitle, prod.name);

    const skus = Array.isArray(prod.skus) && prod.skus.length > 0
      ? prod.skus
      : [{ id: prod.id, sku: prod.sku || '', cogs_total: prod.cogs_total || 0 }];

    let matchedSku = null;
    if (normOcrSku) {
      matchedSku = skus.find(s => {
        const normS = removeVietnameseTones(s.sku || '').replace(/\s+/g, '');
        return normS === normOcrSku;
      });
      if (matchedSku) {
        score += 0.35; // Bonus for matching SKU
      }
    }

    if (!matchedSku && skus.length > 0) {
      matchedSku = skus[0];
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = {
        product: prod,
        skuVariant: matchedSku,
        score: Math.round(score * 100),
      };
    }
  }

  // Minimum threshold: 30% confidence
  if (highestScore >= 0.30) {
    return bestMatch;
  }

  return null;
}

/**
 * Products API
 */
export function getProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const list = raw ? JSON.parse(raw) : [];
    return list.map(computeProductMetrics);
  } catch (e) {
    console.error('Error reading products:', e);
    return [];
  }
}

export function saveProduct(productData) {
  const products = getProducts();
  const now = new Date().toISOString();
  let computed = computeProductMetrics(productData);

  if (computed.id) {
    // Update existing
    const index = products.findIndex(p => p.id === computed.id);
    if (index >= 0) {
      computed.updated_at = now;
      products[index] = computed;
    } else {
      computed.created_at = computed.created_at || now;
      computed.updated_at = now;
      products.push(computed);
    }
  } else {
    // Create new
    computed.id = generateUUID();
    computed.created_at = now;
    computed.updated_at = now;
    products.push(computed);
  }

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  triggerSync();
  return computed;
}

export function deleteProduct(productId) {
  const products = getProducts().filter(p => p.id !== productId);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  triggerSync();
  return true;
}

/**
 * Apply TikTok platform fees to ALL existing products and their SKUs
 */
export function applyFeesToAllProducts(feePercent, fixedFee) {
  const products = getProducts().map(p => {
    const updatedSkus = (p.skus || []).map(s => ({
      ...s,
      tiktok_fee_percent: Number(feePercent),
      tiktok_fixed_fee: Number(fixedFee),
    }));
    return computeProductMetrics({
      ...p,
      tiktok_fee_percent: Number(feePercent),
      tiktok_fixed_fee: Number(fixedFee),
      skus: updatedSkus,
      updated_at: new Date().toISOString(),
    });
  });

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  triggerSync();
  return products;
}

/**
 * Orders API
 */
export function getOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading orders:', e);
    return [];
  }
}

/**
 * Create Order with Cost Snapshot
 * Clones product costs of the exact SKU variant at this point in time!
 */
export function createOrderWithSnapshot(orderData, matchedProduct = null, matchedSkuVariant = null) {
  const now = new Date().toISOString();
  const id = orderData.id || generateUUID();
  const products = getProducts();

  let product = matchedProduct;
  let skuVar = matchedSkuVariant;

  // If no skuVar provided, search by orderData.sku
  if (!skuVar && orderData.sku) {
    const found = findSkuVariant(products, orderData.sku);
    if (found) {
      product = found.product;
      skuVar = found.skuVariant;
    }
  }

  // Fallback to product first sku if only product provided
  if (product && !skuVar && Array.isArray(product.skus) && product.skus.length > 0) {
    skuVar = product.skus[0];
  }

  // Cost snapshot calculation
  const cogs_snapshot = skuVar ? (skuVar.cogs_total || 0) : (product ? (product.cogs_total || 0) : (Number(orderData.cogs_snapshot) || 0));
  const cost_breakdown_snapshot = skuVar ? JSON.stringify(skuVar.components || []) : (orderData.cost_breakdown_snapshot || '[]');
  const expected_price_snapshot = skuVar ? (skuVar.expected_price || 0) : (Number(orderData.expected_price_snapshot) || 0);
  const fee_percent_snapshot = skuVar ? (skuVar.tiktok_fee_percent || 0) : (Number(orderData.tiktok_fee_percent_snapshot) || 0);
  const fixed_fee_snapshot = skuVar ? (skuVar.tiktok_fixed_fee || 0) : (Number(orderData.tiktok_fixed_fee_snapshot) || 0);
  const total_cost_snapshot = skuVar ? (skuVar.total_cost || 0) : (Number(orderData.total_cost_snapshot) || cogs_snapshot);

  const newOrder = {
    id,
    tracking_code: orderData.tracking_code || '',
    order_id: orderData.order_id || '',
    order_date: orderData.order_date || now.slice(0, 16).replace('T', ' '),
    product_id: product ? product.id : (orderData.product_id || null),
    sku_id: skuVar ? skuVar.id : null,
    product_name: orderData.product_name || (product ? product.name : ''),
    sku: orderData.sku || (skuVar ? skuVar.sku : ''),
    quantity: Number(orderData.quantity) || 1,
    customer_name: orderData.customer_name || '',
    customer_phone: orderData.customer_phone || '',
    
    // Snapshots
    cogs_snapshot,
    cost_breakdown_snapshot,
    expected_price_snapshot,
    tiktok_fee_percent_snapshot: fee_percent_snapshot,
    tiktok_fixed_fee_snapshot: fixed_fee_snapshot,
    total_cost_snapshot,

    // Settlement & Notes
    is_settled: Boolean(orderData.is_settled),
    settled_amount: orderData.settled_amount !== undefined && orderData.settled_amount !== null && orderData.settled_amount !== ''
      ? Number(orderData.settled_amount)
      : null,
    note: orderData.note || '',

    created_at: orderData.created_at || now,
    updated_at: now,
  };

  const orders = getOrders();
  const existingIdx = orders.findIndex(o => o.id === newOrder.id || (newOrder.tracking_code && o.tracking_code === newOrder.tracking_code));
  if (existingIdx >= 0) {
    orders[existingIdx] = { ...orders[existingIdx], ...newOrder, updated_at: now };
  } else {
    orders.unshift(newOrder);
  }

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  triggerSync();
  return newOrder;
}

export function batchCreateOrders(ordersList) {
  const products = getProducts();
  const productsBySku = new Map();
  products.forEach(p => {
    if (p.sku) productsBySku.set(p.sku.toLowerCase().trim(), p);
  });

  const createdOrders = [];
  for (const rawOrder of ordersList) {
    const skuKey = (rawOrder.sku || '').toLowerCase().trim();
    const matched = productsBySku.get(skuKey) || null;
    const ord = createOrderWithSnapshot(rawOrder, matched);
    createdOrders.push(ord);
  }
  return createdOrders;
}

export function updateOrderField(orderId, fields) {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index >= 0) {
    orders[index] = {
      ...orders[index],
      ...fields,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    triggerSync();
    return orders[index];
  }
  return null;
}

export function deleteOrder(orderId) {
  const orders = getOrders().filter(o => o.id !== orderId);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  triggerSync();
  return true;
}

/**
 * Helper to trigger sync event to Electron / Excel
 */
function triggerSync() {
  window.dispatchEvent(new CustomEvent('database-changed'));
  if (window.electronAPI && window.electronAPI.syncExcel) {
    window.electronAPI.syncExcel({
      orders: getOrders(),
      products: getProducts(),
    });
  }
}
