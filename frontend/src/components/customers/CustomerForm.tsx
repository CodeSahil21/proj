import { useState, useEffect, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import type { Customer } from '@/types';
import { Loader2 } from 'lucide-react';

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

const empty = {
  name: '', mobile: '', email: '', businessName: '', gstNumber: '',
  customerType: 'RETAILER', address: '', status: 'ACTIVE', notes: '', followUpDate: '',
};

export function CustomerForm({ open, onClose, customer }: CustomerFormProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!customer;

  const [form, setForm] = useState({ ...empty });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name ?? '',
        mobile: customer.mobile ?? '',
        email: customer.email ?? '',
        businessName: customer.businessName ?? '',
        gstNumber: customer.gstNumber ?? '',
        customerType: customer.customerType ?? 'RETAILER',
        address: customer.address ?? '',
        status: customer.status ?? 'ACTIVE',
        notes: customer.notes ?? '',
        followUpDate: customer.followUpDate ? customer.followUpDate.slice(0, 10) : '',
      });
    } else {
      setForm({ ...empty });
    }
  }, [customer, open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        ...data,
        customerType: data.customerType as import('@/types').CustomerType | undefined,
        status: data.status as import('@/types').CustomerStatus | undefined,
        email: data.email || undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
      };
      return isEdit
        ? customersApi.update(customer!.id, payload)
        : customersApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast('success', isEdit ? 'Customer updated' : 'Customer created');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong';
      toast('error', 'Failed', msg);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name *</Label>
              <Input id="c-name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-mobile">Mobile *</Label>
              <Input id="c-mobile" required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="10-digit mobile" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-biz">Business Name</Label>
              <Input id="c-biz" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="Company / Shop name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-gst">GST Number</Label>
              <Input id="c-gst" value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value)} placeholder="15-digit GSTIN" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Customer Type</Label>
              <Select id="c-type" value={form.customerType} onChange={(e) => set('customerType', e.target.value)}>
                <option value="RETAILER">Retailer</option>
                <option value="WHOLESALER">Wholesaler</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="INDIVIDUAL">Individual</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-status">Status</Label>
              <Select id="c-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PROSPECT">Prospect</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-followup">Follow-up Date</Label>
              <Input id="c-followup" type="date" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-address">Address</Label>
            <Input id="c-address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full address" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea id="c-notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Internal notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
