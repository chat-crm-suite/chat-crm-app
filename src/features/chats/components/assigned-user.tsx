import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { assignMember, searchCompanyMembers } from '@/services/chat.service'
import { getApiErrorMessage } from '@/lib/api-error'
import { UserRoundSearch } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import type { CompanyMemberResponse as Member } from '@chat-crm/contracts'

const statusColors: Record<Member['status'], string> = {
  active: 'border-green-400',
  inactive: 'border-red-400',
  suspended: 'border-amber-400',
}

const memberName = (member: Member) =>
  [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username

export const AssignedUser = ({
  conversationId,
}: {
  conversationId: string
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: members = [] } = useQuery({
    queryKey: ['company-members', searchTerm],
    queryFn: () => searchCompanyMembers(searchTerm),
    placeholderData: (prev) => prev,
  })

  const { mutate } = useMutation({
    mutationFn: (member: Member) => assignMember(conversationId, member.id),
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
          <span className='hidden sm:inline'>Assigned Member</span>
          <span className='inline sm:hidden'>
            <UserRoundSearch />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-91'>
        <DropdownMenuLabel>Member List</DropdownMenuLabel>
        <div className='px-2 pb-2'>
          <Input
            placeholder='Search members...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='text-sm'
          />
        </div>
        <DropdownMenuGroup>
          {members.map((member) => (
            <DropdownMenuItem key={member.id} className='justify-between'>
              <Avatar className={`border ${statusColors[member.status]}`}>
                <AvatarFallback className='text-xs'>
                  {member.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-1 flex-col'>
                <span className='text-popover-foreground'>
                  {memberName(member)}
                </span>
                <span className='text-muted-foreground text-xs capitalize'>
                  {member.role}
                </span>
              </div>
              <Button
                variant='secondary'
                className='h-7 cursor-pointer rounded-md px-2'
                onClick={() => mutate(member)}
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
