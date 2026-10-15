import { useCallback, useRef, useState, type DragEvent } from 'react'

const carriesFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files')

/**
 * Drop zone for files dragged from the operating system (dnd-kit only moves
 * elements inside the page). Child elements fire their own enter/leave, so a
 * depth counter keeps the overlay from flickering while the pointer moves
 * over them. Text or links being dragged are ignored.
 */
export function useFileDrop({
  onFiles,
  disabled = false,
}: {
  onFiles: (files: File[]) => void
  disabled?: boolean
}) {
  const depth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const reset = useCallback(() => {
    depth.current = 0
    setIsDragging(false)
  }, [])

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth.current += 1
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const onDragOver = useCallback(
    (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
    },
    [disabled]
  )

  const onDragLeave = useCallback(
    (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth.current = Math.max(depth.current - 1, 0)
      if (depth.current === 0) setIsDragging(false)
    },
    []
  )

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      reset()
      if (!disabled) onFiles(Array.from(event.dataTransfer.files))
    },
    [disabled, onFiles, reset]
  )

  return {
    isDragging,
    dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  }
}
