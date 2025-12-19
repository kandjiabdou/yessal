/// <reference types="jest" />
import AuthService from '../src/services/auth';

jest.mock('../src/lib/axios');
jest.mock('../src/config/env', () => ({
  API_URL: 'http://localhost:3000',
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Token Management', () => {
    it('devrait récupérer un token', () => {
      const authData = {
        state: {
          token: 'test-token',
          user: { id: 1 },
          isAuthenticated: true,
        },
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      expect(AuthService.getToken()).toBe('test-token');
    });

    it('devrait retourner null si pas de token', () => {
      expect(AuthService.getToken()).toBeNull();
    });

    it('devrait gérer les erreurs de parsing', () => {
      localStorage.setItem('auth-storage', 'invalid-json');
      expect(AuthService.getToken()).toBeNull();
    });
  });

  describe('User Management', () => {
    it('devrait récupérer un utilisateur', () => {
      const user = { id: 1, nom: 'Test', prenom: 'User', role: 'MANAGER' };
      const authData = {
        state: {
          token: 'test-token',
          user,
          isAuthenticated: true,
        },
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      expect(AuthService.getUser()).toEqual(user);
    });

    it('devrait retourner null si pas d\'utilisateur', () => {
      expect(AuthService.getUser()).toBeNull();
    });

    it('devrait gérer un JSON invalide', () => {
      localStorage.setItem('auth-storage', 'invalid-json');
      expect(AuthService.getUser()).toBeNull();
    });
  });

  describe('Authentication State', () => {
    it('devrait dire si authentifié', () => {
      const authData = {
        state: {
          token: 'test-token',
          user: { id: 1 },
          isAuthenticated: true,
        },
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('devrait dire si non authentifié sans token', () => {
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('devrait dire si non authentifié sans user', () => {
      const authData = {
        state: {
          token: 'test-token',
          isAuthenticated: true,
        },
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      expect(AuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('Role Checks', () => {
    it('devrait vérifier si manager', () => {
      const authData = {
        state: {
          token: 'test-token',
          user: { id: 1, role: 'MANAGER' },
          isAuthenticated: true,
        },
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      expect(AuthService.isManager()).toBe(true);
    });

    it('devrait vérifier si admin', () => {
      const authData = {
        state: {
          token: 'test-token',
          user: { id: 1, role: 'ADMIN' },
          isAuthenticated: true,
        },
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      expect(AuthService.isAdmin()).toBe(true);
    });

    it('devrait retourner false si pas de user', () => {
      expect(AuthService.isManager()).toBe(false);
      expect(AuthService.isAdmin()).toBe(false);
    });
  });
});
