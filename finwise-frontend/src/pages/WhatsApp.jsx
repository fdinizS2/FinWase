import { useState, useRef, useEffect } from 'react';
import { Send, RotateCw } from 'lucide-react';
import { processar } from '../bot';
import { uid } from '../lib';

export default function WhatsApp({ db, update, user, toast }) {
  const [numero, setNumero] = useState(user.telefone || '');
  const [txt, setTxt] = useState('');
  const fim = useRef(null);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [db.chat.length]);

  const enviar = (texto, wamid = uid()) => {
    if (!texto.trim()) return;
    // RI003: o mesmo wamid reenviado pelo WhatsApp não gera nova transação
    if (db.chat.some((m) => m.de === 'user' && m.wamid === wamid)) return toast('Mensagem repetida ignorada: nenhuma transação duplicada.', 'erro');
    update((d) => processar(d, { numero, texto: texto.trim(), wamid }, user));
    setTxt('');
  };

  return (
    <>
      <header className="topo"><div><h1>Chatbot WhatsApp</h1><p className="mut">Simulador do canal. No sistema final, as mensagens chegam ao backend por webhook e os dados aparecem aqui e no dashboard.</p></div></header>
      {!user.telefone && <div className="aviso-box">Seu perfil ainda não tem telefone. Cadastre-o em Perfil para o chatbot reconhecer você.</div>}
      <div className="zap">
        <div className="zap-top">
          <b>FinWise</b>
          <label>Seu número<input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="5511999999999" /></label>
        </div>
        <div className="zap-msgs">
          {db.chat.length === 0 && <p className="mut centro">Envie “menu” para começar.</p>}
          {db.chat.map((m) => (
            <div key={m.id} className={'bolha ' + (m.de === 'user' ? 'eu' : 'bot')}>
              {m.texto}
              <small>{new Date(m.agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                {m.de === 'user' && <button className="reenv" onClick={() => enviar(m.texto, m.wamid)} title="Simular reenvio do mesmo webhook"><RotateCw size={11} /></button>}
              </small>
            </div>
          ))}
          <div ref={fim} />
        </div>
        <div className="zap-rapido">{['menu', '1', '2', '3', '4'].map((x) => <button key={x} onClick={() => enviar(x)}>{x}</button>)}</div>
        <form className="zap-form" onSubmit={(e) => { e.preventDefault(); enviar(txt); }}>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Digite uma mensagem" aria-label="Mensagem" />
          <button className="btn" aria-label="Enviar"><Send size={16} /></button>
        </form>
      </div>
    </>
  );
}
