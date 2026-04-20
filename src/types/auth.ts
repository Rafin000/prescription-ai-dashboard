import type { Doctor } from './doctor';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse extends AuthTokens {
  user: Doctor;
}

export type AuthStatus =
  | 'idle'
  | 'bootstrapping'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';
