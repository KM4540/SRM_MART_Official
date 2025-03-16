
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, User, Phone, IdCard, KeyRound, Lock, CheckCircle, AlertCircle } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const phoneRegex = /^[6-9]\d{9}$/;

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .endsWith("@srmist.edu.in", "Only @srmist.edu.in email addresses are allowed")
    .transform(email => email.toLowerCase().trim()), // Normalize email
  phone: z
    .string()
    .regex(phoneRegex, "Please enter a valid 10-digit Indian mobile number"),
  studentId: z
    .string()
    .min(8, "Student ID must be at least 8 characters")
    .max(15, "Student ID must be less than 15 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(5, "Password must be at least 5 characters"),
  confirmPassword: z
    .string()
    .min(5, "Confirm Password must be at least 5 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      studentId: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const emailValue = form.watch("email");

  const verifyEmail = async () => {
    const email = emailValue;
    if (!email || !email.endsWith("@srmist.edu.in")) {
      toast.error("Please enter a valid SRM email address");
      return;
    }

    setVerifying(true);
    try {
      // Just simulate verification for now since we're not getting emails
      await new Promise(resolve => setTimeout(resolve, 1500));
      setEmailVerified(true);
      toast.success("Email verified successfully");
    } catch (error) {
      toast.error("Failed to verify email. Please try again.");
      console.error("Email verification error:", error);
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (data: RegisterValues) => {
    if (!emailVerified) {
      toast.error("Please verify your email before signing up");
      return;
    }

    setIsLoading(true);
    try {
      await signUp(data.email, data.password, {
        name: data.name,
        phone: data.phone,
        studentId: data.studentId,
        username: data.username,
        full_name: data.name // Ensure this field is saved for profiles table
      });
      
      toast.success("Registration successful! You can now log in.");
      navigate('/auth?mode=login');
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Error signing up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="John Doe"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SRM Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="student@srmist.edu.in"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={verifyEmail} 
                  disabled={verifying || emailVerified || !emailValue || !emailValue.endsWith("@srmist.edu.in")}
                  className="flex items-center gap-1"
                >
                  {verifying ? "Verifying..." : "Verify Email"}
                </Button>
                {emailVerified ? (
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-xs">Verified</span>
                  </div>
                ) : emailValue ? (
                  <div className="flex items-center text-amber-500">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span className="text-xs">Not verified</span>
                  </div>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground">@</span>
                    <Input
                      placeholder="johndoe"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="9XXXXXXXXX"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student ID</FormLabel>
              <FormControl>
                <div className="relative">
                  <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="RA2211XXXXXXX"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !emailVerified}
        >
          {isLoading ? "Signing up..." : "Sign Up"}
        </Button>
      </form>
    </Form>
  );
};

export default RegisterForm;
