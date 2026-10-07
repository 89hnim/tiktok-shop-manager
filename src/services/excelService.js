/**
 * Excel Service (using ExcelJS)
 * Generates beautifully formatted workbooks for Orders & Products,
 * handles automatic synchronization and manual export/import.
 */
import ExcelJS from 'exceljs';

/**
 * Format currency to number / text
 */
function formatVND(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  return Number(amount);
}

/**
 * Generate Workbook with Orders & Products sheets
 */
export async function generateWorkbook(orders = [], products = []) {
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
    const cogsUnit = ord.cogs_snapshot || 0;
    const totalCogs = cogsUnit * qty;
    const isSettled = Boolean(ord.is_settled);
    const settledAmount = ord.settled_amount !== null && ord.settled_amount !== undefined ? Number(ord.settled_amount) : null;
    const actualProfit = settledAmount !== null ? settledAmount - totalCogs : null;

    const row = orderSheet.addRow({
      stt: idx + 1,
      tracking_code: ord.tracking_code || '',
      order_id: ord.order_id || '',
      order_date: ord.order_date || '',
      product_name: ord.product_name || '',
      sku: ord.sku || '',
      quantity: qty,
      customer_name: ord.customer_name || '',
      customer_phone: ord.customer_phone || '',
      cogs_snapshot: formatVND(cogsUnit),
      total_cogs: formatVND(totalCogs),
      is_settled: isSettled ? 'Đã tất toán' : 'Chưa',
      settled_amount: settledAmount !== null ? formatVND(settledAmount) : '',
      actual_profit: actualProfit !== null ? formatVND(actualProfit) : '',
      note: ord.note || '',
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
        name: p.name || '',
        sku: s.sku || '',
        expected_price: formatVND(s.expected_price),
        cogs_total: formatVND(s.cogs_total),
        tiktok_fee_percent: `${feePercent}%`,
        tiktok_fixed_fee: formatVND(fixedFee),
        estimated_platform_fee: formatVND(platFee),
        total_cost: formatVND(totCost),
        estimated_profit: formatVND(estProf),
        components_summary: compText,
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

  return workbook;
}

/**
 * Export workbook directly to user download (Browser & Desktop fallback)
 */
export async function exportToExcelFile(orders, products, filename = 'TikTok_Shop_Orders.xlsx') {
  const workbook = await generateWorkbook(orders, products);
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
