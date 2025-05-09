import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client'; // Correct import path

const FeaturedListings = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*, condition, seller_contacts(name)') // Select condition and seller name
          .eq('is_featured', true) // Assuming you have an 'is_featured' column
          .eq('status', 'available') // Only get available products
          .order('created_at', { ascending: false })
          .limit(4);
          
        if (error) throw error;
        // Additional safety check to filter out any sold items
        const availableProducts = (data || []).filter(product => product.status !== 'sold');
        setProducts(availableProducts);
      } catch (error: any) {
        console.error('Error fetching featured listings:', error);
        // Handle error
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  if (loading || products.length === 0) {
    // Don't render the section if loading or no featured items
    return null; 
  }

  return (
    <div className="bg-secondary/50 py-16">
      <div className="container px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <span className="text-sm font-medium text-primary">Top Picks</span>
            <h2 className="text-3xl font-bold tracking-tighter">Featured Listings</h2>
          </div>
          <Link to="/listings?featured=true">
            <Button variant="outline">View All Featured</Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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
              isFeatured={true} // Indicate it's featured
              status={product.status || 'available'} // Pass status
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedListings;
