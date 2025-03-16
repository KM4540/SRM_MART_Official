import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  date: string;
  sellerName?: string;
  sellerPhone?: string;
  product_id?: string; // Added for database items
}

interface WishlistStore {
  wishlistItems: WishlistItem[];
  setWishlistItems: (items: WishlistItem[]) => void;
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => Promise<void>;
  syncWithDatabase: (userId: string) => Promise<void>;
  isInitialized: boolean;
  setInitialized: (value: boolean) => void;
}

// Helper function to convert database wishlist items to local format
const formatDatabaseWishlistItem = (item: any, product: any): WishlistItem => ({
  id: item.product_id,
  product_id: item.product_id,
  title: product.title,
  price: product.price,
  image: product.image || '',
  category: product.category || '',
  date: item.created_at,
  sellerName: '',
  sellerPhone: '',
});

// Hook to use wishlist functionality and sync with database for logged-in users
const useWishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Create a user-specific store instance
  const userSpecificStore = useMemo(() => {
    // Create a unique storage key for this user
    const storageKey = user?.id ? `srmmart-wishlist-${user.id}` : 'srmmart-wishlist-temp';
    
    // Create a new store with the user-specific key
    return create<WishlistStore>()(
      persist(
        (set, get) => ({
          wishlistItems: [],
          isInitialized: false,
          
          setWishlistItems: (items) => {
            set({ wishlistItems: items });
          },
          
          setInitialized: (value) => {
            set({ isInitialized: value });
          },
          
          addToWishlist: async (item) => {
            // Check if user is logged in
            if (!user?.id) {
              toast.error("Please log in to add items to your wishlist");
              // Optional: Redirect to login page
              navigate('/auth');
              return;
            }
            
            const currentItems = get().wishlistItems;
            const existingItem = currentItems.find((i) => i.id === item.id);
            
            // Update local state only if item doesn't already exist
            if (!existingItem) {
              // Ensure item has a valid date and is properly formatted
              const formattedItem = {
                ...item,
                date: item.date || new Date().toISOString(),
                // Ensure these fields exist even if undefined in the original item
                sellerName: item.sellerName || '',
                sellerPhone: item.sellerPhone || '',
              };
              
              set({ wishlistItems: [...currentItems, formattedItem] });
              toast.success(`Added ${item.title} to wishlist`);
              
              // Sync to database
              try {
                await supabase
                  .from('wishlist_items')
                  .insert({
                    user_id: user.id,
                    product_id: item.id,
                  });
              } catch (error) {
                console.error('Error syncing wishlist to database:', error);
              }
            }
          },
          
          removeFromWishlist: async (id) => {
            // Check if user is logged in
            if (!user?.id) {
              toast.error("Please log in to manage your wishlist");
              return;
            }
            
            // Update local state
            const currentItems = get().wishlistItems;
            const updatedItems = currentItems.filter((item) => item.id !== id);
            set({ wishlistItems: updatedItems });
            toast.info('Item removed from wishlist');
            
            // Remove from database
            try {
              await supabase
                .from('wishlist_items')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', id);
            } catch (error) {
              console.error('Error removing wishlist item from database:', error);
            }
          },
          
          isInWishlist: (id) => {
            // If not logged in, nothing is in wishlist
            if (!user?.id) return false;
            
            return get().wishlistItems.some((item) => item.id === id);
          },
          
          clearWishlist: async () => {
            // Check if user is logged in
            if (!user?.id) {
              toast.error("Please log in to manage your wishlist");
              return;
            }
            
            // Update local state
            set({ wishlistItems: [] });
            toast.info('Wishlist cleared');
            
            // Clear from database
            try {
              await supabase
                .from('wishlist_items')
                .delete()
                .eq('user_id', user.id);
            } catch (error) {
              console.error('Error clearing wishlist from database:', error);
            }
          },
          
          syncWithDatabase: async (userId) => {
            if (!userId) return;
            
            try {
              // Fetch wishlist items from database
              const { data: wishlistItems, error } = await supabase
                .from('wishlist_items')
                .select('*')
                .eq('user_id', userId);
                
              if (error) throw error;
              
              if (wishlistItems && wishlistItems.length > 0) {
                // Fetch product details for each wishlist item
                const productIds = wishlistItems.map(item => item.product_id);
                const { data: products, error: productsError } = await supabase
                  .from('products')
                  .select('*')
                  .in('id', productIds);
                  
                if (productsError) throw productsError;
                
                // Map database items to wishlist items
                const formattedItems = wishlistItems.map(item => {
                  const product = products?.find(p => p.id === item.product_id);
                  if (!product) return null;
                  return formatDatabaseWishlistItem(item, product);
                }).filter(Boolean) as WishlistItem[];
                
                // Set wishlist items
                set({ wishlistItems: formattedItems });
              } else {
                // No items found, ensure wishlist is empty
                set({ wishlistItems: [] });
              }
            } catch (error) {
              console.error('Error syncing wishlist with database:', error);
              toast.error('Failed to load your wishlist from the database');
            } finally {
              set({ isInitialized: true });
            }
          },
        }),
        {
          name: storageKey,
        }
      )
    );
  }, [user?.id, navigate]);
  
  // Use the user-specific store
  const {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    syncWithDatabase,
    isInitialized,
    setInitialized,
  } = userSpecificStore();
  
  // Sync with database when user changes
  useEffect(() => {
    const syncWishlist = async () => {
      if (user?.id) {
        // Sync with the database when user is present
        await syncWithDatabase(user.id);
        setInitialized(true);
      } else {
        // If not logged in, ensure wishlist is empty
        setInitialized(true);
      }
    };
    
    // Always sync when user state changes
    syncWishlist();
    
  }, [user, syncWithDatabase, setInitialized]);
  
  return {
    wishlistItems: user?.id ? wishlistItems : [], // Only return wishlist items if logged in
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
  };
};

export default useWishlist;
