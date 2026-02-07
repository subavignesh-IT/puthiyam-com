import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, IndianRupee, ShoppingCart, Package, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';

interface Order {
  id: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
}

interface DailySales {
  date: string;
  sales: number;
  orders: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#22c55e', '#f59e0b', '#ef4444'];

const SalesReportDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    fetchOrders();
  }, [dateRange]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(dateRange));
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []).map(o => ({
        ...o,
        items: o.items as Order['items']
      })));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.order_status === 'delivered').length;
    const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const paidOrders = orders.filter(o => o.payment_status === 'paid');
    const paidRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    return { totalRevenue, totalOrders, completedOrders, pendingOrders, avgOrderValue, paidRevenue };
  }, [orders]);

  const dailySalesData = useMemo(() => {
    const salesByDate: Record<string, DailySales> = {};
    
    for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      salesByDate[date] = { date, sales: 0, orders: 0 };
    }

    orders.forEach(order => {
      const date = format(new Date(order.created_at), 'yyyy-MM-dd');
      if (salesByDate[date]) {
        salesByDate[date].sales += order.total;
        salesByDate[date].orders += 1;
      }
    });

    return Object.values(salesByDate).map(d => ({
      ...d,
      displayDate: format(new Date(d.date), 'MMM dd'),
    }));
  }, [orders, dateRange]);

  const paymentMethodData = useMemo(() => {
    const methods: Record<string, number> = {};
    orders.forEach(order => {
      const method = order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment';
      methods[method] = (methods[method] || 0) + order.total;
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.id]) {
          productSales[item.id] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSales[item.id].quantity += item.quantity;
        productSales[item.id].revenue += item.price * item.quantity;
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  const downloadExcel = () => {
    // Daily sales sheet
    const dailySheet = dailySalesData.map(d => ({
      'Date': d.date,
      'Total Sales (₹)': d.sales,
      'Number of Orders': d.orders,
    }));

    // Orders detail sheet
    const ordersSheet = orders.map(o => ({
      'Order ID': o.id.slice(0, 8),
      'Date': format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      'Subtotal (₹)': o.subtotal,
      'Shipping (₹)': o.shipping_cost,
      'Total (₹)': o.total,
      'Payment Method': o.payment_method,
      'Payment Status': o.payment_status,
      'Order Status': o.order_status,
      'Items': o.items.map(i => `${i.name} x${i.quantity}`).join(', '),
    }));

    // Summary sheet
    const summarySheet = [
      { 'Metric': 'Total Revenue', 'Value': `₹${stats.totalRevenue}` },
      { 'Metric': 'Paid Revenue', 'Value': `₹${stats.paidRevenue}` },
      { 'Metric': 'Total Orders', 'Value': stats.totalOrders },
      { 'Metric': 'Completed Orders', 'Value': stats.completedOrders },
      { 'Metric': 'Pending Orders', 'Value': stats.pendingOrders },
      { 'Metric': 'Average Order Value', 'Value': `₹${stats.avgOrderValue}` },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySheet), 'Daily Sales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersSheet), 'Orders');

    XLSX.writeFile(wb, `PUTHIYAM_Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif">Sales Report</h2>
          <p className="text-sm text-muted-foreground">Overview of your sales performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(['7', '30', '90'] as const).map(range => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range}d
              </Button>
            ))}
          </div>
          <Button onClick={downloadExcel} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download XLSX</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-lg font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Order Value</p>
                <p className="text-lg font-bold">₹{stats.avgOrderValue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-lg font-bold">{stats.pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Daily Sales (Last {dateRange} days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 10 }} 
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value}`, 'Sales']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Orders Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 10 }} 
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Orders']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--secondary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center">
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {paymentMethodData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₹${value}`, 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary">₹{product.revenue}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">No sales data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesReportDashboard;
