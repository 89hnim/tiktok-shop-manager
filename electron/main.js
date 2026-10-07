const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { setupUpdater } = require('./updater');

let mainWindow;

function getDocumentsPath() {
  return app.getPath('documents');
}

let excelFilePath = path.join(getDocumentsPath(), 'TikTok_Shop_Orders.xlsx');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TikTok Shop Manager',
    backgroundColor: '#0F172A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows loading local image previews
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  const distIndexPath = path.join(__dirname, '../dist/index.html');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else if (fs.existsSync(distIndexPath)) {
    mainWindow.loadFile(distIndexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ================= IPC HANDLERS =================

// Select images
ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn ảnh phiếu in đơn hàng TikTok',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Hình ảnh', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
  });
  return result.filePaths || [];
});

// Get current excel path
ipcMain.handle('get-excel-path', () => {
  return excelFilePath;
});

// Set custom excel path
ipcMain.handle('set-excel-path', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Chọn nơi lưu file Excel đồng bộ',
    defaultPath: excelFilePath,
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
  });

  if (!result.canceled && result.filePath) {
    excelFilePath = result.filePath;
    return excelFilePath;
  }
  return null;
});

// Open Excel file directly in system (MS Excel / Numbers)
ipcMain.handle('open-excel', async () => {
  if (fs.existsSync(excelFilePath)) {
    await shell.openPath(excelFilePath);
    return { success: true, path: excelFilePath };
  } else {
    return { success: false, error: 'File Excel chưa được tạo. Hãy tạo ít nhất 1 đơn hàng để tự động đồng bộ.' };
  }
});

// Show in folder
ipcMain.handle('show-item-in-folder', async (event, targetPath) => {
  const p = targetPath || excelFilePath;
  if (fs.existsSync(p)) {
    shell.showItemInFolder(p);
    return true;
  }
  return false;
});

// Auto-Sync Excel from Main Process using ExcelJS
ipcMain.handle('sync-excel', async (event, data) => {
  try {
    const { orders = [], products = [] } = data;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TikTok Shop Manager';
    workbook.lastModifiedBy = 'TikTok Shop Manager';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. Orders Sheet
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

    orderSheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    orderSheet.getRow(1).height = 28;

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
        cogs_snapshot: cogsUnit,
        total_cogs: totalCogs,
        is_settled: isSettled ? 'Đã tất toán' : 'Chưa',
        settled_amount: settledAmount,
        actual_profit: actualProfit,
        note: ord.note || '',
      });

      row.height = 22;
      row.alignment = { vertical: 'middle' };

      ['cogs_snapshot', 'total_cogs', 'settled_amount', 'actual_profit'].forEach(key => {
        const cell = row.getCell(key);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0 "₫"';
        }
      });

      const settledCell = row.getCell('is_settled');
      settledCell.font = { color: { argb: isSettled ? 'FF16A34A' : 'FFE11D48' }, bold: true };
      settledCell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (actualProfit !== null) {
        const profitCell = row.getCell('actual_profit');
        profitCell.font = { color: { argb: actualProfit >= 0 ? 'FF16A34A' : 'FFE11D48' }, bold: true };
      }
    });

    orderSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: orders.length + 1, column: 15 },
    };

    // 2. Products Sheet
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
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
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
          expected_price: s.expected_price || 0,
          cogs_total: s.cogs_total || 0,
          tiktok_fee_percent: `${feePercent}%`,
          tiktok_fixed_fee: fixedFee,
          estimated_platform_fee: platFee,
          total_cost: totCost,
          estimated_profit: estProf,
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

    // Ensure directory exists
    const dir = path.dirname(excelFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await workbook.xlsx.writeFile(excelFilePath);
    return { success: true, path: excelFilePath };
  } catch (err) {
    console.error('Error writing Excel file:', err);
    return { success: false, error: err.message };
  }
});
