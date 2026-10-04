import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { UserResponse as User } from '@chat-crm/contracts'

type UserComboboxProps = {
  value: string | null
  onChange: (value: string | null) => void
  options: User[]
  onSearch?: (query: string) => void // 🔹 para server-side search
  placeholder?: string
}

export function UserCombobox({
  value,
  onChange,
  options,
  onSearch,
  placeholder = 'Select user',
}: UserComboboxProps) {
  const [open, setOpen] = useState(false)

  const selected = options.find((user) => user.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
        >
          {selected ? (
            <span className='flex gap-2'>
              <Avatar className='size-6'>
                <AvatarImage
                  src={selected.avatar ?? undefined}
                  alt={selected.username}
                />
                <AvatarFallback className='font-bold'>
                  {selected.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className='font-medium'>{selected.username}</span>
            </span>
          ) : (
            <span className='text-muted-foreground'>{placeholder}</span>
          )}
          <ChevronsUpDownIcon
            size={16}
            className='text-muted-foreground/80 shrink-0'
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0'>
        <Command>
          <CommandInput placeholder='Search user...' onValueChange={onSearch} />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {options.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={(val) => {
                    onChange(val === value ? null : val)
                    setOpen(false)
                  }}
                >
                  <span className='flex items-center gap-2'>
                    <Avatar className='size-7'>
                      <AvatarImage
                        src={user.avatar ?? undefined}
                        alt={user.username}
                      />
                      <AvatarFallback className='font-bold'>
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className='flex flex-col'>
                      <span className='font-medium'>{user.username}</span>
                      <span className='text-muted-foreground text-sm'>
                        {user.email}
                      </span>
                    </span>
                  </span>
                  {value === user.id && (
                    <CheckIcon size={16} className='ml-auto' />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
