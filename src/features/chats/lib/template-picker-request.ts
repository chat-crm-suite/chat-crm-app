import { create } from 'zustand'

type TemplatePickerRequest = {
  /** Bumped on every request; the open chat reacts to changes. */
  seq: number
  request: () => void
}

/**
 * Lets code outside the chat tree (the socket-provider's "Enviar plantilla"
 * toast) ask the open conversation to show its template picker.
 */
export const useTemplatePickerRequest = create<TemplatePickerRequest>()(
  (set) => ({
    seq: 0,
    request: () => set((state) => ({ seq: state.seq + 1 })),
  })
)

export const requestTemplatePicker = () =>
  useTemplatePickerRequest.getState().request()
