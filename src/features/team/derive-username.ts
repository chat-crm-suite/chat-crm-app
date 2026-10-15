/** The username the API derives from the email when none is given. */
export function deriveUsername(email: string): string | null {
  const local = email.split('@')[0]
  if (!email.includes('@') || !local) return null

  const slug = local
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug.length >= 3 ? slug : null
}
