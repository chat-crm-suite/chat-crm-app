/**
 * WhatsApp-style metadata for a document card: the file type and byte size
 * the API exposes for the attachment. Both parts are optional, so the
 * description degrades to whatever is honest (`"PDF · 2.4 MB"` → `"PDF"`).
 */

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PPTX',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
  'application/x-rar-compressed': 'RAR',
  'application/vnd.rar': 'RAR',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
}

function extensionLabel(filename?: string | null): string | undefined {
  const match = /\.([a-z0-9]{1,5})$/i.exec(filename ?? '')
  return match?.[1]?.toUpperCase()
}

/** Document type label, from the MIME type first and the extension second. */
export function documentTypeLabel(
  mimeType: string | null | undefined,
  filename: string | null | undefined
): string | undefined {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase()
  if (normalized && MIME_LABELS[normalized]) return MIME_LABELS[normalized]

  const fromExtension = extensionLabel(filename)
  if (fromExtension) return fromExtension

  // Unknown but well-formed media type: "application/ogg" → "OGG".
  const subtype = normalized?.split('/')[1]
  if (subtype && !subtype.includes('.')) return subtype.toUpperCase()

  return undefined
}

/** Byte size as `"2.4 MB"` / `"820 KB"`; `undefined` when unknown. */
export function formatFileSize(bytes?: number | null): string | undefined {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return undefined
  if (bytes < 1024) return `${Math.round(bytes)} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}

/**
 * Description for the document card: `"PDF · 2.4 MB"` with whichever parts
 * the API exposed; `undefined` means there is nothing honest to show.
 */
export function documentMeta({
  mimeType,
  sizeBytes,
  filename,
}: {
  mimeType?: string | null
  sizeBytes?: number | null
  filename?: string | null
}): string | undefined {
  const parts = [
    documentTypeLabel(mimeType, filename),
    formatFileSize(sizeBytes),
  ].filter(Boolean)

  return parts.length ? parts.join(' · ') : undefined
}
