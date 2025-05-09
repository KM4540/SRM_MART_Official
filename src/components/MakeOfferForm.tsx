import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Info } from 'lucide-react';
import {
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BuyButtonProps {
  product: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
    status: string;
  };
}

const BuyButton = ({ product }: BuyButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleBuy = async () => {    
    if (!user) {
      toast.error('Please log in to buy this product');
      return;
    }

    if (product.status === 'sold') {
      toast.error('This product has already been sold');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create an accepted offer directly (bypassing negotiation)
      const { error } = await supabase
        .from('price_offers')
        .insert({
          product_id: product.id,
          buyer_id: user.id,
          seller_id: product.seller_id,
          offered_price: product.price, // Use the listed price
          buyer_message: "Direct purchase at listed price",
          status: 'accepted' // Set as accepted immediately
        });
        
      if (error) throw error;
      
      // Update product status to sold
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'sold' })
        .eq('id', product.id);
        
      if (updateError) throw updateError;
      
      toast.success('Product purchased successfully!');
      setShowDialog(false);
      
      // Reload page after short delay to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error purchasing product:', error);
      toast.error(error.message || 'Failed to purchase product');
    } finally {
      setLoading(false);
    }
  };

  if (product.status === 'sold') {
    return null;
  }

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        className="w-full"
        disabled={product.status === 'sold'}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Buy Now
      </Button>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase "{product.title}" for ₹{product.price}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p>This will directly purchase the item at the listed price. Continue?</p>
            
            {/* Notice for sellers about service charge */}
            <Alert className="mt-4 text-xs bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              <Info className="h-3 w-3 mr-1" />
              <AlertDescription>
                Sellers will be charged a 2% service fee on successful sales.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBuy} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Purchase'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BuyButton; 