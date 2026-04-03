import { useState, useEffect } from 'react';
import api, { formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Pencil, UserX, ShieldCheck, BarChart3, Eye } from 'lucide-react';

const ROLE_ICONS = {
  admin: ShieldCheck,
  analyst: BarChart3,
  viewer: Eye,
};

const ROLE_STYLES = {
  admin: 'bg-moss text-white',
  analyst: 'bg-sand text-stone-800',
  viewer: 'bg-stone-200 text-stone-700',
};

const STATUS_STYLES = {
  active: 'bg-moss/10 text-moss border-moss/20',
  inactive: 'bg-terracotta/10 text-terracotta border-terracotta/20',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', status: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [deactivateId, setDeactivateId] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ role: u.role, status: u.status });
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await api.put(`/users/${editUser.id}`, editForm);
      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setDeactivateLoading(true);
    try {
      await api.delete(`/users/${deactivateId}`);
      toast.success('User deactivated');
      setDeactivateId(null);
      fetchUsers();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="users-page">
      <Card className="bg-white border-stone-200 rounded-sm shadow-none">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading font-semibold text-stone-800 tracking-tight">
            User Management
          </CardTitle>
          <span className="text-xs text-stone-400">{users.length} user{users.length !== 1 ? 's' : ''}</span>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="users-loading">
              <div className="w-6 h-6 border-2 border-moss border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200">
                  <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Name</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Email</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Role</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Status</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Joined</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500 text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role] || Eye;
                  return (
                    <TableRow key={u.id} className="border-stone-100 table-row-hover" data-testid={`user-row-${u.id}`}>
                      <TableCell className="text-sm text-stone-700 font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-stone-500 font-mono">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-sm text-xs flex items-center gap-1 w-fit ${ROLE_STYLES[u.role] || ''}`}>
                          <RoleIcon size={12} />
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-sm text-xs ${STATUS_STYLES[u.status] || ''}`}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-stone-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(u)}
                            className="h-7 w-7 p-0 text-stone-400 hover:text-stone-700"
                            data-testid={`edit-user-${u.id}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateId(u.id)}
                            className="h-7 w-7 p-0 text-stone-400 hover:text-terracotta"
                            data-testid={`deactivate-user-${u.id}`}
                          >
                            <UserX size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="rounded-sm border-stone-200 sm:max-w-sm" data-testid="edit-user-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading font-semibold text-stone-800">Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-stone-500">Editing:</span>{' '}
                <span className="font-medium text-stone-800">{editUser.name}</span>
                <span className="text-stone-400 ml-1">({editUser.email})</span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-stone-500 uppercase tracking-wide">Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="rounded-sm border-stone-300" data-testid="edit-user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-stone-500 uppercase tracking-wide">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-sm border-stone-300" data-testid="edit-user-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditUser(null)}
                  className="rounded-sm border-stone-300"
                  data-testid="edit-user-cancel-btn"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEdit}
                  disabled={editLoading}
                  className="rounded-sm bg-moss hover:bg-moss-hover text-white"
                  data-testid="edit-user-submit-btn"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <DialogContent className="rounded-sm border-stone-200 sm:max-w-sm" data-testid="deactivate-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading font-semibold text-stone-800">Deactivate User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500">
            This will set the user's status to inactive. They won't be able to log in until reactivated.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateId(null)}
              className="rounded-sm border-stone-300"
              data-testid="deactivate-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={deactivateLoading}
              className="rounded-sm bg-terracotta hover:bg-terracotta/90 text-white"
              data-testid="deactivate-confirm-btn"
            >
              {deactivateLoading ? 'Processing...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
