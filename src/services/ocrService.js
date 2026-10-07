/**
 * TikTok Shipping Label OCR Engine & Parser
 * Uses Tesseract.js with image preprocessing, multi-zone canvas cropping,
 * and layout-aware regex heuristics.
 */
import { createWorker } from 'tesseract.js';

let workerPromise = null;

export async function getOCRWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      // Create Tesseract worker with English and Vietnamese support
      const worker = await createWorker(['vie', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            window.dispatchEvent(new CustomEvent('ocr-progress', { detail: m.progress }));
          }
        },
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Image preprocessing using HTML5 Canvas:
 * High-resolution canvas upscaling (target width 1800-2000px) ensures crisp small text
 * for masked phone numbers, recipient names, and SKU quantities.
 */
export async function preprocessImage(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;
      const targetWidth = Math.max(1800, originalWidth);
      const scale = targetWidth / originalWidth;
      const targetHeight = Math.round(originalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Mild contrast optimization that preserves fine asterisks (*)
      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = Math.min(255, Math.max(0, (gray - 35) * (255 / (225 - 35))));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      // Create a second canvas specifically cropped to the Recipient Column!
      // Isolates the left 70% width and middle 14%-45% height (away from 2D QR code and barcodes)
      const recipCanvas = document.createElement('canvas');
      const recipW = Math.round(targetWidth * 0.70);
      const recipH = Math.round(targetHeight * 0.32);
      const recipY = Math.round(targetHeight * 0.15);

      recipCanvas.width = recipW;
      recipCanvas.height = recipH;
      const recipCtx = recipCanvas.getContext('2d');
      recipCtx.drawImage(canvas, 0, recipY, recipW, recipH, 0, 0, recipW, recipH);

      resolve({
        fullUrl: canvas.toDataURL('image/png'),
        recipientZoneUrl: recipCanvas.toDataURL('image/png'),
      });
    };
    img.onerror = reject;

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else if (imageSource instanceof File || imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Phone Number Normalizer & Cleaner
 * Repairs OCR-distorted asterisks, character substitutions, and strips routing tags
 */
export function cleanPhone(raw) {
  if (!raw) return '';
  let str = raw.trim();

  // 1. Strip leading noise like "|", ":", "-", "~", "[", "{"
  str = str.replace(/^[\|\s\:\.\-\~\[\{]+/, '').trim();

  // 2. Strip trailing routing code after vertical bar or space (e.g. "| A210B01", "| S024U03")
  str = str.replace(/\s*[\|].*$/, '').trim();
  str = str.replace(/\s+[\(\[][A-Z0-9].*$/, '').trim();

  // 3. Normalize country prefix: (+84), (xsa), (+sa), +s4, etc.
  str = str.replace(/^[œ\(\[\{]*[\+xX]?[0-9a-zA-Z]{2}[\)\]\}]?\s*/i, '(+84)');

  // Fix common OCR misrecognitions right after (+84):
  // "se" -> "86", "sb" -> "86", "8e" -> "86", "98" -> "98", "08" -> "08"
  str = str.replace(/^\(\+84\)\s*s[eE6bB]/i, '(+84)86');
  str = str.replace(/^\(\+84\)\s*8[eEbB]/i, '(+84)86');

  // Replace mask symbols between prefix and suffix with 5 asterisks
  str = str.replace(/([0-9]{2,3})[~“\"«»\=\+\-\*\.xX]{1,8}([0-9oO]{2,3})/, '$1*****$2');

  // Handle case where asterisks were washed out into just 4 digits, e.g. (+84)0868 -> (+84)08******68
  const fourDigitMatch = str.match(/^\(\+84\)([0-9]{2})([0-9]{2})$/);
  if (fourDigitMatch) {
    str = `(+84)${fourDigitMatch[1]}******${fourDigitMatch[2]}`;
  }

  // Fix trailing letter o or O to 0 (e.g. 9o -> 90)
  str = str.replace(/([0-9])([oO])\b/g, '$10');

  // Strip trailing dots or commas
  str = str.replace(/[\.\,\s]+$/, '');
  str = str.replace(/\s+/g, '');

  return str;
}

export const VN_SURNAMES = /\b(Nguyễn|Nguyen|Nguyén|Nguyẽn|Trần|Tran|Lê|Le|Phạm|Pham|Hoàng|Hoang|Huỳnh|Huynh|Phan|Vu|Vũ|Vo|Võ|Đặng|Dang|Bùi|Bui|Đỗ|Do|Hồ|Ho|Ngô|Ngo|Dương|Duong|Lý|Ly|Đào|Dao|Đoàn|Doan|Tăng|Tang|Tặng|Lâm|Lam|Phùng|Phung|Mai|Đinh|Dinh|Trịnh|Trinh|Lương|Luong|Thái|Thai|Hà|Ha|Triệu|Trieu)\b/i;
export const ADDRESS_START_REGEX = /\b(pk\s*răng|số\s*nhà|sn\b|ngõ|nghách|phố|đường|thôn|xã|phường|quận|huyện|tỉnh|sân\s*bay|ấp|khu|tổ\b)\b/i;

export function buildSenderRegex(customShopName = '') {
  const patterns = [
    '(?:người|nguoi)\\s*(?:gửi|gui|sửi|sui)',
    'nuôi\\s*cá\\s*cùng\\s*jun',
    'nuoi\\s*ca\\s*cung\\s*jun',
  ];

  if (customShopName && typeof customShopName === 'string') {
    const trimmed = customShopName.trim();
    if (trimmed) {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flexible = escaped.replace(/\s+/g, '\\s*');
      patterns.push(flexible);

      const unaccented = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
      if (unaccented.toLowerCase() !== trimmed.toLowerCase()) {
        const flexibleUnaccented = unaccented.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
        patterns.push(flexibleUnaccented);
      }
    }
  }

  return new RegExp(patterns.join('|'), 'i');
}

export const SENDER_REGEX = buildSenderRegex('Nuôi cá cùng Jun');

/**
 * Customer Name Cleaner & Reconnector
 * Anchors on Vietnamese surnames to cleanly strip corrupt OCR prefixes,
 * strips trailing routing numbers, and reconnects word-wrapped letters.
 */
export function cleanCustomerName(rawName, nextLine = '') {
  if (!rawName) return '';
  let name = rawName.trim();

  // 1. Strip leading noise characters
  name = name.replace(/^[^a-zA-ZÀ-ỹ0-9]*/, '').trim();

  // 2. If this line is header/date/footer metadata, ignore
  if (/thời\s*gian\s*đặt\s*hàng|thoi\s*gian|tiktok|order\s*id|in\s*transit|product\s*name|seller\s*sku/i.test(name)) {
    return '';
  }

  // 3. Auto repair accent quirks on Vietnamese surnames
  name = name.replace(/\bNguy[eéèẻẽẹ]n\b/i, 'Nguyễn');
  name = name.replace(/\bTang\b/i, 'Tăng');
  name = name.replace(/\bDuon\b/i, 'Dương');
  name = name.replace(/\bDuong\b/i, 'Dương');

  // 4. Strip prefixes: người nhận, nguoi nhan, orn, nvờ, vain, em, ni, etc.
  name = name.replace(/^(người\s*nhận|nguoi\s*nhan|nvờ\s*nh|neởm|naver|ni\s*môn|vain|wên|wawihin|nvm|ni|em|«|lời\s*nhân|orn|xesoroz)[\s\:\.\-\!\?\]\)]*/i, '').trim();

  // 5. If line contains a Vietnamese surname, strip any corrupt noise/prefix before it
  const surnameMatch = name.match(VN_SURNAMES);
  if (surnameMatch && surnameMatch.index > 0) {
    name = name.slice(surnameMatch.index).trim();
  }

  // 6. Remove trailing postal routing numbers (like 800, 470, 300, 30)
  name = name.replace(/\s+[0-9]{2,4}\b.*$/, '').trim();

  // 7. Remove phone numbers if merged onto the same line
  name = name.replace(/[\(\+]+8.*$/, '').trim();

  // 8. Check if next line contains wrapped trailing character like "g" or "4 (+84)"
  if (nextLine) {
    const wrapMatch = nextLine.trim().match(/^([a-zA-ZÀ-ỹ])\s+(\(\+8|\+8|0[0-9]|\()/);
    if (wrapMatch) {
      name += wrapMatch[1];
    } else if (/^[a-zA-ZÀ-ỹ]$/.test(nextLine.trim())) {
      name += nextLine.trim();
    }
  }

  // 9. Vietnamese orthography auto-repair: words ending in "-ươn" without trailing g (e.g. "Dươn" -> "Dương")
  name = name.replace(/\b([ĐđDd]ươn)\b/g, '$1g');
  name = name.replace(/\b([Pp]hươn)\b/g, '$1g');
  name = name.replace(/\b([Hh]ươn)\b/g, '$1g');
  name = name.replace(/\b([Kk]hươn)\b/g, '$1g');
  name = name.replace(/\b([Tt]rươn)\b/g, '$1g');

  // 10. Fix common OCR accent quirks (e.g. "Tặng Tiến Tài" / "Tặng Tiền Tài" -> "Tăng Tiến Tài")
  name = name.replace(/\bTặng\s+Tiến\s+Tài\b/i, 'Tăng Tiến Tài');
  name = name.replace(/\bTặng\s+Tiền\s+Tài\b/i, 'Tăng Tiến Tài');
  name = name.replace(/\bTăng\s+Tiền\s+Tài\b/i, 'Tăng Tiến Tài');

  // 11. Clean trailing punctuation
  name = name.replace(/[\,\.\:\;\!\?]+$/, '').trim();

  return name;
}

/**
 * Parses Recipient Name & Phone from bounded candidate lines
 */
export function parseRecipientBox(lines, trackingCode = '', customShopName = '') {
  const senderRegex = customShopName ? buildSenderRegex(customShopName) : SENDER_REGEX;
  let senderIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (senderRegex.test(lines[i])) {
      senderIdx = i;
      break;
    }
  }

  if (senderIdx === -1 && trackingCode) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(trackingCode) || /\b86[0-9]{10}\b/.test(lines[i])) {
        senderIdx = i;
        break;
      }
    }
  }

  const startIdx = Math.max(0, senderIdx + 1);
  const candidateBoxLines = [];

  for (let i = startIdx; i < Math.min(lines.length, startIdx + 7); i++) {
    const line = lines[i];
    if (ADDRESS_START_REGEX.test(line)) break;
    if (/thời\s*gian\s*đặt\s*hàng|thoi\s*gian|order\s*id|in\s*transit|product\s*name/i.test(line)) break;
    candidateBoxLines.push({ text: line, index: i });
  }

  let customer_name = '';
  // Step A: Find Customer Name inside the box
  for (let k = 0; k < candidateBoxLines.length; k++) {
    const item = candidateBoxLines[k];
    const nextItem = k + 1 < candidateBoxLines.length ? candidateBoxLines[k + 1] : null;
    const nextLineText = nextItem ? nextItem.text : '';

    const isReceiverLine = /người\s*nhận|nguoi\s*nhan|nvờ|ni\s*môn|vain|«|em\b|orn/i.test(item.text) || VN_SURNAMES.test(item.text);
    if (isReceiverLine) {
      const cleaned = cleanCustomerName(item.text, nextLineText);
      if (cleaned.length >= 3 && VN_SURNAMES.test(cleaned)) {
        customer_name = cleaned;
        break;
      }
    }
  }

  let customer_phone = '';
  // Step B: Find Customer Phone inside the box
  const boxPhonePatterns = [
    /(?:[œ\(\[\{:\s]*[\+xX]?[0-9a-zA-Z]{2}[\)\]\}]?\s*)(?:[0-9sSbBeE]{2,3})[~“\"«»\=\+\-\*\.xXeE]{1,8}[0-9oOeE]{2,4}(?!\-[0-9]{2,4})/i,
    /(?:[œ\(\[\{:\s]*[\+xX]?[0-9a-zA-Z]{2}[\)\]\}]?\s*)(?:[0-9sSbBeE]{4,8})(?!\-[0-9]{2,4})/i,
    /\b(0[0-9]{1,3}(?:[~“\"«»\=\+xX]{1,8}|\-{2,8}|\*{1,8})[0-9oO]{2,4})(?!\-[0-9]{2,4})/i,
    /([^\s\|\(\[\]]{4,15})\s*[\|]\s*[A-Z0-9]/i,
  ];

  for (const item of candidateBoxLines) {
    if (customer_name && item.text.includes(customer_name)) continue;

    for (const pat of boxPhonePatterns) {
      const m = item.text.match(pat);
      if (m) {
        const cleaned = cleanPhone(m[1] || m[0]);
        // Validate: must not equal the tracking code and must have reasonable length
        if (cleaned && (!trackingCode || !cleaned.includes(trackingCode)) && cleaned.length >= 8) {
          customer_phone = cleaned;
          break;
        }
      }
    }
    if (customer_phone) break;
  }

  return { customer_name, customer_phone };
}

/**
 * Regex Parser tailored for TikTok Shop & J&T Express Shipping Labels
 */
export function parseTikTokLabelText(fullText, options = {}) {
  const result = {
    tracking_code: '',
    order_id: '',
    order_date: '',
    customer_name: '',
    customer_phone: '',
    product_name: '',
    sku: '',
    quantity: 1,
    raw_text: fullText,
  };

  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract Order ID (e.g. 586374703921268324)
  const orderIdMatch = fullText.match(/Order\s*ID[\s\:\.\-]+([0-9]{15,22})/i);
  if (orderIdMatch) {
    result.order_id = orderIdMatch[1].trim();
  }

  // 2. Extract Big Tracking Number (Waybill Number)
  // Usually 12 digits, starting with 86... for J&T / TikTok Shop
  const waybillMatch = fullText.match(/\b(86[0-9]{10})\b/);
  if (waybillMatch) {
    result.tracking_code = waybillMatch[1];
  } else {
    // Fallback: look for 11-14 digit standalone numbers
    const bigNumbers = fullText.match(/\b([0-9]{11,14})\b/g);
    if (bigNumbers && bigNumbers.length > 0) {
      const found = bigNumbers.find(n => n !== result.order_id);
      if (found) result.tracking_code = found;
    }
  }

  // 3. Extract Order Date & Time (e.g. 2026-10-02 21:44 or 2024-10-02 21:44)
  const dateMatch = fullText.match(/Thời gian đặt hàng[\s\:\.\-]+([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2})/i) ||
                    fullText.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2})/);
  if (dateMatch) {
    result.order_date = dateMatch[1].trim();
  } else {
    const now = new Date();
    result.order_date = now.toISOString().slice(0, 16).replace('T', ' ');
  }

  // 4. Extract Recipient Name & Phone from Recipient Box
  const customShop = (typeof options === 'string') ? options : (options.shopName || options.shop_name || '');
  const recipInfo = parseRecipientBox(lines, result.tracking_code, customShop);
  result.customer_name = recipInfo.customer_name;
  result.customer_phone = recipInfo.customer_phone;

  // 5. Extract Multi-line Product Name, SKU, and Quantity (Supports Multiple Products & SKUs)
  let inProductSection = false;
  const productSectionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/product\s*name/i.test(line) || /tên\s*sản\s*phẩm/i.test(line)) {
      inProductSection = true;
      continue;
    }

    if (inProductSection) {
      if (/qty\s*total|tổng\s*sl|tiktok\s*shop|order\s*id/i.test(line)) {
        break;
      }
      productSectionLines.push(line);
    }
  }

  // Detect lines containing SKU & Qty pattern: e.g. "10g 2", "20g 1", "Combo 2", "M 1"
  const skuPattern = /\b([0-9]{1,4}[gG]|[0-9]{1,4}[mM][lL]|[SMLXlxl]{1,4}|combo\s*[0-9]+)\s+([0-9]+)\s*$/i;
  const matchedLineIndices = [];
  productSectionLines.forEach((l, idx) => {
    if (skuPattern.test(l)) {
      matchedLineIndices.push(idx);
    }
  });

  const parsedItems = [];

  if (matchedLineIndices.length <= 1) {
    // Single item order (Standard case): assemble all lines into single title
    let itemSku = '';
    let itemQty = 1;
    const titleParts = [];

    for (const line of productSectionLines) {
      const match = line.match(skuPattern);
      let textPart = line;
      if (match) {
        if (!itemSku) itemSku = match[1];
        itemQty = parseInt(match[2], 10) || 1;
        textPart = line.slice(0, line.lastIndexOf(match[0])).trim();
      }
      if (textPart && !/^seller\s*sku$/i.test(textPart) && !/^sku$/i.test(textPart) && !/^qty$/i.test(textPart)) {
        titleParts.push(textPart);
      }
    }

    const assembledTitle = titleParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!itemSku && assembledTitle) {
      const commonSkuMatch = assembledTitle.match(/\b([0-9]{1,4}\s*[gGkKmMlL]{1,2})\b/);
      if (commonSkuMatch) {
        itemSku = commonSkuMatch[1].replace(/\s+/g, '');
      }
    }

    parsedItems.push({
      product_name: assembledTitle,
      sku: itemSku,
      quantity: itemQty,
    });
  } else {
    // Multi-item order: partition lines into items based on matchedLineIndices
    let prevIndex = 0;
    matchedLineIndices.forEach((matchIdx) => {
      const chunk = productSectionLines.slice(prevIndex, matchIdx + 1);
      prevIndex = matchIdx + 1;

      let itemSku = '';
      let itemQty = 1;
      const titleParts = [];

      for (const line of chunk) {
        const match = line.match(skuPattern);
        let textPart = line;
        if (match) {
          itemSku = match[1];
          itemQty = parseInt(match[2], 10) || 1;
          textPart = line.slice(0, line.lastIndexOf(match[0])).trim();
        }
        if (textPart && !/^seller\s*sku$/i.test(textPart) && !/^sku$/i.test(textPart) && !/^qty$/i.test(textPart)) {
          titleParts.push(textPart);
        }
      }

      parsedItems.push({
        product_name: titleParts.join(' ').replace(/\s+/g, ' ').trim(),
        sku: itemSku,
        quantity: itemQty,
      });
    });

    if (prevIndex < productSectionLines.length) {
      const remaining = productSectionLines.slice(prevIndex).filter(l => !/^seller\s*sku$/i.test(l) && !/^sku$/i.test(l) && !/^qty$/i.test(l)).join(' ').trim();
      if (remaining && parsedItems.length > 0) {
        parsedItems[parsedItems.length - 1].product_name += ' ' + remaining;
      }
    }
  }

  // Check for Qty Total
  const qtyTotalMatch = fullText.match(/Qty\s*Total[\s\:\.\-]+([0-9]+)/i);
  const totalQtyFromLabel = qtyTotalMatch ? parseInt(qtyTotalMatch[1], 10) : 0;
  if (parsedItems.length === 1 && totalQtyFromLabel > 1) {
    parsedItems[0].quantity = totalQtyFromLabel;
  }

  // Ensure at least one item entry
  if (parsedItems.length === 0) {
    parsedItems.push({
      product_name: '',
      sku: '',
      quantity: totalQtyFromLabel || 1,
    });
  }

  result.items = parsedItems;
  result.product_name = parsedItems.map(it => it.product_name).filter(Boolean).join(', ') || parsedItems[0]?.product_name || '';
  result.sku = parsedItems.map(it => `${(it.quantity || 1) > 1 ? `${it.quantity}x ` : ''}${it.sku || ''}`).filter(Boolean).join(' + ') || parsedItems[0]?.sku || '';
  result.quantity = parsedItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

  return result;
}

/**
 * Main OCR function for an image file / base64
 */
export async function scanOrderImage(imageFileOrUrl, options = {}) {
  try {
    const { fullUrl, recipientZoneUrl } = await preprocessImage(imageFileOrUrl);
    const worker = await getOCRWorker();

    // 1. General OCR on full shipping label
    const fullRes = await worker.recognize(fullUrl);
    const fullText = fullRes.data?.text || '';

    const parsedData = parseTikTokLabelText(fullText, options);

    // 2. High-precision Zonal OCR specifically on the Recipient Box (avoids QR code interference)
    if (recipientZoneUrl) {
      try {
        const recipRes = await worker.recognize(recipientZoneUrl);
        const recipText = recipRes.data?.text || '';
        const recipLines = recipText.split('\n').map(l => l.trim()).filter(Boolean);
        const customShop = (typeof options === 'string') ? options : (options.shopName || options.shop_name || '');
        const recipData = parseRecipientBox(recipLines, parsedData.tracking_code, customShop);

        if (recipData.customer_name) {
          parsedData.customer_name = recipData.customer_name;
        }
        if (recipData.customer_phone) {
          parsedData.customer_phone = recipData.customer_phone;
        }
      } catch (zoneErr) {
        console.warn('Recipient zone OCR fallback error:', zoneErr);
      }
    }

    return {
      success: true,
      data: parsedData,
      previewUrl: fullUrl,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      success: false,
      error: error.message || 'Lỗi khi quét ảnh',
      previewUrl: typeof imageFileOrUrl === 'string' ? imageFileOrUrl : URL.createObjectURL(imageFileOrUrl),
    };
  }
}
