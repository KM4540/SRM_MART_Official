import { useEffect, useState } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import useCart from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ProductCardActionsProps {
  id: string;
  title: string;
  price: number;
  image: string;
}

const ProductCardActions = ({ id, title, price, image }: ProductCardActionsProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, cartItems, isAuthenticated } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInCart, setIsInCart] = useState(false);
  
  useEffect(() => {
    setIsInCart(cartItems.some(item => item.id === id));
  }, [cartItems, id]);
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is logged in
    if (!user) {
      toast.error("Please log in to add items to your wishlist");
      navigate('/auth');
      return;
    }
    
    setIsFavorite(!isFavorite);
    
    toast[isFavorite ? 'info' : 'success'](
      isFavorite ? 'Removed from favorites' : 'Added to favorites'
    );
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is logged in
    if (!isAuthenticated) {
      toast.error("Please log in to add items to your cart");
      navigate('/auth');
      return;
    }
    
    if (!isInCart) {
      addToCart({ id, title, price, image })
        .then((success) => {
          // Success toast is shown in the hook
        });
    } else {
      toast.info('Item already in cart');
    }
  };
  
  return (
    <div className="flex space-x-2 mt-auto">
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full ${isFavorite ? 'text-destructive border-destructive' : ''}`}
        onClick={toggleFavorite}
      >
        <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
      </Button>
      
      <Button 
        className="w-full rounded-full" 
        variant={isInCart ? "secondary" : "default"}
        onClick={handleAddToCart}
      >
        <ShoppingCart size={16} className="mr-2" />
        {isInCart ? 'In Cart' : 'Add to Cart'}
      </Button>
    </div>
  );
};

export default ProductCardActions;
