import { Button, Icon } from '@monarch/design-system'

// Step 4.3 — linkage proof. One design-system Button, imported from the bare
// specifier, styled entirely by the DS's token layer. No local styling.
//
// The leading Icon is here to prove vite-plugin-svgr transforms the DS's
// `?react` SVG imports: without svgr the default export is a URL string and
// this fails at render as "Element type is invalid", not at build time.
export default function App() {
  return (
    <main>
      <Button
        variant="primary"
        size="m"
        label="Monarch Button"
        leadingIcon={<Icon name="add" size="s" />}
      />
    </main>
  )
}
