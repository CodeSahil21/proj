import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { customersApi } from '@/api/customers.api';
import { productsApi } from '@/api/products.api';
import { challansApi } from '@/api/challans.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';
import {
  Users, Package, FileText, AlertTriangle,
  TrendingUp, CheckCircle, CalendarDays,
} from 'lucide-react';
import type { ChallanStatus } from '@/types';

const statusVariant: Record<ChallanStatus, 'success' | 'warning' | 'destructive'> = {
  CONFIRMED: 'success', DRAFT: 'warning', CANCELLED: 'destructive',
};

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'dashboard'],
    queryFn: () => customersApi.list({ limit: 1 }),
  });

  const { data: activeCustomersData } = useQuery({
    queryKey: ['customers', 'active-count'],
    queryFn: () => customersApi.list({ limit: 1, status: 'ACTIVE' }),
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
    queryFn: () => challansApi.list({ limit: 6 }),
  });

  const { data: confirmedChallansData } = useQuery({
    queryKey: ['challans', 'confirmed-count'],
    queryFn: () => challansApi.list({ status: 'CONFIRMED', limit: 1 }),
  });

  const { data: draftChallansData } = useQuery({
    queryKey: ['challans', 'draft-count'],
    queryFn: () => challansApi.list({ status: 'DRAFT', limit: 1 }),
  });

  const stats = [
    {
      title: 'Total Customers',
      value: customersData?.meta?.total ?? '—',
      sub: `${activeCustomersData?.meta?.total ?? 0} active`,
      icon: Users,
      to: '/customers',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Total Products',
      value: productsData?.meta?.total ?? '—',
      sub: `${lowStockData?.meta?.total ?? 0} low stock`,
      icon: Package,
      to: '/products',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Low Stock Items',
      value: lowStockData?.meta?.total ?? '—',
      sub: 'need restocking',
      icon: AlertTriangle,
      to: '/products?lowStock=true',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Confirmed Challans',
      value: confirmedChallansData?.meta?.total ?? '—',
      sub: 'all time',
      icon: CheckCircle,
      to: '/challans?status=CONFIRMED',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Draft Challans',
      value: draftChallansData?.meta?.total ?? '—',
      sub: 'pending confirmation',
      icon: CalendarDays,
      to: '/challans?status=DRAFT',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Total Challans',
      value: challansData?.meta?.total ?? '—',
      sub: 'all statuses',
      icon: FileText,
      to: '/challans',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
        <p className="text-slate-500 mt-1">Here's what's happening in your portal.</p>
      </div>

      {/* Stats — 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link to={stat.to} key={stat.title}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-medium truncate">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1 leading-none">{stat.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                    </div>
                    <div className={`${stat.bg} ${stat.color} rounded-full p-2.5 shrink-0`}>
                      <Icon className="h-5 w-5" />
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
              <div className="space-y-1">
                {challansData.data.slice(0, 6).map((challan) => (
                  <Link
                    key={challan.id}
                    to={`/challans/${challan.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-mono">{challan.challanNumber}</p>
                      <p className="text-xs text-slate-500 truncate">{challan.customer?.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <Badge variant={statusVariant[challan.status]}>{challan.status}</Badge>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ₹{Number(challan.totalAmount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
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
              <p className="text-sm text-slate-500 py-4 text-center">All stock levels are healthy ✓</p>
            ) : (
              <div className="space-y-1">
                {lowStockData.data.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{product.sku}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
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
