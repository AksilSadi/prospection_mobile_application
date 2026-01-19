import { useEffect, useState } from 'react';
import { authService } from '@/services/auth';

export function useAuth() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refresh = async () => {
    const authenticated = await authService.isAuthenticated();
    setIsAuthenticated(authenticated);
    setIsReady(true);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { isReady, isAuthenticated, refresh };
}
