import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';

interface RecentListingsProps {
  products: any[];
  visibleItems: any[];
  loading: boolean;
}

const RecentListings = ({ products, visibleItems, loading }: RecentListingsProps) => {
  const scrollToTop = () => {
    window.scrollTo(0, 0);
  };

  return (
    <div className="container px-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between mb-10">
        <div>
          <span className="text-sm font-medium text-primary">Just Added</span>
          <h2 className="text-2xl font-bold mt-1">Recent Listings</h2>
        </div>
        
        <Link to="/listings" onClick={scrollToTop}>
          <Button variant="outline" className="group">
            All Listings
            <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No recent listings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleItems.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              price={product.price}
              image={product.image}
              category={product.category}
              date={new Date(product.created_at).toLocaleDateString()}
              sellerName={product.seller_contacts?.[0]?.name}
              sellerPhone={product.seller_contacts?.[0]?.phone}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentListings;
