import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import type { LoginRequest } from '@shared/schema';

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      return apiRequest('POST', '/api/auth/login', data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: 'Sukces!',
        description: data.message || 'Zalogowano pomyślnie',
      });
      // Redirect to home page
      setLocation('/');
      // Reload to update authentication state
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Login error:', error);

      let errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło';
      let errorTitle = 'Błąd logowania';

      // Parse error message to extract clean message
      if (error.message) {
        if (error.message.includes('ACCOUNT_PENDING_APPROVAL')) {
          errorTitle = 'Konto oczekuje na akceptację';
          errorMessage = 'Twoje konto oczekuje na zatwierdzenie przez administratora. Skontaktuj się z administratorem.';
        } else if (error.message.includes('ACCOUNT_INACTIVE')) {
          errorTitle = 'Konto nieaktywne';
          errorMessage = 'Twoje konto zostało dezaktywowane. Skontaktuj się z administratorem.';
        } else if (error.message.includes('INVALID_CREDENTIALS')) {
          errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło';
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      toast({
        title: 'Błąd',
        description: 'Wypełnij wszystkie pola',
        variant: 'destructive',
      });
      return;
    }

    loginMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof LoginRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

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
          <CardTitle className="text-2xl font-bold">System Obecności CSM</CardTitle>
          <CardDescription>
            Zaloguj się aby uzyskać dostęp do systemu zarządzania obecnością
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nazwa użytkownika</Label>
              <Input
                id="username"
                type="text"
                placeholder="Wprowadź nazwę użytkownika"
                value={formData.username}
                onChange={handleInputChange('username')}
                disabled={loginMutation.isPending}
                data-testid="input-username"
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Wprowadź hasło"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  disabled={loginMutation.isPending}
                  data-testid="input-password"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? 'Logowanie...' : 'Zaloguj się'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password">
              <Button variant="link" size="sm" className="text-sm">
                Zapomniałem hasła
              </Button>
            </Link>
          </div>

          <div className="mt-2 text-center">
            <Link href="/register">
              <Button variant="ghost" size="sm" data-testid="link-register">
                <UserPlus className="w-4 h-4 mr-2" />
                Nie masz konta? Zarejestruj się
              </Button>
            </Link>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}