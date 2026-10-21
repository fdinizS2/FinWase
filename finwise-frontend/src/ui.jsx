import { X } from 'lucide-react';

export function Modal({ titulo, onClose, children, largo }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (largo ? ' largo' : '')} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-h">
          <h3>{titulo}</h3>
          <button className="icon" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
export const Vazio = ({ children }) => <div className="vazio">{children}</div>;
export const Erros = ({ lista }) => (lista.length ? <ul className="erros">{lista.map((e) => <li key={e}>{e}</li>)}</ul> : null);
