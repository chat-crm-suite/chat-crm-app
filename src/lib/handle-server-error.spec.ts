import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleMutationError,
  SERVER_ERROR_TOAST_ID,
} from './handle-server-error'

const toast = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const mutation = (meta?: Record<string, unknown>, onError?: () => void) =>
  ({ meta, options: { onError } }) as Parameters<typeof handleMutationError>[1]

describe('handleMutationError', () => {
  beforeEach(() => toast.error.mockClear())

  it('toasts one readable Spanish error with a stable id', () => {
    handleMutationError(new AxiosError('Network Error'), mutation())

    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('No hay conexión'),
      expect.objectContaining({ id: SERVER_ERROR_TOAST_ID })
    )
  })

  it('stays quiet when the screen handles the error', () => {
    handleMutationError(new Error('x'), mutation({ toast: false }))
    handleMutationError(new Error('x'), mutation(undefined, vi.fn()))

    expect(toast.error).not.toHaveBeenCalled()
  })
})
