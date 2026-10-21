import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { consolidar, porCategoria, brl, hoje } from '../lib';

export const PERFIS = {
  conservador: { nome: 'Conservador', desc: 'Prioriza segurança e liquidez, aceita rendimento menor.' },
  moderado: { nome: 'Moderado', desc: 'Equilibra segurança e crescimento.' },
  agressivo: { nome: 'Agressivo', desc: 'Aceita oscilações em busca de maior retorno no longo prazo.' },
};
const SPLIT = {
  conservador: [['Renda fixa com liquidez (Tesouro Selic, CDB)', 70], ['Renda fixa de prazo maior (Tesouro IPCA+, LCI/LCA)', 25], ['Renda variável (FIIs, ações, ETFs)', 5]],
  moderado: [['Renda fixa com liquidez (Tesouro Selic, CDB)', 50], ['Renda fixa de prazo maior (Tesouro IPCA+, LCI/LCA)', 30], ['Renda variável (FIIs, ações, ETFs)', 20]],
  agressivo: [['Renda fixa com liquidez (Tesouro Selic, CDB)', 25], ['Renda fixa de prazo maior (Tesouro IPCA+, LCI/LCA)', 25], ['Renda variável (FIIs, ações, ETFs)', 50]],
};
const PLANO_INICIAL = { conservador: [55, 15, 30], moderado: [50, 20, 30], agressivo: [50, 15, 35] };

// "Motor de decisão" do UC001: regras simples sobre os últimos 3 meses.
function gerar(db, user) {
  const perfil = db.perfil;
  const d0 = new Date();
  const meses = [0, 1, 2].map((i) => { const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const txs = db.transacoes.filter((t) => meses.includes(t.data.slice(0, 7)));
  const itens = [];

  if (!txs.length) { // exceção do UC001: sem registros => plano inicial pelo perfil
    const [es, la, inv] = PLANO_INICIAL[perfil];
    const renda = user.salario || 0;
    itens.push({ nivel: 'dica', titulo: 'Plano inicial para o perfil ' + PERFIS[perfil].nome.toLowerCase(), texto: `Você ainda não tem registros. Um ponto de partida: ${es}% para despesas essenciais, ${la}% para lazer e ${inv}% para poupar e investir${renda ? ` (com sua renda de ${brl(renda)}, são ${brl((renda * inv) / 100)} por mês)` : ''}.` });
    itens.push({ nivel: 'dica', titulo: 'Comece a registrar', texto: 'Registre gastos e receitas por aqui ou pelo WhatsApp. Com alguns dias de dados, as sugestões passam a usar a sua realidade.' });
    return { itens, alocacao: null };
  }

  const ativos = meses.filter((m) => txs.some((t) => t.data.slice(0, 7) === m)).length || 1;
  const c = consolidar(txs);
  const renda = c.totalEntradas / ativos || user.salario || 0;
  const gasto = c.totalGastos / ativos;
  const sobra = renda - gasto;
  const taxa = renda > 0 ? sobra / renda : 0;

  if (renda > 0) {
    if (taxa < 0) itens.push({ nivel: 'alerta', titulo: 'Você gasta mais do que recebe', texto: `Em média, suas despesas (${brl(gasto)}) passam das receitas (${brl(renda)}) em ${brl(-sobra)} por mês. Comece cortando as maiores categorias.` });
    else if (taxa < 0.1) itens.push({ nivel: 'alerta', titulo: 'Taxa de poupança baixa', texto: `Você poupa ${(taxa * 100).toFixed(0)}% da renda. Uma meta comum é chegar a pelo menos 10% a 20%.` });
    else itens.push({ nivel: 'ok', titulo: 'Boa taxa de poupança', texto: `Você poupa cerca de ${(taxa * 100).toFixed(0)}% da renda (${brl(sobra)} por mês). Continue assim.` });
  }
  const top = porCategoria(txs, db.categorias, 'GASTO')[0];
  if (top && c.totalGastos > 0 && top.total / c.totalGastos > 0.4)
    itens.push({ nivel: 'alerta', titulo: `${top.nome} pesa no orçamento`, texto: `Essa categoria concentra ${((top.total / c.totalGastos) * 100).toFixed(0)}% das suas despesas. Vale revisar esses gastos.` });
  const vencidas = db.transacoes.filter((t) => t.tipo === 'GASTO' && !t.pago && t.dataVencimento < hoje());
  if (vencidas.length) itens.push({ nivel: 'alerta', titulo: `${vencidas.length} conta(s) vencida(s)`, texto: `Total de ${brl(vencidas.reduce((s, t) => s + t.valor, 0))} em atraso. Pague logo para evitar juros e multa.` });

  let alocacao = null;
  if (sobra > 0) {
    const meta = gasto * 6;
    itens.push({ nivel: 'dica', titulo: 'Reserva de emergência', texto: `Uma reserva de 6 meses de despesas seria ${brl(meta)}. Guardando ${brl(sobra)} por mês, você chega lá em cerca de ${Math.ceil(meta / sobra)} meses.` });
    const valor = sobra * 0.8;
    alocacao = { valor, linhas: SPLIT[perfil].map(([n, p]) => [n, p, (valor * p) / 100]) };
  }
  return { itens, alocacao };
}

export default function Sugestoes({ db, update, user }) {
  const [res, setRes] = useState(null);
  return (
    <>
      <header className="topo"><h1>Sugestões financeiras</h1></header>
      <section className="card">
        <h3>Seu perfil de investidor</h3>
        <div className="perfis">
          {Object.entries(PERFIS).map(([k, p]) => (
            <label key={k} className={'perfil' + (db.perfil === k ? ' sel' : '')}>
              <input type="radio" name="perfil" checked={db.perfil === k} onChange={() => { update((d) => ({ ...d, perfil: k })); setRes(null); }} />
              <b>{p.nome}</b><span>{p.desc}</span>
            </label>
          ))}
        </div>
        <button className="btn" onClick={() => setRes(gerar(db, user))}><Lightbulb size={16} /> Consultar sugestões</button>
      </section>

      {res && (
        <>
          <section className="sug">
            {res.itens.map((s) => <article key={s.titulo} className={'card sug-' + s.nivel}><h3>{s.titulo}</h3><p>{s.texto}</p></article>)}
          </section>
          {res.alocacao && (
            <section className="card">
              <h3>Onde aplicar {brl(res.alocacao.valor)} por mês (perfil {PERFIS[db.perfil].nome.toLowerCase()})</h3>
              {res.alocacao.linhas.map(([n, p, v]) => (
                <div key={n} className="linha-cat"><div><span>{n}</span><b>{p}% · {brl(v)}</b></div><div className="trilho"><i style={{ width: p + '%' }} /></div></div>
              ))}
            </section>
          )}
          <p className="aviso">As sugestões são automáticas, baseadas nos seus registros, e não substituem a orientação de um profissional certificado.</p>
        </>
      )}
    </>
  );
}
