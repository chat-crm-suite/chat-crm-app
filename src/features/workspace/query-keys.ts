/**
 * Query keys of the workspace data screens (Equipo, Clientes). Every key
 * starts with the screen's root so a socket ping can invalidate the whole
 * family with one prefix, and carries the company so switching companies never
 * shows another company's rows while the new ones load.
 */
export const teamKeys = {
  root: ['team'] as const,
  tables: ['team', 'table'] as const,
  table: (companyId: string | null, query: unknown) =>
    ['team', 'table', companyId, query] as const,
}

export const customerKeys = {
  root: ['customers'] as const,
  tables: ['customers', 'table'] as const,
  table: (companyId: string | null, query: unknown) =>
    ['customers', 'table', companyId, query] as const,
  details: ['customers', 'detail'] as const,
  detail: (companyId: string | null, id: string) =>
    ['customers', 'detail', companyId, id] as const,
  tags: (companyId: string | null) => ['customers', 'tags', companyId] as const,
  stages: (companyId: string | null) =>
    ['customers', 'stages', companyId] as const,
  owners: (companyId: string | null, q: string) =>
    ['customers', 'owners', companyId, q] as const,
}
