import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CalendarDatePickerButton from './calendarDatePickerButton.tsx'

describe('CalendarDatePickerButton', () => {
  it('Échap ferme la popup sans atteindre les écouteurs de la page', () => {
    const setAnchorEl = vi.fn()
    const page = vi.fn()
    document.addEventListener('keydown', page)
    render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
        <CalendarDatePickerButton
          anchorEl={document.body}
          setAnchorEl={setAnchorEl}
          onChange={() => undefined}
        />
      </LocalizationProvider>,
    )
    fireEvent.keyDown(document.body, { key: 'Escape' })
    document.removeEventListener('keydown', page)
    expect(setAnchorEl).toHaveBeenCalledWith(null)
    expect(page).not.toHaveBeenCalled()
  })
})
