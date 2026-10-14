import html2canvas from 'html2canvas-pro'

/** Snapshot of a DOM block as a PNG download (dashboard sharing). */
export const useExportPng = () => {
  const exportPng = async (elementId: string, filename = 'metricas.png') => {
    const element = document.getElementById(elementId)
    if (!element) return

    const canvas = await html2canvas(element, { scale: 2 })
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = filename
    link.click()
  }

  return { exportPng }
}
