import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Plus, Pencil, Trash2, Search, CalendarIcon, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Rental Income', 'Groceries', 'Utilities', 'Rent', 'Transportation', 'Entertainment', 'Healthcare', 'Education', 'Other'];

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
}

function DatePicker({ date, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal rounded-sm border-stone-300 text-sm"
          data-testid="date-picker-trigger"
        >
          <CalendarIcon size={14} className="mr-2 text-stone-400" />
          {date ? format(date, 'yyyy-MM-dd') : <span className="text-stone-400">{placeholder || 'Pick date'}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-sm" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { onSelect(d); setOpen(false); }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function RecordsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(null);
  const [filterDateTo, setFilterDateTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({ amount: '', type: 'expense', category: '', date: null, description: '' });
  const [formLoading, setFormLoading] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (filterType) params.append('type', filterType);
      if (filterCategory) params.append('category', filterCategory);
      if (filterDateFrom) params.append('date_from', format(filterDateFrom, 'yyyy-MM-dd'));
      if (filterDateTo) params.append('date_to', format(filterDateTo, 'yyyy-MM-dd'));
      if (searchQuery) params.append('search', searchQuery);

      const { data } = await api.get(`/records?${params.toString()}`);
      setRecords(data.records);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterCategory, filterDateFrom, filterDateTo, searchQuery]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const resetFilters = () => {
    setFilterType('');
    setFilterCategory('');
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setSearchQuery('');
    setPage(1);
  };

  const openCreateDialog = () => {
    setEditingRecord(null);
    setFormData({ amount: '', type: 'expense', category: '', date: null, description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setFormData({
      amount: record.amount.toString(),
      type: record.type,
      category: record.category,
      date: record.date ? new Date(record.date + 'T00:00:00') : null,
      description: record.description,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category,
        date: format(formData.date, 'yyyy-MM-dd'),
        description: formData.description,
      };

      if (editingRecord) {
        await api.put(`/records/${editingRecord.id}`, payload);
        toast.success('Record updated');
      } else {
        await api.post('/records', payload);
        toast.success('Record created');
      }
      setDialogOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/records/${deleteId}`);
      toast.success('Record deleted');
      setDeleteId(null);
      fetchRecords();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="records-page">
      {/* Filters */}
      <Card className="bg-white border-stone-200 rounded-sm shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-36">
              <Label className="text-xs text-stone-500 mb-1 block">Type</Label>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="rounded-sm border-stone-300 text-sm h-9" data-testid="filter-type-select">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-xs text-stone-500 mb-1 block">Category</Label>
              <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="rounded-sm border-stone-300 text-sm h-9" data-testid="filter-category-select">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-xs text-stone-500 mb-1 block">From</Label>
              <DatePicker date={filterDateFrom} onSelect={(d) => { setFilterDateFrom(d); setPage(1); }} placeholder="Start date" />
            </div>

            <div className="w-40">
              <Label className="text-xs text-stone-500 mb-1 block">To</Label>
              <DatePicker date={filterDateTo} onSelect={(d) => { setFilterDateTo(d); setPage(1); }} placeholder="End date" />
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-stone-500 mb-1 block">Search</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Search descriptions..."
                  className="pl-9 rounded-sm border-stone-300 text-sm h-9"
                  data-testid="filter-search-input"
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-stone-500 hover:text-stone-700"
              data-testid="reset-filters-btn"
            >
              Reset
            </Button>

            {isAdmin && (
              <Button
                size="sm"
                onClick={openCreateDialog}
                className="rounded-sm bg-moss hover:bg-moss-hover text-white ml-auto"
                data-testid="add-record-btn"
              >
                <Plus size={16} className="mr-1" /> Add Record
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="bg-white border-stone-200 rounded-sm shadow-none">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading font-semibold text-stone-800 tracking-tight">
            Financial Records
          </CardTitle>
          <span className="text-xs text-stone-400">{total} record{total !== 1 ? 's' : ''}</span>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="records-loading">
              <div className="w-6 h-6 border-2 border-moss border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200">
                    <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Date</TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Description</TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Category</TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Type</TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500 text-right">Amount</TableHead>
                    {isAdmin && (
                      <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500 text-right w-24">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="border-stone-100 table-row-hover" data-testid={`record-row-${record.id}`}>
                      <TableCell className="text-sm text-stone-600 font-mono">{record.date}</TableCell>
                      <TableCell className="text-sm text-stone-700 max-w-[200px] truncate">{record.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-sm text-xs font-normal bg-stone-100 text-stone-600">
                          {record.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {record.type === 'income' ? (
                            <ArrowUpRight size={14} className="text-moss" />
                          ) : (
                            <ArrowDownRight size={14} className="text-terracotta" />
                          )}
                          <span className={`text-xs font-medium ${record.type === 'income' ? 'text-moss' : 'text-terracotta'}`}>
                            {record.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        <span className={record.type === 'income' ? 'text-moss' : 'text-terracotta'}>
                          {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount)}
                        </span>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(record)}
                              className="h-7 w-7 p-0 text-stone-400 hover:text-stone-700"
                              data-testid={`edit-record-${record.id}`}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(record.id)}
                              className="h-7 w-7 p-0 text-stone-400 hover:text-terracotta"
                              data-testid={`delete-record-${record.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-stone-400 py-8">
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-4">
                  <span className="text-xs text-stone-400">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-sm h-8"
                      data-testid="prev-page-btn"
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-sm h-8"
                      data-testid="next-page-btn"
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-sm border-stone-200 sm:max-w-md" data-testid="record-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading font-semibold text-stone-800">
              {editingRecord ? 'Edit Record' : 'New Record'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-stone-500 uppercase tracking-wide">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="rounded-sm border-stone-300"
                  data-testid="record-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-stone-500 uppercase tracking-wide">Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="rounded-sm border-stone-300" data-testid="record-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-stone-500 uppercase tracking-wide">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-sm border-stone-300" data-testid="record-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-stone-500 uppercase tracking-wide">Date</Label>
              <DatePicker
                date={formData.date}
                onSelect={(d) => setFormData((f) => ({ ...f, date: d }))}
                placeholder="Select date"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-stone-500 uppercase tracking-wide">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
                className="rounded-sm border-stone-300"
                data-testid="record-description-input"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-sm border-stone-300"
                data-testid="record-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="rounded-sm bg-moss hover:bg-moss-hover text-white"
                data-testid="record-submit-btn"
              >
                {formLoading ? 'Saving...' : editingRecord ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-sm border-stone-200 sm:max-w-sm" data-testid="delete-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading font-semibold text-stone-800">Delete Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500">Are you sure you want to delete this record? This action uses soft delete and can be reversed.</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="rounded-sm border-stone-300"
              data-testid="delete-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="rounded-sm bg-terracotta hover:bg-terracotta/90 text-white"
              data-testid="delete-confirm-btn"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
