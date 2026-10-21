import { useState } from 'react';
import { consolidar, porCategoria, brl, mesAtual, mesLabel, dataBR, hoje } from '../lib';

const ultimosMeses = (fim, n = 6) => {
  const [y, m] = fim.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
};

export default function Dashboard({ db, user }) {
  const [mes, setMes] = useState(mesAtual());
  const [cat, setCat] = useState('');
  const filtrado = db.transacoes.filter((t) => !cat || t.categoriaId === cat);
  const doMes = filtrado.filter((t) => t.data.slice(0, 7) === mes);
  const c = consolidar(doMes);
  const gastosCat = porCategoria(doMes, db.categorias, 'GASTO');
  const maxCat = Math.max(1, ...gastosCat.map((x) => x.total));
  const serie = ultimosMeses(mes).map((m) => ({ m, ...consolidar(filtrado.filter((t) => t.data.slice(0, 7) === m)) }));
  const maxSerie = Math.max(1, ...serie.flatMap((s) => [s.totalEntradas, s.totalGastos]));
  const contas = db.transacoes.filter((t) => t.tipo === 'GASTO' && !t.pago).sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)).slice(0, 5);

  return (
    <>
      <header className="topo">
        <div>
          <h1>Olá, {user.nome.split(' ')[0]}</h1>
          <p className="mut">Resumo de {mesLabel(mes)}</p>
        </div>
        <div className="filtros">
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Mês" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {db.categorias.map((x) => <option key={x.id} value={x.id}>{x.descricao} ({x.tipo === 'GASTO' ? 'gasto' : 'receita'})</option>)}
          </select>
        </div>
      </header>

      {doMes.length === 0 ? (
        <div className="cinza">
          <strong>Sem registros</strong>
          <span>Nada registrado neste período. Adicione um gasto ou uma receita, ou envie uma mensagem pelo WhatsApp.</span>
        </div>
      ) : (
        <>
          <section className="kpis">
            <div className="kpi"><span>Saldo atual</span><b className={c.saldoAtual < 0 ? 'neg' : ''}>{brl(c.saldoAtual)}</b><small>Só o que já foi recebido e pago</small></div>
            <div className="kpi"><span>Saldo projetado</span><b className={c.saldoProjetado < 0 ? 'neg' : ''}>{brl(c.saldoProjetado)}</b><small>Inclui previstos e pendentes</small></div>
            <div className="kpi"><span>Receitas</span><b className="pos">{brl(c.totalEntradas)}</b></div>
            <div className="kpi"><span>Despesas</span><b className="neg">{brl(c.totalGastos)}</b></div>
          </section>

          <section className="grid2">
            <div className="card">
              <h3>Receitas e despesas nos últimos 6 meses</h3>
              <div className="serie">
                {serie.map((s) => (
                  <div key={s.m} className={'col' + (s.m === mes ? ' atual' : '')}>
                    <div className="barras">
                      <i className="b-in" style={{ height: (s.totalEntradas / maxSerie) * 100 + '%' }} title={'Receitas ' + brl(s.totalEntradas)} />
                      <i className="b-out" style={{ height: (s.totalGastos / maxSerie) * 100 + '%' }} title={'Despesas ' + brl(s.totalGastos)} />
                    </div>
                    <small>{mesLabel(s.m).slice(0, 3)}</small>
                  </div>
                ))}
              </div>
              <div className="legenda"><span><i className="b-in" />Receitas</span><span><i className="b-out" />Despesas</span></div>
            </div>

            <div className="card">
              <h3>Despesas por categoria</h3>
              {gastosCat.length === 0 ? <p className="mut">Sem despesas neste período.</p> : gastosCat.map((g) => (
                <div key={g.id} className="linha-cat">
                  <div><span>{g.nome}</span><b>{brl(g.total)}</b></div>
                  <div className="trilho"><i style={{ width: (g.total / maxCat) * 100 + '%' }} /></div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="card">
        <h3>Contas a pagar</h3>
        {contas.length === 0 ? <p className="mut">Nenhuma conta pendente.</p> : (
          <ul className="contas">
            {contas.map((t) => {
              const venc = t.dataVencimento < hoje();
              return <li key={t.id}><span>{t.descricao || db.categorias.find((x) => x.id === t.categoriaId)?.descricao}</span><span className={venc ? 'neg' : 'mut'}>{venc ? 'Venceu em ' : 'Vence em '}{dataBR(t.dataVencimento)}</span><b>{brl(t.valor)}</b></li>;
            })}
          </ul>
        )}
      </section>
    </>
  );
}
