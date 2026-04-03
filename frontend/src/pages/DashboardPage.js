import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';

const CHART_COLORS = {
  income: '#455C40',
  expense: '#A34A3E',
};

const PIE_COLORS = ['#455C40', '#A34A3E', '#D99B48', '#575A53', '#9B9D95', '#3B4E36', '#C06050', '#E5B570'];

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
}

function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trends, setTrends] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, catRes, trendRes, recentRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/categories'),
          api.get('/dashboard/trends'),
          api.get('/dashboard/recent'),
        ]);
        setSummary(summaryRes.data);
        setCategories(catRes.data.categories);
        setTrends(trendRes.data.trends.map((t) => ({ ...t, name: formatMonth(t.month) })));
        setRecent(recentRes.data.transactions);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Aggregate categories for pie chart
  const expenseByCategory = categories
    .filter((c) => c.type === 'expense')
    .reduce((acc, c) => {
      const existing = acc.find((a) => a.name === c.category);
      if (existing) existing.value += c.total;
      else acc.push({ name: c.category, value: c.total });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]" data-testid="dashboard-loading">
        <div className="w-8 h-8 border-2 border-moss border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-stone-200 rounded-sm shadow-none card-hover stagger-1" data-testid="total-income-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-[0.1em] uppercase text-stone-500">
                Total Income
              </span>
              <div className="w-9 h-9 rounded-sm bg-moss/10 flex items-center justify-center">
                <TrendingUp size={18} className="text-moss" />
              </div>
            </div>
            <p className="text-3xl font-medium tracking-tight text-stone-900 font-heading" data-testid="total-income-value">
              {formatCurrency(summary?.total_income || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 rounded-sm shadow-none card-hover stagger-2" data-testid="total-expenses-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-[0.1em] uppercase text-stone-500">
                Total Expenses
              </span>
              <div className="w-9 h-9 rounded-sm bg-terracotta/10 flex items-center justify-center">
                <TrendingDown size={18} className="text-terracotta" />
              </div>
            </div>
            <p className="text-3xl font-medium tracking-tight text-stone-900 font-heading" data-testid="total-expenses-value">
              {formatCurrency(summary?.total_expenses || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 rounded-sm shadow-none card-hover stagger-3" data-testid="net-balance-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-[0.1em] uppercase text-stone-500">
                Net Balance
              </span>
              <div className="w-9 h-9 rounded-sm bg-stone-100 flex items-center justify-center">
                <Wallet size={18} className="text-stone-600" />
              </div>
            </div>
            <p
              className={`text-3xl font-medium tracking-tight font-heading ${
                (summary?.net_balance || 0) >= 0 ? 'text-moss' : 'text-terracotta'
              }`}
              data-testid="net-balance-value"
            >
              {formatCurrency(summary?.net_balance || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trends */}
        <Card className="lg:col-span-2 bg-white border-stone-200 rounded-sm shadow-none" data-testid="monthly-trends-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold text-stone-800 tracking-tight">
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E4DE" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#575A53' }} axisLine={{ stroke: '#E2E4DE' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#575A53' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ border: '1px solid #E2E4DE', borderRadius: '2px', fontSize: '13px' }}
                  />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.expense} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-white border-stone-200 rounded-sm shadow-none" data-testid="category-breakdown-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold text-stone-800 tracking-tight">
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px] flex flex-col items-center justify-center">
              {expenseByCategory.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expenseByCategory.map((entry, idx) => (
                          <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ border: '1px solid #E2E4DE', borderRadius: '2px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                    {expenseByCategory.slice(0, 5).map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs text-stone-500">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-stone-400">No expense data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-white border-stone-200 rounded-sm shadow-none" data-testid="recent-transactions-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading font-semibold text-stone-800 tracking-tight">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200">
                <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Date</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Description</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Category</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500">Type</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider uppercase text-stone-500 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((tx) => (
                <TableRow key={tx.id} className="border-stone-100 table-row-hover" data-testid={`transaction-row-${tx.id}`}>
                  <TableCell className="text-sm text-stone-600 font-mono">{tx.date}</TableCell>
                  <TableCell className="text-sm text-stone-700">{tx.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-sm text-xs font-normal bg-stone-100 text-stone-600">
                      {tx.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {tx.type === 'income' ? (
                        <ArrowUpRight size={14} className="text-moss" />
                      ) : (
                        <ArrowDownRight size={14} className="text-terracotta" />
                      )}
                      <span className={`text-xs font-medium ${tx.type === 'income' ? 'text-moss' : 'text-terracotta'}`}>
                        {tx.type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    <span className={tx.type === 'income' ? 'text-moss' : 'text-terracotta'}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-stone-400 py-8">
                    No transactions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
