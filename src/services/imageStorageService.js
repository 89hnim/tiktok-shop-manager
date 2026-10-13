/**
 * Order Label Image Storage Service
 * Stores compressed shipping label images in IndexedDB (completely separate from 5MB localStorage)
 * Features:
 * - Smart Canvas JPEG compression (~50-80KB per shipping label image, crystal clear text/barcodes)
 * - Automatic 30-day retention policy cleanup on app startup
 * - O(1) lookup by Order ID or Tracking Code
 */

const DB_NAME = 'tiktok_shop_label_images_db';
const DB_VERSION = 1;
const STORE_NAME = 'order_images';

let dbPromise = null;

/**
 * Open or initialize IndexedDB
 */
function getDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'order_id' });
          store.createIndex('tracking_code', 'tracking_code', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open error:', event.target?.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB initialization error:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Compress an image (File, Blob, Blob URL, or Data URL) into a compact JPEG Data URL
 * Typical shipping label size after compression: ~50KB - 85KB
 */
export async function compressLabelImage(fileOrUrl, maxDimension = 1280, quality = 0.76) {
  if (!fileOrUrl) return null;

  // Load source into an Image object
  const srcUrl = typeof fileOrUrl === 'string'
    ? fileOrUrl
    : URL.createObjectURL(fileOrUrl);

  const shouldRevoke = typeof fileOrUrl !== 'string';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 1000;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const sizeBytes = Math.round((dataUrl.length * 3) / 4);

        if (shouldRevoke) {
          URL.revokeObjectURL(srcUrl);
        }

        resolve({
          dataUrl,
          sizeBytes,
          width,
          height,
        });
      } catch (err) {
        if (shouldRevoke) URL.revokeObjectURL(srcUrl);
        console.warn('Canvas compression fallback:', err);
        resolve(null);
      }
    };

    img.onerror = () => {
      if (shouldRevoke) URL.revokeObjectURL(srcUrl);
      resolve(null);
    };

    img.src = srcUrl;
  });
}

/**
 * Save a shipping label image linked to an orderId and trackingCode
 */
export async function saveOrderImage({ orderId, trackingCode, fileOrUrl, createdAt }) {
  if (!orderId && !trackingCode) return false;
  if (!fileOrUrl) return false;

  const db = await getDb();
  if (!db) return false;

  const compressed = await compressLabelImage(fileOrUrl);
  if (!compressed || !compressed.dataUrl) return false;

  const normOrderId = String(orderId || trackingCode).trim();
  const normTracking = String(trackingCode || '').trim().toUpperCase();

  const record = {
    order_id: normOrderId,
    tracking_code: normTracking,
    data_url: compressed.dataUrl,
    size_bytes: compressed.sizeBytes,
    width: compressed.width,
    height: compressed.height,
    created_at: createdAt || Date.now(),
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);

      tx.oncomplete = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('order-images-changed'));
        }
        resolve(true);
      };

      tx.onerror = () => resolve(false);
    } catch (err) {
      console.warn('Error saving order image:', err);
      resolve(false);
    }
  });
}

/**
 * Retrieve a shipping label image by orderId or trackingCode
 */
export async function getOrderImage(orderId, trackingCode) {
  const db = await getDb();
  if (!db) return null;

  const normOrderId = String(orderId || '').trim();
  const normTracking = String(trackingCode || '').trim().toUpperCase();

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);

      if (normOrderId) {
        const getReq = store.get(normOrderId);
        getReq.onsuccess = () => {
          if (getReq.result) {
            resolve(getReq.result);
          } else if (normTracking) {
            // Fallback lookup by tracking_code index
            const idx = store.index('tracking_code');
            const idxReq = idx.get(normTracking);
            idxReq.onsuccess = () => resolve(idxReq.result || null);
            idxReq.onerror = () => resolve(null);
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      } else if (normTracking) {
        const idx = store.index('tracking_code');
        const idxReq = idx.get(normTracking);
        idxReq.onsuccess = () => resolve(idxReq.result || null);
        idxReq.onerror = () => resolve(null);
      } else {
        resolve(null);
      }
    } catch (err) {
      resolve(null);
    }
  });
}

/**
 * Delete a stored shipping label image by orderId and/or trackingCode
 */
export async function deleteOrderImage(orderId, trackingCode) {
  const db = await getDb();
  if (!db) return false;

  const normOrderId = String(orderId || '').trim();
  const normTracking = String(trackingCode || '').trim().toUpperCase();

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      if (normOrderId) {
        store.delete(normOrderId);
      }

      if (normTracking) {
        const idx = store.index('tracking_code');
        const keyReq = idx.getKey(normTracking);
        keyReq.onsuccess = () => {
          if (keyReq.result) {
            store.delete(keyReq.result);
          }
        };
      }

      tx.oncomplete = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('order-images-changed'));
        }
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
}

/**
 * Get summary of all stored images (keys & storage metrics) without loading heavy base64 strings
 */
export async function getOrderImagesMetadata() {
  const db = await getDb();
  const empty = { orderIds: new Set(), trackingCodes: new Set(), count: 0, totalBytes: 0 };
  if (!db) return empty;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      const orderIds = new Set();
      const trackingCodes = new Set();
      let count = 0;
      let totalBytes = 0;

      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const val = cursor.value;
          if (val.order_id) orderIds.add(val.order_id);
          if (val.tracking_code) trackingCodes.add(val.tracking_code.toUpperCase());
          count += 1;
          totalBytes += Number(val.size_bytes) || 0;
          cursor.continue();
        } else {
          resolve({ orderIds, trackingCodes, count, totalBytes });
        }
      };

      req.onerror = () => resolve(empty);
    } catch (err) {
      resolve(empty);
    }
  });
}

/**
 * Automatically delete images older than `retentionDays` (default: 30 days)
 * @param {number} retentionDays - Number of days to keep images (0 = keep forever)
 * @returns {Promise<{ deletedCount: number, remainingCount: number, totalBytes: number }>}
 */
export async function cleanupExpiredOrderImages(retentionDays = 30) {
  const days = Number(retentionDays);
  if (!days || days <= 0) {
    const meta = await getOrderImagesMetadata();
    return { deletedCount: 0, remainingCount: meta.count, totalBytes: meta.totalBytes };
  }

  const db = await getDb();
  if (!db) return { deletedCount: 0, remainingCount: 0, totalBytes: 0 };

  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      let deletedCount = 0;
      let remainingCount = 0;
      let totalBytes = 0;

      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const val = cursor.value;
          const createdAt = Number(val.created_at) || Date.now();
          if (createdAt < cutoffTime) {
            cursor.delete();
            deletedCount += 1;
          } else {
            remainingCount += 1;
            totalBytes += Number(val.size_bytes) || 0;
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        if (deletedCount > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('order-images-changed'));
        }
        resolve({ deletedCount, remainingCount, totalBytes });
      };

      tx.onerror = () => resolve({ deletedCount: 0, remainingCount: 0, totalBytes: 0 });
    } catch (err) {
      resolve({ deletedCount: 0, remainingCount: 0, totalBytes: 0 });
    }
  });
}

/**
 * Clear all stored label images
 */
export async function clearAllOrderImages() {
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();

      tx.oncomplete = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('order-images-changed'));
        }
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
}
