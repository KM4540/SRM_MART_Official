import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  StoreIcon,
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { formatDistanceToNow } from 'date-fns';

const MyPendingItems = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [noShowItems, setNoShowItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchPendingItems();
    fetchNoShowItems();
  }, [user, navigate]);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_products')
        .select('*, pickup_locations(name)')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingItems(data || []);
    } catch (error: any) {
      console.error('Error fetching pending items:', error);
      toast.error(error.message || 'Error fetching pending items');
    } finally {
      setLoading(false);
    }
  };

  const fetchNoShowItems = async () => {
    try {
      // Get all offers with status "seller_no_show" where the current user is the seller
      const { data: offerData, error: offerError } = await supabase
        .from('price_offers')
        .select(`
          id, 
          product_id, 
          status, 
          offered_price,
          products (id, title, image),
          pickup_schedules (id, pickup_location_id, pickup_time, seller_no_show)
        `)
        .eq('seller_id', user?.id)
        .eq('status', 'seller_no_show');

      if (offerError) throw offerError;
      
      // Fetch location info for these offers
      if (offerData && offerData.length > 0) {
        const locationIds = offerData
          .map(offer => offer.pickup_schedules?.[0]?.pickup_location_id)
          .filter(Boolean);
          
        if (locationIds.length > 0) {
          const { data: locationData } = await supabase
            .from('pickup_locations')
            .select('id, name')
            .in('id', locationIds);
            
          // Combine the data
          const enhancedData = offerData.map(offer => {
            const locationId = offer.pickup_schedules?.[0]?.pickup_location_id;
            const location = locationData?.find(loc => loc.id === locationId);
            
            return {
              ...offer,
              location_name: location?.name || 'Unknown location'
            };
          });
          
          setNoShowItems(enhancedData);
        } else {
          setNoShowItems(offerData);
        }
      } else {
        setNoShowItems([]);
      }
    } catch (error: any) {
      console.error('Error fetching no-show items:', error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('pending_products')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setPendingItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Item removed successfully');
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.message || 'Error deleting item');
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
      case 'seller_no_show':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> No-Show
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

  // Format date to show relative time
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <AnimatedLayout>
        <Navbar />
        <main className="container max-w-4xl py-12 px-4 md:px-6 min-h-screen">
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
      <main className="container max-w-4xl py-12 px-4 md:px-6 min-h-screen">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">My Pending Items</h1>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-8">
          <h2 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
            How the Gateway System Works
          </h2>
          <ul className="text-sm text-blue-700/70 dark:text-blue-400/70 space-y-1 list-disc pl-5">
            <li>Submit your item for review by our admins</li>
            <li>Once approved, it will appear in the marketplace</li>
            <li>Buyers will purchase and pick up from the designated location (Place X)</li>
            <li>You will be notified when a buyer purchases your item</li>
          </ul>
        </div>

        {/* No-Show Items Section */}
        {noShowItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <AlertCircle size={20} className="mr-2 text-red-500" /> 
              Items Needing Pickup
            </h2>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4">
              <p className="text-red-700 dark:text-red-400">
                You missed your scheduled drop-off time for the following items. Please contact the coordinator to arrange pickup of your items.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {noShowItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{item.products.title}</CardTitle>
                    {getStatusBadge('seller_no_show')}
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary/30 rounded-lg h-24 overflow-hidden">
                        {item.products.image && (
                          <img 
                            src={item.products.image} 
                            alt={item.products.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Price:</strong> ₹{item.offered_price}</p>
                        <p className="text-sm"><strong>Drop-off Location:</strong> {item.location_name || 'Unknown location'}</p>
                        <p className="text-sm"><strong>Status:</strong> Needs pickup</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Please contact coordinator to arrange item pickup
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <p className="text-muted-foreground">
            Items awaiting approval: {pendingItems.filter(item => item.status === 'pending').length}
          </p>
          <Link to="/sell">
            <Button className="flex items-center gap-2">
              <Plus size={16} /> Add New Item
            </Button>
          </Link>
        </div>

        {pendingItems.length === 0 ? (
          <div className="text-center py-16 bg-secondary/30 rounded-lg">
            <StoreIcon size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Pending Items</h3>
            <p className="text-muted-foreground">
              You don't have any items waiting for approval.
            </p>
            <Link to="/sell" className="mt-4 inline-block">
              <Button>Submit Your First Item</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/4 min-h-[160px] bg-muted">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-6">
                    <CardHeader className="px-0 pt-0">
                      <div className="flex justify-between items-start">
                        <CardTitle>{item.title}</CardTitle>
                        {getStatusBadge(item.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="px-0 py-2">
                      <p className="text-muted-foreground line-clamp-2 mb-2">
                        {item.description}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <p className="font-medium">₹{item.price}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category:</span>
                          <p className="font-medium">{item.category}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Condition:</span>
                          <p className="font-medium">{item.condition}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pickup Location:</span>
                          <p className="font-medium">{item.pickup_locations?.name || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted:</span>
                          <p className="font-medium">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                      
                      {item.status === 'rejected' && item.admin_notes && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800/50">
                          <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</h4>
                          <p className="text-sm text-red-600 dark:text-red-300">{item.admin_notes}</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="px-0 pt-4 flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setItemToDelete(item.id)}
                          >
                            <Trash2 size={14} className="mr-2" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        {itemToDelete === item.id && (
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this item from your pending submissions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        )}
                      </AlertDialog>
                    </CardFooter>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this item from your pending list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => itemToDelete && handleDelete(itemToDelete)}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default MyPendingItems; 