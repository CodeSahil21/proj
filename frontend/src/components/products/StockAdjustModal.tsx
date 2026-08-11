import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import type { Product } from '@/types';
import { Loader2 } from 'lucide-react';

interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

export function StockAdjustModal({ open, onClose, product }: StockAdjustModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      productsApi.adjustStock(product.id, {
        quantity: parseInt(quantity, 10),
        movementType,
        reason: reason || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', product.id] });
      qc.invalidateQueries({ queryKey: ['movements', product.id] });
      const newStock = data.data.product.currentStock;
      toast('success', 'Stock adjusted', `New stock: ${newStock} units`);
      setQuantity('');
      setReason('');
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Adjustment failed';
      toast('error', 'Failed', msg);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!quantity || parseInt(quantity, 10) <= 0) return;
    mutation.mutate();
  };

  const newStock = (() => {
    const q = parseInt(quantity, 10) || 0;
    if (movementType === 'OUT') return product.currentStock - q;
    return product.currentStock + q;
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-slate-50 p-3 text-sm mb-2">
          <p className="font-medium text-slate-700">{product.name}</p>
          <p className="text-slate-500">SKU: {product.sku} · Current stock: <strong>{product.currentStock}</strong></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sa-type">Movement Type</Label>
            <Select
              id="sa-type"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as 'IN' | 'OUT' | 'ADJUSTMENT')}
            >
              <option value="IN">IN — Add stock</option>
              <option value="OUT">OUT — Remove stock</option>
              <option value="ADJUSTMENT">ADJUSTMENT — Correction</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-qty">Quantity *</Label>
            <Input
              id="sa-qty"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
            {quantity && parseInt(quantity, 10) > 0 && (
              <p className={`text-xs mt-1 ${newStock < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                New stock will be: <strong>{newStock}</strong>
                {newStock < 0 && ' — insufficient stock!'}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-reason">Reason</Label>
            <Input
              id="sa-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Received from supplier"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !quantity || newStock < 0}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adjust Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
