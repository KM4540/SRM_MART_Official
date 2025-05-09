import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, Clock, IndianRupee } from 'lucide-react';
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
  condition: string;
  date: string;
  location?: string;
  isFeatured?: boolean;
  className?: string;
  status: 'available' | 'sold' | 'reserved';
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  price,
  image,
  category,
  condition,
  date,
  location,
  isFeatured = false,
  className = '',
  status = 'available',
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
  
  const handleCardClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.error("Please log in to view product details");
      navigate('/auth');
      return;
    }
  };
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if product is sold
    if (status === 'sold') {
      toast.error("This product has already been sold");
      return;
    }
    
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
    let date;
    
    try {
      // First try parsing as ISO string (from database)
      if (dateString.includes('T') || dateString.includes('Z')) {
        date = new Date(dateString);
      } else {
        // If it's already been converted to a locale string, try to parse it
        // This handles cases where the component receives an already formatted date
        const parts = dateString.split(/[/, ]+/);
        
        // Handle different locale formats
        if (parts.length >= 3) {
          // For formats like "MM/DD/YYYY" or "Mon DD, YYYY"
          // Extract the parts and make a best guess
          let year, month, day;
          
          // Try to identify which parts are year, month, day based on their format
          parts.forEach(part => {
            if (part.length === 4 && !isNaN(Number(part))) {
              // 4-digit number is likely a year
              year = Number(part);
            } else if (!isNaN(Number(part))) {
              // Other numbers could be day or month
              if (Number(part) > 12) {
                day = Number(part);
              } else if (!month) {
                month = Number(part) - 1; // JS months are 0-indexed
              } else {
                day = Number(part);
              }
            } else if (isNaN(Number(part)) && part.length >= 3) {
              // This might be a month name like "Jan", "Feb", etc.
              const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
              const monthIndex = monthNames.findIndex(m => part.toLowerCase().startsWith(m));
              if (monthIndex !== -1) {
                month = monthIndex;
              }
            }
          });
          
          // If we have all parts, create the date
          if (year && month !== undefined && day) {
            date = new Date(year, month, day);
          } else {
            // Fallback: try standard date parsing
            date = new Date(dateString);
          }
        } else {
          // Fallback: try standard date parsing
          date = new Date(dateString);
        }
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString);
        return "Invalid date";
      }
    } catch (e) {
      console.error("Error parsing date:", e, dateString);
      return "Invalid date";
    }
    
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
        status === 'sold' ? 'opacity-75' : '',
        className
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick(e as any);
        }
      }}
    >
      <Link to={`/product/${id}`} onClick={handleCardClick} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {isFeatured && (
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-primary text-white text-xs font-medium px-2.5 py-1 rounded-full">
                Featured
              </span>
            </div>
          )}
          
          <div className="absolute bottom-3 left-3 z-10 flex gap-2">
            <Badge variant="outline" className={cn("text-xs", getConditionColor(condition))}>
              {condition}
            </Badge>
            {status !== 'available' && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  status === 'reserved' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : '',
                  status === 'sold' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "absolute top-3 right-3 z-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 dark:bg-black/70 dark:hover:bg-black/90 transition-all duration-200",
              isFavorite ? "text-destructive hover:text-destructive" : "text-muted-foreground",
              status === 'sold' ? 'opacity-50 cursor-not-allowed' : ''
            )}
            onClick={toggleFavorite}
            disabled={status === 'sold'}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
          </Button>
          
          <img
            src={image || '/placeholder-image.jpg'}
            alt={title}
            loading="lazy"
            className={cn(
              "w-full h-full object-contain p-4 transition-opacity",
              isImageLoaded ? "opacity-100" : "opacity-0",
              status === 'sold' ? 'grayscale' : ''
            )}
            onLoad={() => setIsImageLoaded(true)}
            onError={(e) => {
              console.error("Error loading image:", image);
              e.currentTarget.src = "https://placehold.co/400x300/e2e8f0/64748b?text=No+Image";
            }}
          />
        </div>
        
        <div className="p-4">
          <h3 className="font-medium line-clamp-2 mb-1">{title}</h3>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-primary">
              {formatPrice(price)}
            </p>
            {status === 'sold' && (
              <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Sold
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock size={14} />
              <span>{getRelativeTime(date)}</span>
            </div>
          </div>
          
          {location && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin size={14} />
              <span>{location}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
