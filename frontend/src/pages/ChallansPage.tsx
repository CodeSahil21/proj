import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { challansApi } from '@/api/challans.api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Search } from 'lucide-react';
import type { ChallanStatus } from '@/types';

const statusVariant: Record<ChallanStatus, 'success' | 'warning' | 'destructive'> = {
  CONFIRMED: 'success', DRAFT: 'warning', CANCELLED: 'destructive',
};

export function ChallansPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');

  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data, isLoading } = useQuery({
    queryKey: ['challans', { search, page, statusFilter }],
    queryFn: () => challansApi.list({ search, page, limit: 20, status: statusFilter || undefined }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales Challans</h1>
        {canCreate && (
          <Button asChild>
            <Link to="/challans/new">
              <Plus className="mr-2 h-4 w-4" /> New Challan
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by challan number or customer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : !data?.data?.length ? (
            <div className="py-12 text-center text-slate-500">No challans found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-6 py-3">Challan #</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Items</th>
                      <th className="px-6 py-3">Total Qty</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.data.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/challans/${c.id}`} className="font-mono text-blue-600 hover:underline font-medium">
                            {c.challanNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{c.customer?.name}</p>
                          {c.customer?.businessName && (
                            <p className="text-xs text-slate-500">{c.customer.businessName}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{c._count?.items ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-600">{c.totalQuantity}</td>
                        <td className="px-6 py-4 font-medium">
                          ₹{Number(c.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(c.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.meta && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-3">
                  <p className="text-sm text-slate-500">
                    {data.meta.total} total · page {data.meta.page} of {data.meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
