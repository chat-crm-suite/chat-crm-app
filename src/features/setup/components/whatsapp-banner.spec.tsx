import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatsappBanner } from './whatsapp-banner'

describe('WhatsappBanner', () => {
  it('shows the call to action linking to the whatsapp settings', () => {
    render(<WhatsappBanner visible />)

    expect(screen.getByText(/no está conectado/i)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/settings/integrations/whatsapp'
    )
  })

  it('renders nothing when hidden', () => {
    const { container } = render(<WhatsappBanner visible={false} />)

    expect(container).toBeEmptyDOMElement()
  })
})
