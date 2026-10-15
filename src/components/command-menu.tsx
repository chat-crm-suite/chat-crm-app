import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Check, Laptop, Loader2, Moon, Sun, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'
import type { CustomerResponse } from '@chat-crm/contracts'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import { PLATFORM_STATUS_KEY, usePlatformStatus } from '@/features/platform/hooks/use-platform-status'
import {
  commandsInSection,
  matchesCommand,
  matchesText,
  type CommandDef,
  type CommandSection,
} from '@/lib/commands'
import { useCommandContext } from '@/lib/use-command-context'
import { lockPlatform } from '@/services/platform.service'
import { searchCustomers } from '@/services/command-search.service'
import { useAuthStore } from '@/stores/auth-store'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { MonogramAvatar } from '@/components/data-grid'
import { useCompanySwitch } from './layout/company-switch'
import { ROLE_LABELS } from './layout/copy'

/** Characters needed before the customers are searched on the server. */
export const MIN_CUSTOMER_QUERY = 2
/** Pause after typing before a search request is sent. */
export const SEARCH_DEBOUNCE_MS = 250

const SECTION_HEADINGS: Record<CommandSection, string> = {
  navigation: 'Navegación',
  settings: 'Ajustes',
  actions: 'Acciones',
  platform: 'Consola de plataforma',
}

const SECTION_ORDER: CommandSection[] = [
  'navigation',
  'settings',
  'actions',
  'platform',
]

const THEME_CHOICES: { value: 'light' | 'dark' | 'system'; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Igual que el sistema', icon: Laptop },
]

function customerLabel(customer: CustomerResponse): string {
  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ')
  return (
    customer.displayName?.trim() ||
    fullName ||
    customer.phoneNumber ||
    customer.email ||
    'Cliente sin nombre'
  )
}

/**
 * Ctrl+K. Everything in it comes from the command registry (filtered by role
 * and platform-admin flag), plus the person's companies and a live customer
 * search. Static entries are matched locally and ignoring accents; customers
 * are searched on the server after a pause, so typing never floods the API.
 */
export function CommandMenu() {
  const { open, setOpen } = useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const isPlatformAdmin = useAuthStore(
    (state) => state.auth.user?.isPlatformAdmin ?? false
  )
  const status = usePlatformStatus({ enabled: open && isPlatformAdmin })
  const context = useCommandContext(status.data?.unlocked)
  const { companies, activeId, switchTo } = useCompanySwitch()

  const [query, setQuery] = useState('')
  const [page, setPage] = useState<'root' | 'theme'>('root')

  const trimmed = query.trim()
  const [debounced] = useDebounce(trimmed, SEARCH_DEBOUNCE_MS)
  const wantsCustomers =
    open && page === 'root' && debounced.length >= MIN_CUSTOMER_QUERY

  const customers = useQuery({
    queryKey: ['command-search', 'customers', debounced],
    queryFn: ({ signal }) => searchCustomers(debounced, signal),
    enabled: wantsCustomers,
    staleTime: 30_000,
  })

  const { mutate: lockConsole } = useMutation({
    mutationFn: lockPlatform,
    onSuccess: (next) => {
      queryClient.setQueryData(PLATFORM_STATUS_KEY, next)
      toast.success('Consola bloqueada')
    },
    onError: () => toast.error('No se pudo bloquear la consola. Inténtalo de nuevo.'),
  })

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setPage('root')
  }, [setOpen])

  // Routes owned by other screens are typed loosely on purpose: the registry
  // is data, and the router validates the params on arrival.
  const go = useCallback(
    (to: string, search?: Record<string, unknown>) => {
      close()
      void navigate({ to, search } as never)
    },
    [close, navigate]
  )

  const runCommand = useCallback(
    (command: CommandDef) => {
      if (command.kind === 'navigate') return go(command.to, command.search)

      if (command.action === 'change-theme') {
        setQuery('')
        setPage('theme')
        return
      }
      close()
      lockConsole()
    },
    [close, go, lockConsole]
  )

  const sections = useMemo(
    () =>
      SECTION_ORDER.map((section) => ({
        section,
        commands: commandsInSection(context, section).filter((command) =>
          matchesCommand(command, trimmed)
        ),
      })).filter((entry) => entry.commands.length > 0),
    [context, trimmed]
  )

  const otherCompanies = companies.filter(
    (membership) =>
      membership.companyId !== activeId &&
      matchesText(
        [membership.companyName, 'empresa', 'cambiar de empresa'],
        trimmed
      )
  )

  const isSearching =
    wantsCustomers && (debounced !== trimmed || customers.isFetching)
  const results = wantsCustomers ? (customers.data ?? []) : []

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className='overflow-hidden p-0 sm:max-w-xl'
      >
        <DialogTitle className='sr-only'>Buscar y ejecutar comandos</DialogTitle>
        <DialogDescription className='sr-only'>
          Busca una página, una acción o un cliente.
        </DialogDescription>
        <Command
          shouldFilter={false}
          className='[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5'
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={
              page === 'theme'
                ? 'Elige un tema…'
                : 'Busca una página, una acción o un cliente…'
            }
            aria-label='Buscar comandos'
          />
          <CommandList className='max-h-[min(24rem,60vh)]'>
            {page === 'theme' ? (
              <CommandGroup heading='Tema'>
                {THEME_CHOICES.filter((choice) =>
                  choice.label.toLowerCase().includes(trimmed.toLowerCase())
                ).map((choice) => (
                  <CommandItem
                    key={choice.value}
                    value={`theme-${choice.value}`}
                    onSelect={() => {
                      setTheme(choice.value)
                      close()
                    }}
                  >
                    <choice.icon />
                    {choice.label}
                    {theme === choice.value ? (
                      <Check aria-label='Tema actual' className='ms-auto' />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <>
                <CommandEmpty>
                  {trimmed
                    ? `No encontramos nada para “${trimmed}”.`
                    : 'No hay comandos disponibles.'}
                </CommandEmpty>

                {wantsCustomers ? (
                  <CommandGroup heading='Clientes'>
                    {isSearching && results.length === 0 ? (
                      <CommandItem disabled value='clientes-buscando'>
                        <Loader2 className='animate-spin motion-reduce:animate-none' />
                        <span role='status'>Buscando clientes…</span>
                      </CommandItem>
                    ) : null}
                    {customers.isError ? (
                      <CommandItem disabled value='clientes-error'>
                        No se pudo buscar clientes. Revisa tu conexión.
                      </CommandItem>
                    ) : null}
                    {results.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`cliente-${customer.id}`}
                        onSelect={() =>
                          go('/customers', { customer: customer.id })
                        }
                      >
                        <MonogramAvatar
                          name={customerLabel(customer)}
                          fallback={customer.phoneNumber}
                          tintKey={customer.id}
                          src={customer.avatarUrl}
                          size='sm'
                        />
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate'>
                            {customerLabel(customer)}
                          </span>
                          <span className='text-muted-foreground block truncate text-xs'>
                            {[customer.phoneNumber, customer.email]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}

                {sections.map(({ section, commands }) => (
                  <CommandGroup
                    key={section}
                    heading={SECTION_HEADINGS[section]}
                  >
                    {commands.map((command) => (
                      <CommandItem
                        key={command.id}
                        value={command.id}
                        onSelect={() => runCommand(command)}
                      >
                        <command.icon />
                        {command.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}

                {otherCompanies.length > 0 ? (
                  <CommandGroup heading='Empresas'>
                    {otherCompanies.map((membership) => (
                      <CommandItem
                        key={membership.companyId}
                        value={`empresa-${membership.companyId}`}
                        onSelect={() => {
                          close()
                          switchTo(membership.companyId)
                        }}
                      >
                        <MonogramAvatar
                          name={membership.companyName}
                          tintKey={membership.companyId}
                          size='sm'
                          className='rounded-md'
                        />
                        <span className='min-w-0 flex-1 truncate'>
                          Cambiar a {membership.companyName}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {ROLE_LABELS[membership.role]}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
          <div className='text-muted-foreground hidden items-center gap-4 border-t px-3 py-2 text-xs sm:flex'>
            <span className='inline-flex items-center gap-1'>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> moverte
            </span>
            <span className='inline-flex items-center gap-1'>
              <Kbd>↵</Kbd> abrir
            </span>
            <span className='ms-auto inline-flex items-center gap-1'>
              <Kbd>Esc</Kbd> cerrar
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
