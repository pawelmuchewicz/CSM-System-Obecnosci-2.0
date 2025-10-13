import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Mail } from 'lucide-react';
import type { ForgotPasswordRequest } from '@shared/schema';

export function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordRequest) => {
      return apiRequest('POST', '/api/auth/forgot-password', data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setSubmitted(true);
      toast({
        title: 'Email wysłany',
        description: data.message || 'Jeśli podany adres email istnieje w systemie, wysłaliśmy na niego link do resetowania hasła.',
      });
    },
    onError: (error: any) => {
      console.error('Forgot password error:', error);
      toast({
        title: 'Błąd',
        description: 'Wystąpił błąd podczas wysyłania emaila. Spróbuj ponownie.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Błąd',
        description: 'Wprowadź adres email',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Błąd',
        description: 'Nieprawidłowy adres email',
        variant: 'destructive',
      });
      return;
    }

    forgotPasswordMutation.mutate({ email });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Email wysłany</CardTitle>
            <CardDescription>
              Jeśli podany adres email istnieje w systemie, wysłaliśmy na niego link do resetowania hasła.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Wskazówka:</strong> Link do resetowania hasła jest ważny przez 1 godzinę.
                Jeśli nie otrzymałeś emaila, sprawdź folder spam.
              </p>
            </div>

            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Powrót do logowania
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/login-logo.png"
              alt="Creative Dance Logo"
              className="h-20 w-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Zapomniałem hasła</CardTitle>
          <CardDescription>
            Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adres email</Label>
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={forgotPasswordMutation.isPending}
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? 'Wysyłanie...' : 'Wyślij link do resetowania'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Powrót do logowania
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
