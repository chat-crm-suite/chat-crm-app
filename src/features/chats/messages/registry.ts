import type {
  MessageType,
  MessageView,
  MessageViewType,
} from '@chat-crm/contracts'
import {
  FileText,
  Film,
  Image as ImageIcon,
  MessageSquareText,
  Mic,
  Sticker,
} from 'lucide-react'

import { AudioBody } from './bodies/audio-body'
import { DocumentBody } from './bodies/document-body'
import { ImageBody } from './bodies/image-body'
import { StickerBody } from './bodies/sticker-body'
import { TextBody } from './bodies/text-body'
import { UnsupportedBody } from './bodies/unsupported-body'
import { unsupportedKind } from './unsupported-kinds'
import { VideoBody } from './bodies/video-body'
import type { MessageKind, MessageKinds } from './message-kind'

/**
 * Single source of truth for message kinds in the app (thread rendering,
 * list previews, labels). Replaces the per-type strategies, the inline `if`s
 * of the thread row and the regex-guessed list preview type.
 */
export const MESSAGE_KINDS = {
  text: {
    label: 'Mensaje',
    icon: MessageSquareText,
    preview: (view) => view.text,
    Body: TextBody,
  },
  image: {
    label: 'Foto',
    icon: ImageIcon,
    preview: (view) => view.caption,
    Body: ImageBody,
  },
  video: {
    label: 'Video',
    icon: Film,
    preview: (view) => view.caption,
    Body: VideoBody,
  },
  audio: {
    label: 'Audio',
    icon: Mic,
    preview: (view) => (view.voice ? 'Nota de voz' : null),
    Body: AudioBody,
  },
  document: {
    label: 'Documento',
    icon: FileText,
    preview: (view) => view.caption ?? view.filename,
    Body: DocumentBody,
  },
  sticker: {
    label: 'Sticker',
    icon: Sticker,
    preview: () => null,
    Body: StickerBody,
  },
  unsupported: {
    label: 'Mensaje',
    icon: MessageSquareText,
    preview: (view) => view.text ?? unsupportedKind(view.originalType).label,
    Body: UnsupportedBody,
  },
} satisfies MessageKinds

/**
 * The kind of a view. The lookup is typed per key, but TypeScript cannot
 * correlate a union key with its entry, hence this one documented cast.
 */
export function kindOf<K extends MessageViewType>(view: { type: K }) {
  return MESSAGE_KINDS[view.type] as unknown as MessageKind<K>
}

type RenderedType = Exclude<MessageViewType, 'unsupported'>

/** Stored message types the thread renders natively. */
const RENDERED_TYPES = new Set<MessageType>([
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
] satisfies RenderedType[])

/** The view kind a stored message type renders as. */
export function viewTypeOf(type: MessageType): MessageViewType {
  return RENDERED_TYPES.has(type) ? (type as RenderedType) : 'unsupported'
}

/** The stored message type behind a view (for list previews). */
export function messageTypeOf(view: MessageView): MessageType {
  return view.type === 'unsupported' ? view.originalType : view.type
}

/** Label and icon for a stored message type (chat list). */
export function labelOf(type: MessageType) {
  const viewType = viewTypeOf(type)
  return viewType === 'unsupported'
    ? unsupportedKind(type)
    : { label: MESSAGE_KINDS[viewType].label, icon: MESSAGE_KINDS[viewType].icon }
}

/** List preview text of a view, `null` when only the label fits. */
export function previewOf(view: MessageView): string | null {
  return kindOf(view).preview(view)
}
