import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Clock, MapPin, Loader2, Shield, RefreshCw, CheckCircle, QrCode, Info, Printer, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

interface PickupSchedule {
  id: string;
  offer_id: string;
  pickup_time: string;
  pickup_location_id: string;
  created_at: string;
  updated_at: string;
  item_received: boolean;
  item_delivered: boolean;
  transaction_id?: string;
  buyer_pickup_time?: string;
  seller_no_show?: boolean;
}

interface AcceptedOffer {
  id: string;
  product: {
    id: string;
    title: string;
    price: number;
  };
  buyer: {
    id: string;
    full_name: string;
    email: string;
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
    payment_qr_url?: string;
  };
  offered_price: number;
  status: string;
}

export default function AdminOfferCoordination() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [acceptedOffers, setAcceptedOffers] = useState<AcceptedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<AcceptedOffer | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pickupTime, setPickupTime] = useState(''); // This will be Seller Time
  const [buyerPickupTime, setBuyerPickupTime] = useState(''); // New state for Buyer Time
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduledPickups, setScheduledPickups] = useState<Record<string, PickupSchedule>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentPickup, setCurrentPickup] = useState<PickupSchedule | null>(null);
  const [currentTransactionId, setCurrentTransactionId] = useState('');
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [processingPickupId, setProcessingPickupId] = useState<string | null>(null);
  const [transactionAction, setTransactionAction] = useState<'receive' | 'deliver'>('receive');
  const [currentSellerQrCode, setCurrentSellerQrCode] = useState<string | null>(null);
  const [currentOffer, setCurrentOffer] = useState<AcceptedOffer | null>(null);
  const [isLoadingQrCode, setIsLoadingQrCode] = useState(false);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchPickupLocations();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchAcceptedOffers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && acceptedOffers.length > 0) {
      fetchExistingPickups();
    }
  }, [isAdmin, acceptedOffers]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      setIsAdmin(data?.is_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Failed to verify admin status');
    }
  };

  const fetchPickupLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_locations')
        .select('*')
        .eq('is_active', true);
        
      if (error) throw error;
      setPickupLocations(data || []);
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
      toast.error('Failed to load pickup locations');
    }
  };

  const fetchAcceptedOffers = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      // First, get all accepted offers
      const { data: offers, error: offersError } = await supabase
        .from('price_offers')
        .select('*')
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      
      if (offersError) throw offersError;
      
      if (!offers || offers.length === 0) {
        setAcceptedOffers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('Found accepted offers:', offers);
      
      // Get all profiles in one query for better performance
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, payment_qr_url');
      
      const profileMap = new Map();
      if (allProfiles) {
        allProfiles.forEach(profile => {
          profileMap.set(profile.id, profile);
        });
      }
      
      // For each offer, fetch the associated product details
      const enhancedOffers = await Promise.all(offers.map(async (offer) => {
        console.log(`Processing offer ${offer.id} - buyer_id: ${offer.buyer_id}, seller_id: ${offer.seller_id}`);
        
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, title, price')
          .eq('id', offer.product_id)
          .single();
        
        if (productError) {
          console.error('Error fetching product:', productError);
        }
        
        // Get buyer details from our profile map
        const buyerProfile = profileMap.get(offer.buyer_id);
        
        // Get seller details from our profile map
        const sellerProfile = profileMap.get(offer.seller_id);
        
        const buyer = {
          id: offer.buyer_id,
          full_name: buyerProfile?.full_name || 'Customer',
          email: ''
        };
        
        const seller = {
          id: offer.seller_id,
          full_name: sellerProfile?.full_name || 'Vendor',
          email: '',
          payment_qr_url: sellerProfile?.payment_qr_url || null
        };
        
        return {
          id: offer.id,
          offered_price: offer.offered_price,
          status: offer.status,
          product: product || { id: '', title: 'Unknown Product', price: 0 },
          buyer: buyer,
          seller: seller
        };
      }));
      
      console.log('Enhanced offers:', enhancedOffers);
      setAcceptedOffers(enhancedOffers);
    } catch (error) {
      console.error('Error fetching accepted offers:', error);
      toast.error('Failed to load accepted offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchExistingPickups = async () => {
    try {
      const offerIds = acceptedOffers.map(offer => offer.id);
      
      const { data, error } = await supabase
        .from('pickup_schedules')
        .select(`
          id,
          offer_id,
          pickup_location_id,
          pickup_time,
          created_at,
          updated_at,
          item_received,
          item_delivered,
          transaction_id,
          buyer_pickup_time,
          seller_no_show
        `)
        .in('offer_id', offerIds);

      if (error) throw error;

      const pickupsMap: Record<string, PickupSchedule> = {};
      (data || []).forEach(pickup => {
        pickupsMap[pickup.offer_id] = pickup;
      });
      setScheduledPickups(pickupsMap);
    } catch (error) {
      console.error('Error fetching existing pickups:', error);
      toast.error('Failed to load scheduled pickup information');
    }
  };

  const fetchPickupLocationName = (locationId: string) => {
    const location = pickupLocations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  const formatPickupTime = (timeString: string) => {
    try {
      return format(new Date(timeString), "EEE, MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid Date";
    }
  };

  const formatPickupTimeWithRole = (pickup: PickupSchedule, offer: AcceptedOffer) => {
    const sellerTime = formatPickupTime(pickup.pickup_time);
    const buyerTime = pickup.buyer_pickup_time ? formatPickupTime(pickup.buyer_pickup_time) : sellerTime;
    
    return (
      <div className="space-y-1">
        <p className="flex items-center text-sm">
          <Clock size={14} className="mr-1.5" /> 
          <span className="font-medium">Seller Time:</span> 
          <span className="ml-1">{sellerTime}</span>
        </p>
        <p className="flex items-center text-sm">
          <Clock size={14} className="mr-1.5" /> 
          <span className="font-medium">Buyer Time:</span> 
          <span className="ml-1">{buyerTime}</span>
        </p>
      </div>
    );
  };

  const handleSchedulePickup = (offer: AcceptedOffer) => {
    setSelectedOffer(offer);
    setShowScheduleDialog(true);
  };

  const handleSubmitSchedule = async () => {
    if (!selectedOffer || !selectedLocation || !selectedDate || !pickupTime || !buyerPickupTime) {
      toast.error("Please select location, date, and both pickup times");
      return;
    }

    setSchedulingLoading(true);
    try {
      // Process seller time
      const [sellerHours, sellerMinutes] = pickupTime.split(':');
      const sellerDate = new Date(selectedDate);
      sellerDate.setHours(parseInt(sellerHours, 10));
      sellerDate.setMinutes(parseInt(sellerMinutes, 10));

      // Process buyer time
      const [buyerHours, buyerMinutes] = buyerPickupTime.split(':');
      const buyerDate = new Date(selectedDate);
      buyerDate.setHours(parseInt(buyerHours, 10));
      buyerDate.setMinutes(parseInt(buyerMinutes, 10));

      // Validate that seller time is before buyer time
      if (sellerDate >= buyerDate) {
        toast.error("Seller's pickup time must be before buyer's pickup time");
        setSchedulingLoading(false);
        return;
      }

      // Validate minimum time gap (30 minutes)
      const timeDiff = buyerDate.getTime() - sellerDate.getTime();
      const minTimeGap = 30 * 60 * 1000; // 30 minutes in milliseconds
      if (timeDiff < minTimeGap) {
        toast.error("There must be at least 30 minutes between seller's and buyer's pickup times");
        setSchedulingLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pickup_schedules')
        .insert({
          offer_id: selectedOffer.id,
          pickup_location_id: selectedLocation,
          pickup_time: sellerDate.toISOString(),
          buyer_pickup_time: buyerDate.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setScheduledPickups(prev => ({
        ...prev,
        [selectedOffer.id]: data
      }));

      setShowScheduleDialog(false);
      setSelectedOffer(null);
      setSelectedLocation('');
      setPickupTime('');
      setBuyerPickupTime('');
      setSelectedDate(new Date());
      toast.success('Pickup scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      toast.error('Failed to schedule pickup');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleItemReceived = async (pickupId: string) => {
    setProcessingPickupId(pickupId); // Indicate which item is being processed
    try {
      const { error } = await supabase
        .from('pickup_schedules')
        .update({ item_received: true, updated_at: new Date().toISOString() })
        .eq('id', pickupId);

      if (error) throw error;

      // Update local state
      const updatedPickups = { ...scheduledPickups };
      const pickup = Object.values(updatedPickups).find(p => p.id === pickupId);
      if (pickup) {
        pickup.item_received = true;
        setScheduledPickups(updatedPickups);
      }
      toast.success("Item marked as received from seller!");

    } catch (error) {
      console.error('Error marking item as received:', error);
      toast.error('Failed to mark item as received');
    } finally {
      setProcessingPickupId(null); // Clear processing indicator
    }
  };

  const handleItemDelivered = async (pickupId: string, offer: AcceptedOffer) => {
    setProcessingPickupId(pickupId); // Indicate which item is being processed
    setTransactionAction('deliver');
    setCurrentOffer(offer); // Store the current offer context (for service fee calculation)
    setShowTransactionDialog(true); // Show dialog to enter transaction ID and display service fee
  };

  // Function to fetch Seller QR Code URL
  const fetchSellerQrCode = async (sellerId: string) => {
    setIsLoadingQrCode(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('payment_qr_url')
        .eq('id', sellerId)
        .single();
      
      if (error) {
        console.error('Error fetching QR code:', error);
        toast.error('Failed to fetch seller QR code.');
        return null;
      }
      
      if (!data?.payment_qr_url) {
        toast.info('Seller has not uploaded a payment QR code.');
        return null;
      }
      
      // Download the QR code as a data URL for display
      const dataUrl = await downloadQrCodeAsDataUrl(data.payment_qr_url);
      setCurrentSellerQrCode(dataUrl); // Set the state with the data URL
      
    } catch (err) {
      console.error('Error processing QR code download:', err);
      toast.error('Error displaying seller QR code.');
      return null;
    } finally {
      setIsLoadingQrCode(false);
    }
  };

  // Show Seller QR Code Dialog
  const handleShowQrCode = (offer: AcceptedOffer) => {
    setCurrentSellerQrCode(null); // Reset QR code state
    setCurrentOffer(offer); // Set the current offer for context
    fetchSellerQrCode(offer.seller.id); // Fetch QR code when the button is clicked
  };

  // Handle closing the QR Code Dialog
  const handleCloseQrDialog = () => {
    setCurrentOffer(null);
    setCurrentSellerQrCode(null);
    // Potentially close a dialog if one is open for the QR code
  };

  // Submission from the transaction ID dialog
  const handleTransactionSubmit = async () => {
    if (!processingPickupId || !currentTransactionId) {
      toast.error("Please enter a valid transaction ID.");
      return;
    }

    setSchedulingLoading(true); // Use schedulingLoading state for general processing indication
    try {
      // Fetch the offer_id related to the processingPickupId
      const { data: pickupData, error: pickupError } = await supabase
        .from('pickup_schedules')
        .select('offer_id')
        .eq('id', processingPickupId)
        .single();

      if (pickupError || !pickupData) {
        throw pickupError || new Error("Could not find the offer associated with this pickup.");
      }

      const offerId = pickupData.offer_id;

      // Update both pickup_schedules and price_offers in a single transaction
      const { error: transactionError } = await supabase.rpc('update_pickup_and_offer_status', {
        _pickup_id: processingPickupId,
        _transaction_id: currentTransactionId,
        _offer_id: offerId
      });

      if (transactionError) throw transactionError;

      // Update local state for pickup
      const updatedPickups = { ...scheduledPickups };
      const pickup = Object.values(updatedPickups).find(p => p.id === processingPickupId);
      if (pickup) {
        pickup.item_delivered = true;
        pickup.transaction_id = currentTransactionId; // Store the transaction ID locally
        setScheduledPickups(updatedPickups);
      }

      // Update local state for offer status to 'completed'
      setAcceptedOffers(prevOffers =>
        prevOffers.filter(offer => offer.id !== offerId) // Remove the completed offer
      );
      
      setShowTransactionDialog(false);
      setCurrentTransactionId('');
      toast.success("Item marked as given to buyer and trade completed!");

      // Refresh data to ensure consistency
      await fetchExistingPickups();
      await fetchAcceptedOffers();

    } catch (error: any) {
      console.error('Error marking item as delivered:', error);
      toast.error(`Failed to mark item as delivered: ${error.message}`);
    } finally {
      setSchedulingLoading(false);
      setProcessingPickupId(null); // Clear processing indicator
    }
  };

  // Helper function to download QR code image as data URL
  const downloadQrCodeAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch QR code image: ${response.statusText}`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error downloading QR code:", error);
      return null;
    }
  };

  // Calculate service fee (2% of offered price)
  const calculateServiceFee = (amount: number) => {
    const serviceFee = amount * 0.02;
    return {
      fee: serviceFee,
      feeFormatted: serviceFee.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        style: 'currency',
        currency: 'INR'
      })
    };
  };

  // Handle seller no-show
  const handleSellerNoShow = (pickupId: string, offer: AcceptedOffer) => {
    setProcessingPickupId(pickupId);
    setCurrentOffer(offer);
    setShowNoShowDialog(true);
  };

  // Mark seller as no-show and the item needs to be returned
  const confirmSellerNoShow = async () => {
    if (!processingPickupId || !currentOffer) {
      toast.error("Missing pickup or offer information");
      return;
    }

    setSchedulingLoading(true);
    try {
      // Update pickup schedule to mark seller as no-show
      const { error: updatePickupError } = await supabase
        .from('pickup_schedules')
        .update({ 
          seller_no_show: true, 
          updated_at: new Date().toISOString()
        })
        .eq('id', processingPickupId);

      if (updatePickupError) throw updatePickupError;

      // Update offer status to indicate seller no-show
      const { error: updateOfferError } = await supabase
        .from('price_offers')
        .update({ 
          status: 'seller_no_show',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOffer.id);

      if (updateOfferError) throw updateOfferError;

      // Update local state
      const updatedPickups = { ...scheduledPickups };
      const pickup = Object.values(updatedPickups).find(p => p.id === processingPickupId);
      if (pickup) {
        pickup.seller_no_show = true;
        setScheduledPickups(updatedPickups);
      }

      // Remove this offer from the accepted offers list
      setAcceptedOffers(prevOffers =>
        prevOffers.filter(offer => offer.id !== currentOffer.id)
      );

      toast.success("Marked seller as no-show. Item needs to be returned.");
      setShowNoShowDialog(false);

      // Refresh data
      await fetchExistingPickups();
      await fetchAcceptedOffers();

    } catch (error: any) {
      console.error('Error marking seller as no-show:', error);
      toast.error(`Failed to mark seller as no-show: ${error.message}`);
    } finally {
      setSchedulingLoading(false);
      setProcessingPickupId(null);
      setCurrentOffer(null);
    }
  };

  // Render logic
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">You do not have permission to access this page.</p>
      </div>
    );
  }

  if (loading && acceptedOffers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center">
            <Shield className="mr-2 h-7 w-7 text-primary" />
            Admin Offer Coordination
          </h1>
          <Button onClick={fetchAcceptedOffers} disabled={refreshing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Offers
          </Button>
        </div>

        {acceptedOffers.length === 0 && !loading ? (
          <p className="text-center text-muted-foreground mt-10">No accepted offers require coordination.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {acceptedOffers.map((offer) => {
              const pickup = scheduledPickups[offer.id];
              const isProcessing = processingPickupId === pickup?.id;

              return (
                <Card key={offer.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{offer.product.title}</CardTitle>
                    <Badge variant="secondary" className="w-fit">Offer ID: {offer.id.substring(0, 8)}</Badge>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3 text-sm">
                    <p><strong>Buyer:</strong> {offer.buyer.full_name}</p>
                    <p><strong>Seller:</strong> {offer.seller.full_name}</p>
                    <p><strong>Agreed Price:</strong> ₹{offer.offered_price.toLocaleString()}</p>

                    {pickup ? (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-2">Pickup Scheduled:</h4>
                        <p className="flex items-center"><MapPin size={14} className="mr-1.5" /> {fetchPickupLocationName(pickup.pickup_location_id)}</p>
                        {formatPickupTimeWithRole(pickup, offer)}
                        <div className="flex gap-2 mt-3">
                          <Badge 
                            variant={pickup.item_received ? "secondary" : "outline"}
                            className={cn(pickup.item_received ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "")}
                          >
                            {pickup.item_received ? 'Item Received' : 'Not Received'}
                          </Badge>
                          <Badge 
                            variant={pickup.item_delivered ? "secondary" : "outline"}
                            className={cn(pickup.item_delivered ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "")}
                          >
                            {pickup.item_delivered ? 'Item Delivered' : 'Not Delivered'}
                          </Badge>
                          {pickup.seller_no_show && (
                            <Badge 
                              variant="secondary"
                              className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            >
                              Seller No-Show
                            </Badge>
                          )}
                        </div>
                        {pickup.transaction_id && (
                          <p className="text-xs mt-2 text-muted-foreground">Transaction ID: {pickup.transaction_id}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-amber-600 mt-3">Pickup not scheduled yet.</p>
                    )}
                  </CardContent>
                  <CardFooter className="grid grid-cols-2 gap-2">
                    {!pickup ? (
                      <Button onClick={() => handleSchedulePickup(offer)} className="col-span-2">
                        <CalendarDays size={16} className="mr-2" /> Schedule Pickup
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleItemReceived(pickup.id)}
                          disabled={pickup.item_received || isProcessing || pickup.seller_no_show}
                          variant="outline"
                          size="sm"
                        >
                          {isProcessing && !pickup.item_received ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle size={16} className="mr-2" />}
                          Item Received
                        </Button>
                        <Button
                          onClick={() => handleItemDelivered(pickup.id, offer)}
                          disabled={!pickup.item_received || pickup.item_delivered || isProcessing || pickup.seller_no_show}
                          variant="outline"
                          size="sm"
                        >
                           {isProcessing && pickup.item_received && !pickup.item_delivered ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle size={16} className="mr-2" />}
                          Item Given
                        </Button>
                        {!pickup.item_received && !pickup.seller_no_show && (
                          <Button
                            onClick={() => handleSellerNoShow(pickup.id, offer)}
                            variant="destructive"
                            size="sm"
                            className="col-span-2 mt-2"
                            disabled={isProcessing || pickup.item_received}
                          >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle size={16} className="mr-2" />}
                            Seller Didn't Show
                          </Button>
                        )}
                        {offer.seller?.payment_qr_url && !pickup.seller_no_show && (
                           <Button
                             onClick={() => handleShowQrCode(offer)}
                             variant="secondary"
                             className="col-span-2 mt-2"
                           >
                             <QrCode size={16} className="mr-2"/> Show Seller Payment QR
                           </Button>
                        )}
                      </>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Pickup Dialog */}
      {showScheduleDialog && selectedOffer && (
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Pickup for "{selectedOffer.product.title}"</DialogTitle>
              <DialogDescription>
                Select a location, date, and time for the buyer and seller to meet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select onValueChange={setSelectedLocation} value={selectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Pickup Location" />
                </SelectTrigger>
                <SelectContent>
                  {pickupLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-4 items-start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Disable past dates
                />
                <div className="flex-1 space-y-2">
                  <label htmlFor="pickupTimeSeller" className="text-sm font-medium">Seller Time</label>
                  <Input
                    id="pickupTimeSeller"
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  />
                   <label htmlFor="pickupTimeBuyer" className="text-sm font-medium">Buyer Time</label>
                  <Input
                    id="pickupTimeBuyer"
                    type="time"
                    value={buyerPickupTime}
                    onChange={(e) => setBuyerPickupTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmitSchedule} disabled={schedulingLoading}>
                {schedulingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Transaction ID Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={(open) => { if (!open) setProcessingPickupId(null); setShowTransactionDialog(open); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Item Given</DialogTitle>
              <DialogDescription>
                Enter the Transaction ID provided by the buyer as proof of delivery. This ID will be stored with the pickup record.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-800">Payment Information</h3>
                    {currentOffer && (
                      <>
                        <div className="mt-2 bg-white p-3 rounded-md border border-blue-100 font-mono text-sm">
                          <div className="text-center mb-2 font-medium text-blue-900">SRM Marketplace Receipt</div>
                          <div className="flex justify-between">
                            <span>Product:</span>
                            <span className="text-right">{currentOffer.product.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Seller:</span>
                            <span className="text-right">{currentOffer.seller.full_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Buyer:</span>
                            <span className="text-right">{currentOffer.buyer.full_name}</span>
                          </div>
                          <div className="border-t border-dashed border-gray-300 my-2"></div>
                          <div className="flex justify-between">
                            <span>Trade Amount:</span>
                            <span className="text-right">₹{currentOffer.offered_price.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SRM Service Fee (2%):</span>
                            <span className="text-right">{calculateServiceFee(currentOffer.offered_price).feeFormatted}</span>
                          </div>
                          <div className="border-t border-gray-300 my-1"></div>
                          <div className="flex justify-between font-medium">
                            <span>Total to Seller:</span>
                            <span className="text-right">₹{currentOffer.offered_price.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Total to SRM:</span>
                            <span className="text-right">{calculateServiceFee(currentOffer.offered_price).feeFormatted}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-blue-900 font-medium mt-3">
                          Please collect the service fee from the buyer.
                        </p>
                        
                        <Button 
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => {
                            // Create print content
                            const printContent = `
                              <html>
                                <head>
                                  <title>SRM Marketplace Receipt</title>
                                  <style>
                                    body { font-family: monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
                                    .header { text-align: center; font-weight: bold; margin-bottom: 20px; font-size: 18px; }
                                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                                    .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
                                    .solid-divider { border-top: 1px solid #ccc; margin: 10px 0; }
                                    .total { font-weight: bold; }
                                    .footer { margin-top: 30px; text-align: center; font-size: 14px; }
                                    .timestamp { margin-top: 20px; font-size: 12px; text-align: center; }
                                  </style>
                                </head>
                                <body>
                                  <div class="header">SRM Marketplace Receipt</div>
                                  <div class="row">
                                    <span>Transaction ID:</span>
                                    <span>${currentTransactionId || 'Pending'}</span>
                                  </div>
                                  <div class="row">
                                    <span>Receipt Date:</span>
                                    <span>${new Date().toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}</span>
                                  </div>
                                  <div class="divider"></div>
                                  <div class="row">
                                    <span>Product:</span>
                                    <span>${currentOffer.product.title}</span>
                                  </div>
                                  <div class="row">
                                    <span>Seller:</span>
                                    <span>${currentOffer.seller.full_name}</span>
                                  </div>
                                  <div class="row">
                                    <span>Buyer:</span>
                                    <span>${currentOffer.buyer.full_name}</span>
                                  </div>
                                  <div class="divider"></div>
                                  <div class="row">
                                    <span>Trade Amount:</span>
                                    <span>₹${currentOffer.offered_price.toLocaleString()}</span>
                                  </div>
                                  <div class="row">
                                    <span>SRM Service Fee (2%):</span>
                                    <span>${calculateServiceFee(currentOffer.offered_price).feeFormatted}</span>
                                  </div>
                                  <div class="solid-divider"></div>
                                  <div class="row total">
                                    <span>Total to Seller:</span>
                                    <span>₹${currentOffer.offered_price.toLocaleString()}</span>
                                  </div>
                                  <div class="row total">
                                    <span>Total to SRM:</span>
                                    <span>${calculateServiceFee(currentOffer.offered_price).feeFormatted}</span>
                                  </div>
                                  <div class="footer">
                                    Thank you for using SRM Marketplace!
                                  </div>
                                  <div class="timestamp">
                                    Generated: ${new Date().toLocaleString()}
                                  </div>
                                </body>
                              </html>
                            `;
                            
                            // Open a new window for printing
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(printContent);
                              printWindow.document.close();
                              printWindow.focus();
                              printWindow.print();
                              // Close the print window/tab after printing
                              printWindow.close();
                            } else {
                              toast.error('Please allow pop-ups to print the receipt');
                            }
                          }}
                        >
                          <Printer className="h-4 w-4 mr-2" /> Print Receipt
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="transactionId" className="text-sm font-medium block mb-1">Transaction ID</label>
              <Input
                id="transactionId"
                placeholder="Enter Transaction ID"
                value={currentTransactionId}
                onChange={(e) => setCurrentTransactionId(e.target.value)}
              />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setShowTransactionDialog(false); setProcessingPickupId(null);}}>Cancel</Button>
              <Button onClick={handleTransactionSubmit} disabled={schedulingLoading || !currentTransactionId}>
                {schedulingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Delivery
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      
       {/* Seller QR Code Dialog */}
       {currentOffer && currentSellerQrCode && (
        <Dialog open={!!currentSellerQrCode} onOpenChange={handleCloseQrDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Payment QR Code for {currentOffer?.seller?.full_name}</DialogTitle>
              <DialogDescription>
                Buyer can scan this QR code to make the payment directly to the seller.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              {isLoadingQrCode ? (
                 <Loader2 className="h-8 w-8 animate-spin" />
              ) : currentSellerQrCode ? (
                <img src={currentSellerQrCode} alt="Seller Payment QR Code" className="max-w-xs w-full h-auto rounded-md" />
              ) : (
                 <p className="text-red-500">Could not load QR code.</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCloseQrDialog}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
       )}

       {/* General Loading for QR */}
       {currentOffer && isLoadingQrCode && !currentSellerQrCode && (
         <Dialog open={isLoadingQrCode} onOpenChange={() => { /* Do nothing, controlled by isLoadingQrCode */ }}>
            <DialogContent className="max-w-xs text-center">
              <DialogHeader>
                <DialogTitle>Loading QR Code...</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center py-6">
                 <Loader2 className="h-10 w-10 animate-spin" />
              </div>
            </DialogContent>
         </Dialog>
       )}

      {/* Seller No-Show Dialog */}
      <Dialog open={showNoShowDialog} onOpenChange={(open) => { if (!open) { setProcessingPickupId(null); setCurrentOffer(null); } setShowNoShowDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Seller No-Show</DialogTitle>
            <DialogDescription>
              This will mark the seller as a no-show. The item will need to be returned to the seller, and the trade will be canceled.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-md bg-amber-50 p-4 border border-amber-100">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800">Confirmation Required</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Are you sure the seller didn't show up for the scheduled pickup? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoShowDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmSellerNoShow} disabled={schedulingLoading}>
              {schedulingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Seller No-Show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
} 