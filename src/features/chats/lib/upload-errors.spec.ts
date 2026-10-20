import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { uploadErrorMessage } from './upload-errors'

const apiError = (data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data,
    status: 415,
    statusText: 'Unsupported Media Type',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe('uploadErrorMessage', () => {
  it('explains a coded refusal in Spanish', () => {
    expect(
      uploadErrorMessage(apiError({ code: 'fragmented_video', message: 'Fragmented MP4…' }))
    ).toContain('MP4 fragmentado')
  })

  it('falls back to the API message, then to a generic one', () => {
    expect(uploadErrorMessage(apiError({ message: 'Algo' }))).toBe('Algo')
    // Never the raw axios text ("Request failed"): the Spanish fallback.
    expect(uploadErrorMessage(apiError({}))).toBe('No se pudo subir el archivo.')
  })
})
