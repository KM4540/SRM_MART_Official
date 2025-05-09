import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, DollarSign, Clock, CheckCircle, XCircle, TrendingUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SellerOffers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingOffers: 0,
    acceptedOffers: 0,
    activeListings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch pending offers count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('price_offers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user?.id)
        .eq('status', 'pending');
      
      // Fetch accepted offers count
      const { count: acceptedCount, error: acceptedError } = await supabase
        .from('price_offers')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user?.id)
        .eq('status', 'accepted');
      
      // Fetch active listings count
      const { count: listingsCount, error: listingsError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user?.id)
        .eq('status', 'available');
      
      if (!pendingError && !acceptedError && !listingsError) {
        setStats({
          pendingOffers: pendingCount || 0,
          acceptedOffers: acceptedCount || 0,
          activeListings: listingsCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Charge Notice */}
      <Alert className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
        <Info className="h-4 w-4 mr-2" />
        <AlertDescription>
          A 2% service charge applies to all successful sales, which will be deducted when you receive payment from buyers.
        </AlertDescription>
      </Alert>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Pending Offers</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {loading ? '...' : stats.pendingOffers}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-800/30 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-400">Accepted Offers</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                {loading ? '...' : stats.acceptedOffers}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-400">Active Listings</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {loading ? '...' : stats.activeListings}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-800/30 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              My Sales
            </CardTitle>
            <CardDescription>
              Manage your sales and track purchase status
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex gap-2 flex-wrap">
              {stats.pendingOffers > 0 && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  {stats.pendingOffers} new
                </Badge>
              )}
              {stats.acceptedOffers > 0 && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  {stats.acceptedOffers} completed
                </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => navigate('/my-offers')}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              View Sales History
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              My Products
            </CardTitle>
            <CardDescription>
              Manage your product listings and inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex gap-2 flex-wrap">
              {stats.activeListings > 0 && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                  {stats.activeListings} active
                </Badge>
              )}
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Manage Inventory
              </Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => navigate('/my-listings')}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              View All Products
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => navigate('/sell')}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          List New Product
        </Button>
      </div>
    </div>
  );
} 