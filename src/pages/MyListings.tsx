import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProductCard from '@/components/ProductCard';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { supabase } from '@/integrations/supabase/client';

const MyListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchUserProducts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*, condition')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUserProducts(data || []);
      } catch (error: any) {
        toast.error(error.message || 'Error fetching listings');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProducts();
  }, [user, navigate]);

  const handleDelete = async (productId: string) => {
    try {
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (productError) throw productError;

      setUserProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
      setProductToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Error deleting product');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <AnimatedLayout>
        <Navbar />
        <main className="container max-w-4xl py-12 px-4 md:px-6 min-h-screen">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </AnimatedLayout>
    );
  }

  return (
    <AnimatedLayout>
      <Navbar />
      <main className="container max-w-4xl py-12 px-4 md:px-6 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Listings</h1>
          <Link to="/sell">
            <Button>List New Product</Button>
          </Link>
        </div>

        {userProducts.length === 0 ? (
          <div className="text-center py-16 bg-secondary/30 rounded-lg">
            <Store size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Listings Yet</h3>
            <p className="text-muted-foreground">
              You haven't listed any products for sale yet.
            </p>
            <Link to="/sell" className="mt-4 inline-block">
              <Button>List Your First Product</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {userProducts.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  category={product.category}
                  condition={product.condition || 'Used'}
                  date={product.created_at}
                  status={product.status || 'available'}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 scale-75"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProductToDelete(product.id);
                      }}
                      title="Delete Listing"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  {productToDelete === product.id && (
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your product listing.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  )}
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default MyListings; 
