import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductForm } from '@/components/products/ProductForm';
import { StockAdjustModal } from '@/components/products/StockAdjustModal';
import { useAuthStore } from '@/store/auth.store';
import { ArrowLeft, Edit, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { MovementType } from '@/types';

const movementIcon: Record<MovementType, React.ReactNode> = {
  IN: <TrendingUp className="h-4 w-4 text-green-600" />,
  OUT: <TrendingDown className="h-4 w-4 text-red-500" />,
  ADJUSTMENT: <Minus className="h-4 w-4 text-blue-500" />,
};

const movementBadge: Record<MovementType, 'success' | 'destructive' | 'info'> = {
  IN: 'success', OUT: 'destructive', ADJUSTMENT: 'info',
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [movPage, setMovPage] = useState(1);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
  });

  const { data: movementsData } = useQuery({
    queryKey: ['movements', id, movPage],
    queryFn: () => productsApi.getMovements(id!, { page: movPage, limit: 15 }),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>;
  }

  const product = productData?.data;
  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Product not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/products')}>Back</Button>
      </div>
    );
  }

  const isLowStock = product.currentStock <= product.minStockQty;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              {isLowStock && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Low Stock
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm font-mono">{product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
                <TrendingUp className="mr-2 h-3.5 w-3.5" /> Adjust Stock
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="mr-2 h-3.5 w-3.5" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Product info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stock Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className={`text-5xl font-bold ${isLowStock ? 'text-red-600' : 'text-green-700'}`}>
                  {product.currentStock}
                </p>
                <p className="text-sm text-slate-500 mt-1">units in stock</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
                <div>
                  <p className="text-slate-500">Min stock</p>
                  <p className="font-medium">{product.minStockQty}</p>
                </div>
                <div>
                  <p className="text-slate-500">Unit price</p>
                  <p className="font-medium">₹{Number(product.unitPrice).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Category', product.category ?? '—'],
                ['Location', product.location ?? '—'],
                ['Status', product.isActive ? 'Active' : 'Inactive'],
                ['Added', new Date(product.createdAt).toLocaleDateString('en-IN')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Movement log */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!movementsData?.data?.length ? (
                <div className="py-10 text-center text-slate-400 text-sm">No movements recorded yet</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3">By</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {movementsData.data.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {movementIcon[m.movementType]}
                                <Badge variant={movementBadge[m.movementType]} className="text-xs">
                                  {m.movementType}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium">{m.quantity}</td>
                            <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                              {m.reason ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{m.createdBy?.name ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {movementsData.meta && movementsData.meta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <p className="text-xs text-slate-500">
                        {movementsData.meta.total} total
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={movPage === 1} onClick={() => setMovPage((p) => p - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={movPage === movementsData.meta.totalPages} onClick={() => setMovPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {editOpen && (
        <ProductForm open={editOpen} onClose={() => setEditOpen(false)} product={product} />
      )}
      {adjustOpen && (
        <StockAdjustModal open={adjustOpen} onClose={() => setAdjustOpen(false)} product={product} />
      )}
    </div>
  );
}
