import dotenv from 'dotenv';
import { ApiService } from './api.util';

dotenv.config({
  path: './.env',
});

export const PORT = process.env.PORT || 5000;
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

export const paystackApi = new ApiService('https://api.paystack.co', {
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});
