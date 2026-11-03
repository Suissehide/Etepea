import dayjs from 'dayjs'
import { CalendarX } from 'lucide-react'
import { Dialog } from 'radix-ui'

import { Button } from '../../ui/button.tsx'
import { Popup, PopupContent, PopupFooter } from '../../ui/popup.tsx'

interface CreateForbiddenWeekFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  date: string | null
  onConfirm: (date: string) => void
  loading?: boolean
}

export function CreateForbiddenWeekForm({
  open,
  setOpen,
  date,
  onConfirm,
  loading = false,
}: CreateForbiddenWeekFormProps) {
  const monday = dayjs.utc(date ?? undefined).isoWeekday(1)
  const sunday = monday.add(6, 'day')
  const from =
    monday.month() === sunday.month()
      ? monday.format('D')
      : monday.format('D MMMM')

  return (
    <Popup modal open={open} onOpenChange={setOpen}>
      <PopupContent className="w-[440px] rounded-xl">
        <div className="flex items-center gap-3.5 border-b border-border px-5 py-[18px] pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <CalendarX size={18} className="text-red-700" />
          </span>
          <div className="flex flex-col gap-0.5">
            <Dialog.Title className="m-0 text-lg font-bold text-foreground">
              Interdire la semaine
            </Dialog.Title>
            <span className="text-[13px] text-text-light">
              Aucun créneau ne pourra y être planifié.
            </span>
          </div>
        </div>

        <div className="px-5 py-[18px]">
          <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2.5">
            <span className="text-xs text-text-light">Semaine</span>
            <span className="text-sm font-semibold text-foreground">
              du {from} au {sunday.format('D MMMM YYYY')}
            </span>
          </div>
        </div>

        <PopupFooter className="px-5 py-3.5">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => date && onConfirm(date)}
            disabled={loading}
          >
            <CalendarX className="h-4 w-4" />
            {loading ? 'En cours...' : 'Interdire la semaine'}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
