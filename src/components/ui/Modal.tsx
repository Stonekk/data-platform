import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ModalSize = 'sm' | 'md' | 'lg'

export type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: ModalSize
  className?: string
}

const sizeToMaxWidth: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
}: ModalProps): ReactElement | null {
  const [entered, setEntered] = useState<boolean>(false)

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow: string = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onKeyDown])

  useEffect(() => {
    if (!isOpen) {
      setEntered(false)
      return
    }
    const id: number = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  if (!isOpen) return null

  const node: ReactElement = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭对话框"
        className={cn(
          'absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full rounded-xl border border-border bg-card shadow-xl ring-1 ring-slate-950/5',
          'transition-[opacity,transform] duration-200 ease-out',
          entered ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-1 scale-[0.98] opacity-0',
          sizeToMaxWidth[size],
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2
            id="modal-title"
            className="text-base font-semibold tracking-tight text-text"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-slate-100 hover:text-text"
            aria-label="关闭"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
