import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, User, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setUser(profileData);
        
        // Fetch user's products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            seller_contacts!inner (
              name,
              email,
              phone
            )
          `)
          .eq('seller_id', userId)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;
        setUserProducts(productsData || []);
      } catch (error: any) {
        setError(error.message);
        toast.error('Error fetching user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <AnimatedLayout>
        <Navbar />
        <main className="container max-w-4xl py-12 px-4 md:px-6 min-h-screen">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </AnimatedLayout>
    );
  }

  if (error || !user) {
    return (
      <AnimatedLayout>
        <Navbar />
        <main className="container max-w-4xl py-12 px-4 md:px-6 min-h-screen">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">User Not Found</h1>
            <p className="text-muted-foreground">The user you're looking for doesn't exist or has been removed.</p>
            <Link to="/">
              <Button>Go Back to Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </AnimatedLayout>
    );
  }

  return (
    <AnimatedLayout>
      <Navbar />
      <main className="container max-w-4xl py-12 px-4 md:px-6 min-h-screen">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="bg-muted rounded-full h-20 w-20 flex items-center justify-center">
                <User size={40} className="text-muted-foreground" />
              </div>
              
              <div className="space-y-4 flex-1">
                <div>
                  <h1 className="text-2xl font-bold">{user.full_name || 'Anonymous User'}</h1>
                  <p className="text-muted-foreground text-sm">@{user.username || 'user'}</p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{user.email || 'Email not available'}</p>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{user.phone || 'Phone not available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <h2 className="text-2xl font-bold mb-6">Listings by this user</h2>
        
        {userProducts.length === 0 ? (
          <div className="text-center py-16 bg-secondary/30 rounded-lg">
            <Store size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Listings Yet</h3>
            <p className="text-muted-foreground">
              This user hasn't listed any products for sale yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {userProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                category={product.category}
                date={new Date(product.created_at).toLocaleDateString()}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default UserProfile; 
