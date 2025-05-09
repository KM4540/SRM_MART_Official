import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function QRCodeUpload() {
  const [uploading, setUploading] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { user } = useAuth();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `payment-qr/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('payment-qr')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-qr')
        .getPublicUrl(filePath);

      // Update profile with QR code URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ payment_qr_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('QR code uploaded successfully!');
    } catch (error) {
      console.error('Error uploading QR code:', error);
      toast.error('Failed to upload QR code. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="qr-upload"
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById('qr-upload')?.click()}
          disabled={uploading}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Payment QR Code'}
        </Button>
      </div>
    </div>
  );
} 