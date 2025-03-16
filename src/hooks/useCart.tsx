import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useMemo } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  product_id?: string; // Added for database items
}

interface CartStore {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<boolean>;
  removeFromCart: (id: string) => Promise<boolean>;
  updateQuantity: (id: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  getCartTotal: () => number;
  syncWithDatabase: (userId: string) => Promise<void>;
  isInitialized: boolean;
  setInitialized: (value: boolean) => void;
}

// Helper function to convert database cart items to local format
const formatDatabaseCartItem = (item: any, product: any): CartItem => ({
  id: item.product_id,
  product_id: item.product_id,
  title: product.title,
  price: product.price,
  image: product.image || '',
  quantity: item.quantity,
});

// Hook to use cart functionality and sync with database for logged-in users
const useCart = () => {
  const { user } = useAuth();
  
  // Create a user-specific store instance
  const userSpecificStore = useMemo(() => {
    // Create a unique storage key for this user, or use 'guest' for non-logged in users
    const storageKey = user?.id ? `srmmart-cart-${user.id}` : 'srmmart-cart-guest';
    
    // Create a new store with the user-specific key
    return create<CartStore>()(
      persist(
        (set, get) => ({
          cartItems: [],
          isInitialized: false,
          
          setCartItems: (items) => {
            set({ cartItems: items });
          },
          
          setInitialized: (value) => {
            set({ isInitialized: value });
          },
          
          addToCart: async (item) => {
            // Check if user is authenticated
            if (!user) {
              toast.error("Please log in to add items to your cart");
              return false;
            }
            
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            const currentItems = get().cartItems;
            const existingItem = currentItems.find((i) => i.id === item.id);
            
            // Update local state
            if (existingItem) {
              set({
                cartItems: currentItems.map((i) => 
                  i.id === item.id 
                    ? { ...i, quantity: i.quantity + 1 } 
                    : i
                ),
              });
              toast.success(`Added another ${item.title} to cart`);
            } else {
              set({
                cartItems: [...currentItems, { ...item, quantity: 1 }],
              });
              toast.success(`Added ${item.title} to cart`);
            }
            
            // If user is logged in, sync to database
            if (userId) {
              try {
                if (existingItem) {
                  // Update quantity if item exists
                  await supabase
                    .from('cart_items')
                    .update({ 
                      quantity: existingItem.quantity + 1,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId)
                    .eq('product_id', item.id);
                } else {
                  // Insert new item
                  await supabase
                    .from('cart_items')
                    .insert({
                      user_id: userId,
                      product_id: item.id,
                      quantity: 1,
                    });
                }
              } catch (error) {
                console.error('Error syncing cart to database:', error);
              }
            }
            
            return true;
          },
          
          removeFromCart: async (id) => {
            // Check if user is authenticated
            if (!user) {
              toast.error("Please log in to manage your cart");
              return false;
            }
            
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            // Update local state
            set({
              cartItems: get().cartItems.filter((item) => item.id !== id),
            });
            toast.info('Item removed from cart');
            
            // If user is logged in, remove from database
            if (userId) {
              try {
                await supabase
                  .from('cart_items')
                  .delete()
                  .eq('user_id', userId)
                  .eq('product_id', id);
              } catch (error) {
                console.error('Error removing cart item from database:', error);
              }
            }
            
            return true;
          },
          
          updateQuantity: async (id, quantity) => {
            // Check if user is authenticated
            if (!user) {
              toast.error("Please log in to manage your cart");
              return false;
            }
            
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            if (quantity < 1) {
              return get().removeFromCart(id);
            }
            
            // Update local state
            set({
              cartItems: get().cartItems.map((item) =>
                item.id === id ? { ...item, quantity } : item
              ),
            });
            
            // If user is logged in, update in database
            if (userId) {
              try {
                await supabase
                  .from('cart_items')
                  .update({ 
                    quantity,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', userId)
                  .eq('product_id', id);
              } catch (error) {
                console.error('Error updating cart item in database:', error);
              }
            }
            
            return true;
          },
          
          clearCart: async () => {
            // Check if user is authenticated
            if (!user) {
              toast.error("Please log in to manage your cart");
              return false;
            }
            
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            // Update local state
            set({ cartItems: [] });
            toast.info('Cart cleared');
            
            // If user is logged in, clear from database
            if (userId) {
              try {
                await supabase
                  .from('cart_items')
                  .delete()
                  .eq('user_id', userId);
              } catch (error) {
                console.error('Error clearing cart from database:', error);
              }
            }
            
            return true;
          },
          
          syncWithDatabase: async (userId) => {
            try {
              // Fetch cart items from database
              const { data: cartItems, error } = await supabase
                .from('cart_items')
                .select('*')
                .eq('user_id', userId);
                
              if (error) throw error;
              
              if (cartItems && cartItems.length > 0) {
                // Fetch product details for each cart item
                const productIds = cartItems.map(item => item.product_id);
                const { data: products, error: productsError } = await supabase
                  .from('products')
                  .select('*')
                  .in('id', productIds);
                  
                if (productsError) throw productsError;
                
                // Map database items to cart items
                const formattedItems = cartItems.map(item => {
                  const product = products?.find(p => p.id === item.product_id);
                  if (!product) return null;
                  return formatDatabaseCartItem(item, product);
                }).filter(Boolean) as CartItem[];
                
                // Set cart items
                set({ cartItems: formattedItems });
              }
            } catch (error) {
              console.error('Error syncing cart with database:', error);
              toast.error('Failed to load your cart from the database');
            } finally {
              set({ isInitialized: true });
            }
          },
          
          getCartTotal: () => {
            return get().cartItems.reduce(
              (total, item) => total + item.price * item.quantity, 
              0
            );
          },
        }),
        {
          name: storageKey,
        }
      )
    );
  }, [user?.id, user]);
  
  // Use the user-specific store
  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    syncWithDatabase,
    isInitialized,
    setInitialized,
  } = userSpecificStore();
  
  // Sync with database when user changes
  useEffect(() => {
    const syncCart = async () => {
      if (user?.id) {
        // Sync with the database when user is present
        await syncWithDatabase(user.id);
        setInitialized(true);
      } else {
        setInitialized(true);
      }
    };
    
    // Always sync when user state changes
    syncCart();
    
  }, [user, syncWithDatabase, setInitialized]);
  
  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    isAuthenticated: !!user
  };
};

export default useCart;
