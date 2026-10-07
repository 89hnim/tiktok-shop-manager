import React from 'react';
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { errorLogService } from '../services/errorLogService';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });

    // Record crash directly into Error Log Service
    errorLogService.logError({
      type: 'REACT_CRASH',
      message: error?.message || 'Lỗi kết xuất React',
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || '',
      context: {
        location: typeof window !== 'undefined' ? window.location.href : '',
      }
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      const errorMsg = error?.message || 'Lỗi không xác định';

      return (
        <div className="min-h-[360px] p-6 bg-slate-900 border-2 border-rose-500/70 rounded-3xl shadow-2xl flex flex-col justify-center items-center text-center my-6 max-w-3xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
            <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            Đã Ngăn Chặn Lỗi Giao Diện (Crash Shield Active)
          </h2>
          
          <p className="text-sm text-slate-300 mt-2 max-w-lg leading-relaxed">
            Hệ thống đã tự động bắt lỗi và bảo vệ ứng dụng (<strong>không bị trắng màn hình</strong>). Toàn bộ dữ liệu đơn hàng và sản phẩm của bạn vẫn an toàn tuyệt đối.
          </p>

          {/* Error Message Box */}
          <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 max-w-xl w-full text-left font-mono text-xs text-rose-300 overflow-x-auto shadow-inner">
            <span className="font-bold text-rose-400 block mb-0.5">Thông điệp lỗi:</span>
            {errorMsg}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-rose-500/25 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Khôi Phục Giao Diện</span>
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tải Lại Ứng Dụng</span>
            </button>

            {this.props.onOpenErrorLog && (
              <button
                type="button"
                onClick={this.props.onOpenErrorLog}
                className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
              >
                <Bug className="w-4 h-4" />
                <span>Xem Nhật Ký Báo Lỗi</span>
              </button>
            )}
          </div>

          {/* Toggle Details */}
          <div className="mt-5 w-full max-w-xl">
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <span>{showDetails ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật (Call Stack)'}</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-left font-mono text-[11px] text-slate-400 max-h-56 overflow-y-auto space-y-2">
                <div>
                  <span className="text-amber-400 font-bold block">Stack Trace:</span>
                  <pre className="whitespace-pre-wrap break-all mt-1">{error?.stack || 'Không có stack trace'}</pre>
                </div>
                {errorInfo?.componentStack && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-cyan-400 font-bold block">Component Stack:</span>
                    <pre className="whitespace-pre-wrap break-all mt-1">{errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
