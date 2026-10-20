import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiErrorMessage, NETWORK_ERROR } from './api-error'

const axiosErrorWith = (data: unknown): AxiosError => {
  const error = new AxiosError('Request failed with status code 409')
  error.response = {
    data,
    status: 409,
    statusText: 'Conflict',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  }
  return error
}

describe('getApiErrorMessage', () => {
  it('returns the backend string message', () => {
    expect(
      getApiErrorMessage(
        axiosErrorWith({ message: 'Ya existe un usuario con ese nombre.' })
      )
    ).toBe('Ya existe un usuario con ese nombre.')
  })

  it('joins an array of validation messages', () => {
    expect(
      getApiErrorMessage(axiosErrorWith({ message: ['uno', 'dos'] }))
    ).toBe('uno. dos')
  })

  it('falls back to the Error message when there is no backend body', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('returns the provided fallback for unknown errors', () => {
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback')
  })

  it('never surfaces a raw axios message: network failure gets Spanish copy', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'))).toBe(
      NETWORK_ERROR
    )
  })

  it('uses the fallback for a server error with no readable body', () => {
    const error = axiosErrorWith(undefined)
    expect(getApiErrorMessage(error, 'No se pudo guardar')).toBe(
      'No se pudo guardar'
    )
  })
})
