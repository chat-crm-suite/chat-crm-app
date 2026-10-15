import { UploadErrorCodeSchema, type UploadErrorCode } from '@chat-crm/contracts'
import { AxiosError } from 'axios'
import { getApiErrorMessage } from '@/lib/api-error'

/** What each upload refusal means for the agent, and how to recover. */
const UPLOAD_ERRORS: Record<UploadErrorCode, string> = {
  channel_unsupported: 'Este canal no permite enviar este tipo de archivo.',
  content_mismatch:
    'El contenido del archivo no corresponde a un formato compatible. Puede estar dañado o tener otra extensión.',
  type_not_allowed: 'El canal no admite este formato para ese tipo de archivo.',
  too_large: 'El archivo supera el tamaño máximo que permite el canal.',
  sticker_dimensions: 'Los stickers deben medir exactamente 512 × 512 px.',
  sticker_too_large: 'El sticker es demasiado pesado (máximo 100 KB, o 500 KB si es animado).',
  fragmented_video:
    'Este video se grabó en un navegador (MP4 fragmentado) y el canal no lo acepta. Expórtalo de nuevo como MP4 desde tu editor o teléfono.',
  unreadable: 'No se pudo leer el archivo. Puede estar dañado.',
}

/** The agent-facing reason an upload failed. */
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const code = UploadErrorCodeSchema.safeParse(
      (error.response?.data as { code?: unknown } | undefined)?.code
    )
    if (code.success) return UPLOAD_ERRORS[code.data]
  }

  return getApiErrorMessage(error, 'No se pudo subir el archivo.')
}
