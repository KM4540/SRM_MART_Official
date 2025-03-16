import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, Clock, IndianRupee, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Badge } from '@/components/ui/badge';
import useWishlist from '@/hooks/useWishlist';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  date: string;
  location?: string;
  sellerName?: string;
  sellerPhone?: string;
  isFeatured?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  price,
  image,
  category,
  date,
  location,
  sellerName,
  sellerPhone,
  isFeatured = false,
  className = '',
}) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [cardRef, isVisible] = useScrollAnimation<HTMLDivElement>();
  
  useEffect(() => {
    // Sync with wishlist state
    setIsFavorite(isInWishlist(id));
  }, [id, isInWishlist]);
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is logged in
    if (!user) {
      toast.error("Please log in to add items to your wishlist");
      navigate('/auth');
      return;
    }
    
    if (isFavorite) {
      removeFromWishlist(id);
    } else {
      addToWishlist({
        id,
        title,
        price,
        image,
        category,
        date
      });
    }
    
    setIsFavorite(!isFavorite);
  };
  
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };
  
  const getConditionColor = (condition: string) => {
    switch(condition) {
      case 'New': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Like New': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Used': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Heavily Used': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400';
    }
  };
  
  return (
    <div 
      ref={cardRef}
      className={cn(
        'group bg-white dark:bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300',
        'border border-border/60 hover:border-border',
        isVisible ? 'animate-fade-in-up' : 'opacity-0',
        className
      )}
    >
      <Link to={`/product/${id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {isFeatured && (
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-primary text-white text-xs font-medium px-2.5 py-1 rounded-full">
                Featured
              </span>
            </div>
          )}
          
          <div className="absolute bottom-3 left-3 z-10">
            <Badge variant="outline" className={cn("text-xs", getConditionColor('Used'))}>
              Used
            </Badge>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "absolute top-3 right-3 z-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 dark:bg-black/70 dark:hover:bg-black/90 transition-all duration-200",
              isFavorite ? "text-destructive hover:text-destructive" : "text-muted-foreground"
            )}
            onClick={toggleFavorite}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </Button>
          
          <div className="lazy-image-container h-full w-full">
            <img
              src={image}
              alt={title}
              className={cn(
                "h-full w-full object-cover transition-all duration-500 group-hover:scale-105",
                !isImageLoaded && "lazy-image-blur",
                isImageLoaded && "lazy-image-loaded"
              )}
              onLoad={() => setIsImageLoaded(true)}
            />
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs bg-secondary/80 text-muted-foreground px-2 py-0.5 rounded-full">
              {category}
            </span>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock size={12} className="mr-1" />
              <span>{getRelativeTime(date)}</span>
            </div>
          </div>
          
          <h3 className="font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {location && (
            <div className="mt-1 flex items-center text-xs text-muted-foreground mb-3">
              <MapPin size={12} className="mr-1" />
              <span>{location}</span>
            </div>
          )}
          
          {sellerName && (
            <div className="mt-1 flex items-center text-xs text-muted-foreground mb-3">
              <span>Seller: {sellerName}</span>
            </div>
          )}
          
          {sellerPhone && (
            <div className="mt-1 flex items-center text-xs text-muted-foreground mb-3">
              <Phone size={12} className="mr-1" />
              <span>{sellerPhone}</span>
            </div>
          )}
          
          <div className="text-lg font-semibold text-foreground flex items-center">
            <IndianRupee size={16} className="mr-1" />
            {formatPrice(price).replace('₹', '')}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
