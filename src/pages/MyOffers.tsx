import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  CheckCircle,
  RefreshCw,
  MapPin,
  Info,
} from 'lucide-react';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define interfaces for type safety
interface Product {
  id: string;
  title: string;
  price: number;
  image?: string;
}

interface Offer {
  id: string;
  product_id: string;
  buyer_id: string;
  offered_price: number;
  seller_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'completed';
  seller_counter_price?: number;
  buyer_message?: string;
  seller_message?: string;
  created_at: string;
  updated_at: string;
  is_read: boolean;
  // Join data
  product?: Product;
  // Pickup schedule data
  pickup_schedule?: PickupSchedule;
}

interface PickupSchedule {
  id: string;
  pickup_location_id: string;
  pickup_time: string;
  buyer_pickup_time?: string;
  item_received?: boolean;
  item_delivered?: boolean;
  transaction_id?: string;
  location?: {
    id: string;
    name: string;
    address: string;
  };
  pickup_locations?: {
    id: string;
    name: string;
    address: string;
  };
}

const MyOffers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [responseMessage, setResponseMessage] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pickupLocations, setPickupLocations] = useState<{[key: string]: {name: string, address: string}}>({});

  useEffect(() => {
    if (user) {
      // Initial fetch
      fetchMyOffers(true);
      
      // Set up polling every 30 seconds instead of 5 seconds
      const intervalId = setInterval(() => {
        fetchMyOffers(false);
      }, 30000);
      
      // Also fetch pickup locations for reference
      fetchPickupLocations();
      
      return () => {
        clearInterval(intervalId);
      };
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const fetchPickupLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_locations')
        .select('id, name, address');
      
      if (error) throw error;

      // Convert to a map for easy lookup
      const locationsMap: {[key: string]: {name: string, address: string}} = {};
      data?.forEach(location => {
        locationsMap[location.id] = { name: location.name, address: location.address };
      });
      
      setPickupLocations(locationsMap);
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
    }
  };

  const fetchMyOffers = async (isInitial: boolean = false) => {
    if (!user) return;
    
    // Only show loading indicator on initial load
    if (isInitial) {
    setLoading(true);
    }

    try {
      // First fetch pickup locations to ensure we have them
      await fetchPickupLocations();
      
      const { data: offersData, error } = await supabase
        .from('price_offers')
        .select(`
          *,
          product:products(id, title, price, image)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching offers:', error);
        throw error;
      }

      if (!offersData) {
        console.log('No offers found');
        setOffers([]);
        return;
      }

      console.log('Fetched offers with statuses:', offersData.map(o => ({ id: o.id, status: o.status })));
      
      // For accepted and completed offers, fetch pickup schedules
      const offersNeedingSchedules = offersData.filter(offer => 
        offer.status === 'accepted' || offer.status === 'completed'
      );
      const offerIds = offersNeedingSchedules.map(offer => offer.id);
      
      console.log('Offers needing schedules:', offersNeedingSchedules.map(o => ({ id: o.id, status: o.status })));
      
      // Fetch pickup schedules for accepted and completed offers
      let pickupSchedules: {[key: string]: PickupSchedule} = {};
      
      if (offerIds.length > 0) {
        try {
          // First, get schedules
          const { data: schedulesData, error: schedulesError } = await supabase
            .from('pickup_schedules')
            .select('*, pickup_locations(id, name, address)')
            .in('offer_id', offerIds);
          
          if (!schedulesError && schedulesData) {
            // Process each schedule
            schedulesData.forEach(schedule => {
              pickupSchedules[schedule.offer_id] = {
                ...schedule,
                location: schedule.pickup_locations
              };
            });
            
            console.log('Pickup schedules with locations:', pickupSchedules);
          }
        } catch (error) {
          console.error('Error fetching pickup schedules:', error);
        }
      }
      
      // Attach pickup schedules to offers
      const offersWithSchedules = offersData.map(offer => {
        if (pickupSchedules[offer.id]) {
          return {
            ...offer,
            pickup_schedule: pickupSchedules[offer.id]
          };
        }
        return offer;
      });

      console.log('Final offers with schedules:', offersWithSchedules.map(o => ({ 
        id: o.id, 
        status: o.status, 
        hasSchedule: !!o.pickup_schedule,
        isCompleted: o.status === 'completed',
        transactionId: o.pickup_schedule?.transaction_id
      })));

      setOffers(offersWithSchedules as Offer[]);
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      if (isInitial) {
      toast.error('Failed to load your purchases: ' + (error.message || 'Unknown error'));
      }
    } finally {
      if (isInitial) {
      setLoading(false);
      }
      setIsInitialLoad(false);
    }
  };

  // After successful actions (accept/reject/counter), refresh data
  const refreshOffers = () => {
    fetchMyOffers(false);
  };

  const handleRespond = (offer: Offer) => {
    setSelectedOffer(offer);
    setCounterPrice(offer.product?.price || 0);
    setResponseMessage('');
    setShowRespondDialog(true);
  };

  const handleAccept = async () => {
    if (!selectedOffer) return;
    setRespondLoading(true);
    
    try {
      const { error } = await supabase
        .from('price_offers')
        .update({
          status: 'accepted',
          seller_message: responseMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOffer.id);

      if (error) throw error;
      
      toast.success('Offer accepted');
      setShowRespondDialog(false);
      refreshOffers();
    } catch (error: any) {
      console.error('Error accepting offer:', error);
      toast.error('Failed to accept offer');
    } finally {
      setRespondLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOffer) return;
    setRespondLoading(true);

    try {
      const { error } = await supabase
        .from('price_offers')
        .update({
          status: 'rejected',
          seller_message: responseMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOffer.id);

      if (error) throw error;
      
      toast.success('Offer rejected');
      setShowRespondDialog(false);
      refreshOffers();
    } catch (error: any) {
      console.error('Error rejecting offer:', error);
      toast.error('Failed to reject offer');
    } finally {
      setRespondLoading(false);
    }
  };

  const handleCounter = async () => {
    if (!selectedOffer) return;
    
    if (counterPrice <= 0) {
      toast.error('Please enter a valid counter price');
      return;
    }
    
    setRespondLoading(true);

    try {
      const { error } = await supabase
        .from('price_offers')
        .update({
          status: 'countered',
          seller_counter_price: counterPrice,
          seller_message: responseMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOffer.id);
        
      if (error) throw error;
      
      toast.success('Counter offer sent');
      setShowRespondDialog(false);
      refreshOffers();
    } catch (error: any) {
      console.error('Error sending counter offer:', error);
      toast.error('Failed to send counter offer');
    } finally {
      setRespondLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1">
            <Clock size={12} /> Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
            <XCircle size={12} /> Rejected
          </Badge>
        );
      case 'countered':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
            <MessageSquare size={12} /> Countered
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
            <CheckCircle size={12} /> Trade Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Unknown</Badge>
        );
    }
  };

  // Separate offers into sent and received
  const sentOffers = offers.filter(offer => offer.buyer_id === user?.id);
  const receivedOffers = offers.filter(offer => offer.seller_id === user?.id);

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

  // Add a helper function to format the pickup time based on role
  const formatPickupTimeForRole = (schedule: PickupSchedule, isBuyer: boolean) => {
    const timeToUse = isBuyer && schedule.buyer_pickup_time ? schedule.buyer_pickup_time : schedule.pickup_time;
    return formatDate(timeToUse);
  };

  return (
    <AnimatedLayout>
      <Navbar />
      <main className="container py-12 px-4 md:px-6 min-h-screen">
        <div className="mb-8 flex justify-between items-center">
          <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <DollarSign className="text-primary" /> My Purchases
          </h1>
          <p className="text-muted-foreground">
              Track and manage your purchases and sales
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              toast.info('Refreshing purchase history...');
              fetchMyOffers(true);
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Received Offers Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">My Sales</h2>
              
              {/* Service Charge Notice - only show for sellers who have made sales */}
              {receivedOffers.length > 0 && (
                <Alert className="mb-4 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                  <Info className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    A 2% service charge applies to all successful sales, which will be deducted when you receive payment from buyers.
                  </AlertDescription>
                </Alert>
              )}
              
              {receivedOffers.length === 0 ? (
                <div className="text-center py-8 bg-secondary/30 rounded-lg">
                  <DollarSign size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Sales Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't sold any products yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {receivedOffers.map(offer => (
                    <Card key={offer.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="w-3/4">
                            <CardTitle className="line-clamp-1 text-lg">
                              {offer.product?.title || 'Unknown Product'}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Sold {formatDate(offer.created_at)}
                            </p>
                          </div>
                          {getStatusBadge(offer.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="flex justify-between">
                          <div>
                            <span className="text-sm text-muted-foreground">Your Price:</span>
                            <p className="font-medium">₹{offer.product?.price}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Offered Price:</span>
                            <p className="font-semibold">₹{offer.offered_price}</p>
                          </div>
                        </div>
                        
                        {offer.seller_message && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">Seller's message:</p>
                            <p className="text-sm">{offer.seller_message}</p>
                          </div>
                        )}
                        
                        {/* Show pickup details for accepted offers */}
                        {offer.status === 'accepted' && offer.pickup_schedule && (
                          <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                            <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4" /> Pickup Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Location:</span>
                                <span className="font-medium">
                                  {(offer.pickup_schedule.location?.name || 
                                   offer.pickup_schedule.pickup_locations?.name) || 'Location not set'}
                                </span>
                              </div>
                              {(offer.pickup_schedule.location?.address || 
                                offer.pickup_schedule.pickup_locations?.address) && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Address:</span>
                                  <span className="font-medium">
                                    {offer.pickup_schedule.location?.address || 
                                     offer.pickup_schedule.pickup_locations?.address}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pickup Time:</span>
                                <span className="font-medium">
                                  {formatPickupTimeForRole(offer.pickup_schedule, true)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {offer.status === 'accepted' && !offer.pickup_schedule && (
                          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100">
                            <h4 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" /> Awaiting Pickup Schedule
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              The admin will schedule a pickup time soon.
                            </p>
                          </div>
                        )}

                        {offer.status === 'completed' && (
                          <div className="bg-purple-50 p-3 rounded-md border border-purple-100">
                            <h4 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" /> Trade Completed
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              This transaction has been successfully completed. 
                              {offer.pickup_schedule?.transaction_id && (
                                <span className="block mt-1">
                                  Transaction ID: <span className="font-medium">{offer.pickup_schedule.transaction_id}</span>
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </CardContent>
                      {offer.status === 'pending' && (
                        <CardFooter>
                          <Button 
                            onClick={() => handleRespond(offer)}
                            className="w-full"
                          >
                            Update Purchase Status
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Offers Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">My Purchases</h2>
              {sentOffers.length === 0 ? (
                <div className="text-center py-8 bg-secondary/30 rounded-lg">
                <DollarSign size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Purchase History</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't purchased any products yet
                </p>
                <Button onClick={() => navigate('/listings')}>
                  <ShoppingCart size={16} className="mr-2" /> Browse Products
                </Button>
              </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentOffers.map(offer => (
                  <Card key={offer.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="w-3/4">
                            <CardTitle className="line-clamp-1 text-lg">
                              {offer.product?.title || 'Unknown Product'}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Purchased {formatDate(offer.created_at)}
                            </p>
                          </div>
                          {getStatusBadge(offer.status)}
                        </div>
                    </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="flex justify-between">
                        <div>
                            <span className="text-sm text-muted-foreground">Listing Price:</span>
                          <p className="font-medium">₹{offer.product?.price}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Your Offered Price:</span>
                          <p className="font-semibold">₹{offer.offered_price}</p>
                        </div>
                      </div>
                      
                        {/* Status-specific content */}
                      {offer.status === 'countered' && (
                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">Seller counter-offered:</p>
                            <p className="font-medium">₹{offer.seller_counter_price}</p>
                          {offer.seller_message && (
                            <div className="mt-2">
                                <p className="text-xs text-muted-foreground">Seller's message:</p>
                              <p className="text-sm">{offer.seller_message}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                        {/* Show pickup details for accepted offers */}
                        {offer.status === 'accepted' && offer.pickup_schedule && (
                          <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                            <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4" /> Pickup Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Location:</span>
                                <span className="font-medium">
                                  {(offer.pickup_schedule.location?.name || 
                                   offer.pickup_schedule.pickup_locations?.name) || 'Location not set'}
                                </span>
                              </div>
                              {(offer.pickup_schedule.location?.address || 
                                offer.pickup_schedule.pickup_locations?.address) && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Address:</span>
                                  <span className="font-medium">
                                    {offer.pickup_schedule.location?.address || 
                                     offer.pickup_schedule.pickup_locations?.address}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pickup Time:</span>
                                <span className="font-medium">
                                  {formatPickupTimeForRole(offer.pickup_schedule, false)}
                                </span>
                              </div>
                            </div>
                        </div>
                      )}
                      
                        {offer.status === 'accepted' && !offer.pickup_schedule && (
                          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100">
                            <h4 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" /> Awaiting Pickup Schedule
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              The admin will schedule a pickup time soon.
                            </p>
                          </div>
                        )}
                        
                        {offer.buyer_message && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">Your message:</p>
                            <p className="text-sm">{offer.buyer_message}</p>
                          </div>
                        )}

                        {offer.status === 'completed' && (
                          <div className="bg-purple-50 p-3 rounded-md border border-purple-100">
                            <h4 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" /> Trade Completed
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              This transaction has been successfully completed.
                              {offer.pickup_schedule?.transaction_id && (
                                <span className="block mt-1">
                                  Transaction ID: <span className="font-medium">{offer.pickup_schedule.transaction_id}</span>
                                </span>
                              )}
                            </p>
                        </div>
                      )}
                    </CardContent>
                    {offer.status === 'countered' && (
                      <CardFooter>
                        <Button 
                            onClick={() => handleRespond(offer)}
                          className="w-full"
                          >
                            Update Purchase Status
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
            </div>

            {/* Respond to Offer Dialog */}
            <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Purchase Status</DialogTitle>
                  <DialogDescription>
                    Update the status for {selectedOffer?.product?.title}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Your Price:</span>
                      <p className="font-medium">₹{selectedOffer?.product?.price}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Offered Price:</span>
                      <p className="font-semibold">₹{selectedOffer?.offered_price}</p>
                    </div>
                  </div>
                  
                  {selectedOffer?.buyer_message && (
                    <div className="mt-2 bg-muted p-3 rounded-md">
                      <p className="text-sm text-muted-foreground">Buyer's message:</p>
                      <p className="text-sm">{selectedOffer?.buyer_message}</p>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="counterPrice" className="text-sm font-medium block mb-2">
                      Counter Offer Price (Optional)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="counterPrice"
                        type="number"
                        className="pl-10"
                        value={counterPrice}
                        onChange={(e) => setCounterPrice(parseFloat(e.target.value) || 0)}
                        placeholder="Enter your counter offer"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave unchanged to accept the buyer's price
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="responseMessage" className="text-sm font-medium block mb-2">
                      Message (Optional)
                    </label>
                    <Textarea
                      id="responseMessage"
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Add a message to the buyer..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleReject}
                    disabled={respondLoading}
                    className="flex-1"
                  >
                    <XCircle size={16} className="mr-2" /> Reject
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCounter}
                    disabled={respondLoading || counterPrice <= 0}
                    className="flex-1"
                  >
                    <MessageSquare size={16} className="mr-2" /> Counter
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleAccept}
                    disabled={respondLoading}
                    className="flex-1"
                  >
                    <CheckCircle2 size={16} className="mr-2" /> Accept
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default MyOffers; 