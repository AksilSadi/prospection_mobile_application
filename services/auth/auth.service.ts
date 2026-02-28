import * as SecureStore from 'expo-secure-store';
import { graphqlClient } from '@/services/core/graphql';
import { LoginCredentials, AuthResponse, ALLOWED_GROUPS, GROUP_TO_ROLE_MAP } from './auth.types';
import { decodeToken } from './token.utils';

const STORAGE_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: 'token_expires_at',
  userId: 'user_id',
  savedUsername: 'saved_username',
  savedPassword: 'saved_password',
};

const LOGIN_MUTATION = `
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      access_token
      refresh_token
      expires_in
      token_type
      scope
      groups
      role
      userId
      email
    }
  }
`;

const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      access_token
      refresh_token
      expires_in
      token_type
      scope
      groups
      role
      userId
      email
    }
  }
`;

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const data = await graphqlClient.request<{ login: AuthResponse }>(LOGIN_MUTATION, {
        loginInput: credentials,
      });

      const authResponse = data.login;

      const hasAuthorizedGroup = authResponse.groups.some(group => ALLOWED_GROUPS.includes(group));
      if (!hasAuthorizedGroup) {
        throw new Error('UNAUTHORIZED_GROUP');
      }

      await this.storeAuthData(authResponse);
      await this.saveCredentials(credentials);
      graphqlClient.setAuthToken(authResponse.access_token);

      return authResponse;
    } catch (error: any) {
      if (
        error.message?.includes('UNAUTHORIZED_GROUP') ||
        error.graphQLErrors?.[0]?.message?.includes('UNAUTHORIZED_GROUP')
      ) {
        throw new Error('UNAUTHORIZED_GROUP');
      }

      throw error;
    }
  }

  async refreshToken(): Promise<AuthResponse | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const data = await graphqlClient.requestWithoutAuthRefresh<{ refreshToken: AuthResponse }>(
        REFRESH_TOKEN_MUTATION,
        { refreshToken }
      );

      const authResponse = data.refreshToken;
      await this.storeAuthData(authResponse);
      graphqlClient.setAuthToken(authResponse.access_token);
      return authResponse;
    } catch (error) {
      console.warn('Refresh token failed, attempting auto-re-login...');
      const reLoginResult = await this.autoReLogin();
      if (reLoginResult) return reLoginResult;
      console.error('Auto-re-login also failed, logging out');
      await this.logout();
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.clearAuthData();
    await this.clearSavedCredentials();
    graphqlClient.clearAuthToken();
  }

  async saveCredentials(credentials: LoginCredentials): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.savedUsername, credentials.username);
    await SecureStore.setItemAsync(STORAGE_KEYS.savedPassword, credentials.password);
  }

  async getSavedCredentials(): Promise<LoginCredentials | null> {
    const username = await SecureStore.getItemAsync(STORAGE_KEYS.savedUsername);
    const password = await SecureStore.getItemAsync(STORAGE_KEYS.savedPassword);
    if (!username || !password) return null;
    return { username, password };
  }

  async clearSavedCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.savedUsername);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.savedPassword);
  }

  private async autoReLogin(): Promise<AuthResponse | null> {
    const credentials = await this.getSavedCredentials();
    if (!credentials) return null;

    try {
      const data = await graphqlClient.request<{ login: AuthResponse }>(LOGIN_MUTATION, {
        loginInput: credentials,
      });

      const authResponse = data.login;
      const hasAuthorizedGroup = authResponse.groups.some(group => ALLOWED_GROUPS.includes(group));
      if (!hasAuthorizedGroup) return null;

      await this.storeAuthData(authResponse);
      graphqlClient.setAuthToken(authResponse.access_token);
      return authResponse;
    } catch (reLoginError) {
      console.error('Auto-re-login failed:', reLoginError);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    try {
      const payload = decodeToken(token);
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  async getTokenExpiration(): Promise<number | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    try {
      const payload = decodeToken(token);
      return payload.exp;
    } catch {
      return null;
    }
  }

  async getUserRole(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const payload = decodeToken(token);
      const groups = payload.groups || [];

      for (const group of groups) {
        if (GROUP_TO_ROLE_MAP[group]) {
          return GROUP_TO_ROLE_MAP[group];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async getUserGroups(): Promise<string[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const payload = decodeToken(token);
      return payload.groups || [];
    } catch {
      return [];
    }
  }

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.accessToken);
  }

  async getUserId(): Promise<number | null> {
    const value = await SecureStore.getItemAsync(STORAGE_KEYS.userId);
    if (!value) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.refreshToken);
  }

  async initializeAuth(): Promise<boolean> {
    const hasSession = await this.ensureValidSession(30);
    if (!hasSession) {
      await this.clearAuthData();
      graphqlClient.clearAuthToken();
    }
    return hasSession;
  }

  async ensureValidSession(minValiditySeconds = 120): Promise<boolean> {
    const token = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();
    const now = Math.floor(Date.now() / 1000);

    if (!token) {
      if (!refreshToken) return false;
      return !!(await this.refreshToken());
    }

    try {
      const payload = decodeToken(token);
      if (payload.exp > now + minValiditySeconds) {
        graphqlClient.setAuthToken(token);
        return true;
      }

      if (!refreshToken) {
        await this.logout();
        return false;
      }

      return !!(await this.refreshToken());
    } catch {
      if (!refreshToken) {
        await this.logout();
        return false;
      }
      return !!(await this.refreshToken());
    }
  }

  private async storeAuthData(authResponse: AuthResponse): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, authResponse.access_token);
    await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, authResponse.refresh_token);
    const expiresAt = Math.floor(Date.now() / 1000) + authResponse.expires_in;
    await SecureStore.setItemAsync(STORAGE_KEYS.expiresAt, expiresAt.toString());
    await SecureStore.setItemAsync(STORAGE_KEYS.userId, String(authResponse.userId));
  }

  private async clearAuthData(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.accessToken);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.expiresAt);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.userId);
    // Note: savedUsername/savedPassword are NOT cleared on logout
    // so the user doesn't have to re-enter credentials next time
  }

  async getUserEmail(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const payload = decodeToken(token);
      return payload.email || null;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
void authService.initializeAuth();
