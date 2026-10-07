/**
 * Error Logging & Crash Telemetry Service
 * Tracks React crashes, uncaught window errors, unhandled promise rejections,
 * and maintains persistent error history in localStorage with real-time UI notification.
 */

const STORAGE_KEY = 'tksm_error_logs';
const MAX_LOGS = 60;

class ErrorLogService {
  constructor() {
    this.listeners = new Set();
    this.initialized = false;
    this.initGlobalListeners();
  }

  initGlobalListeners() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // 1. Capture unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      // Ignore trivial browser resize / script load noise
      if (event.message === 'Script error.' || event.message?.includes('ResizeObserver')) {
        return;
      }

      this.logError({
        type: 'UNCAUGHT_ERROR',
        message: event.message || 'Lỗi không xác định',
        stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
        source: `${event.filename || 'unknown'}:${event.lineno || 0}`,
      });
    });

    // 2. Capture unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = typeof reason === 'string' 
        ? reason 
        : (reason?.message || JSON.stringify(reason) || 'Promise rejection không được xử lý');

      this.logError({
        type: 'UNHANDLED_PROMISE',
        message,
        stack: reason?.stack || '',
      });
    });
  }

  /**
   * Log an error into localStorage
   */
  logError({
    type = 'SYSTEM_ERROR',
    message = 'Đã xảy ra lỗi',
    stack = '',
    componentStack = '',
    context = {}
  }) {
    try {
      const logs = this.getErrors();
      
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const newEntry = {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: now.toISOString(),
        formattedTime: timeStr,
        type,
        message: String(message || 'Lỗi không xác định'),
        stack: String(stack || ''),
        componentStack: String(componentStack || ''),
        context,
        isRead: false,
      };

      // Add to front of array and keep at most MAX_LOGS
      const updated = [newEntry, ...logs].slice(0, MAX_LOGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Notify all subscribers (UI components)
      this.notifyListeners(newEntry);
      return newEntry;
    } catch (e) {
      console.error('Failed to save error log to localStorage:', e);
      return null;
    }
  }

  /**
   * Retrieve all logged errors
   */
  getErrors() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Get count of unread errors
   */
  getUnreadCount() {
    const list = this.getErrors();
    return list.filter(item => !item.isRead).length;
  }

  /**
   * Mark all errors as read
   */
  markAllAsRead() {
    try {
      const list = this.getErrors();
      const updated = list.map(item => ({ ...item, isRead: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.notifyListeners(null);
    } catch (e) {}
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notifyListeners(null);
    } catch (e) {}
  }

  /**
   * Subscribe to new errors
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(newEntry) {
    this.listeners.forEach(cb => {
      try {
        cb(newEntry, this.getErrors());
      } catch (e) {
        console.error('Error in errorLog listener:', e);
      }
    });
  }

  /**
   * Format all error logs as a clean text document for clipboard copy
   */
  exportAsText() {
    const errors = this.getErrors();
    if (errors.length === 0) return 'Không có lỗi nào được ghi nhận.';

    const systemInfo = `--- BÁO CÁO LỖI HỆ THỐNG TIKTOK SHOP MANAGER ---
Thời gian xuất: ${new Date().toLocaleString('vi-VN')}
Số lượng lỗi ghi nhận: ${errors.length}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
Platform: ${typeof navigator !== 'undefined' ? navigator.platform : 'N/A'}
--------------------------------------------------\n\n`;

    const errorDetails = errors.map((err, idx) => {
      return `[LỖI #${idx + 1}] - ${err.formattedTime || err.timestamp}
Loại: ${err.type}
Thông điệp: ${err.message}
${err.stack ? `Call Stack:\n${err.stack}` : ''}
${err.componentStack ? `React Component Tree:\n${err.componentStack}` : ''}
${err.context && Object.keys(err.context).length > 0 ? `Bối cảnh: ${JSON.stringify(err.context, null, 2)}` : ''}
--------------------------------------------------`;
    }).join('\n\n');

    return systemInfo + errorDetails;
  }
}

export const errorLogService = new ErrorLogService();
