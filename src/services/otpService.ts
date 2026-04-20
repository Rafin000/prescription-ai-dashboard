import { apiPost } from '../lib/http';

export interface OtpRequestResponse {
  phone: string;
  expiresAt: string;
}

export interface OtpVerifyResponse {
  phone: string;
  token: string;
}

export const otpService = {
  request: (phone: string) =>
    apiPost<OtpRequestResponse, { phone: string }>('/auth/otp/request', { phone }),
  verify: (phone: string, code: string) =>
    apiPost<OtpVerifyResponse, { phone: string; code: string }>(
      '/auth/otp/verify',
      { phone, code },
    ),
};
