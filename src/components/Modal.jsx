import { useEffect } from 'react';

// Render it conditionally ({open && <Modal ...>}) so its inner form state resets every time it opens.
export default function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal-box' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
