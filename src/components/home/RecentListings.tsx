import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';

interface RecentListingsProps {
  products: any[];
  visibleItems: any[];
  loading: boolean;
}

const RecentListings = ({ products, visibleItems, loading }: RecentListingsProps) => {
  if (loading) {
    return <div className="container px-4 md:px-6 py-12">Loading recent listings...</div>;
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="container px-4 md:px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-sm font-medium text-primary">Just Added</span>
          <h2 className="text-3xl font-bold tracking-tighter">Recent Listings</h2>
        </div>
        <Link to="/listings">
          <Button variant="outline">View All</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {visibleItems.map((product) => (
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
    </section>
  );
};

export default RecentListings;
