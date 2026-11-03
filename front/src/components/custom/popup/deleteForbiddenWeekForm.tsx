import dayjs from 'dayjs'
import { CalendarCheck } from 'lucide-react'
import { Dialog } from 'radix-ui'

import { Button } from '../../ui/button.tsx'
import { Popup, PopupContent, PopupFooter } from '../../ui/popup.tsx'

interface DeleteForbiddenWeekFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  startOfWeek: string | null
  onConfirm: () => void
  loading?: boolean
}

export function DeleteForbiddenWeekForm({
  open,
  setOpen,
  startOfWeek,
  onConfirm,
  loading = false,
}: DeleteForbiddenWeekFormProps) {
  const monday = dayjs.utc(startOfWeek ?? undefined).isoWeekday(1)
  const sunday = monday.add(6, 'day')
  const from =
    monday.month() === sunday.month()
      ? monday.format('D')
      : monday.format('D MMMM')

  return (
    <Popup modal open={open} onOpenChange={setOpen}>
      <PopupContent className="w-[440px] rounded-xl">
        <div className="flex items-center gap-3.5 border-b border-border px-5 py-[18px] pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe6fd]">
            <CalendarCheck size={18} className="text-primary" />
          </span>
          <div className="flex flex-col gap-0.5">
            <Dialog.Title className="m-0 text-lg font-bold text-foreground">
              Retirer l'interdiction
            </Dialog.Title>
            <span className="text-[13px] text-text-light">
              Des créneaux pourront de nouveau y être planifiés.
            </span>
          </div>
        </div>

        <div className="px-5 py-[18px]">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2.5">
            <span className="flex flex-col gap-1">
              <span className="text-xs text-text-light">Semaine</span>
              <span className="text-sm font-semibold text-foreground">
                du {from} au {sunday.format('D MMMM YYYY')}
              </span>
            </span>
            <span className="rounded-lg bg-red-100 px-[7px] py-0.5 text-[11px] font-semibold text-red-700">
              Interdite
            </span>
          </div>
        </div>

        <PopupFooter className="px-5 py-3.5">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            <CalendarCheck className="h-4 w-4" />
            {loading ? 'En cours...' : "Retirer l'interdiction"}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
