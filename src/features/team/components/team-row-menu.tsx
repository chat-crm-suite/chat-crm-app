import type { ReactNode } from 'react'
import { Ellipsis, KeyRound, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RowActions } from '@/components/data-grid'
import { DENIAL_REASON, copy } from '../copy'
import type { TeamActions, TeamDecision } from '../team-policy'

type ItemProps = {
  decision: TeamDecision
  icon: ReactNode
  children: ReactNode
  onSelect: () => void
  destructive?: boolean
}

/**
 * Menu item that stays focusable when the policy forbids it: a native
 * `disabled` item is skipped by the keyboard and swallows hover, so nobody
 * would learn why. It is `aria-disabled` instead, ignores the selection and
 * explains itself in a tooltip (hover and focus).
 */
function GatedItem({ decision, icon, children, onSelect, destructive }: ItemProps) {
  const denied = !decision.allowed

  const item = (
    <DropdownMenuItem
      variant={destructive ? 'destructive' : 'default'}
      aria-disabled={denied || undefined}
      className={denied ? 'cursor-not-allowed opacity-50' : undefined}
      onSelect={(event) => {
        if (denied) {
          event.preventDefault()
          return
        }
        onSelect()
      }}
    >
      {icon}
      {children}
    </DropdownMenuItem>
  )

  if (decision.allowed) return item

  return (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent side='left' className='max-w-60'>
        {DENIAL_REASON[decision.reason]}
      </TooltipContent>
    </Tooltip>
  )
}

type Props = {
  name: string
  isActive: boolean
  actions: TeamActions
  onEdit: () => void
  onResetPassword: () => void
  onToggleStatus: () => void
  onRemove: () => void
}

/** Hover-revealed "..." menu of an Equipo row. */
export function TeamRowMenu({
  name,
  isActive,
  actions,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onRemove,
}: Props) {
  return (
    <RowActions>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label={copy.actionsLabel(name)}
          >
            <Ellipsis className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <GatedItem
            decision={actions.edit}
            icon={<Pencil />}
            onSelect={onEdit}
          >
            {copy.menu.edit}
          </GatedItem>
          <GatedItem
            decision={actions.resetPassword}
            icon={<KeyRound />}
            onSelect={onResetPassword}
          >
            {copy.menu.resetPassword}
          </GatedItem>
          <GatedItem
            decision={actions.toggleStatus}
            icon={isActive ? <Pause /> : <Play />}
            onSelect={onToggleStatus}
          >
            {isActive ? copy.menu.suspend : copy.menu.activate}
          </GatedItem>
          <DropdownMenuSeparator />
          <GatedItem
            destructive
            decision={actions.remove}
            icon={<Trash2 />}
            onSelect={onRemove}
          >
            {copy.menu.remove}
          </GatedItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </RowActions>
  )
}
