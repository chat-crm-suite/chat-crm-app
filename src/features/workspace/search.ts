import { z } from 'zod'
import { TableQueryBaseSchema } from '@chat-crm/contracts'

/**
 * Search params every server table shares, derived from the contracts' table
 * query so the URL and the request body can never drift. Each field falls back
 * to "absent" when the URL carries something invalid (a hand-edited link never
 * breaks the page).
 */
export const tableSearchShape = {
  page: TableQueryBaseSchema.shape.page.removeDefault().optional().catch(undefined),
  perPage: TableQueryBaseSchema.shape.perPage
    .removeDefault()
    .optional()
    .catch(undefined),
  sort: TableQueryBaseSchema.shape.sort.removeDefault().optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  /** Opens the create sheet (Ctrl+K "Agregar miembro" / "Nuevo cliente"). */
  new: z.boolean().optional().catch(undefined),
}
