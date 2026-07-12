import { useAuth, AuthContextType } from './AuthContext';

export function useAuthorization(): AuthContextType {
  return useAuth();
}
