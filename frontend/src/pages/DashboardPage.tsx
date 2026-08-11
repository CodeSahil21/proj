import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { customersApi } from '@/api/customers.api';
import { productsApi } from '@/api/products.api';
import { challansApi } from '@/api/challans.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';
import { Users, Package, FileText, AlertTriangle, TrendingUp } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'dashboard'],
    queryFn: () => customersApi.list({ limit: 1 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'dashboard'],
    queryFn: () => productsApi.list({ limit: 1 }),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['products', 'lowstock'],
    queryFn: () => productsApi.list({ lowStock: true, limit: 5 }),
  });

  const { data: challansData } = useQuery({
    queryKey: ['challans', 'dashboard'],
    queryFn: () => challansApi.list({ limit: 5 }),
  });

  const { data: draftChallansData } = useQuery({
    queryKey: ['challans', 'draft'],
    queryFn: () => challansApi.list({ status: 'DRAFT', limit: 1 }),
  });

  const stats = [
    {
      title: 'Total Customers',
      value: customersData?.meta?.total ?? '—',
      icon: Users,
      to: '/customers',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Total Products',
      value: productsData?.meta?.total ?? '—',
      icon: Package,
      to: '/products',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Low Stock Items',
      value: lowStockData?.meta?.total ?? '—',
      icon: AlertTriangle,
      to: '/products?lowStock=true',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Draft Challans',
      value: draftChallansData?.meta?.total ?? '—',
      icon: FileText,
      to: '/challans?status=DRAFT',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-500 mt-1">Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link to={stat.to} key={stat.title}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`${stat.bg} ${stat.color} rounded-full p-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Challans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Challans</CardTitle>
            <Link to="/challans" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> View all
            </Link>
          </CardHeader>
          <CardContent>
            {!challansData?.data?.length ? (
              <p className="text-sm text-slate-500 py-4 text-center">No challans yet</p>
            ) : (
              <div className="space-y-3">
                {challansData.data.slice(0, 5).map((challan) => (
                  <Link
                    key={challan.id}
                    to={`/challans/${challan.id}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{challan.challanNumber}</p>
                      <p className="text-xs text-slate-500">{challan.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          challan.status === 'CONFIRMED'
                            ? 'success'
                            : challan.status === 'CANCELLED'
                            ? 'destructive'
                            : 'warning'
                        }
                      >
                        {challan.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        ₹{Number(challan.totalAmount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
            <Link to="/products?lowStock=true" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {!lowStockData?.data?.length ? (
              <p className="text-sm text-slate-500 py-4 text-center">All stock levels are healthy</p>
            ) : (
              <div className="space-y-3">
                {lowStockData.data.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-600">{product.currentStock}</span>
                      <p className="text-xs text-slate-500">min: {product.minStockQty}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
