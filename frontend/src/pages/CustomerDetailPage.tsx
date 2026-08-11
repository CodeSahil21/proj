import { useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/auth.store';
import {
  ArrowLeft, Phone, Mail, Building2, MapPin, Calendar,
  MessageSquare, Edit, Loader2, FileText,
} from 'lucide-react';
import type { CustomerStatus } from '@/types';

const statusVariant: Record<CustomerStatus, 'success' | 'secondary' | 'info'> = {
  ACTIVE: 'success', INACTIVE: 'secondary', PROSPECT: 'info',
};

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id!),
    enabled: !!id,
  });

  const { data: followUpsData } = useQuery({
    queryKey: ['followups', id],
    queryFn: () => customersApi.getFollowUps(id!),
    enabled: !!id,
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) => customersApi.addFollowUp(id!, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['followups', id] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
      setNoteText('');
      setAddingNote(false);
      toast('success', 'Note added');
    },
    onError: () => toast('error', 'Failed to add note'),
  });

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    noteMutation.mutate(noteText.trim());
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>;
  }

  const customer = customerData?.data;
  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Customer not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/customers')}>Back to Customers</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-slate-500 text-sm">{customer.businessName ?? 'Individual customer'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[customer.status]}>{customer.status}</Badge>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{customer.mobile}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.businessName && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{customer.businessName}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{customer.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span>{customer.customerType}</span>
              </div>
              {customer.gstNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">GST</span>
                  <span className="font-mono text-xs">{customer.gstNumber}</span>
                </div>
              )}
              {customer.followUpDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Follow-up</span>
                  <span>{new Date(customer.followUpDate).toLocaleDateString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Added by</span>
                <span>{customer.createdBy?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Challans</span>
                <Link to={`/challans?customerId=${customer.id}`} className="text-blue-600 hover:underline">
                  {customer._count?.challans ?? 0}
                </Link>
              </div>
            </CardContent>
          </Card>

          {customer.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Follow-up timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Follow-up Notes
                <span className="text-slate-400 font-normal text-sm">({followUpsData?.meta?.total ?? 0})</span>
              </CardTitle>
              {canEdit && !addingNote && (
                <Button size="sm" variant="outline" onClick={() => setAddingNote(true)}>
                  + Add Note
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add note form */}
              {addingNote && (
                <form onSubmit={handleAddNote} className="space-y-2 rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <Textarea
                    autoFocus
                    placeholder="Write your follow-up note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setAddingNote(false); setNoteText(''); }}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={!noteText.trim() || noteMutation.isPending}>
                      {noteMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Save Note
                    </Button>
                  </div>
                </form>
              )}

              {/* Timeline */}
              {!followUpsData?.data?.length ? (
                <div className="py-8 text-center text-slate-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No follow-up notes yet</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {followUpsData.data.map((fu, idx) => (
                    <div key={fu.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        {idx < followUpsData.data.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 mt-1" />
                        )}
                      </div>
                      <div className="pb-4 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-700">{fu.createdBy?.name}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(fu.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{fu.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Challan History</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link to={`/challans?search=${customer.name}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  View all challans for {customer.name}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <CustomerForm open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />
    </div>
  );
}
