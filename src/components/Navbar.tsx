import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, User, Plus, ShoppingCart, Heart, LogOut, Store, Shield, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import useCart from '@/hooks/useCart';
import useWishlist from '@/hooks/useWishlist';
import { supabase } from '@/integrations/supabase/client';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { wishlistItems } = useWishlist();
  const { user, profile, signOut } = useAuth();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
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

        if (error) throw error;
        setSearchResults(data || []);
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
    setSearchOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase() || 'U';
  };
  
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (location.pathname !== '/') {
      navigate('/');
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
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-sm border-b' : ''}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" onClick={handleLogoClick} className="flex items-center space-x-2">
            <span className="font-bold text-xl">SRM Mart</span>
          </a>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/listings">
              <Button variant="ghost">Browse</Button>
            </Link>
            
            <div className="relative w-64">
              <Input
                type="search"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              {searchResults.length > 0 && (
                <div className="absolute w-full mt-1 bg-background rounded-lg shadow-lg border z-50">
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
                      <div className="flex-1">
                        <div className="font-medium">{product.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm text-muted-foreground">
                            {product.category} • ₹{product.price}
                          </span>
                          <Badge variant="outline" className={cn("text-xs ml-1", getConditionColor(product.condition))}>
                            {product.condition}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Admin Dashboard Button - Only visible to admins */}
            {profile?.is_admin && (
              <Link to="/admin">
                <Button variant="outline" className="flex items-center gap-1 text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-800">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}

            <Link to="/cart">
              <Button variant="ghost" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                    {cartItems.length}
                  </span>
                )}
              </Button>
            </Link>

            <Link to="/wishlist">
              <Button variant="ghost" className="relative">
                <Heart className="h-5 w-5" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                    {wishlistItems.length}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <>
                <Link to="/sell">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Sell
                  </Button>
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || ''} />
                        <AvatarFallback>{getInitials(profile?.full_name || '')}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link to="/profile">
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    <Link to="/my-listings">
                      <DropdownMenuItem>
                        <Store className="mr-2 h-4 w-4" />
                        My Listings
                      </DropdownMenuItem>
                    </Link>
                    <Link to="/my-pending-items">
                      <DropdownMenuItem>
                        <Store className="mr-2 h-4 w-4" />
                        My Pending Items
                      </DropdownMenuItem>
                    </Link>
                    <Link to="/my-offers">
                      <DropdownMenuItem>
                        <DollarSign className="mr-2 h-4 w-4" />
                        My Offers
                      </DropdownMenuItem>
                    </Link>
                    {profile?.is_admin && (
                      <Link to="/admin">
                        <DropdownMenuItem>
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/auth">
                  <Button>Login</Button>
                </Link>
              </div>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                {searchResults.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white dark:bg-card rounded-lg shadow-lg border z-50">
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
                        <div className="flex-1">
                          <div className="font-medium">{product.title}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm text-muted-foreground">
                              {product.category} • ₹{product.price}
                            </span>
                            <Badge variant="outline" className={cn("text-xs ml-1", getConditionColor(product.condition))}>
                              {product.condition}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Admin Dashboard Button in Mobile Menu - Only for Admins */}
              {profile?.is_admin && (
                <Link to="/admin">
                  <Button variant="outline" className="w-full justify-start text-purple-700 border-purple-200">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              
              <Link to="/listings">
                <Button variant="ghost" className="w-full justify-start">
                  Browse
                </Button>
              </Link>
              
              <Link to="/cart">
                <Button variant="ghost" className="w-full justify-start">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Cart
                  {cartItems.length > 0 && (
                    <span className="ml-2 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                      {cartItems.length}
                    </span>
                  )}
                </Button>
              </Link>
              
              <Link to="/wishlist">
                <Button variant="ghost" className="w-full justify-start">
                  <Heart className="h-5 w-5 mr-2" />
                  Wishlist
                  {wishlistItems.length > 0 && (
                    <span className="ml-2 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                      {wishlistItems.length}
                    </span>
                  )}
                </Button>
              </Link>
              
              {user ? (
                <>
                  <Link to="/sell">
                    <Button className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Sell
                    </Button>
                  </Link>
                  
                  <Link to="/profile">
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  
                  <Link to="/my-listings">
                    <Button variant="ghost" className="w-full justify-start">
                      <Store className="h-4 w-4 mr-2" />
                      My Listings
                    </Button>
                  </Link>
                  
                  <Link to="/my-pending-items">
                    <Button variant="ghost" className="w-full justify-start">
                      <Store className="h-4 w-4 mr-2" />
                      My Pending Items
                    </Button>
                  </Link>
                  
                  <Link to="/my-offers">
                    <Button variant="ghost" className="w-full justify-start">
                      <DollarSign className="h-4 w-4 mr-2" />
                      My Offers
                    </Button>
                  </Link>
                  
                  {profile?.is_admin && (
                    <Link to="/admin">
                      <Button variant="ghost" className="w-full justify-start">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/auth">
                    <Button className="w-full">Login</Button>
                  </Link>
                  
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Search items..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchResults.length > 0 && (
            <CommandGroup heading="Products">
              {searchResults.map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => handleResultClick(product.id)}
                  className="flex items-center gap-3 p-2"
                >
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div>
                    <div className="font-medium">{product.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm text-muted-foreground">
                        {product.category} • ₹{product.price}
                      </span>
                      <Badge variant="outline" className={cn("text-xs ml-1", getConditionColor(product.condition))}>
                        {product.condition}
                      </Badge>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </header>
  );
};

export default Navbar;
