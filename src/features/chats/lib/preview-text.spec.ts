import { describe, expect, it } from 'vitest'

import { truncatePreview } from './preview-text'

describe('truncatePreview', () => {
  it('leaves short copy untouched', () => {
    expect(truncatePreview('tienen stock del modelo X?')).toBe(
      'tienen stock del modelo X?'
    )
    expect(truncatePreview('')).toBe('')
  })

  it('clips long unbroken words to the budget with an ellipsis', () => {
    expect(truncatePreview('a'.repeat(80))).toBe(`${'a'.repeat(55)}…`)
  })

  it('cuts at the last word boundary when one is close enough', () => {
    const text =
      'uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis'

    expect(truncatePreview(text, 40)).toBe(
      'uno dos tres cuatro cinco seis siete…'
    )
  })

  it('ignores a boundary that would waste most of the budget', () => {
    const text = `corto ${'x'.repeat(80)}`

    expect(truncatePreview(text, 56)).toBe(`${text.slice(0, 55)}…`)
  })
})
