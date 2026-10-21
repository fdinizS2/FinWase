import { useState } from 'react';
import { FileText, Download, Share2, Eye } from 'lucide-react';
import { Modal, Vazio } from '../ui';
import { uid, consolidar, brl, dataBR, mesAtual, mesLabel } from '../lib';

const periodo = (r) => (r.de === r.ate ? mesLabel(r.de) : `${mesLabel(r.de)} a ${mesLabel(r.ate)}`);

function exportarCsv(r) {
  const linhas = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Situação'], ...r.itens.map((i) => [dataBR(i.data), i.tipo === 'GASTO' ? 'Despesa' : 'Receita', i.categoria, i.descricao, i.valor.toFixed(2).replace('.', ','), i.situacao])];
  const csv = '\ufeff' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `finwise-relatorio-${r.de}_${r.ate}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Relatorios({ db, update, toast }) {
  const [gerando, setGerando] = useState(false);
  const [de, setDe] = useState(mesAtual());
  const [ate, setAte] = useState(mesAtual());
  const [ver, setVer] = useState(null);
  const [filtro, setFiltro] = useState('');
  const nome = (id) => db.categorias.find((c) => c.id === id)?.descricao || '—';

  const gerar = (e) => {
    e.preventDefault();
    if (de > ate) return toast('O mês inicial deve ser anterior ao final.', 'erro');
    const txs = db.transacoes.filter((t) => { const m = t.data.slice(0, 7); return m >= de && m <= ate; }).sort((a, b) => a.data.localeCompare(b.data));
    const r = {
      id: uid(), criadoEm: new Date().toISOString(), de, ate, ...consolidar(txs),
      itens: txs.map((t) => ({ data: t.data, tipo: t.tipo, categoria: nome(t.categoriaId), descricao: t.descricao || '', valor: t.valor, situacao: t.tipo === 'ENTRADA' ? (t.recebido ? 'Recebida' : 'Prevista') : (t.pago ? 'Paga' : 'Pendente') })),
    };
    update((d) => ({ ...d, relatorios: [r, ...d.relatorios] }));
    setGerando(false);
    toast('Relatório gerado com sucesso.');
  };

  const compartilhar = (r) => {
    const texto = `FinWise — ${periodo(r)}\nReceitas: ${brl(r.totalEntradas)}\nDespesas: ${brl(r.totalGastos)}\nSaldo atual: ${brl(r.saldoAtual)}\nSaldo projetado: ${brl(r.saldoProjetado)}`;
    if (navigator.share) navigator.share({ title: 'Relatório FinWise', text: texto }).catch(() => {});
    else navigator.clipboard?.writeText(texto).then(() => toast('Resumo copiado. Cole onde quiser compartilhar.'));
  };

  const lista = db.relatorios.filter((r) => !filtro || (r.de <= filtro && filtro <= r.ate));

  return (
    <>
      <header className="topo">
        <h1>Meus relatórios</h1>
        <button className="btn" onClick={() => setGerando(true)}><FileText size={16} /> Gerar relatório</button>
      </header>

      {db.relatorios.length === 0 ? <Vazio>Não há relatórios registrados ainda.</Vazio> : (
        <>
          <div className="filtros">
            <label className="inline">Período que inclui <input type="month" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></label>
            {filtro && <button className="btn sec" onClick={() => setFiltro('')}>Limpar filtro</button>}
          </div>
          <div className="lista-rel">
            {lista.map((r) => (
              <article key={r.id} className="card rel">
                <div>
                  <h3>{periodo(r)}</h3>
                  <p className="mut">Gerado em {new Date(r.criadoEm).toLocaleString('pt-BR')} · {r.itens.length} movimentações</p>
                  <p className="resumo-rel"><span className="pos">{brl(r.totalEntradas)}</span> de receitas · <span className="neg">{brl(r.totalGastos)}</span> de despesas</p>
                </div>
                <div className="acoes">
                  <button className="btn sec" onClick={() => setVer(r)}><Eye size={15} /> Consultar</button>
                  <button className="btn sec" onClick={() => exportarCsv(r)}><Download size={15} /> Exportar</button>
                  <button className="btn sec" onClick={() => compartilhar(r)}><Share2 size={15} /> Compartilhar</button>
                </div>
              </article>
            ))}
            {lista.length === 0 && <p className="mut">Nenhum relatório inclui esse mês.</p>}
          </div>
        </>
      )}

      {gerando && (
        <Modal titulo="Gerar relatório" onClose={() => setGerando(false)}>
          <form className="form" onSubmit={gerar}>
            <div className="duas">
              <label>De<input type="month" value={de} onChange={(e) => setDe(e.target.value)} required /></label>
              <label>Até<input type="month" value={ate} onChange={(e) => setAte(e.target.value)} required /></label>
            </div>
            <div className="acoes"><button type="button" className="btn sec" onClick={() => setGerando(false)}>Cancelar</button><button className="btn">Gerar</button></div>
          </form>
        </Modal>
      )}

      {ver && (
        <Modal titulo={'Relatório · ' + periodo(ver)} onClose={() => setVer(null)} largo>
          <div className="kpis mini">
            <div className="kpi"><span>Saldo atual</span><b>{brl(ver.saldoAtual)}</b></div>
            <div className="kpi"><span>Saldo projetado</span><b>{brl(ver.saldoProjetado)}</b></div>
            <div className="kpi"><span>Receitas</span><b className="pos">{brl(ver.totalEntradas)}</b></div>
            <div className="kpi"><span>Despesas</span><b className="neg">{brl(ver.totalGastos)}</b></div>
          </div>
          <div className="tabela-wrap rolagem">
            <table className="tabela">
              <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th className="dir">Valor</th><th>Situação</th></tr></thead>
              <tbody>{ver.itens.map((i, k) => <tr key={k}><td>{dataBR(i.data)}</td><td>{i.categoria}</td><td>{i.descricao || '—'}</td><td className={'dir num ' + (i.tipo === 'GASTO' ? 'neg' : 'pos')}>{i.tipo === 'GASTO' ? '−' : '+'}{brl(i.valor)}</td><td>{i.situacao}</td></tr>)}</tbody>
            </table>
            {ver.itens.length === 0 && <p className="mut pad">Nenhuma movimentação neste período.</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
