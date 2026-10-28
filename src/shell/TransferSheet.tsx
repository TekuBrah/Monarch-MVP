import { CardAction, Icon, Sheet } from '@monarch/design-system'
import './TransferSheet.css'

/** Gate 92 — Figma `1266:14390`. Opened by the bar's Transfer item (Teku's 18A). */
export function TransferSheet({
  isOpen,
  onClose,
  onReceive,
  onSend,
}: {
  isOpen: boolean
  onClose: () => void
  onReceive: () => void
  onSend: () => void
}) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Transfer">
      <div className="mvp-transfer-sheet">
        <CardAction
          icon={<Icon name="icon_receive" size="l" />}
          title="Receive"
          description="Quickly add money to your account from any source."
          onClick={onReceive}
        />
        <CardAction
          icon={<Icon name="send" size="l" />}
          title="Send"
          description="Transfer money or crypto to others quickly and securely."
          onClick={onSend}
        />
      </div>
    </Sheet>
  )
}
