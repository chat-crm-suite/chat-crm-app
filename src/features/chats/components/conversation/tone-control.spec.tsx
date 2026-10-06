import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { ChatSentiment } from '../../types/chat.domain'
import { ToneControl } from './tone-control'
import { TONE_MODE_STORAGE_KEY } from './tone-mode'

/** jsdom has no `matchMedia`; the tone control only needs `matches`. */
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
}

const sentiment: ChatSentiment = {
  avgPos: 0.52,
  avgNeu: 0.31,
  avgNeg: 0.17,
  totalMessages: 48,
  dominant: 'POS',
}

describe('ToneControl', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the face and label in full mode by default', () => {
    render(<ToneControl sentiment={sentiment} />)

    expect(screen.getByText('Positivo')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /tono positivo/i })
    ).toBeInTheDocument()
  })

  it('keeps only the face in mini mode', () => {
    localStorage.setItem(TONE_MODE_STORAGE_KEY, 'mini')
    render(<ToneControl sentiment={sentiment} />)

    expect(screen.queryByText('Positivo')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /tono positivo/i })
    ).toBeInTheDocument()
  })

  it('hides the control everywhere in off mode', () => {
    localStorage.setItem(TONE_MODE_STORAGE_KEY, 'off')
    render(<ToneControl sentiment={sentiment} />)

    expect(screen.queryByRole('button', { name: /tono/i })).not.toBeInTheDocument()
  })

  it('opens the detail and switches to a persisted off mode', async () => {
    const user = userEvent.setup()
    render(<ToneControl sentiment={sentiment} />)

    await user.click(screen.getByRole('button', { name: /tono positivo/i }))

    expect(
      await screen.findByText('Análisis de sentimiento')
    ).toBeInTheDocument()
    expect(screen.getByText('52%')).toBeInTheDocument()
    expect(screen.getByText(/48 mensajes analizados/i)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Oculto' }))

    expect(
      screen.queryByRole('button', { name: /tono positivo/i })
    ).not.toBeInTheDocument()
    expect(localStorage.getItem(TONE_MODE_STORAGE_KEY)).toBe('off')
  })

  it('opens the same detail in a bottom sheet on compact viewports', async () => {
    stubMatchMedia(true)
    const user = userEvent.setup()
    render(<ToneControl sentiment={sentiment} />)

    await user.click(screen.getByRole('button', { name: /tono positivo/i }))

    expect(
      await screen.findByText('Análisis de sentimiento')
    ).toBeInTheDocument()
    expect(screen.getByText('52%')).toBeInTheDocument()
    expect(screen.getByText(/48 mensajes analizados/i)).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="sheet-content"]')
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="popover-content"]')
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Oculto' }))
    expect(localStorage.getItem(TONE_MODE_STORAGE_KEY)).toBe('off')
  })

  it('keeps the popover detail on desktop viewports', async () => {
    stubMatchMedia(false)
    const user = userEvent.setup()
    render(<ToneControl sentiment={sentiment} />)

    await user.click(screen.getByRole('button', { name: /tono positivo/i }))

    expect(
      await screen.findByText('Análisis de sentimiento')
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="popover-content"]')
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="sheet-content"]')
    ).not.toBeInTheDocument()
  })
})
