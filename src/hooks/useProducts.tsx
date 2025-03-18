
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
 seller_contacts?: {
    name: string;
    email: string;
    phone: string;
  };
}
}

export const useProducts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch all products
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        seller_contacts!inner (
          name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  };

  // Fetch a single product by ID
  const fetchProductById = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      seller_contacts!inner (
        name,
        email,
        phone
      )
    `)
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
};

  // Fetch products by category
  const fetchProductsByCategory = async (category: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  };

  // Fetch products by seller ID
  const fetchMyProducts = async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        seller_contacts!inner (
          name,
          email,
          phone
        )
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  };

  // Upload product image
  const uploadProductImage = async (file: File) => {
    try {
      setUploading(true);
      
      if (!user) throw new Error('You must be logged in to upload images');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      // Create storage bucket if it doesn't exist
      const { error: storageError } = await supabase
        .storage
        .createBucket('product-images', {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2, // 2MB
        });
      
      // Upload file
      const { error: uploadError } = await supabase
        .storage
        .from('product-images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase
        .storage
        .from('product-images')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error: any) {
      toast.error(`Error uploading image: ${error.message}`);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Create a new product
  const createProduct = async (productData: Omit<Product, 'id' | 'seller_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('You must be logged in to create a product');
    
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          ...productData,
          seller_id: user.id
        }
      ])
      .select();
      
    if (error) throw error;
    return data[0];
  };

  // Update an existing product
  const updateProduct = async ({ id, ...productData }: Partial<Product> & { id: string }) => {
    if (!user) throw new Error('You must be logged in to update a product');
    
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .eq('seller_id', user.id)
      .select();
      
    if (error) throw error;
    return data[0];
  };

  // Delete a product
  const deleteProduct = async (id: string) => {
    if (!user) throw new Error('You must be logged in to delete a product');
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('seller_id', user.id);
      
    if (error) throw error;
    return true;
  };

  // Search products
  const searchProducts = async (query: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  };

  // React Query hooks
  const useAllProducts = () => 
    useQuery({
      queryKey: ['products'],
      queryFn: fetchProducts
    });
    
  const useProductById = (id: string) => 
    useQuery({
      queryKey: ['product', id],
      queryFn: () => fetchProductById(id),
      enabled: !!id
    });
    
  const useProductsByCategory = (category: string) => 
    useQuery({
      queryKey: ['products', 'category', category],
      queryFn: () => fetchProductsByCategory(category),
      enabled: !!category
    });
    
  const useMyProducts = () => 
    useQuery({
      queryKey: ['products', 'my'],
      queryFn: fetchMyProducts,
      enabled: !!user
    });
    
  const useSearchProducts = (query: string) => 
    useQuery({
      queryKey: ['products', 'search', query],
      queryFn: () => searchProducts(query),
      enabled: query.length > 2
    });

  // Mutations
  const useCreateProductMutation = () => 
    useMutation({
      mutationFn: createProduct,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success('Product created successfully');
      },
      onError: (error: any) => {
        toast.error(`Error creating product: ${error.message}`);
      }
    });
    
  const useUpdateProductMutation = () => 
    useMutation({
      mutationFn: updateProduct,
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['product', data.id] });
        toast.success('Product updated successfully');
      },
      onError: (error: any) => {
        toast.error(`Error updating product: ${error.message}`);
      }
    });
    
  const useDeleteProductMutation = () => 
    useMutation({
      mutationFn: deleteProduct,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success('Product deleted successfully');
      },
      onError: (error: any) => {
        toast.error(`Error deleting product: ${error.message}`);
      }
    });

  return {
    // Queries
    useAllProducts,
    useProductById,
    useProductsByCategory,
    useMyProducts,
    useSearchProducts,
    
    // Mutations
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    
    // Functions
    uploadProductImage,
    
    // State
    uploading
  };
};
