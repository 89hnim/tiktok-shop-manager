/**
 * Google Gemini Vision Service for TikTok Shop Shipping Label OCR
 * Uses dynamic model discovery (ModelService.ListModels) and candidate fallback
 * Supports gemini-1.5-flash, gemini-1.5-flash-latest, gemini-2.0-flash, gemini-1.5-pro across v1 and v1beta
 * Free tier: 15 RPM, 1,500 requests/day via Google AI Studio
 */

/**
 * Cache for the currently verified working model
 */
let cachedWorkingModel = null; // { key, apiVersion, modelName, displayName }

export function clearGeminiModelCache() {
  cachedWorkingModel = null;
}

export function getCachedWorkingModel() {
  return cachedWorkingModel;
}

/**
 * Fallback candidate models ordered by priority for Vision OCR
 */
export const STATIC_CANDIDATE_MODELS = [
  { apiVersion: 'v1', modelName: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash (v1)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash Latest (v1beta)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-1.5-flash-002', displayName: 'Gemini 1.5 Flash 002 (v1beta)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-1.5-flash-001', displayName: 'Gemini 1.5 Flash 001 (v1beta)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash (v1beta)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash Exp (v1beta)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash (v1beta)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-1.5-flash-8b', displayName: 'Gemini 1.5 Flash 8B (v1beta)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro Latest (v1beta)' },
  { apiVersion: 'v1', modelName: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro (v1)' },
  { apiVersion: 'v1beta', modelName: 'models/gemini-pro', displayName: 'Gemini Pro (v1beta)' },
];

/**
 * Convert File or Blob or URL to Base64 string and MIME type
 */
export async function fileToBase64(fileOrBlob) {
  if (typeof fileOrBlob === 'string') {
    // If it's a data URL
    if (fileOrBlob.startsWith('data:')) {
      const matches = fileOrBlob.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return { mimeType: matches[1], base64: matches[2] };
      }
    }
    // If it's a blob/object URL or http URL, fetch it
    const res = await fetch(fileOrBlob);
    const blob = await res.blob();
    return blobToBase64(blob);
  }
  return blobToBase64(fileOrBlob);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const matches = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        resolve({ mimeType: matches[1], base64: matches[2] });
      } else {
        reject(new Error('Không thể chuyển đổi ảnh sang Base64'));
      }
    };
    reader.onerror = () => reject(new Error('Lỗi đọc tệp ảnh'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Clean and normalize phone number
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).trim();
}

/**
 * Score a model candidate for suitability in vision/OCR tasks
 */
function scoreModelCandidate(candidate) {
  const name = (candidate.modelName || '').toLowerCase();
  let score = 0;

  if (name.includes('gemini-1.5-flash-latest')) score += 100;
  else if (name.includes('gemini-1.5-flash-002')) score += 95;
  else if (name.includes('gemini-1.5-flash-001')) score += 90;
  else if (name.includes('gemini-1.5-flash')) score += 85;
  else if (name.includes('gemini-2.0-flash')) score += 80;
  else if (name.includes('gemini-2.0-flash-exp')) score += 75;
  else if (name.includes('gemini-1.5-flash-8b')) score += 70;
  else if (name.includes('gemini-1.5-pro-latest')) score += 65;
  else if (name.includes('gemini-1.5-pro')) score += 60;
  else if (name.includes('flash')) score += 50;
  else if (name.includes('gemini')) score += 40;
  else score += 10;

  // Give slight preference to stable v1 if model is 1.5-flash
  if (candidate.apiVersion === 'v1' && name.includes('1.5-flash')) score += 5;

  return score;
}

/**
 * Dynamically discover available models for an API key across v1 and v1beta
 */
export async function discoverGeminiModels(apiKey) {
  const key = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!key) return [];

  const versions = ['v1', 'v1beta'];
  const discovered = [];

  for (const ver of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${key}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data.models)) {
        for (const m of data.models) {
          if (Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')) {
            const rawName = m.name || '';
            const fullModelName = rawName.startsWith('models/') ? rawName : `models/${rawName}`;
            discovered.push({
              apiVersion: ver,
              modelName: fullModelName,
              displayName: m.displayName || rawName,
            });
          }
        }
      }
    } catch (e) {
      // Continue to next API version
    }
  }

  return discovered;
}

/**
 * Resolve an ordered list of viable model candidates for the given API Key
 */
export async function resolveGeminiModel(apiKey, options = { forceRefresh: false }) {
  const key = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!key) {
    throw new Error('Chưa cung cấp API Key');
  }

  if (!options.forceRefresh && cachedWorkingModel && cachedWorkingModel.key === key) {
    return {
      activeCandidate: cachedWorkingModel,
      candidates: [
        cachedWorkingModel,
        ...STATIC_CANDIDATE_MODELS.filter(
          c => !(c.apiVersion === cachedWorkingModel.apiVersion && c.modelName === cachedWorkingModel.modelName)
        ),
      ],
    };
  }

  // 1. Try dynamic discovery via ListModels
  let discovered = [];
  try {
    discovered = await discoverGeminiModels(key);
  } catch (e) {
    discovered = [];
  }

  let candidates = [];
  if (discovered.length > 0) {
    // Sort discovered models by score descending
    candidates = discovered.sort((a, b) => scoreModelCandidate(b) - scoreModelCandidate(a));
    // Append any static candidates that might not have appeared in ListModels
    for (const stat of STATIC_CANDIDATE_MODELS) {
      if (!candidates.some(c => c.apiVersion === stat.apiVersion && c.modelName === stat.modelName)) {
        candidates.push(stat);
      }
    }
  } else {
    // Fallback directly to static list
    candidates = [...STATIC_CANDIDATE_MODELS];
  }

  // Deduplicate candidates
  const seen = new Set();
  const uniqueCandidates = [];
  for (const c of candidates) {
    const id = `${c.apiVersion}:${c.modelName}`;
    if (!seen.has(id)) {
      seen.add(id);
      uniqueCandidates.push(c);
    }
  }

  return {
    activeCandidate: uniqueCandidates[0],
    candidates: uniqueCandidates,
  };
}

/**
 * Scan shipping label using Google Gemini Vision
 * Automatically tries best candidate model and gracefully falls back if 404 occurs
 * @param {File|Blob|string} imageFile - The shipping label image
 * @param {Object} options - { apiKey, shopName }
 * @returns {Promise<{ success: boolean, data?: Object, error?: string, isRateLimited?: boolean, retryAfter?: number, modelUsed?: string }>}
 */
export async function scanOrderWithGemini(imageFile, options = {}) {
  const apiKey = (options.apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    return {
      success: false,
      error: 'Chưa cấu hình Google Gemini API Key. Vui lòng vào Cài Đặt (⚙️) để nhập API Key.',
    };
  }

  const shopName = (options.shopName || options.shop_name || '').trim();

  try {
    const { mimeType, base64 } = await fileToBase64(imageFile);

    const prompt = `Bạn là hệ thống AI chuyên gia bóc tách dữ liệu từ nhãn in vận đơn TikTok Shop (Việt Nam).
Hãy phân tích kỹ hình ảnh nhãn vận đơn này và trích xuất dữ liệu chính xác dưới dạng JSON.

CÁC TRƯỜNG DỮ LIỆU CẦN TRÍCH XUẤT:
1. tracking_code: Mã vận đơn (thường in đậm, nằm gần mã vạch barcode, ví dụ: JT0001234567, SPX00012345, VN123456789, EMS12345678, độ dài thường 10-16 ký tự).
2. order_id: Mã đơn hàng TikTok Shop (thường bắt đầu bằng 57... dài khoảng 14-16 số, nếu trên tem không có thì để rỗng "").
3. order_date: Ngày tạo hoặc ngày in đơn theo chuẩn YYYY-MM-DD (nếu có trên tem, nếu không có để rỗng "").
4. customer_name: Tên người nhận hàng.
   - QUAN TRỌNG: TUYỆT ĐỐI BỎ QUA tên Người gửi / Tên Shop bán hàng (ví dụ: "${shopName || 'Nuôi cá cùng Jun'}" hoặc phần "Người gửi").
   - Chỉ lấy tên Người Nhận (ở phần "Người nhận" / "Đến:").
5. customer_phone: Số điện thoại của người nhận hàng.
   - Giữ nguyên các dấu sao che bảo mật nếu có, ví dụ: (+84)98*****97 hoặc 098*****97.
   - Bỏ qua số điện thoại của Người gửi / Shop.
6. items: Danh sách TẤT CẢ các sản phẩm trong đơn hàng. Mỗi sản phẩm gồm:
   - product_name: Tên sản phẩm đầy đủ và chuẩn xác.
   - sku: Phân loại hàng / Mã SKU chi tiết (ví dụ: "Hũ 10g", "Hũ chiết lẻ 20g", "Size L - Màu Đỏ",...). Nếu không có phân loại thì để rỗng "".
   - quantity: Số lượng sản phẩm (số nguyên, mặc định là 1 nếu không ghi).

LƯU Ý QUAN TRỌNG:
- Một đơn hàng có thể có nhiều sản phẩm hoặc nhiều phân loại SKU, hãy trích xuất đầy đủ tất cả vào mảng "items".
- Trả về kết quả hoàn toàn bằng JSON hợp lệ tuân thủ cấu trúc trên.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    // Obtain model candidates
    let candidates = [];
    if (cachedWorkingModel && cachedWorkingModel.key === apiKey) {
      candidates = [
        cachedWorkingModel,
        ...STATIC_CANDIDATE_MODELS.filter(
          c => !(c.apiVersion === cachedWorkingModel.apiVersion && c.modelName === cachedWorkingModel.modelName)
        ),
      ];
    } else {
      const resolved = await resolveGeminiModel(apiKey);
      candidates = resolved.candidates || STATIC_CANDIDATE_MODELS;
    }

    let response = null;
    let successfulCandidate = null;
    let lastError = '';

    for (const cand of candidates) {
      const apiUrl = `https://generativelanguage.googleapis.com/${cand.apiVersion}/${cand.modelName}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        // HTTP 429 Rate Limiting
        if (res.status === 429) {
          const retryHeader = res.headers.get('Retry-After');
          const retrySeconds = retryHeader ? parseInt(retryHeader, 10) : 10;
          return {
            success: false,
            isRateLimited: true,
            retryAfter: isNaN(retrySeconds) ? 10 : retrySeconds,
            error: `Đã chạm hạn mức Gemini Free Tier (15 lượt/phút). Cần chờ ${retrySeconds}s.`,
          };
        }

        if (res.ok) {
          response = res;
          successfulCandidate = cand;
          cachedWorkingModel = {
            key: apiKey,
            apiVersion: cand.apiVersion,
            modelName: cand.modelName,
            displayName: cand.displayName || cand.modelName,
          };
          break;
        }

        // Handle error: If 404 (model not found), continue trying next candidate
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;

        if (res.status === 400 && lastError.toLowerCase().includes('api key')) {
          break; // Stop immediately if API key itself is invalid
        }
      } catch (fetchErr) {
        lastError = fetchErr.message;
      }
    }

    if (!response || !response.ok) {
      return {
        success: false,
        error: `Lỗi Google Gemini: ${lastError || 'Không thể kết nối đến model khả dụng'}`,
      };
    }

    const resData = await response.json();
    const candidate = resData.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      return {
        success: false,
        error: 'Gemini không trả về nội dung nhận diện được từ hình ảnh.',
      };
    }

    let parsed = {};
    try {
      parsed = JSON.parse(textPart);
    } catch (parseErr) {
      // Fallback: clean markdown code fence if present
      const cleaned = textPart.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Standardize items array
    const rawItems = Array.isArray(parsed.items) && parsed.items.length > 0
      ? parsed.items
      : [{
          product_name: parsed.product_name || '',
          sku: parsed.sku || '',
          quantity: parsed.quantity || 1,
        }];

    const standardizedItems = rawItems.map(it => ({
      product_name: (it.product_name || '').trim(),
      sku: (it.sku || '').trim(),
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    }));

    const resultData = {
      tracking_code: (parsed.tracking_code || '').trim(),
      order_id: (parsed.order_id || '').trim(),
      order_date: (parsed.order_date || '').trim(),
      customer_name: (parsed.customer_name || '').trim(),
      customer_phone: cleanPhoneNumber(parsed.customer_phone),
      items: standardizedItems,
      // Backward compatibility fields for single-item expectations
      product_name: standardizedItems[0]?.product_name || '',
      sku: standardizedItems[0]?.sku || '',
      quantity: standardizedItems[0]?.quantity || 1,
    };

    return {
      success: true,
      data: resultData,
      modelUsed: successfulCandidate ? `${successfulCandidate.modelName} (${successfulCandidate.apiVersion})` : undefined,
      previewUrl: typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile),
    };
  } catch (err) {
    console.error('Gemini Vision Error:', err);
    return {
      success: false,
      error: err.message || 'Lỗi kết nối tới dịch vụ Google Gemini',
    };
  }
}

/**
 * Test if a given Gemini API Key is valid
 * Dynamically queries available models via ListModels and verifies with live ping
 * @param {string} apiKey 
 * @returns {Promise<{ success: boolean, message: string, model?: string, apiVersion?: string }>}
 */
export async function testGeminiApiKey(apiKey) {
  const key = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!key) {
    return { success: false, message: 'Vui lòng nhập API Key để kiểm tra' };
  }

  try {
    const { candidates } = await resolveGeminiModel(key, { forceRefresh: true });
    let lastError = '';

    for (const cand of candidates) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/${cand.apiVersion}/${cand.modelName}:generateContent?key=${key}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Trả về chuỗi "OK"' }],
              },
            ],
          }),
        });

        if (response.ok) {
          // Success! Save working model to cache
          cachedWorkingModel = {
            key,
            apiVersion: cand.apiVersion,
            modelName: cand.modelName,
            displayName: cand.displayName || cand.modelName,
          };
          const cleanModelName = cand.modelName.replace(/^models\//, '');
          return {
            success: true,
            message: `Kết nối thành công! Đã tự động nhận diện và kích hoạt model ${cleanModelName} (${cand.apiVersion}).`,
            model: cand.modelName,
            apiVersion: cand.apiVersion,
          };
        }

        const errJson = await response.json().catch(() => ({}));
        lastError = errJson?.error?.message || `Mã HTTP ${response.status} ${response.statusText}`;

        // If the key itself is invalid, stop cycling immediately
        if (response.status === 400 && lastError.toLowerCase().includes('api key not valid')) {
          break;
        }
      } catch (reqErr) {
        lastError = reqErr.message;
      }
    }

    return {
      success: false,
      message: `Kiểm tra thất bại: ${lastError || 'Không tìm thấy model phù hợp cho API Key này'}`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Lỗi kết nối: ${err.message}`,
    };
  }
}
