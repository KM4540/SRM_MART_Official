import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, LogOut, QrCode, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedLayout from "@/components/AnimatedLayout";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SellerOffers from "@/components/SellerOffers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns';

const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
});

type ProfileValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const isSeller = profile?.is_seller || false;
  const [uploading, setUploading] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
    },
    values: {
      full_name: profile?.full_name || "",
    }
  });

  // Extract or determine registration number
  const getRegistrationNumber = () => {
    if (profile?.registration_number) return profile.registration_number;
    
    // Try to extract from name if it follows a pattern with parentheses
    if (profile?.full_name) {
      const match = profile.full_name.match(/\((RA\d+)\)/);
      if (match && match[1]) return match[1];
    }
    
    // Try to extract from email if it follows SRM pattern
    if (user?.email && user.email.includes('@srmist.edu.in')) {
      return user.email.split('@')[0].toUpperCase();
    }
    
    return null;
  };

  const displayName = profile?.full_name ? 
    // Remove the registration number from display name if it's in parentheses
    profile.full_name.replace(/\s*\(RA\d+\)\s*$/, '') : 
    user?.email?.split('@')[0] || "User";
    
  const registrationNumber = getRegistrationNumber();

  function getInitials(name: string) {
    return name
      ?.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase() || 'U';
  }

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

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
    } catch (error: any) {
      console.error('Error uploading QR code:', error);
      toast.error(error.message || 'Failed to upload QR code. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Format date to show relative time
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <AnimatedLayout>
      <Navbar />
      <main className="container max-w-3xl py-24 px-4 md:px-6">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
                  <AvatarFallback className="text-xl">{getInitials(displayName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-1 px-2">
                <CardTitle className="text-xl truncate max-w-full">
                  {displayName}
                </CardTitle>
                {user?.email && (
                  <CardDescription className="text-sm truncate">
                    {user.email}
                  </CardDescription>
                )}
                {registrationNumber && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    ({registrationNumber})
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Member since</p>
                <p>{user?.created_at ? formatDate(user.created_at) : "Unknown"}</p>
              </div>
              
              {/* QR Code Upload Section */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Payment QR Code</p>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    disabled={uploading}
                    className="hidden"
                    id="qr-upload"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('qr-upload')?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    {profile?.payment_qr_url ? (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Update QR Code
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload QR Code
                      </>
                    )}
                  </Button>
                  {profile?.payment_qr_url && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ QR code uploaded
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="destructive" className="w-full" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardFooter>
          </Card>
          
          {/* Profile Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="John Doe"
                              className="pl-10 bg-muted cursor-not-allowed"
                              {...field}
                              disabled
                              title="Full name cannot be changed"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">Full name cannot be changed</p>
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        <Separator className="my-8" />
        
        <Tabs defaultValue="seller-offers" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="seller-offers">Received Offers</TabsTrigger>
            <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="seller-offers">
            <SellerOffers />
          </TabsContent>
          
          <TabsContent value="my-listings">
            <div className="text-center py-8">
              <p>View all your listed products in <a href="/my-listings" className="text-primary hover:underline">My Listings</a>.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </AnimatedLayout>
  );
};

export default Profile;
