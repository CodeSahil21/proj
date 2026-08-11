import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { challansApi } from '@/api/challans.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/auth.store';
import {
  ArrowLeft, CheckCircle, XCircle, Printer, Phone, MapPin,
  Building2, FileText, Calendar,
} from 'lucide-react';
import type { ChallanStatus } from '@/types';

const statusVariant: Record<ChallanStatus, 'success' | 'warning' | 'destructive'> = {
  CONFIRMED: 'success', DRAFT: 'warning', CANCELLED: 'destructive',
};

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const canAct = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['challan', id],
    queryFn: () => challansApi.get(id!),
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () => challansApi.confirm(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challan', id] });
      qc.invalidateQueries({ queryKey: ['challans'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('success', 'Challan confirmed', 'Stock has been deducted');
      refetch();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Confirm failed';
      toast('error', 'Cannot confirm', msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => challansApi.cancel(id!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['challan', id] });
      qc.invalidateQueries({ queryKey: ['challans'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      const wasConfirmed = challan?.status === 'CONFIRMED';
      toast('success', 'Challan cancelled', wasConfirmed ? 'Stock has been restored' : '');
      refetch();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Cancel failed';
      toast('error', 'Cannot cancel', msg);
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>;
  }

  const challan = data?.data;
  if (!challan) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Challan not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/challans')}>Back</Button>
      </div>
    );
  }

  const snap = challan.customerSnapshot as Record<string, string>;
  const isDraft = challan.status === 'DRAFT';
  const isConfirmed = challan.status === 'CONFIRMED';

  return (
    <>
      {/* ── Print styles injected via a style tag ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/challans')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-mono">{challan.challanNumber}</h1>
                <Badge variant={statusVariant[challan.status]}>{challan.status}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                Created by {challan.createdBy?.name} · {new Date(challan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canAct && isDraft && (
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || cancelMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
              </Button>
            )}
            {canAct && !challan.status.includes('CANCELLED') && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => cancelMutation.mutate()}
                disabled={confirmMutation.isPending || cancelMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Challan'}
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {/* ── Printable area ── */}
        <div id="print-area">
          {/* Print header */}
          <div className="hidden print:block mb-6 text-center border-b pb-4">
            <h2 className="text-2xl font-bold">ERP Portal</h2>
            <p className="text-slate-500">Sales Challan</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Customer info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold text-slate-900">{snap.name}</p>
                {snap.businessName && <p className="text-slate-600">{snap.businessName}</p>}
                {snap.mobile && (
                  <p className="flex items-center gap-1 text-slate-600">
                    <Phone className="h-3.5 w-3.5" /> {snap.mobile}
                  </p>
                )}
                {snap.address && (
                  <p className="flex items-start gap-1 text-slate-600">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {snap.address}
                  </p>
                )}
                {snap.gstNumber && (
                  <p className="font-mono text-xs text-slate-500">GST: {snap.gstNumber}</p>
                )}
                <div className="pt-1">
                  <Link to={`/customers/${challan.customerId}`} className="text-xs text-blue-600 hover:underline no-print">
                    View customer profile →
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Challan meta */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Challan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ['Challan No', challan.challanNumber],
                  ['Status', challan.status],
                  ['Date', new Date(challan.createdAt).toLocaleDateString('en-IN')],
                  ...(challan.confirmedAt
                    ? [['Confirmed', new Date(challan.confirmedAt).toLocaleDateString('en-IN')]]
                    : []),
                  ['Created by', challan.createdBy?.name ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
                {challan.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-slate-500 text-xs mb-1">Notes</p>
                    <p className="text-slate-700">{challan.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items table */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs font-medium uppercase text-slate-500">
                      <th className="px-6 py-3 text-left">#</th>
                      <th className="px-6 py-3 text-left">Product</th>
                      <th className="px-6 py-3 text-left">SKU</th>
                      <th className="px-6 py-3 text-right">Unit Price</th>
                      <th className="px-6 py-3 text-right">Qty</th>
                      <th className="px-6 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {challan.items?.map((item, idx) => {
                      const snap = item.productSnapshot as Record<string, string>;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-3 font-medium">{snap.name ?? item.product?.name}</td>
                          <td className="px-6 py-3 font-mono text-xs text-slate-500">
                            {snap.sku ?? item.product?.sku}
                          </td>
                          <td className="px-6 py-3 text-right">
                            ₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-3 text-right font-medium">{item.quantity}</td>
                          <td className="px-6 py-3 text-right font-medium">
                            ₹{Number(item.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-slate-50">
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-slate-500">
                        Total ({challan.totalQuantity} units)
                      </td>
                      <td />
                      <td className="px-6 py-4 text-right text-xl font-bold text-slate-900">
                        ₹{Number(challan.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Print footer */}
          <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-slate-400">
            <p>This is a computer-generated challan. No signature required.</p>
            <div className="flex justify-between mt-6">
              <div className="text-center">
                <div className="h-px w-32 bg-slate-400 mb-1" />
                <p>Authorised Signatory</p>
              </div>
              <div className="text-center">
                <div className="h-px w-32 bg-slate-400 mb-1" />
                <p>Received by</p>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmed at info */}
        {isConfirmed && challan.confirmedAt && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3 no-print">
            <Calendar className="h-4 w-4" />
            Confirmed on {new Date(challan.confirmedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </>
  );
}
