import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ChannelHealth } from '../../lib/channel-health'
import { ChannelDownNotice } from './channel-down-notice'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const health: ChannelHealth = {
  channelId: 'ch-1',
  type: 'whatsapp',
  name: 'WhatsApp',
  status: 'error',
  reason: 'El token de acceso de WhatsApp venció o fue revocado.',
  settingsPath: '/settings/integrations/whatsapp',
}

describe('ChannelDownNotice', () => {
  it('tells an admin why and links to the settings, with a manual retry', async () => {
    const onRetry = vi.fn()
    render(<ChannelDownNotice health={health} canConfigure onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('WhatsApp sin conexión')
    expect(screen.getByRole('alert')).toHaveTextContent(health.reason)
    expect(
      screen.getByRole('link', { name: /ir a configuración/i })
    ).toHaveAttribute('href', '/settings/integrations/whatsapp')

    await userEvent.click(
      screen.getByRole('button', { name: /reintentar verificación/i })
    )
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('asks an agent to call an admin instead of linking to the settings', () => {
    render(
      <ChannelDownNotice
        health={health}
        canConfigure={false}
        onRetry={vi.fn()}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/avisa a un administrador/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /reintentar verificación/i })
    ).toBeInTheDocument()
  })

  it('disables the retry while it runs', () => {
    render(
      <ChannelDownNotice
        health={health}
        canConfigure
        onRetry={vi.fn()}
        retrying
      />
    )
    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled()
  })
})
