import type { ChannelType } from '@chat-crm/contracts'

/**
 * Display copy per channel type. Analytics never hardcodes a provider name:
 * a new channel is one entry here (the API side is a new pricing adapter).
 */
export const channelMeta: Record<ChannelType, { label: string }> = {
  whatsapp: { label: 'WhatsApp' },
  telegram: { label: 'Telegram' },
  messenger: { label: 'Messenger' },
  instagram: { label: 'Instagram' },
  email: { label: 'Correo' },
  sms: { label: 'SMS' },
  webchat: { label: 'Chat web' },
}

/** Human names for the billing categories reported by channel adapters. */
const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utilidad',
  authentication: 'Autenticación',
  authentication_international: 'Autenticación internacional',
  service: 'Servicio',
}

export function chargeCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}
