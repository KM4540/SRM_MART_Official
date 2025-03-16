import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: LucideIcon;
  count: number;
  className?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  id,
  name,
  icon: Icon,
  count,
  className = '',
}) => {
  return (
    <Link 
      to={`/category/${id}`}
      className={cn(
        'group flex flex-col items-center justify-center p-6 rounded-xl border border-border/60 hover:border-border',
        'bg-white dark:bg-card hover-lift transition-all duration-300',
        className
      )}
    >
      <div className="mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        <Icon size={32} />
      </div>
      
      <h3 className="text-base font-medium mb-1 group-hover:text-primary transition-colors text-center">
        {name}
      </h3>
      
      <p className="text-sm text-muted-foreground">
        {count} listings
      </p>
    </Link>
  );
};

export default CategoryCard;
