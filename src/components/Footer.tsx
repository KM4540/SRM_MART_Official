import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '@/types/category';

const Footer = () => {
  // Get first 8 categories for the footer
  const popularCategories = CATEGORIES.slice(0, 8);

  return (
    <footer className="bg-secondary py-12 mt-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SRM Mart</h3>
            <p className="text-sm text-muted-foreground">
              The leading marketplace for buying and selling locally. Find great deals or reach millions of buyers by listing your items for free.
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <a 
                href="https://www.srmist.edu.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="https://www.srmist.edu.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a 
                href="https://www.srmist.edu.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a 
                href="https://www.srmist.edu.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Linkedin size={18} />
              </a>
              <a 
                href="https://www.srmist.edu.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>
          
          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Popular Categories</h3>
            <ul className="space-y-2">
              {popularCategories.map((category) => (
                <li key={category.id}>
                  <Link 
                    to={`/category/${category.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center group"
                  >
                    <ChevronRight size={14} className="mr-1 transition-transform group-hover:translate-x-0.5" />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SRM Mart. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
