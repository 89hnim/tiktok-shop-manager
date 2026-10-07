import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import OrderTable from './components/OrderTable';
import ProductManager from './components/ProductManager';
import ScanModal from './components/ScanModal';
import ManualOrderModal from './components/ManualOrderModal';
import CustomerModal from './components/CustomerModal';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorLogModal from './components/ErrorLogModal';
import UpdateModal from './components/UpdateModal';
import { errorLogService } from './services/errorLogService';
import { Bug, X } from 'lucide-react';
import { 
  getOrders, 
  getProducts, 
  getSettings, 
  saveProduct, 
  deleteProduct, 
  applyFeesToAllProducts,
  saveSettings,
  createOrderWithSnapshot,
  batchCreateOrders,
  updateOrderField,
  updateOrderWithSnapshot,
  deleteOrder
} from './services/dbService';
import { exportToExcelFile } from './services/excelService';

export default function App() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'products'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});

  // Software Update State (GitHub Releases)
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Error Log State
  const [isErrorLogOpen, setIsErrorLogOpen] = useState(false);
  const [unreadErrorsCount, setUnreadErrorsCount] = useState(0);
  const [errorNotification, setErrorNotification] = useState(null);

  // Modals state
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Customer Intelligence Modal
  const [customerModalData, setCustomerModalData] = useState({
    isOpen: false,
    name: '',
    phone: '',
  });

  // Load initial data
  const refreshData = () => {
    const prods = getProducts();
    const ords = getOrders();
    const sets = getSettings();

    setProducts(prods);
    setOrders(ords);
    setSettings(sets);
  };

  useEffect(() => {
    refreshData();
    setUnreadErrorsCount(errorLogService.getUnreadCount());

    // Listen for database change events
    const handleDbChange = () => {
      refreshData();
    };
    window.addEventListener('database-changed', handleDbChange);

    // Listen for system error events
    const unsubscribeError = errorLogService.subscribe((newEntry) => {
      setUnreadErrorsCount(errorLogService.getUnreadCount());
      if (newEntry) {
        setErrorNotification(newEntry);
      }
    });

    return () => {
      window.removeEventListener('database-changed', handleDbChange);
      unsubscribeError();
    };
  }, []);

  // Background check for GitHub software updates
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.checkUpdate) {
      const repo = settings?.github_repo || '89hnim/tiktok-shop-manager';
      window.electronAPI.checkUpdate(repo).then(res => {
        if (res && res.success && res.updateAvailable) {
          setUpdateInfo(res);
        }
      }).catch(() => {});
    }
  }, [settings?.github_repo]);

  // Handlers
  const handleUpdateOrder = (orderId, fields) => {
    updateOrderField(orderId, fields);
    refreshData();
  };

  const handleDeleteOrder = (orderId) => {
    deleteOrder(orderId);
    refreshData();
  };

  const handleCreateOrder = (orderData, matchedProduct) => {
    createOrderWithSnapshot(orderData, matchedProduct);
    refreshData();
  };

  const handleUpdateOrderWithSnapshot = (orderId, orderData) => {
    updateOrderWithSnapshot(orderId, orderData);
    setEditingOrder(null);
    refreshData();
  };

  const handleBatchCreateOrders = (ordersList) => {
    batchCreateOrders(ordersList);
    refreshData();
  };

  const handleSaveProduct = (prodData) => {
    const saved = saveProduct(prodData);
    refreshData();
    return saved;
  };

  const handleDeleteProduct = (prodId) => {
    deleteProduct(prodId);
    refreshData();
  };

  const handleApplyFeesToAll = (feePercent, fixedFee) => {
    applyFeesToAllProducts(feePercent, fixedFee);
    refreshData();
  };

  const handleSaveSettings = (newSettings) => {
    saveSettings(newSettings);
    refreshData();
  };

  const handleOpenExcel = async () => {
    if (window.electronAPI && window.electronAPI.openExcel) {
      const res = await window.electronAPI.openExcel();
      if (!res.success) {
        alert(res.error || 'Chưa thể mở file Excel. Hãy tải file trực tiếp.');
        await exportToExcelFile(orders, products);
      }
    } else {
      // In web browser: trigger direct excel download
      await exportToExcelFile(orders, products);
    }
  };

  const handleSelectCustomer = (name, phone) => {
    setCustomerModalData({
      isOpen: true,
      name,
      phone,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScan={() => setIsScanOpen(true)}
        onOpenManualOrder={() => setIsManualOrderOpen(true)}
        onOpenProducts={() => setActiveTab('products')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExcel={handleOpenExcel}
        onOpenErrorLog={() => {
          setIsErrorLogOpen(true);
          setUnreadErrorsCount(0);
        }}
        unreadErrorsCount={unreadErrorsCount}
        updateInfo={updateInfo}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
      />

      {/* Main Content Area Protected by ErrorBoundary */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <ErrorBoundary onOpenErrorLog={() => setIsErrorLogOpen(true)}>
          {activeTab === 'orders' ? (
            <div>
              {/* Excel-like Spreadsheet Data Grid with Integrated Filtered Stats */}
              <OrderTable
                orders={orders}
                onUpdateOrder={handleUpdateOrder}
                onDeleteOrder={handleDeleteOrder}
                onSelectCustomer={handleSelectCustomer}
                onEditOrder={(order) => setEditingOrder(order)}
              />
            </div>
          ) : (
            <div>
              {/* Products & Cost Snapshot Manager */}
              <ProductManager
                products={products}
                settings={settings}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onApplyFeesToAll={handleApplyFeesToAll}
                onUpdateSettings={handleSaveSettings}
              />
            </div>
          )}
        </ErrorBoundary>
      </main>

      {/* OCR Scan Modal Protected by ErrorBoundary */}
      <ErrorBoundary onOpenErrorLog={() => setIsErrorLogOpen(true)}>
        <ScanModal
          isOpen={isScanOpen}
          onClose={() => setIsScanOpen(false)}
          products={products}
          orders={orders}
          settings={settings}
          onSaveProduct={handleSaveProduct}
          onBatchCreateOrders={handleBatchCreateOrders}
        />
      </ErrorBoundary>

      {/* Manual Order Creation & Edit Modal */}
      <ErrorBoundary onOpenErrorLog={() => setIsErrorLogOpen(true)}>
        <ManualOrderModal
          isOpen={isManualOrderOpen || Boolean(editingOrder)}
          onClose={() => {
            setIsManualOrderOpen(false);
            setEditingOrder(null);
          }}
          products={products}
          orders={orders}
          initialOrder={editingOrder}
          onCreateOrder={handleCreateOrder}
          onUpdateOrder={handleUpdateOrderWithSnapshot}
        />
      </ErrorBoundary>

      {/* Customer Intelligence & Phone Masking Matching Modal */}
      <ErrorBoundary onOpenErrorLog={() => setIsErrorLogOpen(true)}>
        <CustomerModal
          isOpen={customerModalData.isOpen}
          onClose={() => setCustomerModalData(prev => ({ ...prev, isOpen: false }))}
          customerName={customerModalData.name}
          customerPhone={customerModalData.phone}
          allOrders={orders}
        />
      </ErrorBoundary>

      {/* Settings Modal */}
      <ErrorBoundary onOpenErrorLog={() => setIsErrorLogOpen(true)}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          orders={orders}
          products={products}
          onOpenExcel={handleOpenExcel}
          onTriggerUpdateModal={(info) => {
            setUpdateInfo(info);
            setIsUpdateModalOpen(true);
          }}
        />
      </ErrorBoundary>

      {/* Software Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={updateInfo}
        onOpenExternal={(url) => {
          if (window.electronAPI && window.electronAPI.openExternalUrl) {
            window.electronAPI.openExternalUrl(url);
          } else {
            window.open(url, '_blank');
          }
        }}
      />

      {/* System Error Log Modal */}
      <ErrorLogModal
        isOpen={isErrorLogOpen}
        onClose={() => {
          setIsErrorLogOpen(false);
          setUnreadErrorsCount(errorLogService.getUnreadCount());
        }}
      />

      {/* Real-time Floating Error Notification Toast */}
      {errorNotification && (
        <div className="fixed bottom-5 right-5 z-[150] max-w-sm bg-slate-900 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
            <Bug className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-rose-400">Phát Hiện Lỗi Hệ Thống Mới</span>
              <button
                onClick={() => setErrorNotification(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 truncate font-mono">
              {errorNotification.message}
            </p>
            <button
              onClick={() => {
                setErrorNotification(null);
                setIsErrorLogOpen(true);
              }}
              className="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
            >
              <span>Xem chi tiết nhật ký lỗi &rarr;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
