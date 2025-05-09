import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { CATEGORIES } from '@/types/category';
import CategoryCard from '@/components/CategoryCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CategorySection = () => {
  const { toast: uiToast } = useToast();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  const fetchCategoryCounts = async () => {
    try {
      // Get all products that are available (not sold)
      const { data: products, error } = await supabase
        .from('products')
        .select('category, status')
        .eq('status', 'available');

      if (error) throw error;

      console.log('Available products:', products); // Debug log for products
      console.log('Available categories:', CATEGORIES.map(c => c.id)); // Debug log for available categories

      // Initialize counts for all categories
      const counts: Record<string, number> = {};
      CATEGORIES.forEach(category => {
        counts[category.id] = 0;
      });

      // Count products per category (only unsold ones)
      products?.forEach(product => {
        console.log('Product category:', product.category); // Debug log for each product's category
        if (product.category && counts[product.category] !== undefined && product.status !== 'sold') {
          counts[product.category]++;
        }
      });

      console.log('Final category counts:', counts); // Debug log for final counts
      setCategoryCounts(counts);
    } catch (error: any) {
      toast.error(error.message || 'Error fetching category counts');
    } finally {
      setLoading(false);
    }
  };

  // Filter categories to only show those with items
  const activeCategories = CATEGORIES.filter(category => categoryCounts[category.id] > 0);
  console.log('Active categories:', activeCategories); // Debug log for active categories

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Browse Categories</h2>
        <p className="text-muted-foreground">
          Find what you need in our curated collection of categories
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {activeCategories.map((category) => (
          <CategoryCard
            key={category.id}
            id={category.id}
            name={category.name}
            icon={category.icon}
            count={categoryCounts[category.id] || 0}
          />
        ))}
      </div>
    </div>
  );
};

export default CategorySection;
