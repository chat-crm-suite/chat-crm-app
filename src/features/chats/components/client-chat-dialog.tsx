import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, User } from 'lucide-react'
import { parsePhoneNumber } from 'react-phone-number-input'
import { useDebounce } from 'use-debounce'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '../api'
import { chatBuilder } from '../builders/chat.builder'
import { useChats } from '../contexts/chats.provider'
import type { Client } from '../types/client.api'

const customerName = (client: Client) =>
  client.displayName ||
  [client.firstName, client.lastName].filter(Boolean).join(' ') ||
  parsePhoneNumber(client.phoneNumber ?? '', 'PE')?.formatInternational() ||
  client.phoneNumber ||
  'Desconocido'

export function ClientChatDialog() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', debouncedSearch],
    queryFn: () => api.queries.clients.search(debouncedSearch),
    placeholderData: (prev) => prev,
  })

  const { setChatSelected, searchClientDialog, setSearchClientDialog } =
    useChats()

  const handleCreateChat = () => {
    if (!selectedClient) return

    const chat = chatBuilder.draft({
      id: selectedClient.id,
      displayName: selectedClient.displayName,
      phone: selectedClient.phoneNumber,
    })
    setChatSelected(chat)
    setSearchClientDialog(false)
    setSelectedClient(null)
    setSearchTerm('')
  }

  const setDisplaySearchTerm = (value: string) => {
    setSearchTerm(value)
  }

  const handleSelectUser = (client: Client) => {
    setSelectedClient((prev) => (prev?.id === client.id ? null : client))
  }

  useEffect(() => {
    if (!searchClientDialog) {
      setSelectedClient(null)
    }
  }, [searchClientDialog])

  return (
    <Dialog open={searchClientDialog} onOpenChange={setSearchClientDialog}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <Command className='rounded-lg border'>
            <CommandInput
              placeholder='Search people...'
              className='text-foreground'
              onValueChange={setDisplaySearchTerm}
              value={searchTerm}
            />
            <CommandList>
              <CommandEmpty>No people found.</CommandEmpty>
              <CommandGroup>
                {clients?.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => handleSelectUser(c)}
                    className='hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2'
                  >
                    <div className='flex items-center gap-2'>
                      <Avatar>
                        <AvatarImage
                          src={c.avatarUrl ?? undefined}
                          alt={customerName(c) ?? 'Customer'}
                        />
                        <AvatarFallback className='text-xs'>
                          <User />
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex flex-col'>
                        <span className='text-sm font-medium'>
                          {customerName(c)}
                        </span>
                        <span className='text-accent-foreground/70 text-xs'>
                          {c.phoneNumber ?? c.email}
                        </span>
                      </div>
                    </div>

                    {selectedClient?.id === c.id && (
                      <Check className='h-4 w-4' />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <Button
            variant={'default'}
            onClick={handleCreateChat}
            disabled={!selectedClient}
          >
            Chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
