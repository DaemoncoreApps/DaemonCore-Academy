import { X } from 'lucide-react'

export function ModalClose({ onClose, label = 'Close window' }) {
  return <button type="button" className="modal-close" aria-label={label} title={label} onClick={onClose}><X size={18}/></button>
}
