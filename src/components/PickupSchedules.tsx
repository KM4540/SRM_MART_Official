import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays, Clock, MapPin, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface PickupSchedule {
  id: string;
  offer_id: string;
  pickup_location_id: string;
  pickup_time: string;
  buyer_pickup_time?: string;
  is_seller: boolean;
  item_received: boolean;
  item_delivered: boolean;
  transaction_id: string | null;
  offer: {
    product: {
      title: string;
      price: number;
    };
    offered_price: number;
  };
  location: {
    name: string;
    address: string;
  };
}

export default function PickupSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<PickupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      fetchSchedules();
    }
  }, [user]);

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
    }
  };

  const fetchSchedules = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First check if the table exists
      const { error: tableCheckError } = await supabase
        .from('pickup_schedules')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        // Table doesn't exist or other error
        console.log('Pickup schedules table not ready:', tableCheckError);
        setSchedules([]);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_pending_schedules', { user_id: user.id })
        .select(`
          *,
          offer:price_offers(
            product:products(title, price),
            offered_price
          ),
          location:pickup_locations(name, address)
        `);

      if (error) throw error;
      
      // Set the schedules in state
      setSchedules(data || []);
   
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load pickup schedules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="container max-w-7xl py-10 px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Pickup Schedules</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Manage pickup schedules' : 'View your pickup schedules'}
            </p>
          </div>
          <Button onClick={() => fetchSchedules()} variant="outline">
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 bg-secondary/30 rounded-lg">
            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Scheduled Pickups</h3>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "No pickup schedules have been created yet"
                : "You don't have any scheduled pickups at the moment"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {schedule.offer.product.title}
                  </CardTitle>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {schedule.is_seller ? 'You are selling' : 'You are buying'}
                    </Badge>
                    <span className="font-medium">₹{schedule.offer.offered_price}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{schedule.location.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.location.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(schedule.is_seller ? schedule.pickup_time : (schedule.buyer_pickup_time || schedule.pickup_time)), 'd MMM, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(schedule.is_seller ? schedule.pickup_time : (schedule.buyer_pickup_time || schedule.pickup_time)), 'p')}
                        {schedule.buyer_pickup_time && schedule.pickup_time !== schedule.buyer_pickup_time && (
                          <span className="ml-1 text-xs">
                            ({schedule.is_seller ? "Seller's time" : "Buyer's time"})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Item Status:</span>
                      <div className="flex gap-1">
                        {schedule.item_received ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Received
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Awaiting Receipt
                          </Badge>
                        )}
                        
                        {schedule.item_delivered && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 ml-1">
                            Delivered
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {schedule.transaction_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Transaction ID:</span>
                        <span className="text-sm font-medium">{schedule.transaction_id}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
} 