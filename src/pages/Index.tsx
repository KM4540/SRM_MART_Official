import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useScrollAnimation, useProgressiveLoading } from '@/hooks/useScrollAnimation';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import CategorySection from '@/components/home/CategorySection';
import WishlistSection from '@/components/home/WishlistSection';
import RecentListings from '@/components/home/RecentListings';
import CallToAction from '@/components/home/CallToAction';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const { toast: uiToast } = useToast();
  const [sectionsRef, sectionsVisible] = useScrollAnimation<HTMLDivElement>();
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter out any sold items before progressive loading just as a safety measure
  const availableProducts = recentProducts.filter(product => product.status !== 'sold');
  const visibleItems = useProgressiveLoading(availableProducts, 150) || [];
  
  // Show welcome toast only on first mount
  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      uiToast({
        title: "Welcome to SRM Mart",
        description: "Find second-hand college items or sell your own to fellow students.",
        duration: 5000,
      });
      sessionStorage.setItem('hasSeenWelcome', 'true');
    }
  }, []); // Remove uiToast from dependencies

  const fetchRecentProducts = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller_contacts (
            name,
            email,
            phone
          )
        `)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setRecentProducts(data || []);
    } catch (error: any) {
      const errorMessage = error.message || 'Error fetching recent products';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentProducts();
  }, []);
  
  if (error) {
    return (
      <AnimatedLayout>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-destructive">Something went wrong</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => {
                setLoading(true);
                fetchRecentProducts();
              }}>
                Try Again
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </AnimatedLayout>
    );
  }

  return (
    <AnimatedLayout>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-grow">
          <Hero />
          
          <div ref={sectionsRef} className="space-y-24 py-24">
            <CategorySection />
            
            <WishlistSection isVisible={sectionsVisible} />
            
            <RecentListings
              products={recentProducts}
              visibleItems={visibleItems}
              loading={loading}
            />
            
            <CallToAction />
          </div>
        </main>
        
        <Footer />
      </div>
    </AnimatedLayout>
  );
};

export default Index;
