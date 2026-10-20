import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type {
  CreateCustomerInput,
  CustomerRow,
  Tag,
  UpdateCustomerInput,
} from '@chat-crm/contracts'
import {
  bulkDeleteCustomers,
  createCustomer,
  createTag,
  deleteCustomer,
  getCustomerRow,
  importCustomers,
  listStages,
  listTags,
  setCustomerTags,
  updateCustomer,
} from '@/services/customers.service'
import { searchCompanyMembers } from '@/services/chat.service'
import { useAuthStore } from '@/stores/auth-store'
import { getApiError } from '../workspace/api-error-code'
import { customerKeys } from '../workspace/query-keys'
import { API_ERROR_COPY, copy } from './copy'
import { SCREEN_HANDLES_ERRORS } from '@/lib/handle-server-error'

type CustomerPage = Awaited<
  ReturnType<typeof import('@/services/customers.service').getCustomersTable>
>

/** What to tell the person when a customers request fails. */
export const customerErrorMessage = (error: unknown) => {
  const { code } = getApiError(error)
  return (code && API_ERROR_COPY[code]) || copy.genericError
}

const useCompanyId = () =>
  useAuthStore((state) => state.auth.company?.id ?? null)

/** Name shown for a customer: display name, full name, then phone. */
export function customerName(
  customer: Pick<
    CustomerRow,
    'displayName' | 'firstName' | 'lastName' | 'phoneNumber'
  >
) {
  const full = [customer.firstName, customer.lastName].filter(Boolean).join(' ')
  return customer.displayName || full || customer.phoneNumber || copy.noName
}

/** Name for the avatar monogram: none when the title already is the phone. */
export function avatarName(customer: Parameters<typeof customerName>[0]) {
  const name = customerName(customer)
  return name === customer.phoneNumber || name === copy.noName ? null : name
}

/** Pipeline of the company, ordered; rarely changes. */
export function useStages() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: customerKeys.stages(companyId),
    queryFn: listStages,
    staleTime: 5 * 60_000,
  })
}

export function useTags() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: customerKeys.tags(companyId),
    queryFn: listTags,
    staleTime: 60_000,
  })
}

/** Members to pick an owner from (first 20 for the query text). */
export function useOwnerCandidates(q: string, enabled = true) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: customerKeys.owners(companyId, q),
    queryFn: () => searchCompanyMembers(q),
    staleTime: 60_000,
    enabled,
  })
}

/**
 * Customer by id for when the row is not on the loaded page (deep link from
 * Ctrl+K, "Ver cliente" after a 409). A 404 means it was deleted or is not in
 * this company: the caller shows "Este cliente ya no existe".
 */
export function useCustomerById(id: string | undefined, enabled: boolean) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: customerKeys.detail(companyId, id ?? ''),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
    retry: false,
    queryFn: () => getCustomerRow(id ?? ''),
  })
}

/** Writes an updated row into every cached page and the by-id fallback. */
export function patchCustomer(
  queryClient: QueryClient,
  customer: CustomerRow
) {
  queryClient.setQueriesData<CustomerPage>(
    { queryKey: customerKeys.tables },
    (data) =>
      data && {
        ...data,
        items: data.items.map((row) =>
          row.id === customer.id ? customer : row
        ),
      }
  )
  queryClient.setQueriesData<CustomerRow>(
    { queryKey: customerKeys.details },
    (row) => (row?.id === customer.id ? customer : row)
  )
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: customerKeys.root }),
  })
}

/** Edit form, owner and stage selects. */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      updateCustomer(id, input),
    onSuccess: ({ customer }) => patchCustomer(queryClient, customer),
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: customerKeys.root }),
  })
}

export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient()
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (ids: string[]) => bulkDeleteCustomers(ids),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: customerKeys.root }),
  })
}

export function useImportCustomers() {
  const queryClient = useQueryClient()
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (file: File) => importCustomers(file),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: customerKeys.root }),
  })
}

/** Replaces the tags of a customer and reflects them in the cached rows. */
export function useSetCustomerTags() {
  const queryClient = useQueryClient()
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: ({ customer, tags }: { customer: CustomerRow; tags: Tag[] }) =>
      setCustomerTags(
        customer.id,
        tags.map((tag) => tag.id)
      ),
    onSuccess: (customer) => patchCustomer(queryClient, customer),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (name: string) => createTag({ name }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: [...customerKeys.root, 'tags'],
      }),
  })
}
