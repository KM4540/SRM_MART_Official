import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Shield,
  RefreshCw,
  PackageOpen,
  ClipboardList
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Add type definitions
interface SellerInfo {
  id: string;
  username?: string;
  full_name?: string;
}

interface LocationInfo {
  id: string;
  name: string;
  address: string;
}

interface PendingProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  image: string;
  seller_id: string;
  created_at: string;
  status: string;
  admin_notes?: string;
  pickup_location_id?: string;
  seller_email?: string;
  // Extended properties that we add programmatically
  seller_info?: SellerInfo;
  location_info?: LocationInfo;
}

export default function PendingReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingProduct[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<PendingProduct | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    checkAdminStatus();
    fetchLocations();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingItems();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
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
      
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Failed to verify admin status');
      navigate('/');
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_locations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Error fetching pickup locations');
    }
  };

  const fetchPendingItems = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('pending_products')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get additional data
      let pendingProducts: PendingProduct[] = data || [];
      if (pendingProducts.length > 0) {
        // Fetch seller info
        const sellerIds = pendingProducts.map(item => item.seller_id).filter(Boolean);
        if (sellerIds.length > 0) {
          const { data: sellerData, error: sellerError } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', sellerIds);
            
          if (!sellerError && sellerData) {
            // Match seller data to products
            pendingProducts = pendingProducts.map(item => {
              const seller = sellerData.find(s => s.id === item.seller_id);
              return {
                ...item,
                seller_info: seller || undefined
              };
            });
          }
        }
      }
      
      setPendingItems(pendingProducts);
    } catch (error) {
      console.error('Error fetching pending items:', error);
      toast.error('Error fetching pending items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (item: PendingProduct) => {
    try {
      setLoading(true);
      
      // First, insert into products table
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([
          {
            title: item.title,
            description: item.description,
            price: item.price,
            category: item.category,
            condition: item.condition,
            image: item.image,
            seller_id: item.seller_id,
            is_approved: true
          }
        ])
        .select()
        .single();

      if (productError) throw productError;
      
      // Create seller contact
      const { error: contactError } = await supabase
        .from('seller_contacts')
        .insert([
          {
            product_id: product.id,
            name: item.seller_info?.full_name || 'Anonymous',
            email: item.seller_email || '',
            phone: 'Not provided'
          }
        ]);

      if (contactError) throw contactError;

      // Update pending item status
      const { error: updateError } = await supabase
        .from('pending_products')
        .update({ 
          status: 'approved'
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast.success('Item approved and published to marketplace');
      fetchPendingItems();
    } catch (error: any) {
      console.error('Error approving item:', error);
      toast.error(error.message || 'Error approving item');
    } finally {
      setLoading(false);
    }
  };

  const openRejectDialog = (item: PendingProduct) => {
    setSelectedItem(item);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('pending_products')
        .update({ 
          status: 'rejected',
          admin_notes: rejectReason
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Item rejected');
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedItem(null);
      fetchPendingItems();
    } catch (error: any) {
      console.error('Error rejecting item:', error);
      toast.error(error.message || 'Error rejecting item');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1">
            <Clock size={12} /> Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
            <XCircle size={12} /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400 flex items-center gap-1">
            <AlertTriangle size={12} /> Unknown
          </Badge>
        );
    }
  };

  if (!isAdmin) {
    return null; // We handle redirect in checkAdminStatus
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-7xl py-10 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" /> Pending Product Review
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and approve products submitted by sellers
            </p>
          </div>
          <Button 
            onClick={() => fetchPendingItems()} 
            variant="outline"
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading pending items...</p>
            </div>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="flex justify-center items-center min-h-[400px] bg-muted/20 rounded-lg border border-dashed">
            <div className="flex flex-col items-center p-8 text-center">
              <ClipboardList className="h-16 w-16 text-muted-foreground/60 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Pending Items</h3>
              <p className="text-muted-foreground max-w-md">
                There are currently no items awaiting review. Check back later or refresh to check for new submissions.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingItems.map((item) => (
              <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                  <div className="flex justify-between items-center mt-1">
                    {getStatusBadge(item.status)}
                    <span className="font-medium">₹{item.price.toLocaleString()}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-w-1 aspect-h-1 rounded-md overflow-hidden relative">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-muted">
                        <PackageOpen className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Description:</p>
                      <p className="text-sm line-clamp-3">{item.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Category:</p>
                        <p className="text-sm font-medium">{item.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Condition:</p>
                        <p className="text-sm font-medium">{item.condition}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Seller:</p>
                      <p className="text-sm font-medium">{item.seller_info?.full_name || 'Unknown User'}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => openRejectDialog(item)}
                    className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleApprove(item)}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Item</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be shared with the seller.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this item is being rejected..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason}
              className="bg-red-500 hover:bg-red-600"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 