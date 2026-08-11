import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProductForm } from '@/components/products/ProductForm';
import { StockAdjustModal } from '@/components/products/StockAdjustModal';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Search, AlertTriangle, TrendingUp } from 'lucide-react';
import type { Product } from '@/types';

export function ProductsPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === 'true');
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page, lowStock }],
    queryFn: () => productsApi.list({ search, page, limit: 20, lowStock }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products & Inventory</h1>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lowStock}
                onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
                className="rounded border-slate-300"
              />
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Low stock only
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : !data?.data?.length ? (
            <div className="py-12 text-center text-slate-500">No products found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-6 py-3">Product</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Price</th>
                      <th className="px-6 py-3">Stock</th>
                      <th className="px-6 py-3">Min</th>
                      {canEdit && <th className="px-6 py-3">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.data.map((p) => {
                      const isLow = p.currentStock <= p.minStockQty;
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/40' : ''}`}>
                          <td className="px-6 py-4">
                            <Link to={`/products/${p.id}`} className="font-medium text-blue-600 hover:underline">
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">{p.sku}</td>
                          <td className="px-6 py-4 text-slate-600">{p.category ?? '—'}</td>
                          <td className="px-6 py-4 font-medium">₹{Number(p.unitPrice).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4">
                            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-green-700'}`}>
                              {p.currentStock}
                            </span>
                            {isLow && (
                              <Badge variant="warning" className="ml-2 text-xs">Low</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{p.minStockQty}</td>
                          {canEdit && (
                            <td className="px-6 py-4">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setAdjustProduct(p)}
                                >
                                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> Stock
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setEditProduct(p)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
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

      <ProductForm open={createOpen} onClose={() => setCreateOpen(false)} />
      {editProduct && (
        <ProductForm open={!!editProduct} onClose={() => setEditProduct(null)} product={editProduct} />
      )}
      {adjustProduct && (
        <StockAdjustModal open={!!adjustProduct} onClose={() => setAdjustProduct(null)} product={adjustProduct} />
      )}
    </div>
  );
}
