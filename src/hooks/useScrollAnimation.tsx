import { useState, useEffect, useRef, RefObject } from 'react';

export function useScrollAnimation<T extends HTMLElement>(): [RefObject<T>, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);
  
  return [ref, isVisible];
}

// Modified to ensure it always returns an array
export function useProgressiveLoading(items: any[], delay = 200): any[] {
  const [visibleItems, setVisibleItems] = useState<any[]>([]);
  
  useEffect(() => {
    if (!Array.isArray(items)) {
      setVisibleItems([]);
      return;
    }
    
    // If items length is less than or equal to current visible items,
    // just show all items immediately to prevent flickering
    if (items.length <= visibleItems.length) {
      setVisibleItems(items);
      return;
    }
    
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < items.length) {
        setVisibleItems(prev => [...prev, items[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, delay);
    
    return () => clearInterval(interval);
  }, [items, delay]);
  
  return visibleItems;
}
