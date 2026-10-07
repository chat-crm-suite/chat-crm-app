import { API_URL } from './http'

/**
 * Resuelve una URL de media de la API contra la URL base del backend. La API
 * devuelve rutas relativas (`/uploads/foto.jpg`), y usarlas tal cual en un
 * `<img>` las resolvería contra el dev server del front, no contra la API.
 * Las URLs absolutas (http/https) y las locales del navegador (blob/data)
 * se devuelven intactas.
 */
export function resolveMediaUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) return undefined
  if (/^(https?:|data:|blob:)/i.test(url)) return url

  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
}
