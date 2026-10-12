/**
 * Google Gemini Vision Service for TikTok Shop Shipping Label OCR
 * Uses gemini-1.5-flash with structured JSON output via response_mime_type: 'application/json'
 * Free tier: 15 RPM, 1,500 requests/day via Google AI Studio
 */

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
  let str = String(phone).trim();
  // Preserve asterisk masked phones like (+84)98*****97 or 098*****97
  return str;
}

/**
 * Scan shipping label using Google Gemini 1.5 Flash Vision
 * @param {File|Blob|string} imageFile - The shipping label image
 * @param {Object} options - { apiKey, shopName }
 * @returns {Promise<{ success: boolean, data?: Object, error?: string, isRateLimited?: boolean, retryAfter?: number }>}
 */
export async function scanOrderWithGemini(imageFile, options = {}) {
  const apiKey = (options.apiKey || '').trim();
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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Check Rate Limiting HTTP 429
    if (response.status === 429) {
      const retryHeader = response.headers.get('Retry-After');
      const retrySeconds = retryHeader ? parseInt(retryHeader, 10) : 10;
      return {
        success: false,
        isRateLimited: true,
        retryAfter: isNaN(retrySeconds) ? 10 : retrySeconds,
        error: `Đã chạm hạn mức Gemini Free Tier (15 lượt/phút). Cần chờ ${retrySeconds}s.`,
      };
    }

    if (!response.ok) {
      let errText = '';
      try {
        const errJson = await response.json();
        errText = errJson?.error?.message || response.statusText;
      } catch (e) {
        errText = await response.text();
      }
      return {
        success: false,
        error: `Lỗi Google Gemini (${response.status}): ${errText}`,
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
      // Fallback: clean markdown fences if present
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
 * @param {string} apiKey 
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function testGeminiApiKey(apiKey) {
  const key = (apiKey || '').trim();
  if (!key) {
    return { success: false, message: 'Vui lòng nhập API Key để kiểm tra' };
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
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
      return { success: true, message: 'Kết nối Google Gemini API thành công! API Key hoạt động tốt.' };
    }

    const errJson = await response.json().catch(() => ({}));
    const msg = errJson?.error?.message || `Mã phản hồi HTTP ${response.status}`;
    return { success: false, message: `Kiểm tra thất bại: ${msg}` };
  } catch (err) {
    return { success: false, message: `Lỗi kết nối: ${err.message}` };
  }
}
