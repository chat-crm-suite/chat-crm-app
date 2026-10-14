import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChannelCapabilities } from '@chat-crm/contracts'
import { toast } from 'sonner'
import {
  classifyFile,
  readImageSize,
  type AttachableKind,
  type AttachIntent,
} from '../lib/attachment-candidate'
import type { OutgoingDraft } from '../lib/outgoing-draft'

/** WhatsApp lets you share up to 30 files at once. */
export const MAX_TRAY_ITEMS = 30

/** One file waiting in the send tray. */
export interface TrayItem {
  id: string
  file: File
  kind: AttachableKind
  /** Thumbnail for photos and videos. */
  previewUrl?: string
  caption: string
  width?: number | null
  height?: number | null
}

/** The draft each tray item becomes, in tray order. */
function toDraft(item: TrayItem): OutgoingDraft {
  switch (item.kind) {
    case 'image':
    case 'video':
      return {
        type: item.kind,
        file: item.file,
        caption: item.caption,
        width: item.width,
        height: item.height,
      }
    case 'audio':
      return { type: 'audio', file: item.file, voice: false }
    case 'document':
      return { type: 'document', file: item.file, caption: item.caption }
  }
}

/**
 * Files the agent is about to send: added from the menu, a drop or a paste,
 * checked against the channel at once, reordered and captioned one by one
 * like WhatsApp's media preview. `take()` hands them over as drafts.
 */
export function useComposerAttachments(capabilities: ChannelCapabilities | null) {
  const [items, setItems] = useState<TrayItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  })

  const revoke = (list: TrayItem[]) => {
    for (const item of list) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    }
  }

  // Thumbnails are released when the composer goes away.
  useEffect(() => () => revoke(itemsRef.current), [])

  const add = useCallback(
    (files: File[], intent?: AttachIntent) => {
      const room = MAX_TRAY_ITEMS - itemsRef.current.length
      const reasons: string[] = []
      const added: TrayItem[] = []

      for (const file of files) {
        const result = classifyFile(file, capabilities, intent)
        if (!result.ok) {
          reasons.push(result.reason)
          continue
        }
        if (added.length >= room) {
          reasons.push(`Puedes enviar hasta ${MAX_TRAY_ITEMS} archivos a la vez.`)
          break
        }
        added.push({
          id: crypto.randomUUID(),
          file,
          kind: result.kind,
          caption: '',
          previewUrl:
            result.kind === 'image' || result.kind === 'video'
              ? URL.createObjectURL(file)
              : undefined,
        })
      }

      if (reasons.length) {
        toast.error(
          reasons.length === 1 ? 'No se puede enviar este archivo' : `${reasons.length} archivos no se pueden enviar`,
          { description: reasons.slice(0, 3).join(' ') }
        )
      }
      if (!added.length) return

      itemsRef.current = [...itemsRef.current, ...added]
      setItems(itemsRef.current)
      setSelectedId(added[0].id)

      // Reserve each picture's frame in the thread before it uploads.
      for (const item of added) {
        if (item.kind !== 'image') continue
        void readImageSize(item.file).then((size) => {
          if (!size) return
          setItems((current) =>
            current.map((entry) => (entry.id === item.id ? { ...entry, ...size } : entry))
          )
        })
      }
    },
    [capabilities]
  )

  const remove = useCallback((id: string) => {
    const current = itemsRef.current
    const index = current.findIndex((item) => item.id === id)
    if (index === -1) return

    revoke([current[index]])
    const next = current.filter((item) => item.id !== id)
    itemsRef.current = next
    setItems(next)
    setSelectedId((selected) =>
      selected === id ? (next[Math.min(index, next.length - 1)]?.id ?? null) : selected
    )
  }, [])

  const setCaption = useCallback((id: string, caption: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, caption } : item))
    )
  }, [])

  const clear = useCallback(() => {
    revoke(itemsRef.current)
    itemsRef.current = []
    setItems([])
    setSelectedId(null)
  }, [])

  /** Hands the tray over as drafts (in tray order) and empties it. */
  const take = useCallback((): OutgoingDraft[] => {
    const drafts = itemsRef.current.map(toDraft)
    clear()
    return drafts
  }, [clear])

  return {
    items,
    selected: items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    add,
    remove,
    select: setSelectedId,
    reorder: setItems,
    setCaption,
    clear,
    take,
  }
}

export type ComposerAttachments = ReturnType<typeof useComposerAttachments>
