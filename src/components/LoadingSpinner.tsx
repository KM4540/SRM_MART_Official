import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className="min-h-[100px] flex items-center justify-center">
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-r-transparent",
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
};

export default LoadingSpinner; 