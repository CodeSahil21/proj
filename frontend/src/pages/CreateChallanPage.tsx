import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { challansApi } from '@/api/challans.api';
import { customersApi } from '@/api/customers.api';
import { productsApi } from '@/api/products.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, Plus, Trash2, Search, Loader2, CheckCircle, Save } from 'lucide-react';
import type { Customer, Product } from '@/types';

interface LineItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export function CreateChallanPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);

  // Line items
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');

  // ── Customer search ──────────────────────────────────────────────────────────
  const { data: customerResults } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => customersApi.list({ search: customerSearch, limit: 6, status: 'ACTIVE' }),
    enabled: customerSearch.length >= 2 && !selectedCustomer,
  });

  // ── Product search ───────────────────────────────────────────────────────────
  const { data: productResults } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.list({ search: productSearch, limit: 6 }),
    enabled: productSearch.length >= 2,
  });

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const selectCustomer = useCallback((c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setShowCustomerResults(false);
  }, []);

  const addProduct = useCallback((p: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          quantity: 1,
          unitPrice: Number(p.unitPrice),
        },
      ];
    });
    setProductSearch('');
    setShowProductResults(false);
  }, []);

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: qty } : item)));
  };

  const updatePrice = (idx: number, price: number) => {
    if (price < 0) return;
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, unitPrice: price } : item)));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ───────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (confirmImmediately: boolean) => {
      if (!selectedCustomer) throw new Error('No customer selected');
      if (!items.length) throw new Error('No items added');
      return challansApi.create({
        customerId: selectedCustomer.id,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        notes: notes || undefined,
      }).then(async (res) => {
        if (confirmImmediately && res.data?.id) {
          return challansApi.confirm(res.data.id);
        }
        return res;
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['challans'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      const challanId = res.data?.id;
      toast('success', 'Challan created', res.data?.challanNumber);
      navigate(challanId ? `/challans/${challanId}` : '/challans');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create challan';
      toast('error', 'Error', msg);
    },
  });

  const canSubmit = !!selectedCustomer && items.length > 0 && !mutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/challans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">New Sales Challan</h1>
      </div>

      {/* Customer selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
              <div>
                <p className="font-medium text-slate-900">{selectedCustomer.name}</p>
                <p className="text-sm text-slate-500">
                  {selectedCustomer.businessName && `${selectedCustomer.businessName} · `}
                  {selectedCustomer.mobile}
                  {selectedCustomer.gstNumber && ` · GST: ${selectedCustomer.gstNumber}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search customer by name or mobile..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerResults(true);
                  }}
                  onFocus={() => setShowCustomerResults(true)}
                  className="pl-9"
                />
              </div>
              {showCustomerResults && customerResults?.data && customerResults.data.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                  {customerResults.data.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b last:border-0 transition-colors"
                      onClick={() => selectCustomer(c)}
                    >
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.businessName ?? c.mobile}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product search */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search product by name or SKU to add..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowProductResults(true); }}
                onFocus={() => setShowProductResults(true)}
                className="pl-9"
              />
            </div>
            {showProductResults && productResults?.data && productResults.data.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                {productResults.data.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b last:border-0 transition-colors"
                    onClick={() => addProduct(p)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">₹{Number(p.unitPrice).toLocaleString('en-IN')}</p>
                        <p className={`text-xs ${p.currentStock <= p.minStockQty ? 'text-red-500' : 'text-slate-500'}`}>
                          Stock: {p.currentStock}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items table */}
          {items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Search and add products above</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b text-xs font-medium uppercase text-slate-500">
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-right">Unit Price (₹)</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updatePrice(idx, parseFloat(e.target.value))}
                          className="w-28 text-right h-8"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQty(idx, item.quantity - 1)}
                          >−</Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQty(idx, parseInt(e.target.value, 10))}
                            className="w-16 text-center h-8"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQty(idx, item.quantity + 1)}
                          >+</Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-slate-50 font-medium">
                    <td className="px-4 py-3 text-slate-600">Total</td>
                    <td />
                    <td className="px-4 py-3 text-right">{totalQty} units</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-slate-900">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any additional notes for this challan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between items-start sm:items-center border-t pt-4">
        <Button variant="outline" onClick={() => navigate('/challans')} disabled={mutation.isPending}>
          Cancel
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={!canSubmit}
            onClick={() => mutation.mutate(false)}
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save as Draft
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => mutation.mutate(true)}
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Create & Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
