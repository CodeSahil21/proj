import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Plus, Loader2, UserCheck, UserX } from 'lucide-react';
import type { Role, User } from '@/types';

const roleVariant: Record<Role, 'default' | 'info' | 'warning' | 'secondary'> = {
  ADMIN: 'default',
  SALES: 'info',
  WAREHOUSE: 'warning',
  ACCOUNTS: 'secondary',
};

const emptyForm = { name: '', email: '', password: '', role: 'SALES' as Role };

export function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  // ── Create user ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast('success', 'User created', `${form.name} can now log in`);
      setForm({ ...emptyForm });
      setCreateOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create user';
      toast('error', 'Error', msg);
    },
  });

  // ── Toggle active ─────────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast('success', vars.isActive ? 'User activated' : 'User deactivated');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Update failed';
      toast('error', 'Error', msg);
    },
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : !data?.data?.length ? (
            <div className="py-12 text-center text-slate-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Joined</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((u: User) => {
                    const isSelf = u.id === currentUser?.id;
                    const isPending = toggleMutation.isPending &&
                      (toggleMutation.variables as { id: string })?.id === u.id;
                    return (
                      <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-4 font-medium">
                          {u.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-slate-400">(you)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{u.email}</td>
                        <td className="px-6 py-4">
                          <Badge variant={roleVariant[u.role]}>{u.role}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={u.isActive ? 'success' : 'secondary'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(u.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 text-xs gap-1 ${u.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'}`}
                              disabled={isPending}
                              onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            >
                              {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : u.isActive ? (
                                <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                              ) : (
                                <><UserCheck className="h-3.5 w-3.5" /> Activate</>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User modal */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Full Name *</Label>
              <Input
                id="u-name"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email *</Label>
              <Input
                id="u-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Role *</Label>
              <Select
                id="u-role"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
              >
                <option value="ADMIN">Admin</option>
                <option value="SALES">Sales</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="ACCOUNTS">Accounts</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-pass">Password *</Label>
              <Input
                id="u-pass"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
