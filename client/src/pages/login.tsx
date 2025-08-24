import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { LoginRequest } from '@shared/schema';

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
      toast({
        title: 'Błąd logowania',
        description: error.message || 'Nieprawidłowa nazwa użytkownika lub hasło',
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
          <CardTitle className="text-2xl font-bold">System Frekwencji</CardTitle>
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
              <Input
                id="password"
                type="password"
                placeholder="Wprowadź hasło"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={loginMutation.isPending}
                data-testid="input-password"
                autoComplete="current-password"
              />
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

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Testowe konto:</p>
            <p><strong>Login:</strong> admin</p>
            <p><strong>Hasło:</strong> admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}