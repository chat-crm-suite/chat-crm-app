export function humanFileSize(bytes: number): string {
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes

  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }

  return `${size.toFixed(2)} ${units[i]}`
}

export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

export async function getFileSize(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.headers.get('content-length')
  } catch {
    return null
  }
}
