import React from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  Wallet
} from 'lucide-react';

export default function StatsCards({ orders = [] }) {
  const totalOrders = orders.length;
  const settledOrders = orders.filter(o => o.is_settled);
  const pendingOrders = orders.filter(o => !o.is_settled);

  // Return / negative orders
  const returnOrders = orders.filter(o => 
    (o.note && /hoàn|hủy|tra lai|trả lại|bom/i.test(o.note)) || 
    (o.settled_amount !== null && o.settled_amount < 0)
  );

  // Calculate financials for SETTLED orders
  let totalSettledRevenue = 0;
  let totalSettledCogs = 0;

  settledOrders.forEach(o => {
    const qty = o.quantity || 1;
    const cogs = (o.cogs_snapshot || 0) * qty;
    totalSettledCogs += cogs;
    if (o.settled_amount !== null && o.settled_amount !== undefined) {
      totalSettledRevenue += Number(o.settled_amount);
    }
  });

  const netProfit = totalSettledRevenue - totalSettledCogs;

  // Total cogs of ALL orders
  const totalAllCogs = orders.reduce((sum, o) => sum + ((o.cogs_snapshot || 0) * (o.quantity || 1)), 0);

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Orders Count Card */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Đơn hàng hiển thị</span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{totalOrders}</span>
          <span className="text-xs text-slate-400">đơn</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{settledOrders.length} đã tất toán</span>
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{pendingOrders.length} chờ</span>
          </span>
        </div>
      </div>

      {/* 2. Total Settled Revenue */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Doanh thu đã tất toán</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${totalSettledRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(totalSettledRevenue)}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-700/50 flex justify-between items-center">
          <span>Tiền thực nhận từ sàn</span>
          <span className="text-slate-300 font-medium">{settledOrders.length} đơn</span>
        </div>
      </div>

      {/* 3. Total COGS */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Tổng vốn xuất kho (COGS)</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-300">
            {formatMoney(totalAllCogs)}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-700/50 flex justify-between items-center">
          <span>Vốn đơn đã tất toán:</span>
          <span className="text-slate-300 font-medium">{formatMoney(totalSettledCogs)}</span>
        </div>
      </div>

      {/* 4. Net Profit */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Lợi nhuận ròng thực nhận</span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            netProfit >= 0 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {formatMoney(netProfit)}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-700/50 flex justify-between items-center">
          <span className="flex items-center gap-1 text-rose-400">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{returnOrders.length} đơn hoàn/âm</span>
          </span>
          <span className="text-slate-400">Tất toán - Vốn</span>
        </div>
      </div>
    </div>
  );
}
