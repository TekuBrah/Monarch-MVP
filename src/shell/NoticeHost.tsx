import { ToastMobile } from '@monarch/design-system'
import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { NOTICES, currentNotice, dismissNotice, subscribeNotices } from './notices'
import './NoticeHost.css'

/**
 * The one slot for app-level notices (Gate 87) — see `notices.ts` for what is
 * raised, when, and why. Mounted once, by `AppShell`.
 *
 * ── IT NEVER OVERLAPS A SCREEN'S OWN TOAST (RESUME ruling) ──
 *
 * Screens show their own `ToastMobile` ("Goal deleted.", "Receipt deleted." …)
 * in `.mvp-finance-detail__toast`, at the same base position this slot uses.
 * The likeliest collision is the worst one — a "deleted" toast over "changes
 * aren't being saved" when that same write failed — so the two are STACKED:
 * when a screen toast is present, this notice sits one `--spacing-200` above its
 * top edge. The screen toast keeps its designed position; the storage notice,
 * the more important of the two, is the one above. Measured rather than
 * computed from a height, because the toast's height is the DS's business; a
 * MutationObserver and a resize listener keep it current while a notice shows.
 * UNDESIGNED WORK.
 */
export function NoticeHost({ aboveChrome }: { aboveChrome: boolean }) {
  const kind = useSyncExternalStore(subscribeNotices, currentNotice)
  const [lift, setLift] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (kind === null) return
    const measure = () => {
      const toast = document.querySelector('.mvp-finance-detail__toast')
      if (toast === null) {
        setLift(null)
        return
      }
      const gap = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--spacing-200'),
      )
      setLift(document.documentElement.clientHeight - toast.getBoundingClientRect().top + gap)
    }
    measure()
    const observer = new MutationObserver(measure)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [kind])

  if (kind === null) return null
  const notice = NOTICES[kind]

  return (
    <div
      className={`mvp-notice${aboveChrome ? ' mvp-notice--above-chrome' : ''}`}
      style={lift === null ? undefined : { bottom: `${lift}px` }}
    >
      <ToastMobile
        appearance={notice.appearance}
        title={notice.title}
        role={notice.role}
        onDismiss={dismissNotice}
      >
        {notice.body}
      </ToastMobile>
    </div>
  )
}
