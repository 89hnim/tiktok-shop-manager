/**
 * Excel Service (using ExcelJS)
 * Generates beautifully formatted workbooks for Orders & Products,
 * handles automatic synchronization and manual export/import.
 */
import ExcelJS from 'exceljs';
import { 
  getOrderTotalCogs, 
  getOrderProfit,
  getInventoryExpenses,
  getFishOrders
} from './dbService';
import { formatDateVN } from '../utils/dateUtils';

/**
 * Format currency to number / text
 */
function formatVND(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  return Number(amount);
}

/**
 * Generate 4-Sheet Workbook:
 * 1. Đơn Hàng TikTok
 * 2. Danh Mục Sản Phẩm
 * 3. Quản Lý Nhập Kho (3 Cột)
 * 4. Đơn Hàng Cá Cảnh
 */
export async function generateWorkbook(orders = [], products = [], inventoryExpenses = null, fishOrders = null) {
  const inv = inventoryExpenses || getInventoryExpenses();
  const fish = fishOrders || getFishOrders();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TikTok Shop Manager';
  workbook.lastModifiedBy = 'TikTok Shop Manager';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ================= 1. ORDERS SHEET =================
  const orderSheet = workbook.addWorksheet('Danh Sách Đơn Hàng', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  orderSheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã Vận Đơn', key: 'tracking_code', width: 18 },
    { header: 'Order ID TikTok', key: 'order_id', width: 22 },
    { header: 'Ngày Đặt', key: 'order_date', width: 18 },
    { header: 'Tên Sản Phẩm', key: 'product_name', width: 35 },
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Số Lượng', key: 'quantity', width: 10 },
    { header: 'Khách Hàng', key: 'customer_name', width: 20 },
    { header: 'Số Điện Thoại', key: 'customer_phone', width: 16 },
    { header: 'Vốn NVL/Đơn', key: 'cogs_snapshot', width: 16 },
    { header: 'Tổng Vốn Đơn', key: 'total_cogs', width: 16 },
    { header: 'Tất Toán?', key: 'is_settled', width: 14 },
    { header: 'Tiền Tất Toán', key: 'settled_amount', width: 18 },
    { header: 'Lợi Nhuận Thực', key: 'actual_profit', width: 18 },
    { header: 'Ghi Chú', key: 'note', width: 25 },
  ];

  // Header style: dark navy/black background, white bold text
  orderSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  orderSheet.getRow(1).height = 28;

  // Add order rows
  orders.forEach((ord, idx) => {
    const qty = ord.quantity || 1;
    const totalCogs = getOrderTotalCogs(ord);
    const cogsUnit = qty > 0 ? Math.round(totalCogs / qty) : (ord.cogs_snapshot || 0);
    const isSettled = Boolean(ord.is_settled);
    const settledAmount = ord.settled_amount !== null && ord.settled_amount !== undefined ? Number(ord.settled_amount) : null;
    const actualProfit = getOrderProfit(ord);

    const row = orderSheet.addRow({
      stt: idx + 1,
      tracking_code: ord.tracking_code || null,
      order_id: ord.order_id || null,
      order_date: formatDateVN(ord.order_date, false),
      product_name: ord.product_name || null,
      sku: ord.sku || null,
      quantity: qty,
      customer_name: ord.customer_name || null,
      customer_phone: ord.customer_phone || null,
      cogs_snapshot: formatVND(cogsUnit),
      total_cogs: formatVND(totalCogs),
      is_settled: isSettled ? 'Đã tất toán' : 'Chưa',
      settled_amount: settledAmount !== null ? formatVND(settledAmount) : null,
      actual_profit: actualProfit !== null ? formatVND(actualProfit) : null,
      note: ord.note || null,
    });

    row.height = 22;
    row.alignment = { vertical: 'middle' };

    // Currency formatting
    ['cogs_snapshot', 'total_cogs', 'settled_amount', 'actual_profit'].forEach(key => {
      const cell = row.getCell(key);
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0 "₫"';
      }
    });

    // Colorize settled & profit cells
    const settledCell = row.getCell('is_settled');
    settledCell.font = { color: { argb: isSettled ? 'FF16A34A' : 'FFE11D48' }, bold: true };
    settledCell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (actualProfit !== null) {
      const profitCell = row.getCell('actual_profit');
      profitCell.font = { color: { argb: actualProfit >= 0 ? 'FF16A34A' : 'FFE11D48' }, bold: true };
    }
  });

  // Enable AutoFilter
  orderSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: orders.length + 1, column: 15 },
  };

  // ================= 2. PRODUCTS SHEET =================
  const productSheet = workbook.addWorksheet('Danh Mục Sản Phẩm', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  productSheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Tên Sản Phẩm', key: 'name', width: 35 },
    { header: 'Mã SKU', key: 'sku', width: 16 },
    { header: 'Giá Dự Bán', key: 'expected_price', width: 16 },
    { header: 'Vốn NVL (COGS)', key: 'cogs_total', width: 16 },
    { header: '% Chiết Khấu Sàn', key: 'tiktok_fee_percent', width: 18 },
    { header: 'Phí Cố Định Sàn', key: 'tiktok_fixed_fee', width: 16 },
    { header: 'Phí Sàn Ước Tính', key: 'estimated_platform_fee', width: 18 },
    { header: 'Tổng Vốn Dự Kiến', key: 'total_cost', width: 18 },
    { header: 'Lợi Nhuận Dự Tính', key: 'estimated_profit', width: 18 },
    { header: 'Chi Tiết Vốn Hàng', key: 'components_summary', width: 40 },
  ];

  productSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Teal
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  productSheet.getRow(1).height = 28;

  let rowStt = 1;
  products.forEach((p) => {
    const skus = Array.isArray(p.skus) && p.skus.length > 0
      ? p.skus
      : [{ sku: p.sku || '', expected_price: p.expected_price || 0, cogs_total: p.cogs_total || 0, components: p.components || [] }];

    skus.forEach((s) => {
      const compText = Array.isArray(s.components)
        ? s.components.map(c => `${c.name}: ${Number(c.cost).toLocaleString('vi-VN')}₫`).join(' | ')
        : '';

      const feePercent = s.tiktok_fee_percent !== undefined ? s.tiktok_fee_percent : (p.tiktok_fee_percent || 0);
      const fixedFee = s.tiktok_fixed_fee !== undefined ? s.tiktok_fixed_fee : (p.tiktok_fixed_fee || 0);
      const platFee = s.estimated_platform_fee !== undefined ? s.estimated_platform_fee : Math.round(((s.expected_price || 0) * feePercent) / 100 + fixedFee);
      const totCost = s.total_cost !== undefined ? s.total_cost : ((s.cogs_total || 0) + platFee);
      const estProf = s.estimated_profit !== undefined ? s.estimated_profit : ((s.expected_price || 0) - totCost);

      const row = productSheet.addRow({
        stt: rowStt++,
        name: p.name || null,
        sku: s.sku || null,
        expected_price: formatVND(s.expected_price),
        cogs_total: formatVND(s.cogs_total),
        tiktok_fee_percent: `${feePercent}%`,
        tiktok_fixed_fee: formatVND(fixedFee),
        estimated_platform_fee: formatVND(platFee),
        total_cost: formatVND(totCost),
        estimated_profit: formatVND(estProf),
        components_summary: compText || null,
      });

      row.height = 22;
      row.alignment = { vertical: 'middle' };

      ['expected_price', 'cogs_total', 'tiktok_fixed_fee', 'estimated_platform_fee', 'total_cost', 'estimated_profit'].forEach(key => {
        const cell = row.getCell(key);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0 "₫"';
        }
      });
    });
  });

  productSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(2, rowStt), column: 11 },
  };

  // ================= 3. INVENTORY EXPENSES SHEET (TAB 2) =================
  const inventorySheet = workbook.addWorksheet('Quản Lý Nhập Kho', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  inventorySheet.columns = [
    { key: 'tt_name', width: 26 },
    { key: 'tt_amount', width: 16 },
    { key: 'tt_settled', width: 13 },
    { key: 'spacer_1', width: 3 },
    { key: 'fish_name', width: 26 },
    { key: 'fish_amount', width: 16 },
    { key: 'fish_settled', width: 13 },
    { key: 'spacer_2', width: 3 },
    { key: 'sup_name', width: 26 },
    { key: 'sup_amount', width: 16 },
    { key: 'sup_settled', width: 13 },
  ];

  // Row 1: Group banners
  inventorySheet.mergeCells('A1:C1');
  inventorySheet.getCell('A1').value = '1. VỐN NHẬP TIKTOK SHOP';
  inventorySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
  inventorySheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  inventorySheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  inventorySheet.mergeCells('E1:G1');
  inventorySheet.getCell('E1').value = '2. VỐN NHẬP CÁ CẢNH';
  inventorySheet.getCell('E1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  inventorySheet.getCell('E1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  inventorySheet.getCell('E1').alignment = { vertical: 'middle', horizontal: 'center' };

  inventorySheet.mergeCells('I1:K1');
  inventorySheet.getCell('I1').value = '3. VỐN NHẬP VẬT TƯ KHÁC';
  inventorySheet.getCell('I1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  inventorySheet.getCell('I1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  inventorySheet.getCell('I1').alignment = { vertical: 'middle', horizontal: 'center' };

  inventorySheet.getRow(1).height = 28;

  // Row 2: Sub-headers
  const row2 = inventorySheet.getRow(2);
  row2.values = [
    'Tên Mặt Hàng / Chi Phí', 'Số Tiền', 'Tất Toán?', null, 
    'Tên Cá / Lô Cá Nhập', 'Số Tiền', 'Tất Toán?', null, 
    'Tên Vật Tư / Phụ Kiện', 'Số Tiền', 'Tất Toán?'
  ];
  row2.height = 24;
  ['A2', 'B2', 'C2', 'E2', 'F2', 'G2', 'I2', 'J2', 'K2'].forEach(ref => {
    const c = inventorySheet.getCell(ref);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const ttItems = inv.tiktok_shop || [];
  const fishItems = inv.fish || [];
  const supItems = inv.supplies || [];
  const maxRows = Math.max(ttItems.length, fishItems.length, supItems.length, 1);

  let totalTt = 0;
  let totalFishExp = 0;
  let totalSup = 0;

  for (let i = 0; i < maxRows; i++) {
    const tt = ttItems[i];
    const fi = fishItems[i];
    const su = supItems[i];

    if (tt?.amount) totalTt += Number(tt.amount) || 0;
    if (fi?.amount) totalFishExp += Number(fi.amount) || 0;
    if (su?.amount) totalSup += Number(su.amount) || 0;

    const row = inventorySheet.addRow([
      tt?.name || null,
      tt?.amount !== undefined && tt?.amount !== null && tt?.amount !== '' ? Number(tt.amount) : null,
      tt ? (tt.is_settled ? 'Đã TT' : 'Chưa') : null,
      null,
      fi?.name || null,
      fi?.amount !== undefined && fi?.amount !== null && fi?.amount !== '' ? Number(fi.amount) : null,
      fi ? (fi.is_settled ? 'Đã TT' : 'Chưa') : null,
      null,
      su?.name || null,
      su?.amount !== undefined && su?.amount !== null && su?.amount !== '' ? Number(su.amount) : null,
      su ? (su.is_settled ? 'Đã TT' : 'Chưa') : null,
    ]);

    row.height = 20;
    row.alignment = { vertical: 'middle' };
    ['B', 'F', 'J'].forEach(col => {
      const cell = row.getCell(col);
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0 "₫"';
      }
    });

    ['C', 'G', 'K'].forEach(col => {
      const cell = row.getCell(col);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (cell.value === 'Đã TT') {
        cell.font = { bold: true, color: { argb: 'FF16A34A' } };
      } else if (cell.value === 'Chưa') {
        cell.font = { bold: true, color: { argb: 'FFD97706' } };
      }
    });
  }

  // Column Summary Row
  const sumRowIdx = maxRows + 3;
  const sumRow = inventorySheet.getRow(sumRowIdx);
  sumRow.values = [
    'TỔNG VỐN TIKTOK:', totalTt, null,
    null,
    'TỔNG VỐN CÁ:', totalFishExp, null,
    null,
    'TỔNG VỐN VẬT TƯ:', totalSup, null
  ];
  sumRow.height = 24;
  ['A', 'B', 'C', 'E', 'F', 'G', 'I', 'J', 'K'].forEach(col => {
    const c = sumRow.getCell(col);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    if (['B', 'F', 'J'].includes(col)) {
      c.numFmt = '#,##0 "₫"';
      c.font = { bold: true, color: { argb: 'FFFDE047' }, size: 11 };
    } else {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    }
  });

  // Grand Total Row
  const grandTotal = totalTt + totalFishExp + totalSup;
  const grandRowIdx = sumRowIdx + 2;
  inventorySheet.mergeCells(`A${grandRowIdx}:G${grandRowIdx}`);
  const grandCellA = inventorySheet.getCell(`A${grandRowIdx}`);
  grandCellA.value = '★ TỔNG GIÁ VỐN TOÀN BỘ KHO:';
  grandCellA.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  grandCellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  grandCellA.alignment = { vertical: 'middle', horizontal: 'right' };

  inventorySheet.mergeCells(`H${grandRowIdx}:K${grandRowIdx}`);
  const grandCellF = inventorySheet.getCell(`H${grandRowIdx}`);
  grandCellF.value = grandTotal;
  grandCellF.numFmt = '#,##0 "₫"';
  grandCellF.font = { bold: true, color: { argb: 'FF34D399' }, size: 14 };
  grandCellF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  grandCellF.alignment = { vertical: 'middle', horizontal: 'center' };
  inventorySheet.getRow(grandRowIdx).height = 30;

  // ================= 4. FISH ORDERS SHEET (TAB 3) =================
  const fishSheet = workbook.addWorksheet('Đơn Hàng Cá Cảnh', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  fishSheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Ngày Đặt', key: 'order_date', width: 16 },
    { header: 'Tên Khách Hàng', key: 'customer_name', width: 25 },
    { header: 'Số Điện Thoại', key: 'customer_phone', width: 16 },
    { header: 'Mặt Hàng Cá / Chi Tiết', key: 'fish_name', width: 35 },
    { header: 'Tiền Cá', key: 'fish_price', width: 18 },
    { header: 'Tiền Ship', key: 'shipping_fee', width: 16 },
    { header: 'Tổng Tiền Đơn', key: 'total_amount', width: 18 },
    { header: 'Ghi Chú', key: 'note', width: 30 },
  ];

  fishSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  fishSheet.getRow(1).height = 28;

  let totalFishPriceSum = 0;
  let totalFishRevenue = 0;
  let totalShippingFees = 0;

  fish.forEach((ord, idx) => {
    const fishPrice = ord.fish_price !== undefined && ord.fish_price !== null 
      ? Number(ord.fish_price) 
      : Math.max(0, (Number(ord.total_amount) || 0) - (Number(ord.shipping_fee) || 0));
    const ship = Number(ord.shipping_fee) || 0;
    const total = Number(ord.total_amount) || (fishPrice + ship);
    totalFishPriceSum += fishPrice;
    totalShippingFees += ship;
    totalFishRevenue += total;

    const row = fishSheet.addRow({
      stt: idx + 1,
      order_date: formatDateVN(ord.order_date, false),
      customer_name: ord.customer_name || null,
      customer_phone: ord.customer_phone || null,
      fish_name: ord.fish_name || null,
      fish_price: fishPrice,
      shipping_fee: ship,
      total_amount: total,
      note: ord.note || null,
    });

    row.height = 22;
    row.alignment = { vertical: 'middle' };

    ['fish_price', 'shipping_fee', 'total_amount'].forEach(key => {
      const cell = row.getCell(key);
      cell.numFmt = '#,##0 "₫"';
    });
  });

  if (fish.length > 0) {
    const fishSumRow = fishSheet.addRow({
      stt: null,
      order_date: null,
      customer_name: 'TỔNG CỘNG:',
      customer_phone: null,
      fish_name: `${fish.length} đơn hàng`,
      fish_price: totalFishPriceSum,
      shipping_fee: totalShippingFees,
      total_amount: totalFishRevenue,
      note: null,
    });
    fishSumRow.height = 24;
    fishSumRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    });
    fishSumRow.getCell('fish_price').numFmt = '#,##0 "₫"';
    fishSumRow.getCell('shipping_fee').numFmt = '#,##0 "₫"';
    fishSumRow.getCell('total_amount').numFmt = '#,##0 "₫"';
    fishSumRow.getCell('total_amount').font = { bold: true, color: { argb: 'FF34D399' }, size: 11 };
  }

  fishSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(2, fish.length + 1), column: 8 },
  };

  return workbook;
}

/**
 * Export workbook directly to user download (Browser & Desktop fallback)
 */
export async function exportToExcelFile(orders, products, inventoryExpenses = null, fishOrders = null, filename = 'TikTok_Shop_Orders.xlsx') {
  const workbook = await generateWorkbook(orders, products, inventoryExpenses, fishOrders);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
