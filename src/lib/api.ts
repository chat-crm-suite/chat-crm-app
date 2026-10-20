import axios from 'axios';

import { API_URL } from './endpoints';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Cookies config
});

export const isAuthorizate = async () => await api.get('/auth/me')
  .then(res => res.status === 200)
  .catch(() => false);