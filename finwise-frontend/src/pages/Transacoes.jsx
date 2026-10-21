import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Modal, Vazio, Erros } from '../ui';
import { uid, hoje, brl, dataBR, validar } from '../lib';

const ROT = {
  GASTO: { titulo: 'Meus gastos', novo: 'Registrar gasto', vazio: 'Não há registros ainda. Registre seus gastos para consultá-los.', ok: ['Pago', 'Pendente'] },
  ENTRADA: { titulo: 'Minhas receitas', novo: 'Registrar receita', vazio: 'Não há registros ainda. Registre suas receitas para consultá-las.', ok: ['Recebida', 'Prevista'] },
};

function Form({ tipo, db, inicial, onSave, onClose }) {
  const [f, setF] = useState(inicial || { tipo, valor: '', data: hoje(), categoriaId: '', descricao: '', recebido: true, dataVencimento: hoje(), pago: false });
  const [nova, setNova] = useState('');
  const [erros, setErros] = useState([]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const cats = db.categorias.filter((c) => c.tipo === tipo);
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, valor: Number(f.valor) }, nova.trim(), setErros); }}>
      <div className="duas">
        <label>Valor (R$)<input type="number" step="0.01" min="0.01" value={f.valor} onChange={(e) => set('valor', e.target.value)} autoFocus required /></label>
        <label>Data<input type="date" value={f.data} onChange={(e) => set('data', e.target.value)} required /></label>
      </div>
      <label>Categoria
        <select value={f.categoriaId} onChange={(e) => set('categoriaId', e.target.value)} disabled={!!nova}>
          <option value="">Selecione…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
        </select>
      </label>
      <label>Ou crie uma nova categoria<input value={nova} onChange={(e) => setNova(e.target.value)} maxLength={80} placeholder="Ex.: Pets" /></label>
      <label>Descrição<input value={f.descricao} onChange={(e) => set('descricao', e.target.value)} maxLength={255} /></label>
      {tipo === 'ENTRADA' ? (
        <label className="chk"><input type="checkbox" checked={f.recebido} onChange={(e) => set('recebido', e.target.checked)} /> Já recebi este valor</label>
      ) : (
        <div className="duas">
          <label>Vencimento<input type="date" value={f.dataVencimento} onChange={(e) => set('dataVencimento', e.target.value)} required /></label>
          <label className="chk"><input type="checkbox" checked={f.pago} onChange={(e) => set('pago', e.target.checked)} /> Já paguei</label>
        </div>
      )}
      <Erros lista={erros} />
      <div className="acoes"><button type="button" className="btn sec" onClick={onClose}>Cancelar</button><button className="btn">Salvar</button></div>
    </form>
  );
}

export default function Transacoes({ tipo, db, update, toast }) {
  const R = ROT[tipo];
  const [modal, setModal] = useState(null);
  const [mes, setMes] = useState('');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const campo = tipo === 'GASTO' ? 'pago' : 'recebido';
  const nomeCat = (id) => db.categorias.find((c) => c.id === id)?.descricao || '—';
  const todas = db.transacoes.filter((t) => t.tipo === tipo);
  const lista = todas
    .filter((t) => (!mes || t.data.slice(0, 7) === mes) && (!cat || t.categoriaId === cat) && (!q || (t.descricao || '').toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.data.localeCompare(a.data));

  const salvar = (f, nova, setErros) => {
    let categorias = db.categorias, categoriaId = f.categoriaId;
    if (nova) {
      const ex = categorias.find((c) => c.tipo === tipo && c.descricao.toLowerCase() === nova.toLowerCase());
      if (ex) categoriaId = ex.id;
      else { const c = { id: uid(), descricao: nova, tipo }; categorias = [...categorias, c]; categoriaId = c.id; }
    }
    const t = { ...f, categoriaId, tipo };
    if (tipo === 'ENTRADA') { delete t.dataVencimento; delete t.pago; } else delete t.recebido;
    const erros = validar(t, categorias);
    if (erros.length) return setErros(erros);
    update((d) => ({ ...d, categorias, transacoes: f.id ? d.transacoes.map((x) => (x.id === f.id ? { ...x, ...t } : x)) : [...d.transacoes, { ...t, id: uid(), origem: 'web', criadoEm: new Date().toISOString() }] }));
    toast(f.id ? 'Registro atualizado com sucesso.' : 'Registro salvo com sucesso.');
    setModal(null);
  };
  const excluir = (t) => {
    if (!window.confirm('Excluir este registro?')) return;
    update((d) => ({ ...d, transacoes: d.transacoes.filter((x) => x.id !== t.id) }));
    toast('Registro excluído.');
  };
  const alternar = (t) => update((d) => ({ ...d, transacoes: d.transacoes.map((x) => (x.id === t.id ? { ...x, [campo]: !x[campo] } : x)) }));

  return (
    <>
      <header className="topo">
        <h1>{R.titulo}</h1>
        <button className="btn" onClick={() => setModal({})}><Plus size={16} /> {R.novo}</button>
      </header>

      {todas.length === 0 ? <Vazio>{R.vazio}</Vazio> : (
        <>
          <div className="filtros">
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {db.categorias.filter((c) => c.tipo === tipo).map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
            </select>
            <input type="search" placeholder="Buscar descrição" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="card tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th>{tipo === 'GASTO' && <th>Vencimento</th>}<th className="dir">Valor</th><th>Situação</th><th /></tr></thead>
              <tbody>
                {lista.map((t) => {
                  const ok = t[campo];
                  const vencido = tipo === 'GASTO' && !ok && t.dataVencimento < hoje();
                  return (
                    <tr key={t.id}>
                      <td>{dataBR(t.data)}</td>
                      <td>{t.descricao || '—'}{t.origem === 'whatsapp' && <span className="tag">WhatsApp</span>}</td>
                      <td>{nomeCat(t.categoriaId)}</td>
                      {tipo === 'GASTO' && <td>{dataBR(t.dataVencimento)}</td>}
                      <td className="dir num">{brl(t.valor)}</td>
                      <td><button className={'badge ' + (ok ? 'ok' : vencido ? 'venc' : 'pend')} onClick={() => alternar(t)} title="Clique para alterar">{ok ? R.ok[0] : vencido ? 'Vencido' : R.ok[1]}</button></td>
                      <td className="dir nowrap">
                        <button className="icon" onClick={() => setModal(t)} aria-label="Editar"><Pencil size={16} /></button>
                        <button className="icon" onClick={() => excluir(t)} aria-label="Excluir"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lista.length === 0 && <p className="mut pad">Nenhum registro com esses filtros.</p>}
          </div>
        </>
      )}

      {modal && (
        <Modal titulo={modal.id ? 'Editar registro' : R.novo} onClose={() => setModal(null)}>
          <Form tipo={tipo} db={db} inicial={modal.id ? modal : null} onSave={salvar} onClose={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
