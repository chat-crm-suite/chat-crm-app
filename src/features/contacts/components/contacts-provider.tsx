import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { ContactResponse as Contact } from '@chat-crm/contracts'

type ContactDialogType = 'add' | 'edit' | 'delete'

type ContactContextType = {
  open: ContactDialogType | null
  setOpen: (str: ContactDialogType | null) => void
  currentRow: Contact | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Contact | null>>
}

const ContactContext = React.createContext<ContactContextType | null>(null)

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<ContactDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Contact | null>(null)

  return (
    <ContactContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </ContactContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useContacts = () => {
  const contactContext = React.useContext(ContactContext)

  if (!contactContext) {
    throw new Error('useContact has to be used within <ContactContext>')
  }

  return contactContext
}
