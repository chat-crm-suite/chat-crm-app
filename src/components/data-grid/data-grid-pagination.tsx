import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizes?: number[]
}

/** "1–10 de 128" plus previous/next; page size is a quiet select. */
export function DataGridPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50],
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm'>
      <p className='text-muted-foreground tabular-nums' aria-live='polite'>
        {total === 0 ? 'Sin resultados' : `${from}–${to} de ${total}`}
      </p>
      <div className='flex items-center gap-4'>
        <div className='hidden items-center gap-2 sm:flex'>
          <span className='text-muted-foreground'>Filas</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className='h-8 w-[4.5rem]' aria-label='Filas por página'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent side='top'>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-1'>
          <span className='text-muted-foreground me-2 tabular-nums'>
            {page} / {pages}
          </span>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Página anterior'
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Página siguiente'
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
