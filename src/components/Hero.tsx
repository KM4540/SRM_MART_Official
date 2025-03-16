import { useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/types/category';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '../hooks/useDebounce';

const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const backgroundImages = [
    'https://images.unsplash.com/photo-1556742111-a301076d9d18?q=80&w=2070',
    'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?q=80&w=2070',
    'https://images.unsplash.com/photo-1627915813338-2fba31911e64?q=80&w=2070'
  ];
  
  // Preload images
  useEffect(() => {
    backgroundImages.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => setImageLoaded(true);
    });
  }, []);

  // Hero background image rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === backgroundImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 6000);
    
    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      try {
        setLoading(true);
        let query = supabase
          .from('products')
          .select(`
            *,
            seller_contacts (
              name,
              email,
              phone
            )
          `)
          .or(`title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`)
          .order('created_at', { ascending: false })
          .limit(4);

        const { data, error } = await query;

        if (error) throw error;
        setSearchResults(data || []);
        setShowResults(true);
      } catch (error: any) {
        toast.error(error.message || 'Error searching products');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  const handleResultClick = (productId: string) => {
    navigate(`/product/${productId}`);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === 'All Categories') {
      setSelectedCategory('All Categories');
      return;
    }
    navigate(`/category/${categoryId}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    const searchParams = new URLSearchParams();
    searchParams.append('search', searchQuery.trim());
    if (selectedCategory !== 'All Categories') {
      searchParams.append('category', selectedCategory);
    }
    navigate(`/listings?${searchParams.toString()}`);
    setShowResults(false);
  };
  
  return (
    <div className="relative min-h-[500px] flex items-center justify-center overflow-hidden bg-background">
      {/* Background Image with Fallback */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800"
        style={{
          backgroundImage: imageLoaded ? `url(${backgroundImages[currentImageIndex]})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 container px-4 md:px-6 py-24 text-center">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg p-8 md:p-12 max-w-3xl mx-auto border border-gray-200 dark:border-gray-800">
          <div className="inline-block bg-white dark:bg-gray-900 rounded-lg px-6 py-3 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold">
              Moving Out of Dorms?
            </h1>
          </div>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Buy and sell second-hand items with your fellow students. From textbooks to electronics, find everything you need for college life.
          </p>
          
          {/* Search Section */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <Select
                value={selectedCategory}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-[180px] bg-background dark:bg-card">
                  <SelectValue placeholder="Browse Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Categories">All Categories</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  className="w-full bg-background dark:bg-card"
                />
                {showResults && searchResults.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border z-50">
                    {searchResults.map((product) => (
                      <div
                        key={product.id}
                        className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3"
                        onClick={() => handleResultClick(product.id)}
                      >
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{product.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.category} • ₹{product.price}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button type="submit" size="icon" disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

export default Hero;
