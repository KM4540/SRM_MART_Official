import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Trash2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { formatPrice } from '@/lib/utils';
import useWishlist from '@/hooks/useWishlist';
import useCart from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-logged-in users to auth page
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // If not logged in, show login prompt
  if (!user) {
    return (
      <AnimatedLayout>
        <Navbar />
        
        <main className="min-h-[70vh] container max-w-5xl py-24 px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="rounded-full bg-secondary p-6">
              <LogIn size={32} className="text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Login Required</h1>
              <p className="text-muted-foreground">
                Please sign in to view and manage your wishlist.
              </p>
            </div>
            
            <Link to="/auth">
              <Button size="lg" className="mt-4">
                Sign In
              </Button>
            </Link>
          </div>
        </main>
        
        <Footer />
      </AnimatedLayout>
    );
  }

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.image
    });
  };

  if (wishlistItems.length === 0) {
    return (
      <AnimatedLayout>
        <Navbar />
        
        <main className="min-h-[70vh] container max-w-5xl py-24 px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="rounded-full bg-secondary p-6">
              <Heart size={32} className="text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Your wishlist is empty</h1>
              <p className="text-muted-foreground">
                Looks like you haven't added any items to your wishlist yet.
              </p>
            </div>
            
            <Link to="/">
              <Button size="lg" className="mt-4">
                Browse Listings
              </Button>
            </Link>
          </div>
        </main>
        
        <Footer />
      </AnimatedLayout>
    );
  }

  return (
    <AnimatedLayout>
      <Navbar />
      
      <main className="min-h-[70vh] container max-w-6xl py-24 px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Wishlist</h1>
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Continue Shopping
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-4">
            {wishlistItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-32 h-32 bg-secondary/50">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium line-clamp-2 mb-1">
                          {item.title}
                        </h3>
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2"
                          onClick={() => handleAddToCart(item)}
                        >
                          <ShoppingCart size={16} />
                          Add to Cart
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromWishlist(item.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                className="text-destructive" 
                onClick={clearWishlist}
              >
                Clear Wishlist
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </AnimatedLayout>
  );
};

export default Wishlist;
