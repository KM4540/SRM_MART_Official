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
import { User, Mail, Phone } from 'lucide-react';
import AnimatedLayout from '@/components/AnimatedLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    image: null as File | null,
    sellerName: '',
    sellerEmail: '',
    sellerPhone: ''
  });

  // Pre-fill user data when component mounts or user changes
  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({ 
        ...prev, 
        sellerName: profile.full_name || '',
        sellerEmail: user.email || '',
        sellerPhone: profile.phone || ''
      }));
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

      // Validate phone number
      if (!/^\d{10}$/.test(formData.sellerPhone)) {
        toast.error('Please enter a valid 10-digit phone number');
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

      // Insert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            condition: formData.condition,
            image: imageUrl,
            seller_id: user.id
          }
        ])
        .select()
        .single();

      if (productError) throw productError;

      // Insert seller contact
      const { error: contactError } = await supabase
        .from('seller_contacts')
        .insert([
          {
            product_id: product.id,
            name: formData.sellerName,
            email: user.email,
            phone: formData.sellerPhone
          }
        ]);

      if (contactError) throw contactError;

      toast.success('Product listed successfully!');
      navigate('/my-listings');
    } catch (error: any) {
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
        <h1 className="text-3xl font-bold mb-8">List Your Product</h1>
        
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

          <div className="space-y-2">
            <Label htmlFor="sellerPhone">Your Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="sellerPhone"
                type="tel"
                className="pl-10"
                value={formData.sellerPhone}
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/\D/g, '');
                  // Limit to 10 digits
                  const truncatedValue = value.slice(0, 10);
                  setFormData(prev => ({ ...prev, sellerPhone: truncatedValue }));
                }}
                pattern="[0-9]{10}"
                maxLength={10}
                minLength={10}
                placeholder="10-digit mobile number"
                required
                title="Please enter a valid 10-digit mobile number"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enter a 10-digit mobile number without spaces or special characters</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Listing...' : 'List Product'}
          </Button>
        </form>
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default Sell; 