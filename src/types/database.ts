export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  is_admin?: boolean;
  is_seller?: boolean;
  payment_qr_url?: string;
  created_at?: string;
  updated_at?: string;
}

// ... rest of the existing types ... 