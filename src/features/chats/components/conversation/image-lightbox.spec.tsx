import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ImageLightbox } from './image-lightbox'

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  src: 'http://localhost:3000/uploads/foto.jpg',
  alt: 'Firewatch',
  caption: 'Firewatch Sunset Nature',
  senderName: 'Jeremi',
  timestamp: new Date('2026-10-06T22:32:00'),
}

describe('ImageLightbox', () => {
  it('shows the full image with sender, time and caption', () => {
    render(<ImageLightbox {...baseProps} />)

    expect(screen.getByRole('img', { name: 'Firewatch' })).toHaveAttribute(
      'src',
      'http://localhost:3000/uploads/foto.jpg'
    )
    expect(screen.getByText('Jeremi')).toBeInTheDocument()
    expect(screen.getByText('22:32')).toBeInTheDocument()
    expect(screen.getByText('Firewatch Sunset Nature')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<ImageLightbox {...baseProps} onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes when the scrim is clicked', async () => {
    const onOpenChange = vi.fn()
    render(<ImageLightbox {...baseProps} onOpenChange={onOpenChange} />)

    await userEvent.click(
      document.querySelector('[data-slot="dialog-overlay"]') as Element
    )

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('offers an accessible close button', async () => {
    const onOpenChange = vi.fn()
    render(<ImageLightbox {...baseProps} onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
