import { createFileRoute } from '@tanstack/react-router'
import { Customers } from '@/features/customers'
import { CustomersSearchSchema } from '@/features/customers/search'

export const Route = createFileRoute('/_authenticated/customers/')({
  validateSearch: CustomersSearchSchema,
  component: Customers,
})
