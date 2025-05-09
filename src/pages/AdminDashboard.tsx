import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Package,
  MapPin,
  LayoutGrid,
  Shield,
  ShieldCheck,
  ShieldX,
  Eye,
  User,
  ClipboardList,
  Users,
  ShoppingBag,
  HandshakeIcon,
  LineChart,
  DollarSign,
} from 'lucide-react';
import AnimatedLayout from '@/components/AnimatedLayout';
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

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingProduct[]>([]);
  const [approvedItems, setApprovedItems] = useState<PendingProduct[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<PendingProduct | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    description: '',
    is_active: true
  });
  const [offersToCoordinateCount, setOffersToCoordinateCount] = useState<number>(0);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);

  const fetchLocationName = async (locationId: string) => {
    try {
      const { data, error } = await supabase
        .from('pickup_locations')
        .select('name')
        .eq('id', locationId)
        .single();
        
      if (error) throw error;
      return data?.name || 'Unknown location';
    } catch (error) {
      console.error('Error fetching location name:', error);
      return 'Unknown location';
    }
  };

  useEffect(() => {
    // Check if user is admin
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

        // Fetch items and locations
        fetchPendingItems();
        fetchApprovedItems();
        fetchLocations();
        fetchOfferCoordinationCount();
        fetchTotalProductsCount();
      } catch (error: any) {
        console.error('Error checking admin status:', error);
        toast.error('An error occurred');
        navigate('/');
      }
    };

    checkAdminStatus();
  }, [user, navigate]);

  const fetchPendingItems = async () => {
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
        
        // Fetch location info
        const locationIds = pendingProducts.map(item => item.pickup_location_id).filter(Boolean) as string[];
        if (locationIds.length > 0) {
          const { data: locationData, error: locationError } = await supabase
            .from('pickup_locations')
            .select('id, name, address')
            .in('id', locationIds);
            
          if (!locationError && locationData) {
            // Match location data to products
            pendingProducts = pendingProducts.map(item => {
              const location = locationData.find(l => l.id === item.pickup_location_id);
              return {
                ...item,
                location_info: location || undefined
              };
            });
          }
        }
      }
      
      setPendingItems(pendingProducts);
    } catch (error: any) {
      console.error('Error fetching pending items:', error);
      toast.error('Error fetching pending items');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_products')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Get additional data
      let approvedProducts: PendingProduct[] = data || [];
      if (approvedProducts.length > 0) {
        // Fetch seller info
        const sellerIds = approvedProducts.map(item => item.seller_id).filter(Boolean);
        if (sellerIds.length > 0) {
          const { data: sellerData, error: sellerError } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', sellerIds);
            
          if (!sellerError && sellerData) {
            // Match seller data to products
            approvedProducts = approvedProducts.map(item => {
              const seller = sellerData.find(s => s.id === item.seller_id);
              return {
                ...item,
                seller_info: seller || undefined
              };
            });
          }
        }
        
        // Fetch location info
        const locationIds = approvedProducts.map(item => item.pickup_location_id).filter(Boolean) as string[];
        if (locationIds.length > 0) {
          const { data: locationData, error: locationError } = await supabase
            .from('pickup_locations')
            .select('id, name, address')
            .in('id', locationIds);
            
          if (!locationError && locationData) {
            // Match location data to products
            approvedProducts = approvedProducts.map(item => {
              const location = locationData.find(l => l.id === item.pickup_location_id);
              return {
                ...item,
                location_info: location || undefined
              };
            });
          }
        }
      }
      
      setApprovedItems(approvedProducts);
    } catch (error: any) {
      console.error('Error fetching approved items:', error);
      toast.error('Error fetching approved items');
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      toast.error('Error fetching pickup locations');
    }
  };

  const fetchOfferCoordinationCount = async () => {
    try {
      // We need to get only the offers that need coordination:
      // 1. Status is accepted AND
      // 2. Either no pickup is scheduled OR
      // 3. Pickup is scheduled but item is not delivered and not cancelled
      
      // First, get all accepted offers
      const { data: offers, error: offersError } = await supabase
        .from('price_offers')
        .select('id')
        .eq('status', 'accepted');
      
      if (offersError) throw offersError;
      
      if (!offers || offers.length === 0) {
        setOffersToCoordinateCount(0);
        return;
      }
      
      // Get all pickup schedules for these offers
      const offerIds = offers.map(offer => offer.id);
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickup_schedules')
        .select('offer_id, item_delivered, seller_no_show, buyer_no_show')
        .in('offer_id', offerIds);
      
      if (pickupsError) throw pickupsError;
      
      // Count offers that need coordination (pending review)
      const pendingOffers = offers.filter(offer => {
        // Find pickup for this offer
        const pickup = pickups?.find(p => p.offer_id === offer.id);
        
        // Include if:
        // 1. No pickup scheduled yet, or
        // 2. Pickup scheduled but not delivered and not cancelled
        return !pickup || 
          (pickup && 
           !pickup.item_delivered && 
           !pickup.seller_no_show && 
           !pickup.buyer_no_show);
      });
      
      setOffersToCoordinateCount(pendingOffers.length);
    } catch (error) {
      console.error('Error fetching offer coordination count:', error);
      // Don't show toast for count errors, maybe less critical
    }
  };

  const fetchTotalProductsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);

      if (error) throw error;
      setTotalProductsCount(count || 0);
    } catch (error) {
      console.error('Error fetching total products count:', error);
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
            is_approved: true,
            pickup_location_id: item.pickup_location_id
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
        .update({ status: 'approved' })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast.success('Item approved and published to marketplace');
      fetchPendingItems();
      fetchApprovedItems();
    } catch (error: any) {
      console.error('Error approving item:', error);
      toast.error(error.message || 'Error approving item');
    } finally {
      setLoading(false);
    }
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

  const handleAddLocation = async () => {
    try {
      if (!newLocation.name || !newLocation.address) {
        toast.error('Name and address are required');
        return;
      }
      
      setLoading(true);
      const { error } = await supabase
        .from('pickup_locations')
        .insert([{
          name: newLocation.name,
          address: newLocation.address,
          description: newLocation.description,
          is_active: newLocation.is_active
        }]);

      if (error) throw error;

      toast.success('Pickup location added');
      setShowLocationDialog(false);
      setNewLocation({
        name: '',
        address: '',
        description: '',
        is_active: true
      });
      fetchLocations();
    } catch (error: any) {
      console.error('Error adding location:', error);
      toast.error(error.message || 'Error adding location');
    } finally {
      setLoading(false);
    }
  };

  const toggleLocationStatus = async (locationId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('pickup_locations')
        .update({ is_active: !isActive })
        .eq('id', locationId);

      if (error) throw error;

      fetchLocations();
    } catch (error: any) {
      console.error('Error toggling location status:', error);
      toast.error('Error updating location status');
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

  const adminFeatures = [
    {
      title: "Pending Review",
      description: "Review and approve pending product listings",
      icon: ClipboardList,
      path: "/admin/pending-review",
      color: "text-yellow-600"
    },
    {
      title: "Manage Users",
      description: "View and manage user accounts",
      icon: Users,
      path: "/admin/users",
      color: "text-blue-600"
    },
    {
      title: "Offer Coordination",
      description: "Schedule pickup times for accepted offers",
      icon: HandshakeIcon,
      path: "/admin/offers",
      color: "text-green-600"
    },
    {
      title: "Transaction Reports",
      description: "View transaction history and service fees",
      icon: LineChart,
      path: "/admin/reports",
      color: "text-purple-600"
    },
    {
      title: "View All Products",
      description: "View and manage all listed products",
      icon: Package,
      path: "/listings",
      color: "text-orange-600"
    },
    {
      title: "View All Offers",
      description: "Monitor all active offers",
      icon: HandshakeIcon,
      path: "/my-offers",
      color: "text-indigo-600"
    }
  ];

  if (loading && !user) {
    return (
      <AnimatedLayout>
        <Navbar />
        <main className="container py-12 px-4 md:px-6 min-h-screen">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </AnimatedLayout>
    );
  }

  return (
    <AnimatedLayout>
      <Navbar />
      <main className="container py-12 px-4 md:px-6 min-h-screen">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="text-primary" /> Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage product submissions and user accounts
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Pending Review Card */}
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/pending-review')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingItems.length}</div>
              <p className="text-xs text-muted-foreground">
                Review and approve pending product listings
              </p>
            </CardContent>
          </Card>

          {/* Offer Coordination Card */}
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/offers')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Offer Coordination</CardTitle>
              <HandshakeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offersToCoordinateCount}</div>
              <p className="text-xs text-muted-foreground">
                Pending offers needing coordination
              </p>
            </CardContent>
          </Card>

          {/* View All Products Card */}
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/listings?source=admin')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">View All Products</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{totalProductsCount}</div>
              <p className="text-xs text-muted-foreground">
                Total approved products listed
              </p>
            </CardContent>
          </Card>

          {/* Transaction Reports Card */}
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/reports')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transaction Reports</CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-green-600 mr-1" />
                <p className="text-sm font-medium">View Service Fee Reports</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitor transactions and revenue
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Recent Activity/Approvals Section (Example) */}
        {/* ... you might add a table or list of recent approvals/rejections here ... */}

      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default AdminDashboard; 