import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: "owner" | "reception" | "instructor";
  status: "pending" | "active" | "inactive";
  groupIds: string[];
  isAdmin: boolean; // Computed from role for backward compatibility
  permissions: {
    canManageUsers: boolean;
    canAssignGroups: boolean;
    canManageStudents: boolean;
    canViewAllGroups: boolean;
    canChangeContactInfo: boolean;
    canExpelStudents: boolean;
    canViewReports: boolean;
  };
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Redirect to login
      setLocation('/login');
      // Reload to reset authentication state
      window.location.reload();
    },
    onError: (error) => {
      console.error('Logout error:', error);
      // Even if logout fails, clear cache and redirect
      queryClient.clear();
      setLocation('/login');
      window.location.reload();
    },
  });
}

// Custom hook to check if user has access to a specific group
export function useGroupAccess(groupId?: string) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return { hasAccess: false, isAdmin: false, permissions: null };
  }

  // Owners and reception have access to all groups
  if (user.permissions.canViewAllGroups) {
    return { hasAccess: true, isAdmin: user.isAdmin, permissions: user.permissions };
  }

  // Check if user has access to the specific group
  const hasAccess = !groupId || user.groupIds.includes(groupId);

  return { hasAccess, isAdmin: user.isAdmin, permissions: user.permissions };
}

// Custom hook for permission checks
export function usePermissions() {
  const { user } = useAuth();
  
  return {
    canManageUsers: user?.permissions?.canManageUsers || false,
    canAssignGroups: user?.permissions?.canAssignGroups || false,
    canManageStudents: user?.permissions?.canManageStudents || false,
    canViewAllGroups: user?.permissions?.canViewAllGroups || false,
    canChangeContactInfo: user?.permissions?.canChangeContactInfo || false,
    canExpelStudents: user?.permissions?.canExpelStudents || false,
    canViewReports: user?.permissions?.canViewReports || false,
    isOwner: user?.role === 'owner',
    isReception: user?.role === 'reception',
    isInstructor: user?.role === 'instructor',
  };
}