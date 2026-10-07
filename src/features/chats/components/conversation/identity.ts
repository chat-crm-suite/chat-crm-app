import { parsePhoneNumber } from 'react-phone-number-input'

/** Avatar initials: "Rosa Medina" -> "RM". */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Phone in international format when parseable, raw value otherwise. */
export function formatPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined

  return parsePhoneNumber(phone, 'PE')?.formatInternational() || phone
}
