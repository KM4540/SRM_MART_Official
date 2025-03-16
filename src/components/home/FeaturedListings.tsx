
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';

interface FeaturedListingsProps {
  products: any[];
  isVisible: boolean;
}

const FeaturedListings = ({ products, isVisible }: FeaturedListingsProps) => {
  return (
    <div className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between mb-10">
          <div>
            <span className="text-sm font-medium text-primary">Promoted</span>
            <h2 className="text-2xl font-bold mt-1">Featured Listings</h2>
          </div>
          
          <Button variant="outline" className="group">
            Explore Featured
            <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              price={product.price}
              image={product.image}
              location={product.location}
              category={product.category}
              date={product.date}
              condition={product.condition}
              isFeatured={product.isFeatured}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedListings;
