import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { assignMember, searchCompanyMembers } from '@/services/chat.service'
import type { CompanyMemberResponse as Member } from '@chat-crm/contracts'
import { UserRoundSearch } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  assignmentToastId,
  clearSelfInitiatedAssignment,
  markSelfInitiatedAssignment,
} from '@/lib/socket-taxonomy'
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

const statusColors: Record<Member['status'], string> = {
  active: 'border-green-400',
  inactive: 'border-red-400',
  suspended: 'border-amber-400',
}

const memberName = (member: Member) =>
  [member.firstName, member.lastName].filter(Boolean).join(' ') ||
  member.username

export const AssignedUser = ({
  conversationId,
}: {
  conversationId: string
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const { user, company } = useAuthStore((state) => state.auth)
  const currentMemberId = user?.memberships?.find(
    (membership) => membership.companyId === company.id
  )?.id
  const { data: members = [] } = useQuery({
    queryKey: ['company-members', searchTerm],
    queryFn: () => searchCompanyMembers(searchTerm),
    placeholderData: (prev) => prev,
  })

  const { mutate } = useMutation({
    mutationFn: (member: Member) => assignMember(conversationId, member.id),
    // Assigning yourself is an own action: the `conversation:assigned` echo
    // must not double the mutation toast (T6).
    onMutate: (member) => {
      if (member.id === currentMemberId) {
        markSelfInitiatedAssignment(conversationId)
      }
    },
    onSuccess: (_data, member) => {
      const isSelf = member.id === currentMemberId
      toast.success(
        isSelf ? 'Chat asignado a tu nombre' : 'Asignado correctamente',
        {
          position: 'top-right',
          id: isSelf ? assignmentToastId(conversationId) : undefined,
        }
      )
    },
    onError: (error, member) => {
      if (member.id === currentMemberId) {
        clearSelfInitiatedAssignment(conversationId)
      }
      toast.error(getApiErrorMessage(error, 'No se pudo asignar el chat'), {
        position: 'top-right',
      })
    },
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-11 w-11 justify-center gap-1.5 rounded-full px-0 text-xs sm:h-8 sm:w-auto sm:px-3'
          aria-label='Asignar'
        >
          <UserRoundSearch className='size-3.5' />
          <span className='hidden sm:inline'>Asignar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-91 max-sm:w-[calc(100vw_-_1rem)]'>
        <DropdownMenuLabel>Miembros del equipo</DropdownMenuLabel>
        <div className='px-2 pb-2'>
          <Input
            placeholder='Buscar miembros…'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='text-sm'
          />
        </div>
        <DropdownMenuGroup>
          {members.map((member) => (
            <DropdownMenuItem
              key={member.id}
              className='justify-between max-sm:min-h-11'
            >
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
                className='h-7 cursor-pointer rounded-md px-2 max-sm:h-11 max-sm:px-3'
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
