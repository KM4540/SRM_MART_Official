import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Share, Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import useCart from '@/hooks/useCart';
import useWishlist from '@/hooks/useWishlist';
import { formatPrice } from '@/lib/utils';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { useDeleteProductMutation } = useProducts();
  const deleteProductMutation = useDeleteProductMutation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            seller_contacts!inner (
              name,
              email,
              phone
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);
        
        // Check if current user is the owner of this product
        if (user && data.seller_id === user.id) {
          setIsOwner(true);
        }
      } catch (error: any) {
        setError(error.message);
        toast.error('Error fetching product details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, user]);

  useEffect(() => {
    if (id) {
      setIsFavorite(isInWishlist(id));
    }
  }, [id, isInWishlist]);

  const handleQuantityChange = (value: number) => {
    setQuantity(Math.max(1, Math.min(10, value)));
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    // Check if user is logged in
    if (!user) {
      toast.error("Please log in to add items to your cart");
      navigate('/auth');
      return;
    }
    
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image
    })
      .then((success) => {
        if (success) {
          toast.success('Added to cart');
        }
      });
  };

  const toggleFavorite = () => {
    if (!product) return;
    
    // Check if user is logged in
    if (!user) {
      toast.error("Please log in to add items to your wishlist");
      navigate('/auth');
      return;
    }
    
    if (isFavorite) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        category: product.category,
        date: product.created_at,
        sellerName: product.seller_contacts?.name,
        sellerPhone: product.seller_contacts?.phone
      });
    }
    
    setIsFavorite(!isFavorite);
  };

  const handleDeleteProduct = async () => {
    try {
      await deleteProductMutation.mutateAsync(product.id);
      toast.success('Product deleted successfully');
      navigate('/my-listings');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <AnimatedLayout>
        <Navbar />
        <main className="container max-w-5xl py-24 px-4 md:px-6">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          </div>
        </main>
        <Footer />
      </AnimatedLayout>
    );
  }

  if (error || !product) {
    return (
      <AnimatedLayout>
        <Navbar />
        <main className="container max-w-5xl py-24 px-4 md:px-6 min-h-[70vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Product Not Found</h1>
            <p className="text-muted-foreground">The product you're looking for doesn't exist or has been removed.</p>
            <Link to="/">
              <Button>Go Back to Home</Button>
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
      <main className="container max-w-5xl py-8 px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="flex items-center">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Listing
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    listing and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteProduct}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img
              src={product.image}
              alt={product.title}
              className="object-cover w-full h-full"
            />
            <Button
              size="icon"
              variant="ghost"
              className={`absolute top-4 right-4 bg-white/70 backdrop-blur-sm hover:bg-white/90 dark:bg-black/70 dark:hover:bg-black/90 ${
                isFavorite ? 'text-destructive hover:text-destructive' : 'text-muted-foreground'
              }`}
              onClick={toggleFavorite}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </Button>
          </div>
          
          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
              <p className="text-2xl font-semibold text-primary">
                {formatPrice(product.price)}
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h3 className="font-medium">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Category</h3>
              <p className="text-muted-foreground">{product.category}</p>
            </div>
            
            <div className="space-y-2">
              <Button 
                className="w-full"
                onClick={() => navigate(`/user-profile/${product.seller_id}`)}
              >
                Contact Seller
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-medium text-lg">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>

                <Button
                  variant={isFavorite ? "secondary" : "outline"}
                  onClick={toggleFavorite}
                  className="flex-1"
                >
                  <Heart className="mr-2 h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                  {isFavorite ? 'Saved' : 'Add to Wishlist'}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="hidden sm:flex"
                  onClick={() => {
                    navigator.share({
                      title: product.title,
                      text: product.description,
                      url: window.location.href
                    }).catch(() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied to clipboard');
                    });
                  }}
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Share button for mobile - displayed only on small screens */}
              <div className="sm:hidden">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.share({
                      title: product.title,
                      text: product.description,
                      url: window.location.href
                    }).catch(() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied to clipboard');
                    });
                  }}
                >
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default ProductDetail;
