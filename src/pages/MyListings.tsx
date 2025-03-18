import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Edit, Plus, Store } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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

const MyListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { useMyProducts, useDeleteProductMutation } = useProducts();
  const { data: products, isLoading, refetch } = useMyProducts();
  const deleteProductMutation = useDeleteProductMutation();
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProductMutation.mutateAsync(id);
      setProductToDelete(null);
      refetch();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <AnimatedLayout>
      <Navbar />
      
      <main className="min-h-screen container max-w-7xl py-12 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Listings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your listed products
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/sell">
              <Button className="flex items-center gap-2">
                <Plus size={16} />
                Add New Listing
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Store size={16} />
                Browse Store
              </Button>
            </Link>
          </div>
        </div>
        
        <Separator className="mb-8" />
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-16 bg-secondary/30 rounded-lg">
            <Store size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Listings Yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven't listed any products for sale yet.
            </p>
            <Link to="/sell">
              <Button>Create Your First Listing</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products?.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  category={product.category}
                  date={new Date(product.created_at).toLocaleDateString()}
                  sellerName={product.seller_contacts?.[0]?.name || ''}
                  sellerPhone={product.seller_contacts?.[0]?.phone || ''}
                />
                
                <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setProductToDelete(product.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your listing
                          and remove it from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <Button 
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => navigate(`/edit-product/${product.id}`)}
                  >
                    <Edit size={14} />
                  </Button>
                </div>
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
