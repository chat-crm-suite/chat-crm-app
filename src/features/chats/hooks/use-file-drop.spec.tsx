import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFileDrop } from './use-file-drop'

function Zone({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const { isDragging, dropProps } = useFileDrop({ onFiles, disabled })
  return (
    <div data-testid='zone' {...dropProps}>
      <span data-testid='child'>hijo</span>
      {isDragging && <p>Suelta los archivos aquí</p>}
    </div>
  )
}

const transfer = (types: string[], files: File[] = []) => ({
  dataTransfer: { types, files, dropEffect: 'none' },
})

describe('useFileDrop', () => {
  it('keeps the overlay while the pointer crosses child elements', () => {
    render(<Zone onFiles={vi.fn()} />)
    const zone = screen.getByTestId('zone')

    fireEvent.dragEnter(zone, transfer(['Files']))
    fireEvent.dragEnter(screen.getByTestId('child'), transfer(['Files']))
    fireEvent.dragLeave(zone, transfer(['Files']))
    expect(screen.getByText('Suelta los archivos aquí')).toBeInTheDocument()

    fireEvent.dragLeave(screen.getByTestId('child'), transfer(['Files']))
    expect(screen.queryByText('Suelta los archivos aquí')).not.toBeInTheDocument()
  })

  it('hands dropped files over and hides the overlay', () => {
    const onFiles = vi.fn()
    render(<Zone onFiles={onFiles} />)
    const zone = screen.getByTestId('zone')
    const file = new File(['x'], 'a.png', { type: 'image/png' })

    fireEvent.dragEnter(zone, transfer(['Files']))
    fireEvent.drop(zone, transfer(['Files'], [file]))

    expect(onFiles).toHaveBeenCalledWith([file])
    expect(screen.queryByText('Suelta los archivos aquí')).not.toBeInTheDocument()
  })

  it('ignores dragged text and refuses drops while disabled', () => {
    const onFiles = vi.fn()
    const { rerender } = render(<Zone onFiles={onFiles} />)
    const zone = screen.getByTestId('zone')

    fireEvent.dragEnter(zone, transfer(['text/plain']))
    expect(screen.queryByText('Suelta los archivos aquí')).not.toBeInTheDocument()

    rerender(<Zone onFiles={onFiles} disabled />)
    fireEvent.dragEnter(zone, transfer(['Files']))
    fireEvent.drop(zone, transfer(['Files'], [new File(['x'], 'a.png')]))
    expect(screen.queryByText('Suelta los archivos aquí')).not.toBeInTheDocument()
    expect(onFiles).not.toHaveBeenCalled()
  })
})
