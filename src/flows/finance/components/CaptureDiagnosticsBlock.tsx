import { useState } from 'react'
import { Button } from '@monarch/design-system'
import { SectionHeader } from '../../../components/SectionHeader'
import {
  diagnosticFor,
  diagnosticJson,
  type CaptureDiagnostic,
  type Dimensions,
  type PassDiagnostic,
} from '../../../data/captureDiagnostics'
import { formatMyrOrUnread } from '../../../data/format'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE "Capture diagnostics" DISCLOSURE (Gate 59). RENDERED ONLY UNDER `?diag=1`.
 *
 * `ReceiptViewer` mounts this behind the constant `CAPTURE_DIAGNOSTICS`, so with
 * the flag absent it is never rendered and no walk state can reach it — which
 * is why no baseline can move.
 *
 * COMPOSED, NOT A PRIMITIVE. The DS ships no disclosure or accordion, so the
 * collapse is the app's own heading-with-a-trailing-link pattern — the same
 * `SectionHeader` "Receipt details" uses for Edit — toggling a boolean, and the
 * rows are the details block's own `<dl>` rows and classes. It is a developer
 * instrument behind a query flag, not a designed surface; nothing here was drawn.
 *
 * WHAT IS COPIED IS NOT EVERYTHING THAT IS SHOWN. The raw engine text is on
 * screen, per pass, because reading it is how a divergence is explained; the
 * copied JSON omits it (`diagnosticJson`), because a clipboard is one paste from
 * a note or a chat and the text can carry whatever the paper printed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mvp-receipt-details__row">
      <dt className="mvp-receipt-details__row-label type-body-sm">{label}</dt>
      <dd className="mvp-receipt-details__row-value type-body-sm-medium">{value}</dd>
    </div>
  )
}

const size = (d: Dimensions | null | undefined) => (d ? `${d.width} × ${d.height}` : '—')
const count = (n: number | null | undefined, unit = '') =>
  n === null || n === undefined ? '—' : `${n.toLocaleString('en-GB')}${unit}`
const yesNo = (b: boolean) => (b ? 'yes' : 'no')
const normalisedSize = (pass: PassDiagnostic): Dimensions | null =>
  pass.normalised && pass.normalised.width !== null && pass.normalised.height !== null
    ? { width: pass.normalised.width, height: pass.normalised.height }
    : null

function Rows({ diagnostic }: { diagnostic: CaptureDiagnostic }) {
  const { source, received, passes, secondPass, result } = diagnostic
  return (
    <>
      <dl className="mvp-receipt-details__rows" aria-label="Source file">
        <Row label="Source name" value={source.name} />
        <Row label="Source type" value={source.type || '(none)'} />
        <Row label="Source bytes" value={count(source.bytes, ' B')} />
        <Row label="Source SHA-256" value={source.sha256 ? `${source.sha256.slice(0, 16)}…` : '—'} />
        <Row label="PDF, first page drawn" value={yesNo(diagnostic.pdf)} />
        <Row label="Stored size" value={size(received?.stored)} />
        <Row label="Decoded size" value={size(received?.decoded)} />
        <Row label="EXIF orientation" value={received?.exifOrientation?.toString() ?? 'none'} />
      </dl>

      {passes.map((pass, i) => (
        <section key={i} className="mvp-capture-diag__group">
          <p className="mvp-capture-diag__pass type-body-sm-medium">{`Pass ${i + 1} · ${pass.preparation}`}</p>
          <dl className="mvp-receipt-details__rows" aria-label={`Pass ${i + 1}, ${pass.preparation}`}>
            <Row label="Normalised size" value={size(normalisedSize(pass))} />
            <Row label="Normalised bytes" value={count(pass.normalised?.bytes, ' B')} />
            <Row label="Passed through" value={pass.normalised ? yesNo(pass.normalised.passedThrough) : '—'} />
            <Row
              label="Pixel hash"
              value={pass.normalised?.pixelHash ? `${pass.normalised.pixelHash.slice(0, 16)}…` : '—'}
            />
            <Row label="Normalise ms" value={count(pass.normaliseMs)} />
            <Row label="Engine ms" value={count(pass.engineMs)} />
            <Row label="Raw text chars" value={count(pass.rawTextLength)} />
            <Row label="Engine lines" value={count(pass.lineCount)} />
            <Row label="Engine confidence" value={count(pass.engineConfidence)} />
            {pass.error && <Row label="Error" value={pass.error} />}
          </dl>
        </section>
      ))}

      <dl className="mvp-receipt-details__rows" aria-label="Second pass">
        <Row label="Second pass ran" value={yesNo(secondPass.ran)} />
        <Row label="Trigger" value={secondPass.trigger ?? '—'} />
        <Row label="Kept" value={secondPass.kept ?? '—'} />
        <Row label="Why" value={secondPass.why ?? '—'} />
      </dl>

      <dl className="mvp-receipt-details__rows" aria-label="Parsed result">
        <Row label="Items" value={count(result?.items)} />
        <Row label="Total" value={formatMyrOrUnread(result?.total ?? null)} />
        <Row label="Subtotal" value={formatMyrOrUnread(result?.subtotal ?? null)} />
        <Row label="Tax" value={formatMyrOrUnread(result?.tax ?? null)} />
        <Row label="Capture ms" value={count(diagnostic.totalMs)} />
        {diagnostic.error && <Row label="Error" value={diagnostic.error} />}
      </dl>

      {passes.map((pass, i) =>
        pass.rawText === null ? null : (
          <section key={`text-${i}`} className="mvp-capture-diag__text-block">
            <p className="mvp-capture-diag__pass type-body-sm-medium">{`Raw engine text · pass ${i + 1}`}</p>
            <pre className="mvp-capture-diag__text type-body-caption">{pass.rawText}</pre>
          </section>
        ),
      )}
    </>
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

export function CaptureDiagnosticsBlock({ receiptId }: { receiptId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copy, setCopy] = useState<CopyState>('idle')
  const diagnostic = diagnosticFor(receiptId)

  if (!diagnostic) {
    return (
      <section className="mvp-receipt-details mvp-capture-diag">
        <SectionHeader label="Capture diagnostics" />
        <p className="mvp-capture-diag__none type-body-caption">
          Not read in this session, so there is nothing to show.
        </p>
      </section>
    )
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticJson(diagnostic))
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <section className="mvp-receipt-details mvp-capture-diag">
      <SectionHeader
        label="Capture diagnostics"
        linkLabel={isOpen ? 'Hide' : 'Show'}
        onLinkClick={() => setIsOpen((open) => !open)}
      />
      {isOpen && (
        <div className="mvp-capture-diag__body">
          <div className="mvp-capture-diag__actions">
            <Button
              variant="secondary"
              size="s"
              label={copy === 'copied' ? 'Copied' : copy === 'failed' ? 'Copy failed' : 'Copy as JSON'}
              onClick={copyJson}
            />
          </div>
          <Rows diagnostic={diagnostic} />
        </div>
      )}
    </section>
  )
}
