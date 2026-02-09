import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, IndianRupee, ShoppingCart, Package, Calendar, Users } from 'lucide-react';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
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

interface CustomerSummary {
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrder: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#22c55e', '#f59e0b', '#ef4444'];

const SalesReportDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Array<{
    id: string;
    name: string;
    category: string;
    base_price: number;
    is_in_stock: boolean;
    is_on_sale: boolean;
    discount_amount: number;
    variants: Array<{ quantity: number; price: number; stock_quantity: number }>;
    measurement_unit: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [dateRange]);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const productsWithVariants = await Promise.all(
        (productsData || []).map(async (product) => {
          const { data: variants } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id);

          return {
            id: product.id,
            name: product.name,
            category: product.category,
            base_price: product.base_price,
            is_in_stock: product.is_in_stock,
            is_on_sale: product.is_on_sale,
            discount_amount: product.discount_amount,
            measurement_unit: product.measurement_unit,
            variants: variants || [],
          };
        })
      );

      setProducts(productsWithVariants);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

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
    const uniqueCustomers = new Set(orders.map(o => o.customer_phone)).size;

    return { totalRevenue, totalOrders, completedOrders, pendingOrders, avgOrderValue, paidRevenue, uniqueCustomers };
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

  // Customer-wise summary
  const customerSummary = useMemo(() => {
    const customers: Record<string, CustomerSummary> = {};
    
    orders.forEach(order => {
      const key = order.customer_phone;
      if (!customers[key]) {
        customers[key] = {
          name: order.customer_name,
          phone: order.customer_phone,
          orderCount: 0,
          totalSpent: 0,
          lastOrder: order.created_at,
        };
      }
      customers[key].orderCount += 1;
      customers[key].totalSpent += order.total;
      if (new Date(order.created_at) > new Date(customers[key].lastOrder)) {
        customers[key].lastOrder = order.created_at;
      }
    });

    return Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const downloadExcel = () => {
    // Summary sheet
    const summarySheet = [
      { 'Metric': 'Total Revenue', 'Value': `₹${stats.totalRevenue}` },
      { 'Metric': 'Paid Revenue', 'Value': `₹${stats.paidRevenue}` },
      { 'Metric': 'Total Orders', 'Value': stats.totalOrders },
      { 'Metric': 'Completed Orders', 'Value': stats.completedOrders },
      { 'Metric': 'Pending Orders', 'Value': stats.pendingOrders },
      { 'Metric': 'Average Order Value', 'Value': `₹${stats.avgOrderValue}` },
      { 'Metric': 'Unique Customers', 'Value': stats.uniqueCustomers },
    ];

    // Daily sales sheet
    const dailySheet = dailySalesData.map(d => ({
      'Date': d.date,
      'Total Sales (₹)': d.sales,
      'Number of Orders': d.orders,
    }));

    // Customer-wise report sheet
    const customerSheet = customerSummary.map(c => ({
      'Customer Name': c.name,
      'Phone': c.phone,
      'Total Orders': c.orderCount,
      'Total Spent (₹)': c.totalSpent,
      'Last Order Date': format(new Date(c.lastOrder), 'yyyy-MM-dd HH:mm'),
    }));

    // Orders detail sheet
    const ordersSheet = orders.map(o => ({
      'Order ID': o.id.slice(0, 8),
      'Date': format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      'Customer Name': o.customer_name,
      'Customer Phone': o.customer_phone,
      'Subtotal (₹)': o.subtotal,
      'Shipping (₹)': o.shipping_cost,
      'Total (₹)': o.total,
      'Payment Method': o.payment_method,
      'Payment Status': o.payment_status,
      'Order Status': o.order_status,
      'Items': o.items.map(i => `${i.name} x${i.quantity}`).join(', '),
    }));

    // Product-wise sales summary
    const productSalesSheet = Object.entries(
      orders.reduce((acc, order) => {
        order.items.forEach(item => {
          if (!acc[item.name]) {
            acc[item.name] = { quantity: 0, revenue: 0 };
          }
          acc[item.name].quantity += item.quantity;
          acc[item.name].revenue += item.price * item.quantity;
        });
        return acc;
      }, {} as Record<string, { quantity: number; revenue: number }>)
    ).map(([name, data]) => ({
      'Product Name': name,
      'Quantity Sold': data.quantity,
      'Revenue (₹)': data.revenue,
    })).sort((a, b) => b['Revenue (₹)'] - a['Revenue (₹)']);

    // Product Inventory sheet
    const inventorySheet = products.map(p => {
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock_quantity, 0);
      return {
        'Product Name': p.name,
        'Category': p.category,
        'Base Price (₹)': p.base_price,
        'In Stock': p.is_in_stock ? 'Yes' : 'No',
        'On Sale': p.is_on_sale ? 'Yes' : 'No',
        'Discount (₹)': p.discount_amount,
        'Total Stock': totalStock,
        'Variants': p.variants.map(v => `${v.quantity}${p.measurement_unit}=₹${v.price}(${v.stock_quantity})`).join(', '),
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySheet), 'Daily Sales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerSheet), 'Customer Report');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersSheet), 'All Orders');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productSalesSheet), 'Product Sales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventorySheet), 'Product Inventory');

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <ShoppingCart className="w-5 h-5 text-secondary-foreground" />
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
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customers</p>
                <p className="text-lg font-bold">{stats.uniqueCustomers}</p>
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
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
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

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerSummary.length > 0 ? (
              <div className="space-y-3">
                {customerSummary.slice(0, 5).map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.orderCount} orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary">₹{customer.totalSpent}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">No customer data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
  );
};

export default SalesReportDashboard;
