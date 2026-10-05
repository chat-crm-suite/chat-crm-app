import type React from 'react'
import type { MessageType } from '../../types/message.domain'
import { MessageDocument } from './document'
import { MessageImage } from './image'
import { MessageText } from './text'

export const renderMessage: Partial<
  Record<MessageType, React.ComponentType<any>>
> = {
  text: MessageText,
  image: MessageImage,
  document: MessageDocument,
}
