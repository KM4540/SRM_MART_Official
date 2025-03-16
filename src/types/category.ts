import { LucideIcon, BookOpen, Shirt, Sofa, Dumbbell, Smartphone, MoreHorizontal } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  {
    id: 'Electronics',
    name: 'Electronics',
    icon: Smartphone,
  },
  {
    id: 'Books',
    name: 'Books',
    icon: BookOpen,
  },
  {
    id: 'Clothing',
    name: 'Clothing',
    icon: Shirt,
  },
  {
    id: 'Furniture',
    name: 'Furniture',
    icon: Sofa,
  },
  {
    id: 'Sports',
    name: 'Sports',
    icon: Dumbbell,
  },
  {
    id: 'Others',
    name: 'Others',
    icon: MoreHorizontal,
  },
]; 