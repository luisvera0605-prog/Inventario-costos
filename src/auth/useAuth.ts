import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { dataverseScopes, msalInstance } from './authConfig';

export function useAuth() {
  const { instance, accounts } = useMsal();
  const account = accounts[0] ?? null;

  const login = useCallback(() => {
    instance.loginRedirect({ scopes: dataverseScopes });
  }, [instance]);

  const logout = useCallback(() => {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }, [instance]);

  const getToken = useCallback(async (): Promise<string> => {
    if (!account) throw new Error('No account found');
    try {
      const result = await msalInstance.acquireTokenSilent({
        scopes: dataverseScopes,
        account,
      });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        await msalInstance.acquireTokenRedirect({
          scopes: dataverseScopes,
          account,
        });
      }
      throw err;
    }
  }, [account]);

  return { account, login, logout, getToken, isAuthenticated: !!account };
}
