import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const client = (path: string) => {
  const instance = axios.create({
    baseURL: API_URL + path,
    withCredentials: true,
  })

  // Multi-empresa: el backend resuelve la empresa activa por header (CLS).
  instance.interceptors.request.use((config) => {
    const companyId = useAuthStore.getState().auth.company?.id
    if (companyId) {
      config.headers.set('x-company-id', companyId)
    }
    return config
  })

  return instance
}
