/**
 * Phone and Customer Intelligence Analysis Service
 * Handles phone normalization, masking pattern matching, and identity resolution.
 */

/**
 * Normalize phone string into standard format.
 * Converts (+84) or +84 to 0 prefix, removes non-alphanumeric except *
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim();
  // Replace (+84)0 or (+84) or +840 or +84 with single 0
  cleaned = cleaned.replace(/^\(\+84\)0?/, '0').replace(/^\+84\s*0?/, '0');
  // Remove spaces, hyphens, dots
  cleaned = cleaned.replace(/[\s\-\.]/g, '');
  return cleaned;
}

/**
 * Check if a phone contains mask characters (* or x)
 */
export function isMasked(phone) {
  return /[\*xX]/.test(phone || '');
}

/**
 * Deconstruct a phone into prefix, mask, suffix parts
 * e.g., "098*****97" => { prefix: "098", maskLength: 5, suffix: "97", totalLength: 10 }
 */
export function parsePhonePattern(phone) {
  const norm = normalizePhone(phone);
  if (!isMasked(norm)) {
    return {
      isMasked: false,
      raw: norm,
      prefix: norm.slice(0, 3),
      suffix: norm.slice(-2),
      length: norm.length,
    };
  }

  const match = norm.match(/^([0-9]+)([\*xX]+)([0-9]+)$/);
  if (match) {
    return {
      isMasked: true,
      raw: norm,
      prefix: match[1],
      maskLength: match[2].length,
      suffix: match[3],
      length: norm.length,
    };
  }

  return {
    isMasked: true,
    raw: norm,
    prefix: norm.slice(0, 2),
    suffix: norm.slice(-2),
    length: norm.length,
  };
}

/**
 * Compares two phone numbers to see if they can be the same phone number.
 * Can match:
 * - Exact matches: 0981234567 === 0981234567
 * - Mask vs Unmasked: 098*****97 matches 0987654197
 * - Mask vs Mask: 098*****97 matches 098****97
 */
export function matchPhonePattern(phoneA, phoneB) {
  const pA = parsePhonePattern(phoneA);
  const pB = parsePhonePattern(phoneB);

  if (!pA.raw || !pB.raw) return { match: false, confidence: 'none' };

  if (pA.raw === pB.raw) {
    return { match: true, confidence: 'exact', details: 'Trùng khớp 100%' };
  }

  // If one is masked and other is not
  if (pA.isMasked && !pB.isMasked) {
    const prefixMatch = pB.raw.startsWith(pA.prefix);
    const suffixMatch = pB.raw.endsWith(pA.suffix);
    const lengthMatch = Math.abs(pB.length - pA.length) <= 1; // allow 10 vs 11
    if (prefixMatch && suffixMatch && lengthMatch) {
      return {
        match: true,
        confidence: 'high',
        resolvedPhone: pB.raw,
        details: `SĐT ẩn ${pA.raw} khớp với SĐT thực ${pB.raw} (Đầu ${pA.prefix}.. đuôi ..${pA.suffix})`,
      };
    }
  }

  if (!pA.isMasked && pB.isMasked) {
    const prefixMatch = pA.raw.startsWith(pB.prefix);
    const suffixMatch = pA.raw.endsWith(pB.suffix);
    const lengthMatch = Math.abs(pA.length - pB.length) <= 1;
    if (prefixMatch && suffixMatch && lengthMatch) {
      return {
        match: true,
        confidence: 'high',
        resolvedPhone: pA.raw,
        details: `SĐT thực ${pA.raw} khớp với SĐT ẩn ${pB.raw} (Đầu ${pB.prefix}.. đuôi ..${pB.suffix})`,
      };
    }
  }

  // If both are masked
  if (pA.isMasked && pB.isMasked) {
    const minPrefixLen = Math.min(pA.prefix.length, pB.prefix.length);
    const minSuffixLen = Math.min(pA.suffix.length, pB.suffix.length);
    const prefixMatch = pA.prefix.slice(0, minPrefixLen) === pB.prefix.slice(0, minPrefixLen);
    const suffixMatch = pA.suffix.slice(-minSuffixLen) === pB.suffix.slice(-minSuffixLen);
    if (prefixMatch && suffixMatch) {
      return {
        match: true,
        confidence: 'probable',
        details: `Cùng mẫu che (Đầu ${pA.prefix.slice(0, minPrefixLen)}.., đuôi ..${pA.suffix.slice(-minSuffixLen)})`,
      };
    }
  }

  return { match: false, confidence: 'none' };
}

/**
 * Deep Customer Intelligence Analysis
 * Cross-references a selected customer name & phone across all database orders.
 * Detects:
 * - Resolved phone numbers (unmasked matches)
 * - Case 1: Same name, matching phone patterns
 * - Case 2: Same name, DIFFERENT phone patterns (warning: likely different person)
 * - Case 3: Same phone number, DIFFERENT customer names (warning: shared phone/order on behalf)
 * - Behavioral metrics: total orders, return count, total revenue
 */
export function analyzeCustomerIdentity(targetCustomerName, targetPhone, allOrders) {
  const normTargetName = (targetCustomerName || '').trim().toLowerCase();
  const normTargetPhone = normalizePhone(targetPhone);

  const customerOrders = [];
  const sameNameDifferentPhone = [];
  const samePhoneDifferentName = [];
  const phoneVariations = new Set();
  const resolvedFullPhones = new Set();

  let totalSpent = 0;
  let settledSpent = 0;
  let returnCount = 0;

  for (const order of allOrders) {
    const orderName = (order.customer_name || '').trim();
    const normOrderName = orderName.toLowerCase();
    const orderPhone = normalizePhone(order.customer_phone);

    const isSameName = normOrderName === normTargetName;
    const phoneCompare = matchPhonePattern(normTargetPhone, orderPhone);

    const isReturnOrder = (
      (order.note && /hoàn|hủy|tra lai|trả lại|bom/i.test(order.note)) ||
      (order.settled_amount !== undefined && order.settled_amount < 0)
    );

    if (isSameName) {
      customerOrders.push(order);
      if (orderPhone) phoneVariations.add(orderPhone);
      if (order.settled_amount) {
        settledSpent += Number(order.settled_amount);
      }
      totalSpent += (Number(order.expected_price_snapshot || order.settled_amount || 0) * (order.quantity || 1));
      if (isReturnOrder) returnCount++;

      // Check if phone matches or is completely different
      if (normTargetPhone && orderPhone && !phoneCompare.match) {
        sameNameDifferentPhone.push({
          orderId: order.id,
          trackingCode: order.tracking_code,
          phone: orderPhone,
          date: order.order_date,
        });
      }
    } else {
      // Different name, check if same phone!
      if (normTargetPhone && orderPhone && phoneCompare.match) {
        samePhoneDifferentName.push({
          orderId: order.id,
          trackingCode: order.tracking_code,
          customerName: order.customer_name,
          phone: orderPhone,
          date: order.order_date,
          matchDetail: phoneCompare.details,
        });
      }
    }

    // Check for unmasked phone resolution
    if (normTargetPhone && orderPhone && phoneCompare.match && phoneCompare.resolvedPhone) {
      resolvedFullPhones.add(phoneCompare.resolvedPhone);
    }
  }

  // Calculate return rate
  const totalOrdersCount = customerOrders.length;
  const returnRatePercent = totalOrdersCount > 0 ? ((returnCount / totalOrdersCount) * 100).toFixed(1) : 0;

  return {
    customerName: targetCustomerName,
    targetPhone: targetPhone,
    normalizedPhone: normTargetPhone,
    resolvedPhones: Array.from(resolvedFullPhones),
    phoneVariations: Array.from(phoneVariations),
    totalOrdersCount,
    returnCount,
    returnRatePercent,
    totalSpent,
    settledSpent,
    customerOrders,
    cases: {
      case1_matchingOrders: customerOrders.filter(o => !normTargetPhone || matchPhonePattern(normTargetPhone, o.customer_phone).match),
      case2_sameNameDifferentPhone: sameNameDifferentPhone,
      case3_samePhoneDifferentName: samePhoneDifferentName,
    },
  };
}
