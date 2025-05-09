import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, DownloadIcon, FilterIcon, RefreshCw, ArrowLeft, DollarSign, Info } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Types for the data
interface Transaction {
  id: string;
  offer_id: string;
  transaction_id: string;
  created_at: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  service_fee: number;
  final_amount: number;
  payment_status: string;
  product?: {
    title: string;
    price: number;
  };
  buyer?: {
    full_name: string;
    email: string;
  };
  seller?: {
    full_name: string;
    email: string;
  };
}

const datePresets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 }
];

const TransactionReports = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [filterOpen, setFilterOpen] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    totalServiceFees: 0
  });
  
  // Check if admin
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        if (!data?.is_admin) {
          toast.error('You do not have admin privileges');
          navigate('/');
          return;
        }

        // Load initial data
        fetchTransactions();
      } catch (error: any) {
        console.error('Error checking admin status:', error);
        toast.error('An error occurred');
        navigate('/');
      }
    };

    checkAdminStatus();
  }, [user, navigate]);

  const fetchTransactions = async () => {
    setLoading(true);
    setTransactions([]); // Clear existing data while loading
    
    try {
      // Step 1: Fetch transactions without joins
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
        
      // Apply date filtering if dates are set
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString().substring(0, 10));
      }
      
      if (endDate) {
        // Add one day to make it inclusive
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('created_at', nextDay.toISOString().substring(0, 10));
      }
      
      // Execute the query  
      const { data: transactionsData, error: transactionsError } = await query;

      if (transactionsError) {
        console.error('Supabase query error:', transactionsError);
        if (transactionsError.code === 'PGRST116') {
          toast.error('Permission denied: You may not have access to transaction data');
        } else if (transactionsError.code?.startsWith('22P02')) {
          toast.error('Invalid data format in the query');
        } else if (transactionsError.code?.startsWith('42')) {
          toast.error('Database schema error: Table or column might not exist');
        } else {
          toast.error(`Error loading transaction data: ${transactionsError.message}`);
        }
        return;
      }
      
      if (!transactionsData || transactionsData.length === 0) {
        // Handle no data case gracefully
        setTransactions([]);
        setSummaryStats({
          totalTransactions: 0,
          totalAmount: 0,
          totalServiceFees: 0
        });
        // Only show toast if there might have been data (i.e., no filters applied)
        if (!startDate && !endDate) {
          toast.info('No transaction data found');
        }
        return;
      }

      // Step 2: Fetch product details
      const productIds = transactionsData
        .map(t => t.product_id)
        .filter(id => id !== null && id !== undefined);
      
      let productsData = {};
      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, title, price')
          .in('id', productIds);
        
        if (productsError) {
          console.error('Error fetching products:', productsError);
        } else if (products) {
          productsData = products.reduce((acc, product) => {
            acc[product.id] = product;
            return acc;
          }, {});
        }
      }
      
      // Step 3: Fetch user profiles
      const userIds = [
        ...transactionsData.map(t => t.buyer_id), 
        ...transactionsData.map(t => t.seller_id)
      ].filter(id => id !== null && id !== undefined);
      
      let profilesData = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profiles) {
          profilesData = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }
      
      // Step 4: Combine data
      const combinedData = transactionsData.map(transaction => {
        return {
          ...transaction,
          product: productsData[transaction.product_id] || null,
          buyer: profilesData[transaction.buyer_id] || null,
          seller: profilesData[transaction.seller_id] || null
        };
      });
      
      setTransactions(combinedData);
      
      // Calculate summary statistics
      const totalAmount = combinedData.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
      const totalServiceFees = combinedData.reduce((sum, transaction) => sum + (transaction.service_fee || 0), 0);
      
      setSummaryStats({
        totalTransactions: combinedData.length,
        totalAmount,
        totalServiceFees
      });
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      // Show more detailed error if available
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      toast.error(`Error loading transaction data: ${errorMessage}`);
      
      // Reset data on error
      setTransactions([]);
      setSummaryStats({
        totalTransactions: 0,
        totalAmount: 0,
        totalServiceFees: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDatePresetChange = (days: number) => {
    if (days === 0) {
      // All time - set start date to null
      setStartDate(undefined);
    } else {
      setStartDate(subDays(new Date(), days));
    }
    setEndDate(new Date());
  };

  const handleExportCSV = () => {
    try {
      // Format transactions for CSV
      const csvData = transactions.map(transaction => ({
        'Transaction ID': transaction.transaction_id,
        'Date': format(new Date(transaction.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Product': transaction.product?.title || 'Unknown',
        'Buyer': transaction.buyer?.full_name || 'Unknown',
        'Seller': transaction.seller?.full_name || 'Unknown',
        'Amount': transaction.amount || 0,
        'Service Fee': transaction.service_fee || 0,
        'Final Amount': transaction.final_amount || 0,
        'Status': transaction.payment_status
      }));
      
      // Convert to CSV
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => 
        Object.values(row)
          .map(value => typeof value === 'string' ? `"${value}"` : value)
          .join(',')
      );
      const csv = [headers, ...rows].join('\n');
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Transaction report downloaded');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export transactions');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <AnimatedLayout>
      <Navbar />
      <main className="container py-12 px-4 md:px-6 min-h-screen">
        <div className="flex flex-col gap-6">
          {/* Header with Back Button */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Transaction Reports</h1>
                <p className="text-muted-foreground">
                  View and analyze all marketplace transactions
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2"
              >
                <FilterIcon className="h-4 w-4" />
                Filter
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                className="flex items-center gap-2"
                disabled={transactions.length === 0}
              >
                <DownloadIcon className="h-4 w-4" />
                Export CSV
              </Button>
              
              <Button 
                onClick={() => fetchTransactions()}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {filterOpen && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Filter Transactions</CardTitle>
                <CardDescription>
                  Select a date range to filter transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Start Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">End Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Date Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {datePresets.map((preset, index) => (
                      <Button 
                        key={index} 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDatePresetChange(preset.days)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(new Date());
                  }}
                >
                  Reset Filters
                </Button>
                <Button onClick={() => {
                  fetchTransactions();
                  setFilterOpen(false);
                }}>
                  Apply Filters
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Service Fee Information */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-400 mb-4">
            <Info className="h-4 w-4 mr-2" />
            <AlertDescription>
              A 2% service charge is applied to all marketplace transactions.
            </AlertDescription>
          </Alert>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalTransactions}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transaction Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalAmount)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Service Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.totalServiceFees)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {startDate && endDate
                  ? `Showing transactions from ${format(startDate, 'MMM d, yyyy')} to ${format(endDate, 'MMM d, yyyy')}`
                  : startDate 
                    ? `Showing transactions from ${format(startDate, 'MMM d, yyyy')}` 
                    : 'Showing all transactions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="mx-auto h-8 w-8 mb-4 opacity-50" />
                  <p>No transactions found for the selected period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="py-3 px-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="py-3 px-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Product
                        </th>
                        <th className="py-3 px-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Buyer
                        </th>
                        <th className="py-3 px-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Seller
                        </th>
                        <th className="py-3 px-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="py-3 px-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Service Fee
                        </th>
                        <th className="py-3 px-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Final Amount
                        </th>
                        <th className="py-3 px-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="py-3 px-2 whitespace-nowrap text-sm">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap text-sm">
                            {transaction.transaction_id}
                          </td>
                          <td className="py-3 px-2 text-sm font-medium">
                            {transaction.product?.title || 'Unknown product'}
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {transaction.buyer?.full_name || 'Unknown'}
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {transaction.seller?.full_name || 'Unknown'}
                          </td>
                          <td className="py-3 px-2 text-sm text-right">
                            {formatCurrency(transaction.amount || 0)}
                          </td>
                          <td className="py-3 px-2 text-sm text-right text-green-600">
                            {formatCurrency(transaction.service_fee || 0)}
                          </td>
                          <td className="py-3 px-2 text-sm text-right font-medium">
                            {formatCurrency(transaction.final_amount || 0)}
                          </td>
                          <td className="py-3 px-2 text-sm text-center">
                            <Badge 
                              variant="outline" 
                              className={`
                                ${transaction.payment_status === 'completed' 
                                  ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'}
                              `}
                            >
                              {transaction.payment_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default TransactionReports; 