import { useState } from 'react'
import { Button, Menu, MenuItem, Modal, Radio, Select } from '@monarch/design-system'

/**
 * The two bottom-action flows on a holding's drill-down — B9.
 *
 * ⚠️ PRESETS, NOT A CALENDAR, AND THAT IS A RULE-3 DECISION RATHER THAN A
 * SHORTCUT. The DS ships no `DateRangePicker` and no calendar-grid primitive:
 * `DatePicker` exposes a `calendarSlot` that is explicitly app-provided, and the
 * DS's own notes record Figma's calendar as "not a reusable slot component yet
 * (deferred)". Building one here would be building a primitive in the MVP, which
 * rule 3 forbids — the correct move is to design around it, and neither of these
 * two tasks actually needs an arbitrary date.
 *
 * WHAT IS DELIBERATELY NOT BUILT: no file is generated, no email is sent, no
 * notification is scheduled. Both flows end in a toast. Anything more would be
 * inventing a subsystem the design does not describe.
 */

const REMINDER_PRESETS = [
  { id: 'week-1', label: '1 week before' },
  { id: 'week-2', label: '2 weeks before' },
  { id: 'month-1', label: '1 month before' },
] as const

const STATEMENT_PRESETS = [
  { id: 'days-30', label: 'Last 30 days' },
  { id: 'months-3', label: 'Last 3 months' },
  { id: 'year', label: 'This year' },
] as const

export interface PresetModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the chosen preset's label, for the confirmation toast. */
  onConfirm: (label: string) => void
}

/**
 * Set Maturity Reminder — a `Radio` group, because the three options are
 * mutually exclusive and all three should be visible at once. Three items is
 * below the threshold where a dropdown earns its extra interaction.
 */
export function ReminderModal({ isOpen, onClose, onConfirm }: PresetModalProps) {
  const [selected, setSelected] = useState<string>(REMINDER_PRESETS[0].id)

  const chosen = REMINDER_PRESETS.find((p) => p.id === selected)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Maturity Reminder"
      footer={
        <Button
          variant="primary"
          size="m"
          label="Set reminder"
          onClick={() => {
            if (chosen) onConfirm(chosen.label)
            onClose()
          }}
        />
      }
    >
      <div className="mvp-finance__presets" role="radiogroup" aria-label="Remind me">
        {REMINDER_PRESETS.map((preset) => (
          <Radio
            key={preset.id}
            name="maturity-reminder"
            value={preset.id}
            label={preset.label}
            isChecked={selected === preset.id}
            onChange={() => setSelected(preset.id)}
          />
        ))}
      </div>
    </Modal>
  )
}

/**
 * Download Statement — a `Select`, as specified. A period is a single choice out
 * of a closed list, which is exactly what `Select` is for, and it keeps the
 * modal one line tall instead of three.
 */
export function StatementModal({ isOpen, onClose, onConfirm }: PresetModalProps) {
  const [selected, setSelected] = useState<string>(STATEMENT_PRESETS[0].id)
  const [isMenuOpen, setMenuOpen] = useState(false)

  const chosen = STATEMENT_PRESETS.find((p) => p.id === selected)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Download Statement"
      footer={
        <Button
          variant="primary"
          size="m"
          label="Send statement"
          onClick={() => {
            if (chosen) onConfirm(chosen.label)
            onClose()
          }}
        />
      }
    >
      <Select
        label="Period"
        value={chosen?.label}
        placeholder="Choose a period"
        isOpen={isMenuOpen}
        onOpenChange={setMenuOpen}
        isSelected={Boolean(chosen)}
        menuSlot={
          <Menu
            listAriaLabel="Statement period"
            slotContent={STATEMENT_PRESETS.map((preset) => (
              <MenuItem
                key={preset.id}
                id={preset.id}
                label={preset.label}
                isSelected={selected === preset.id}
                onSelect={() => {
                  setSelected(preset.id)
                  setMenuOpen(false)
                }}
              />
            ))}
          />
        }
      />
    </Modal>
  )
}
