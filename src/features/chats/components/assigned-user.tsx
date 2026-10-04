import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { assignedUser } from '@/services/chat.service'
import { getApiErrorMessage } from '@/lib/api-error'
import { UserRoundSearch } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useSearchUsers } from '@/components/contact/hooks/user-search-users'
import type { User } from '@/features/users/data/schema'

export const AssignedUser = ({ chatId }: { chatId: string }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: users } = useSearchUsers(searchTerm)
  const colorsStatus = {
    offline: 'border-red-400',
    online: 'border-green-400',
    busy: 'border-amber-400',
  }

  const { mutate } = useMutation({
    mutationFn: (user: User) => assignedUser(chatId, user.id),
    onSuccess: () =>
      toast.success('Asignado correctamente', {
        position: 'top-right',
      }),
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'No se pudo asignar el chat'), {
        position: 'top-right',
      }),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline'>
          <span className='hidden sm:inline'>Assigned User</span>
          <span className='inline sm:hidden'>
            <UserRoundSearch />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-91'>
        <DropdownMenuLabel>User List</DropdownMenuLabel>
        <div className='px-2 pb-2'>
          <Input
            placeholder='Search users...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='text-sm'
          />
        </div>
        <DropdownMenuGroup>
          {users?.map((item, index) => (
            <DropdownMenuItem key={index} className='justify-between'>
              <Avatar className={`border ${colorsStatus[item.status]}`}>
                <AvatarImage src={item.avatar} alt={item.username} />
                <AvatarFallback className='text-xs'>
                  {item.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-1 flex-col'>
                <span className='text-popover-foreground'>{item.username}</span>
                <span className='text-muted-foreground text-xs capitalize'>
                  {item.role ?? '-'}
                </span>
              </div>
              <Button
                variant='secondary'
                className='h-7 cursor-pointer rounded-md px-2'
                onClick={() => mutate(item)}
              >
                Asignar
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
