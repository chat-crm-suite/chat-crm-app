import {
  differenceInDays,
  format,
  isThisYear,
  isToday,
  isYesterday,
} from 'date-fns'
import type { Chat, ChatCustomer } from '../types/chat.domain'

export const chatBuilder = {
  draft(customer: ChatCustomer): Chat {
    return {
      id: crypto.randomUUID() + '-temp',
      isDraft: true,
      status: 'open',
      createdAt: new Date(),
      customer,
    }
  },
  label: {
    date: (d: Date | string) => getChatDateLabel(d),
  },
}

function getChatDateLabel(date: Date | string): string {
  const d =
    typeof date === 'string' ? new Date(`${date}T00:00:00`) : new Date(date)

  const now = new Date()
  const diffDays = differenceInDays(now, d)

  if (isToday(d)) return 'Hoy'
  if (isYesterday(d)) return 'Ayer'
  if (diffDays <= 7) return format(d, 'EEEE')
  if (isThisYear(d)) return format(d, "d 'de' MMMM")
  return format(d, "d 'de' MMMM 'de' yyyy")
}
