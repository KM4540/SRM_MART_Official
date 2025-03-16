import { Link } from 'react-router-dom';
import { ArrowRight, Heart, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import useWishlist from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';

interface WishlistSectionProps {
  isVisible: boolean;
}

const WishlistSection = ({ isVisible }: WishlistSectionProps) => {
  const { wishlistItems } = useWishlist();
  const { user } = useAuth();
  
  const scrollToTop = () => {
    window.scrollTo(0, 0);
  };

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="container px-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between mb-10">
            <div>
              <span className="text-sm font-medium text-primary">Your Favorites</span>
              <h2 className="text-2xl font-bold mt-1">Wishlist Items</h2>
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-secondary/40 p-3">
                <LogIn size={24} className="text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-2">Login to use wishlist</h3>
            <p className="text-muted-foreground mb-4">
              Sign in to save your favorite items to your wishlist
            </p>
            <Link to="/auth" onClick={scrollToTop}>
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between mb-10">
          <div>
            <span className="text-sm font-medium text-primary">Your Favorites</span>
            <h2 className="text-2xl font-bold mt-1">Wishlist Items</h2>
          </div>
          
          <Link to="/wishlist" onClick={scrollToTop}>
            <Button variant="outline" className="group">
              Manage Wishlist
              <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        {wishlistItems.length === 0 ? (
          <div className="bg-card rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-secondary/40 p-3">
                <Heart size={24} className="text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-4">
              Browse listings and add items to your wishlist to see them here
            </p>
            <Link to="/listings" onClick={scrollToTop}>
              <Button>Browse Listings</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistItems.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                category={product.category}
                date={product.date}
                sellerName={product.sellerName}
                sellerPhone={product.sellerPhone}
              />
            ))}
          </div>
        )}
        
        {wishlistItems.length > 4 && (
          <div className="flex justify-center mt-6">
            <Link to="/wishlist" onClick={scrollToTop}>
              <Button variant="outline">
                View All Wishlist Items
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistSection;
