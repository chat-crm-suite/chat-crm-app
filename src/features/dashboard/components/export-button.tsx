import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExportToPng } from '@/features/dashboard/hooks/user-export-to-pdf'

export function ExportDashboardButton() {
  const { exportPng } = useExportToPng()

  return (
    <Button
      onClick={() => exportPng('metrics', 'metrics.png')}
    >
      <span className='font-bold'>Export</span>
      <FileUp size={18} />
    </Button>
  )
}
