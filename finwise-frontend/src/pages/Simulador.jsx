import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Modal, Vazio } from '../ui';
import { uid, brl, simular } from '../lib';

const VAZIO = { aporteInicial: '0', aporteMensal: '', taxa: '', prazo: '' };

export default function Simulador({ db, update, toast }) {
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(VAZIO);
  const [res, setRes] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const calcular = (e) => {
    e.preventDefault();
    const p = { aporteInicial: Number(f.aporteInicial) || 0, aporteMensal: Number(f.aporteMensal) || 0, taxa: Number(f.taxa), prazo: parseInt(f.prazo, 10) };
    const r = simular(p);
    setRes({ ...p, ...r });
    update((d) => ({ ...d, simulacoes: [{ id: uid(), criadoEm: new Date().toISOString(), ...p, montante: r.montante }, ...d.simulacoes].slice(0, 20) }));
  };
  const fechar = () => { setAberto(false); setRes(null); setF(VAZIO); };

  return (
    <>
      <header className="topo">
        <h1>Simular investimento</h1>
        <button className="btn" onClick={() => setAberto(true)}><Calculator size={16} /> Calcular investimento</button>
      </header>

      <h2 className="sub">Simulações recentes</h2>
      {db.simulacoes.length === 0 ? <Vazio>Você ainda não fez simulações. Clique em “Calcular investimento” para começar.</Vazio> : (
        <div className="card tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Data</th><th className="dir">Aporte inicial</th><th className="dir">Aporte mensal</th><th className="dir">Taxa ao mês</th><th className="dir">Prazo</th><th className="dir">Montante projetado</th></tr></thead>
            <tbody>{db.simulacoes.map((s) => <tr key={s.id}><td>{new Date(s.criadoEm).toLocaleDateString('pt-BR')}</td><td className="dir num">{brl(s.aporteInicial)}</td><td className="dir num">{brl(s.aporteMensal)}</td><td className="dir">{String(s.taxa).replace('.', ',')}%</td><td className="dir">{s.prazo} meses</td><td className="dir num"><b>{brl(s.montante)}</b></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {aberto && !res && (
        <Modal titulo="Dados do investimento" onClose={fechar}>
          <form className="form" onSubmit={calcular}>
            <div className="duas">
              <label>Aporte inicial (R$)<input type="number" min="0" step="0.01" value={f.aporteInicial} onChange={(e) => set('aporteInicial', e.target.value)} /></label>
              <label>Aporte mensal (R$)<input type="number" min="0" step="0.01" value={f.aporteMensal} onChange={(e) => set('aporteMensal', e.target.value)} required /></label>
            </div>
            <div className="duas">
              <label>Rentabilidade (% ao mês)<input type="number" min="0" step="0.0001" value={f.taxa} onChange={(e) => set('taxa', e.target.value)} required /></label>
              <label>Tempo (meses)<input type="number" min="1" step="1" value={f.prazo} onChange={(e) => set('prazo', e.target.value)} required /></label>
            </div>
            <div className="acoes"><button type="button" className="btn sec" onClick={fechar}>Cancelar</button><button className="btn">Calcular</button></div>
          </form>
        </Modal>
      )}

      {aberto && res && (
        <Modal titulo="Resultado da simulação" onClose={fechar}>
          <div className="resultado">
            <span>Montante projetado em {res.prazo} meses</span>
            <b>{brl(res.montante)}</b>
          </div>
          <dl className="det">
            <div><dt>Total investido</dt><dd>{brl(res.investido)}</dd></div>
            <div><dt>Juros acumulados</dt><dd className="pos">{brl(res.juros)}</dd></div>
            <div><dt>Taxa</dt><dd>{String(res.taxa).replace('.', ',')}% ao mês</dd></div>
          </dl>
          <p className="aviso">Estimativa com juros compostos e aportes no fim de cada mês, sem impostos nem inflação.</p>
          <div className="acoes"><button className="btn sec" onClick={() => setRes(null)}>Nova simulação</button><button className="btn" onClick={() => { fechar(); toast('Simulação salva no histórico.'); }}>Fechar</button></div>
        </Modal>
      )}
    </>
  );
}
