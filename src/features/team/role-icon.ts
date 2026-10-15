import type { MemberRole } from '@chat-crm/contracts'
import { Eye, Headset, ShieldCheck } from 'lucide-react'

export const ROLE_ICON: Record<MemberRole, typeof Eye> = {
  admin: ShieldCheck,
  supervisor: Eye,
  agent: Headset,
}
