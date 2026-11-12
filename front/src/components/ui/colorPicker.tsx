import { Github } from '@uiw/react-color'
import { useEffect, useRef, useState } from 'react'

import { cn } from '../../libs/utils.ts'
import { Input } from './input.tsx'

// Palette du sélecteur de couleur : 8 teintes x 6 nuances, puis une ligne
// de neutres. L'ordre est celui de l'affichage (8 pastilles par ligne).
export const COLOR_PICKER_PALETTE = [
  // Nuances soutenues
  '#b91c1c',
  '#c2410c',
  '#b45309',
  '#047857',
  '#0e7490',
  '#1d4ed8',
  '#6d28d9',
  '#be185d',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#059669',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  // Nuances vives
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  // Nuances claires
  '#fca5a5',
  '#fdba74',
  '#fcd34d',
  '#6ee7b7',
  '#67e8f9',
  '#93c5fd',
  '#c4b5fd',
  '#f9a8d4',
  '#fecaca',
  '#fed7aa',
  '#fde68a',
  '#a7f3d0',
  '#a5f3fc',
  '#bfdbfe',
  '#ddd6fe',
  '#fbcfe8',
  // Neutres
  '#000000',
  '#374151',
  '#6b7280',
  '#9ca3af',
  '#d1d5db',
  '#e5e7eb',
  '#f3f4f6',
  '#ffffff',
]

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  /**
   * Pastille seule, sans le champ hexadécimal : pour une cellule de tableau
   * (résumé des parcours). La palette reste la même.
   */
  swatchOnly?: boolean
  'aria-label'?: string
}

/** Pastille + code hexadécimal, palette au clic : le sélecteur de couleur des formulaires. */
export function ColorPicker({
  value,
  onChange,
  id,
  className,
  swatchOnly = false,
  'aria-label': ariaLabel = 'Ouvrir le sélecteur de couleur',
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (/^#[0-9A-Fa-f]{0,6}$/.test(newValue) || newValue === '') {
      onChange(newValue)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={cn('flex items-center', className)}>
        <button
          type="button"
          className={cn(
            'flex-shrink-0 border border-border cursor-pointer',
            swatchOnly
              ? 'w-6 h-6 rounded-md'
              : 'w-9 h-9 rounded rounded-tr-none rounded-br-none',
          )}
          style={{ backgroundColor: value }}
          onClick={() => setOpen(true)}
          aria-label={ariaLabel}
        />

        {!swatchOnly && (
          <Input
            type="text"
            id={id}
            value={value}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            placeholder="#000000"
            maxLength={7}
            className="border-l-0 rounded-tl-none rounded-bl-none"
          />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2">
          <Github
            className="bg-primary"
            color={value}
            colors={COLOR_PICKER_PALETTE}
            style={{ width: '212px' }}
            onChange={(color: { hex: string }) => {
              onChange(color.hex)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
