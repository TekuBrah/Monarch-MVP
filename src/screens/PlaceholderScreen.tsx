/**
 * Frame-only placeholder. Phase 4.7 is the shell; real screens are Phase 5.
 * Typography comes from the DS's .type-* composite classes — no local type
 * styling, per CLAUDE.md rule 2.
 */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <section>
      <h1 className="type-header-h4 mvp-screen__title">{title}</h1>
      <p className="type-body-m mvp-screen__body">
        Shell placeholder — screens are built in Phase 5.
      </p>
    </section>
  )
}
