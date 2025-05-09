import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, MapPin, QrCode, Info } from 'lucide-react';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Database } from '@/types/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Profile = Database['public']['Tables']['profiles']['Row'];

const categories = [
  'Electronics',
  'Books',
  'Clothing',
  'Furniture',
  'Sports',
  'Others'
];

const conditions = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Heavily Used'
];

const Sell = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    image: null as File | null,
    sellerName: '',
    sellerEmail: ''
  });

  // Pre-fill user data and check QR code when component mounts
  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({ 
        ...prev, 
        sellerName: profile.full_name || '',
        sellerEmail: user.email || ''
      }));

      // Check if user has uploaded QR code
      const checkQRCode = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('payment_qr_url')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          // Show dialog if no QR code is found
          if (!data || !data.payment_qr_url) {
            setShowQRDialog(true);
          }
        } catch (error) {
          console.error('Error checking QR code:', error);
        }
      };

      checkQRCode();
    }
  }, [user, profile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, image: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        toast.error('You must be logged in to list a product');
        navigate('/auth');
        return;
      }

      // Check QR code again before submission
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('payment_qr_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Show dialog if no QR code is found
        if (!data || !data.payment_qr_url) {
          setShowQRDialog(true);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking QR code:', error);
        toast.error('Failed to verify payment QR code');
        setLoading(false);
        return;
      }

      // Upload image if provided
      let imageUrl = null;
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('products')
          .upload(filePath, formData.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert into pending_products instead of directly to products
      const { data: pendingProduct, error: pendingError } = await supabase
        .from('pending_products')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            condition: formData.condition,
            image: imageUrl,
            seller_id: user.id,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (pendingError) throw pendingError;

      toast.success('Product submitted for review! We will notify you once approved.');
      navigate('/my-pending-items');
    } catch (error: any) {
      console.error('Error listing product:', error);
      toast.error(error.message || 'Error listing product');
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      toast.error('You must be logged in to list a product');
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Return nothing while redirecting
  }

  return (
    <AnimatedLayout>
      <Navbar />
      <main className="container max-w-2xl py-24 px-4 md:px-6">
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment QR Code Required</DialogTitle>
              <DialogDescription>
                Before listing products, you need to upload your payment QR code. This will be used by buyers to make payments.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-4 mt-4">
              <Button variant="outline" onClick={() => navigate('/profile')}>
                <QrCode className="w-4 h-4 mr-2" />
                Upload QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <h1 className="text-3xl font-bold mb-8">List Your Product</h1>
        
        {/* Service Charge Notice */}
        <Alert className="mb-6 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
          <Info className="h-4 w-4 mr-2" />
          <AlertDescription>
            <strong>Seller Fee:</strong> A 2% service charge applies to all successful sales, which will be deducted when you receive payment from buyers.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Product Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (₹)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={formData.condition}
              onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Product Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellerName">Your Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="sellerName"
                className="pl-10 bg-muted cursor-not-allowed"
                value={formData.sellerName}
                onChange={(e) => setFormData(prev => ({ ...prev, sellerName: e.target.value }))}
                disabled
                title="Your name cannot be changed"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Your name cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellerEmail">Your Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="sellerEmail"
                type="email"
                className="pl-10 bg-muted cursor-not-allowed"
                value={formData.sellerEmail}
                disabled
                title="Your email cannot be changed"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Your email cannot be changed</p>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
            <h3 className="font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <MapPin size={16} /> Gateway System Information
            </h3>
            <p className="text-sm text-blue-700/70 dark:text-blue-400/70 mt-1">
              Your listing will be reviewed by our admins before it appears in the marketplace. 
              Once approved, buyers can purchase and pick up the item from your selected location.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </form>
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default Sell; 