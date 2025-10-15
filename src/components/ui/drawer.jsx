import React, { createContext, useContext, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const DrawerContext = createContext(null)

function Drawer({ children, open: controlledOpen, onOpenChange }) {
  const [open, setOpen] = useState(controlledOpen ?? false)

  useEffect(() => {
    if (typeof controlledOpen === 'boolean') setOpen(controlledOpen)
  }, [controlledOpen])

  useEffect(() => {
    if (typeof onOpenChange === 'function') onOpenChange(open)
  }, [open, onOpenChange])

  return (
    <DrawerContext.Provider value={{ open, setOpen }}>
      {children}
    </DrawerContext.Provider>
  )
}

function DrawerTrigger({ children }) {
  const ctx = useContext(DrawerContext)
  if (!ctx) return null
  const { setOpen } = ctx
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e)
      setOpen(true)
    },
  })
}

function DrawerClose({ children }) {
  const ctx = useContext(DrawerContext)
  if (!ctx) return null
  const { setOpen } = ctx
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e)
      setOpen(false)
    },
  })
}

function DrawerContent({ children, className, side = 'right' }) {
  const ctx = useContext(DrawerContext)
  
  // Avoid rendering portal until after client mount to prevent
  // SSR / hydration mismatches (server renders nothing; client must wait)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => setMounted(true), [])

  // These hooks must be called before any early returns
  useEffect(() => {
    if (!ctx) return
    const { open, setOpen } = ctx
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ctx])

  if (!ctx) return null
  if (!mounted) return null
  if (typeof document === 'undefined') return null
  
  const { open, setOpen } = ctx

  return createPortal(
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity bg-black/40',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed z-50 top-0 h-full w-full md:w-[520px] bg-popover shadow-lg transform transition-transform',
          side === 'right' ? 'right-0' : 'left-0',
          open ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full',
          className
        )}
      >
        <div className="h-full overflow-auto p-6">{children}</div>
      </aside>
    </>,
    document.body
  )
}

function DrawerHeader({ children, className }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

function DrawerTitle({ children, className }) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>
}

function DrawerDescription({ children, className }) {
  return <p className={cn('text-sm text-muted-foreground mt-1', className)}>{children}</p>
}

function DrawerFooter({ children, className }) {
  return <div className={cn('mt-6 flex items-center justify-end gap-2', className)}>{children}</div>
}

export {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
}

export default Drawer
