import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CATEGORIES } from '@/types/category';
import ProductCard from '@/components/ProductCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnimatedLayout from '@/components/AnimatedLayout';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<any>(null);

  useEffect(() => {
    // Find the category details
    const foundCategory = CATEGORIES.find(cat => cat.id === categoryId);
    setCategory(foundCategory);

    // Fetch products for this category
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, condition, seller_contacts(name)')
        .eq('category', categoryId)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Additional safety check to filter out any sold items
      const availableProducts = (data || []).filter(product => product.status !== 'sold');
      setProducts(availableProducts);
    } catch (error: any) {
      toast.error(error.message || 'Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  if (!category) {
    return (
      <AnimatedLayout>
        <Navbar />
        <div className="container py-8">
          <h1 className="text-2xl font-bold">Category not found</h1>
        </div>
        <Footer />
      </AnimatedLayout>
    );
  }

  return (
    <AnimatedLayout>
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            <category.icon size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <p className="text-muted-foreground">{products.length} {products.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="mt-4 h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">No items found</h2>
            <p className="text-muted-foreground">
              There are no items listed in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                category={product.category}
                condition={product.condition || 'Used'}
                date={product.created_at}
                status={product.status || 'available'}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </AnimatedLayout>
  );
};

export default CategoryPage; 