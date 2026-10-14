import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlatformHome } from '@/features/platform'
import {
  companiesSearchSchema,
  type CompaniesSearch,
} from '@/features/platform/lib/companies-search'

export const Route = createFileRoute('/platform/')({
  validateSearch: companiesSearchSchema,
  component: PlatformIndex,
})

function PlatformIndex() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/platform/' })

  const onSearchChange = (patch: Partial<CompaniesSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })

  return <PlatformHome search={search} onSearchChange={onSearchChange} />
}
