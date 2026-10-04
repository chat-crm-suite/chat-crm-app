import { useQuery } from '@tanstack/react-query'
import { MessageCircleWarning } from 'lucide-react'

import { getSetupStatus } from '@/services/setup.service'

export function WhatsappBanner({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div className='border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900'>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        <MessageCircleWarning className='size-4 shrink-0' />
        <span>WhatsApp todavía no está conectado.</span>
        <a
          href='/settings/integrations/whatsapp'
          className='font-medium underline underline-offset-4'
        >
          Conectar ahora
        </a>
      </div>
    </div>
  )
}

export function WhatsappSetupBanner() {
  const { data } = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: getSetupStatus,
    staleTime: 60 * 1000,
  })

  return (
    <WhatsappBanner
      visible={Boolean(data?.initialized && !data.hasWhatsapp)}
    />
  )
}
