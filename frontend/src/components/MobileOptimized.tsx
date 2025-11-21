/**
 * Mobile-optimized component wrappers and utilities
 */

import React, { ReactNode, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TouchTargetProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
}

/**
 * Ensures button meets minimum touch target size (44x44px)
 */
export function TouchTarget({ children, className, ...props }: TouchTargetProps) {
  return (
    <button
      className={cn('touch-target', className)}
      {...props}
    >
      {children}
    </button>
  )
}

interface MobileContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Container with mobile-appropriate padding
 */
export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn('container-mobile', className)}>
      {children}
    </div>
  )
}

/**
 * Stack layout that's column on mobile, row on desktop
 */
export function StackLayout({ children, className }: MobileContainerProps) {
  return (
    <div className={cn('stack-mobile gap-4', className)}>
      {children}
    </div>
  )
}

/**
 * Responsive grid that adapts to screen size
 */
export function ResponsiveGrid({ children, className }: MobileContainerProps) {
  return (
    <div className={cn('grid-mobile gap-4', className)}>
      {children}
    </div>
  )
}

/**
 * Mobile-optimized card with appropriate padding
 */
export function MobileCard({ children, className }: MobileContainerProps) {
  return (
    <div className={cn('card-mobile rounded-lg border bg-card', className)}>
      {children}
    </div>
  )
}

interface ResponsiveTextProps {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Text that scales appropriately across breakpoints
 */
export function ResponsiveText({
  children,
  className,
  as: Component = 'p',
  size = 'md',
}: ResponsiveTextProps) {
  const sizeClasses = {
    sm: 'heading-responsive-sm',
    md: 'heading-responsive-md',
    lg: 'heading-responsive-lg',
  }

  return (
    <Component className={cn(Component !== 'p' && sizeClasses[size], 'text-responsive', className)}>
      {children}
    </Component>
  )
}

/**
 * Horizontal scrollable container (e.g., for image galleries on mobile)
 */
export function HorizontalScroll({ children, className }: MobileContainerProps) {
  return (
    <div className={cn('overflow-x-auto hide-scrollbar -mx-4 px-4', className)}>
      <div className="flex gap-4">
        {children}
      </div>
    </div>
  )
}

/**
 * Table that stacks on mobile, displays as table on desktop
 */
export function ResponsiveTable({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <table className={cn('table-mobile w-full', className)}>
      {children}
    </table>
  )
}

/**
 * Sticky element optimized for mobile (accounts for safe areas)
 */
export function StickyMobile({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('sticky-mobile safe-area-padding', className)}>
      {children}
    </div>
  )
}

/**
 * Full-screen modal on mobile, centered dialog on desktop
 */
export function ResponsiveModal({
  children,
  className,
  open,
  onClose,
}: {
  children: ReactNode
  className?: string
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 md:flex md:items-center md:justify-center">
        <div
          className={cn(
            'modal-mobile bg-background p-6 shadow-lg md:max-w-lg md:w-full',
            className
          )}
        >
          {children}
        </div>
      </div>
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-label="Close modal"
      />
    </div>
  )
}

/**
 * Utility hook to detect if user is on mobile device
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

/**
 * Utility hook to detect touch device
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false)

  React.useEffect(() => {
    setIsTouch(
      'ontouchstart' in window || navigator.maxTouchPoints > 0
    )
  }, [])

  return isTouch
}
