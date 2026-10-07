import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ChatPreview } from './chat-preview'

// The REST list sends `content: null` for media without caption (the API
// stores no body for them); the preview must survive a reload via `type`.
describe('ChatPreview', () => {
  it('labels an image without body from the explicit type', () => {
    render(<ChatPreview preview={{ content: null, type: 'image' }} />)

    expect(screen.getByText('Imagen')).toBeInTheDocument()
  })

  it('labels a document without body from the explicit type', () => {
    render(<ChatPreview preview={{ content: null, type: 'document' }} />)

    expect(screen.getByText('Documento')).toBeInTheDocument()
  })

  it('renders nothing for an empty text message', () => {
    const { container } = render(
      <ChatPreview preview={{ content: null, type: 'text' }} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('infers the kind from a filename when the type is missing', () => {
    render(<ChatPreview preview={{ content: 'foto.jpg' }} />)

    expect(screen.getByText('foto.jpg')).toBeInTheDocument()
    expect(screen.getByText('Imagen:')).toBeInTheDocument()
  })
})
