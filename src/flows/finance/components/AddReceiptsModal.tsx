import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Icon, Modal, Tag } from '@monarch/design-system'
import { CapturingBlock } from './CapturingBlock'
import {
  ReceiptFileInput,
  type ReceiptFileInputHandle,
  type ReceiptSource,
} from './ReceiptFileInput'
import { captureToReceipt, fileTypeLabel } from '../receiptCapture'
import type { Receipt } from '../../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BULK ADD SURFACE — Figma `1266:14284` (Gate 50).
 *
 * IT IS A MODAL, NOT A SHEET, AND THE FRAME'S OWN NAME IS THE TRAP. The inner
 * node is literally called "Bottom Sheet"; its geometry says otherwise and
 * geometry wins: `1048:10593` is **343 wide at x=16**, i.e. inset 16 on both
 * sides, with all four corners rounded and no home indicator. A `Sheet` in this
 * DS is full-bleed (`width: 100%`, radius on the top corners only, a home
 * indicator region) and could not be made to look like this without overriding
 * three of its own rules.
 *
 * THE DS `Modal` REPRODUCES THE FRAME'S HORIZONTAL GEOMETRY EXACTLY AND ITS
 * VERTICAL GEOMETRY ONLY APPROXIMATELY — and the difference between those two
 * sentences is a correction, made after measuring. A first draft of this block
 * asserted four exact matches, derived by adding up `Modal.css`'s paddings; two
 * of the four were WRONG, and only a real measurement through the harness found
 * it. Arithmetic over a stylesheet is not a measurement of a render.
 *
 * MEASURED in a Playwright-launched Chromium at 375, DPR 2, animations settled:
 *
 *   card      x=16, w=343                Figma 16 / 343    ✓ EXACT
 *   content   inset 16 (grid x=32)       Figma 16          ✓ EXACT
 *   header    h=74                       Figma 64          ✗ +10
 *   footer    h=74 empty / 128 populated Figma 152         ✗ -24
 *
 * THE TWO THAT MATCH ARE THE TWO THE CLASSIFICATION RESTS ON. "343 wide at
 * x=16" is what says Modal rather than Sheet, and it is exact to the pixel.
 *
 * THE TWO THAT DIVERGE ARE ONE CAUSE, AND IT IS A KNOWN DS PATTERN: Figma FIXES
 * these heights and the DS HUGS them, so the rendered height is whatever the
 * DS's own children measure. The header is TALLER because the DS's close
 * `IconButton` renders 34 where Figma's header allows 24; the footer is SHORTER
 * because `Button` renders ~34 (and ~38 with a leading icon) where Figma draws
 * 48 — and NO `ButtonSize` reaches 48: `s`/`m`/`l` are 4/8/12px paddings, so `l`
 * tops out around 42. There is no prop that closes it.
 *
 * REGISTERED AS G28, NOT FIXED HERE, and it is the same question G18 already
 * asks of `Header/bg` (22px shorter, same hug-versus-fixed cause). Forcing it
 * would mean an MVP-local height override on DS components — the equal-specificity
 * override on DS geometry that Gate 13 removed on measurement.
 *
 * ────────────────────── IT TRANSFORMS IN PLACE ───────────────────────────────
 *
 * Teku's proposal, settled. ONE overlay, ONE scrim, ONE dismiss gesture, three
 * phases inside it:
 *
 *   empty     the two source buttons          -> nothing staged
 *   grid      the thumbnails + "Add more"     -> at least one staged
 *   saving    the processing moment           -> Save pressed
 *
 * "Add more" pushes BACK to the picker, it does not open a second overlay. A
 * stacked second modal over this one would give the user two scrims and two
 * dismiss gestures for one task, and would make "which ✕ am I pressing" a
 * question they have to answer.
 *
 * THE GRID IS AN ACCUMULATOR. Gallery returns several at once, camera returns
 * one, and both land in the same list until Save — which is what the Figma
 * annotation `1266:14280` describes in its entirety: *"In gallery multi select >
 * multi added > Save"*. That single line is the only statement anywhere of how
 * this surface is reached, and it says accumulate-then-commit.
 *
 * ──────────────────────── SAVE IS ABSENT WHEN EMPTY ──────────────────────────
 *
 * Not disabled — absent. Gate 44 ruled on exactly this shape for the filter
 * chips: a control that is drawn, focusable and announced while being unable to
 * do anything is worse than one that is not there. With nothing staged the
 * content IS the two source buttons, so a greyed Save would add a second,
 * duller call to action beneath the real one.
 *
 * ────────────────────────── GEOMETRY, DERIVED ────────────────────────────────
 *
 * From `get_metadata` on `1048:10593`, tiles at x = 16 / 122 / 228 and rows at
 * y = 0 / 106, each 98 x 98: pitch 106, so the gap is 8 (`--brand-scale-200`).
 *
 * THE TILES ARE `1fr`, NOT 98, AND THE 1px DIFFERENCE IS THE POINT. Three 98s
 * plus two 8s is 310, in a content box that is 343 - 32 = **311**: Figma's own
 * row leaves a pixel of slack on the right. `repeat(3, 1fr)` resolves to 98.33
 * and fills the column exactly, which is what the design means rather than what
 * it measures — the same reading Gate 41 applied to the receipt card's two
 * 145.5-wide rules, where the drawn number was an artifact of a fixed-width
 * frame and the flex version also survives 430.
 *
 * THE REMOVE AFFORDANCE AND THE TYPE BADGE BOTH SIT 3px IN, ROUNDED TO 4.
 * Figma: `Frame 438` at (71, 3) in a 98 tile -> 3 from the top and 3 from the
 * right; `Tag` at (3, 77) -> 3 from the left and 3 from the bottom. 3 is off the
 * ramp (25=1, 100=4); 4 is the nearest step, and rounding to the ramp is the
 * DS's own established move rather than a new permanent literal.
 *
 * THE REMOVE AFFORDANCE'S FILL IS AN MVP-LOCAL CORRECTION, NOT A GAP.
 * `get_variable_defs` on `1048:10888` returns `{icon/primary/on-color,
 * Scale/100, Border Radius/sm}` — an icon colour, a padding and a radius, and NO
 * background binding at all, so its fill is a raw literal in the file. It is
 * bound here to `--mapped-surface-overlay-default`, which is what the type badge
 * two corners away ALREADY binds (`1052:11038`). So this is not a substitution
 * of taste: it gives two chips on the same tile the same surface, which is
 * evidently what was meant.
 *
 * ─────────────────── ONE DRAWN VARIANT IS NOT BUILT ──────────────────────────
 *
 * Hidden node `1048:10925` draws a PDF tile — no thumbnail, an icon and a
 * truncated filename ("IKEA_Receipt_13...06.pdf"), and the screenshot shows a
 * `pdf` badge on the fifth tile. THIS SURFACE IS IMAGE-ONLY: the input declares
 * `accept="image/*"`, so a PDF cannot be staged and the variant is unreachable.
 * Building an unreachable branch would be shipping dead code whose only consumer
 * is a gate that may never come. If PDFs are wanted, widening `accept` is the
 * change and this variant arrives with it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** One image the user has chosen but not yet saved. */
interface StagedCapture {
  /** Stable across renders so the grid's keys and the remove button agree. */
  key: string
  file: File
  /** `URL.createObjectURL(file)` — revoked when the modal unmounts. */
  url: string
}

let stagedSeq = 0

export interface AddReceiptsModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called once, with every extracted capture, when Save resolves. */
  onSave: (receipts: Receipt[]) => void
}

export function AddReceiptsModal({
  isOpen,
  onClose,
  onSave,
}: AddReceiptsModalProps) {
  const [staged, setStaged] = useState<StagedCapture[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<ReceiptFileInputHandle>(null)

  /*
    REVOKED ON UNMOUNT, AND THE MODAL IS MOUNTED CONDITIONALLY BY ITS CALLER, so
    "unmount" is "the modal closed" and the blob urls do not outlive the surface
    that made them. Leaving them would leak the images for the life of the tab.

    The effect depends on nothing, so it runs its cleanup once — and reads
    `staged` through the setter rather than closing over it, which is why it does
    not need `staged` in its dependency list and therefore does not revoke a url
    the grid is still showing.
  */
  useEffect(
    () => () => {
      setStaged((current) => {
        current.forEach((c) => URL.revokeObjectURL(c.url))
        return []
      })
    },
    [],
  )

  const stage = useCallback((files: File[]) => {
    setStaged((current) => [
      ...current,
      ...files.map((file) => ({
        key: `staged-${(stagedSeq += 1)}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ])
  }, [])

  const remove = useCallback((key: string) => {
    setStaged((current) => {
      const gone = current.find((c) => c.key === key)
      if (gone) URL.revokeObjectURL(gone.url)
      return current.filter((c) => c.key !== key)
    })
  }, [])

  const pick = (source: ReceiptSource) => inputRef.current?.open(source)

  /*
    SAVE — EXTRACT EVERY STAGED CAPTURE, THEN COMMIT ONCE.

    `Promise.all` rather than a loop with an await inside it: the captures are
    independent, the surface shows one indeterminate loader for the batch, and a
    sequential loop would make a five-image save take five times as long for no
    change to what the user sees.

    THE COMMIT IS ONE CALL WITH THE WHOLE BATCH, not one per receipt. Both are
    correct against `addReceipt`, but a batch is one state update and one
    re-render of the Receipts tab rather than N of each.

    IT DOES NOT REVOKE ON SUCCESS. The saved receipts carry these very urls as
    their `sourceUrl` — revoking here would blank every thumbnail the moment it
    reached the library. The unmount cleanup above clears `staged` first, so it
    revokes nothing that was handed on.
  */
  const save = async () => {
    setIsSaving(true)
    const receipts = await Promise.all(
      staged.map((c) => captureToReceipt(c.file, c.url, null)),
    )
    setStaged([])
    setIsSaving(false)
    onSave(receipts)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add receipts"
      footer={
        <>
          {staged.length > 0 && !isSaving && (
            <Button
              variant="primary"
              label="Save"
              leadingIcon={<Icon name="upload" size="m" />}
              onClick={save}
            />
          )}
          {/*
            LOWERCASE "cancel", AS DRAWN. The screenshot of `1266:14284` prints
            it in lower case beside a capitalised "Save", and that asymmetry is
            in the file rather than a transcription slip. Left as drawn — the
            mockup is authoritative for copy.
          */}
          <Button variant="secondary" label="cancel" onClick={onClose} />
        </>
      }
    >
      <ReceiptFileInput ref={inputRef} onFiles={stage} />

      {isSaving ? (
        <CapturingBlock count={staged.length} />
      ) : staged.length === 0 ? (
        /*
          THE EMPTY PHASE. The two sources as full-width buttons in the CONTENT
          region — they are the choice this surface is asking the user to make,
          so they are the content, not chrome. Same two labels as the source
          picker, because they are the same two sources.
        */
        <div className="mvp-add-receipts__sources">
          <Button
            variant="secondary"
            label="Photo Gallery"
            onClick={() => pick('gallery')}
          />
          <Button
            variant="secondary"
            label="Camera"
            onClick={() => pick('camera')}
          />
        </div>
      ) : (
        <ul className="mvp-add-receipts__grid">
          {staged.map((capture) => (
            <li className="mvp-add-receipts__tile" key={capture.key}>
              {/*
                `alt=""`, FOR THE REASON `ReceiptCard` ALREADY GIVES: a thumbnail
                of a receipt whose own text is illegible at 98px adds nothing a
                screen reader can use, and the remove button beside it carries
                the file's name. It is decoration for a labelled control.
              */}
              <img
                className="mvp-add-receipts__thumb"
                src={capture.url}
                alt=""
              />
              <button
                type="button"
                className="mvp-add-receipts__remove"
                aria-label={`Remove ${capture.file.name}`}
                onClick={() => remove(capture.key)}
              >
                <Icon name="close" size="s" />
              </button>
              <span className="mvp-add-receipts__badge">
                {/*
                  THE DS `Tag` AT THE VARIANT FIGMA NAMES. `1052:11038` binds
                  `surface/Overlay/default` and `text/primary/on-color` at
                  `body/caption-medium` — which is `.mn-tag--overlay` at
                  `size="s"` exactly. Measured 28x18 in the file; the DS's own
                  padding decides it here.
                */}
                <Tag label={fileTypeLabel(capture.file.name)} appearance="overlay" size="s" />
              </span>
            </li>
          ))}

          {/*
            "ADD MORE" IS THE LAST CELL, NOT A SEPARATE CONTROL BELOW THE GRID.
            Figma `1050:10957` puts it at (228, 106) — the sixth cell of the
            grid — so it flows with the tiles and moves as they accumulate.
            Dashed, because it is a slot rather than a thing.
          */}
          <li className="mvp-add-receipts__tile mvp-add-receipts__tile--more">
            <button
              type="button"
              className="mvp-add-receipts__more"
              onClick={() => pick('gallery')}
            >
              <span className="mvp-add-receipts__more-icon" aria-hidden="true">
                <Icon name="add" size="m" />
              </span>
              <span className="mvp-add-receipts__more-label type-body-caption">
                Add more
              </span>
            </button>
          </li>
        </ul>
      )}
    </Modal>
  )
}
