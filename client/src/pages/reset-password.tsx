import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import type { ResetPasswordRequest } from '@shared/schema';

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Extract token from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (!tokenParam) {
      toast({
        title: 'Błąd',
        description: 'Brak tokenu resetującego. Link może być nieprawidłowy.',
        variant: 'destructive',
      });
    } else {
      setToken(tokenParam);
    }
  }, [toast]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      return apiRequest('POST', '/api/auth/reset-password', data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setResetSuccess(true);
      toast({
        title: 'Sukces!',
        description: data.message || 'Hasło zostało zmienione pomyślnie.',
      });
    },
    onError: (error: any) => {
      console.error('Reset password error:', error);

      let errorMessage = 'Wystąpił błąd podczas resetowania hasła.';

      if (error.message) {
        if (error.message.includes('INVALID_OR_EXPIRED_TOKEN')) {
          errorMessage = 'Link do resetowania hasła jest nieprawidłowy lub wygasł. Wygeneruj nowy link.';
        } else if (error.message.includes('Token jest wymagany')) {
          errorMessage = 'Link do resetowania hasła jest nieprawidłowy.';
        }
      }

      toast({
        title: 'Błąd resetowania hasła',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: 'Błąd',
        description: 'Brak tokenu resetującego. Link może być nieprawidłowy.',
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword.trim()) {
      toast({
        title: 'Błąd',
        description: 'Wprowadź nowe hasło',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Błąd',
        description: 'Hasło musi mieć co najmniej 6 znaków',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Błąd',
        description: 'Hasła nie są identyczne',
        variant: 'destructive',
      });
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Hasło zostało zmienione</CardTitle>
            <CardDescription>
              Możesz teraz zalogować się używając nowego hasła
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">
                Przejdź do logowania
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
          <CardTitle className="text-2xl font-bold">Ustaw nowe hasło</CardTitle>
          <CardDescription>
            Wprowadź nowe hasło do swojego konta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nowe hasło</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Wprowadź nowe hasło"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={resetPasswordMutation.isPending}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-gray-500">Hasło musi mieć co najmniej 6 znaków</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Wprowadź hasło ponownie"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resetPasswordMutation.isPending}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending || !token}
            >
              {resetPasswordMutation.isPending ? 'Resetowanie...' : 'Zresetuj hasło'}
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
