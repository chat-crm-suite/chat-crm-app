import { AxiosError } from 'axios'
import {
  BulkDeleteCustomersResultSchema,
  CustomerConflictSchema,
  CustomerImportResultSchema,
  CustomerMutationResultSchema,
  CustomerResponseSchema,
  CustomerRowSchema,
  PipelineStageSchema,
  TagSchema,
  paginatedSchema,
  type BulkDeleteCustomersResult,
  type CreateCustomerInput,
  type CreateTagInput,
  type CustomerConflict,
  type CustomerImportResult,
  type CustomerMutationResult,
  type CustomerRow,
  type CustomerResponse,
  type CustomerTableQuery,
  type PipelineStage,
  type Tag,
  type UpdateCustomerInput,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'
import { parseContract } from '@/lib/contract-parse'

const customers = client('/customers')

const CustomerPageSchema = paginatedSchema(CustomerRowSchema)

/** Contract parse (coerces dates; strict in dev, tolerant in prod). */
const check = parseContract

export const getCustomersTable = async (query: CustomerTableQuery) => {
  const { data } = await customers.post('/table', query)
  return check(CustomerPageSchema, data)
}

/** `restored: true` when the phone belonged to a deleted customer. */
export const createCustomer = async (
  input: CreateCustomerInput
): Promise<CustomerMutationResult> => {
  const { data } = await customers.post('', input)
  return check(CustomerMutationResultSchema, data)
}

export const updateCustomer = async (
  id: string,
  input: UpdateCustomerInput
): Promise<CustomerMutationResult> => {
  const { data } = await customers.patch(`/${id}`, input)
  return check(CustomerMutationResultSchema, data)
}

export const deleteCustomer = async (id: string): Promise<void> => {
  await customers.delete(`/${id}`)
}

/** Admin and supervisor only (max 100 ids per call). */
export const bulkDeleteCustomers = async (
  ids: string[]
): Promise<BulkDeleteCustomersResult> => {
  const { data } = await customers.post('/bulk-delete', { ids })
  return check(BulkDeleteCustomersResultSchema, data)
}

export const importCustomers = async (
  file: File
): Promise<CustomerImportResult> => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await customers.post('/import', formData)
  return check(CustomerImportResultSchema, data)
}

export const listTags = async (): Promise<Tag[]> => {
  const { data } = await customers.get('/tags')
  return check(TagSchema.array(), data)
}

/** 409 `tag_exists` when the name is taken. */
export const createTag = async (input: CreateTagInput): Promise<Tag> => {
  const { data } = await customers.post('/tags', input)
  return check(TagSchema, data)
}

/** Replaces the whole tag set of a customer; answers the updated row. */
export const setCustomerTags = async (
  id: string,
  tagIds: string[]
): Promise<CustomerRow> => {
  const { data } = await customers.put(`/${id}/tags`, { tagIds })
  return check(CustomerRowSchema, data)
}

/** One customer as a table row; 404 when deleted or from another company. */
export const getCustomerRow = async (id: string): Promise<CustomerRow> => {
  const { data } = await customers.get(`/${id}/row`)
  return check(CustomerRowSchema, data)
}

export const listStages = async (): Promise<PipelineStage[]> => {
  const { data } = await customers.get('/stages')
  return check(PipelineStageSchema.array(), data)
}

export const searchCustomers = async (q: string): Promise<CustomerResponse[]> => {
  const { data } = await customers.get('/search', { params: { q } })
  return check(CustomerResponseSchema.array(), data ?? [])
}

/**
 * The 409 body returned when an active customer already uses the phone, or
 * `null` for any other error.
 */
export function customerConflictOf(error: unknown): CustomerConflict | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 409) {
    return null
  }

  const parsed = CustomerConflictSchema.safeParse(error.response.data)
  return parsed.success ? parsed.data : null
}

