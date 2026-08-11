import { useState, useEffect, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import type { Product } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

const empty = {
  name: '', sku: '', category: '', unitPrice: '', currentStock: '0',
  minStockQty: '0', location: '',
};

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!product;
  const [form, setForm] = useState({ ...empty });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? '',
        sku: product.sku ?? '',
        category: product.category ?? '',
        unitPrice: String(product.unitPrice ?? ''),
        currentStock: String(product.currentStock ?? 0),
        minStockQty: String(product.minStockQty ?? 0),
        location: product.location ?? '',
      });
    } else {
      setForm({ ...empty });
    }
  }, [product, open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        name: data.name,
        sku: data.sku,
        category: data.category || undefined,
        unitPrice: parseFloat(data.unitPrice),
        currentStock: parseInt(data.currentStock, 10),
        minStockQty: parseInt(data.minStockQty, 10),
        location: data.location || undefined,
      };
      return isEdit
        ? productsApi.update(product!.id, payload)
        : productsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('success', isEdit ? 'Product updated' : 'Product created');
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong';
      toast('error', 'Failed', msg);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="p-name">Product Name *</Label>
              <Input id="p-name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Basmati Rice 5kg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU *</Label>
              <Input
                id="p-sku"
                required
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="e.g. RICE-BAS-5K"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cat">Category</Label>
              <Input id="p-cat" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Grains" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Unit Price (₹) *</Label>
              <Input
                id="p-price"
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => set('unitPrice', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-loc">Location</Label>
              <Input id="p-loc" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Rack A-3" />
            </div>
            {!isEdit && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="p-stock">Initial Stock</Label>
                  <Input id="p-stock" type="number" min="0" value={form.currentStock} onChange={(e) => set('currentStock', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-min">Min Stock Qty</Label>
                  <Input id="p-min" type="number" min="0" value={form.minStockQty} onChange={(e) => set('minStockQty', e.target.value)} />
                </div>
              </>
            )}
            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="p-min-e">Min Stock Qty</Label>
                <Input id="p-min-e" type="number" min="0" value={form.minStockQty} onChange={(e) => set('minStockQty', e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
