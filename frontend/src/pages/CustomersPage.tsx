import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Search, Phone, Building2 } from 'lucide-react';
import type { CustomerStatus } from '@/types';

const statusVariant: Record<CustomerStatus, 'success' | 'secondary' | 'info'> = {
  ACTIVE: 'success', INACTIVE: 'secondary', PROSPECT: 'info',
};

export function CustomersPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, page, statusFilter }],
    queryFn: () => customersApi.list({ search, page, limit: 20, status: statusFilter || undefined }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, mobile, business..."
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
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PROSPECT">Prospect</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : !data?.data?.length ? (
            <div className="py-12 text-center text-slate-500">No customers found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Business</th>
                      <th className="px-6 py-3">Mobile</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.data.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/customers/${c.id}`} className="font-medium text-blue-600 hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {c.businessName
                            ? <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{c.businessName}</span>
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{c.mobile}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{c.customerType}</td>
                        <td className="px-6 py-4">
                          <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{c.gstNumber ?? '—'}</td>
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

      <CustomerForm open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
