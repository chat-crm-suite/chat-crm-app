import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './api-error'

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
})
