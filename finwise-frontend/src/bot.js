// Chatbot do WhatsApp (simulado no navegador). O backend real receberá a mensagem por Webhook
// e aplicará as mesmas regras: RN006, RN007, RI003 e RI007.
import { uid, hoje, mesAtual, consolidar, brl, dataBR } from './lib';

const MENU = 'Olá! Sou o assistente do FinWise.\nDigite 1 para Nova Despesa\nDigite 2 para Nova Receita\nDigite 3 para Consultar Saldo\nDigite 4 para Últimas movimentações\n\nOu escreva direto, ex.: "gastei 45,90 no mercado" ou "recebi 3000 de salário".';
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const so = (s) => (s || '').replace(/\D/g, '');

const KW = {
  alimentacao: ['mercado', 'restaurante', 'lanche', 'pizza', 'ifood', 'padaria', 'almoco', 'jantar', 'comida', 'supermercado'],
  transporte: ['uber', 'onibus', 'gasolina', 'metro', 'combustivel', 'estacionamento', 'pedagio'],
  moradia: ['aluguel', 'luz', 'agua', 'condominio', 'internet', 'energia'],
  lazer: ['cinema', 'netflix', 'bar', 'show', 'viagem', 'jogo', 'spotify'],
  saude: ['farmacia', 'remedio', 'consulta', 'dentista', 'medico', 'exame', 'academia'],
  salario: ['salario', 'pagamento', 'holerite'],
  rendimentos: ['rendimento', 'dividendo', 'dividendos', 'juros', 'fii', 'cdb'],
};

function paraNumero(s) {
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d+\.\d{1,2}$/.test(s)) return parseFloat(s);
  return parseFloat(s.replace(/\./g, ''));
}
function parseValor(t) {
  const m = t.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  const v = m ? paraNumero(m[1]) : null;
  return v > 0 ? v : null;
}
function detectarTipo(t) {
  if (/(recebi|ganhei|receita|entrada|salario|rendimento|dividendo)/.test(t)) return 'ENTRADA';
  if (/(gastei|paguei|comprei|despesa|gasto|conta de)/.test(t)) return 'GASTO';
  return null;
}
function achaCategoria(db, t, tipo) {
  const cats = db.categorias.filter((c) => c.tipo === tipo);
  for (const c of cats) { const n = norm(c.descricao); if (t.includes(n) || (KW[n] || []).some((k) => t.includes(k))) return c; }
  return null;
}

export function processar(db, { numero, texto, wamid }, user) {
  const agora = new Date().toISOString();
  const msg = { id: uid(), de: 'user', texto, wamid, numero, agora, processada: true };
  const bot = (d, ...ts) => ({ ...d, chat: [...d.chat, ...ts.map((texto) => ({ id: uid(), de: 'bot', texto, agora }))] });

  // RN006 / RI007: só registra se o número pertencer a um usuário cadastrado
  if (!so(numero) || so(numero) !== so(user.telefone)) {
    return bot({ ...db, chat: [...db.chat, { ...msg, processada: false }] }, 'Não consegui identificar seu cadastro por este número, então não registrei nada. Cadastre este telefone no FinWise e tente de novo.');
  }
  const d = { ...db, chat: [...db.chat, msg] };
  const t = norm(texto);
  const est = d.estado;
  const mes = () => consolidar(d.transacoes.filter((x) => x.data.slice(0, 7) === mesAtual()));

  if (['menu', 'oi', 'ola', 'inicio', '0', 'cancelar'].includes(t)) return bot({ ...d, estado: null }, MENU);

  if (!est && t === '1') return bot({ ...d, estado: { passo: 'dados', tipo: 'GASTO' } }, 'Nova despesa. Envie o valor e a descrição. Ex.: 45,90 mercado');
  if (!est && t === '2') return bot({ ...d, estado: { passo: 'dados', tipo: 'ENTRADA' } }, 'Nova receita. Envie o valor e a descrição. Ex.: 3000 salário');
  if (!est && t === '3') { const c = mes(); return bot(d, `Saldo atual do mês: ${brl(c.saldoAtual)}\nSaldo projetado: ${brl(c.saldoProjetado)}\nReceitas: ${brl(c.totalEntradas)} | Despesas: ${brl(c.totalGastos)}`); }
  if (!est && t === '4') {
    const ult = [...d.transacoes].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 5);
    if (!ult.length) return bot(d, 'Não há registros ainda. Envie, por exemplo: "gastei 20 no lanche".');
    return bot(d, ult.map((x) => `${dataBR(x.data)} ${x.tipo === 'GASTO' ? '−' : '+'}${brl(x.valor)} ${x.descricao || ''}`).join('\n'));
  }

  const registrar = (base, cat) => {
    const tx = { id: uid(), tipo: base.tipo, categoriaId: cat.id, valor: base.valor, data: hoje(), descricao: base.descricao, origem: 'whatsapp', interacaoId: msg.id, criadoEm: agora,
      ...(base.tipo === 'ENTRADA' ? { recebido: true } : { dataVencimento: hoje(), pago: true }) };
    const nd = { ...d, estado: null, transacoes: [...d.transacoes, tx] };
    const c = consolidar(nd.transacoes.filter((x) => x.data.slice(0, 7) === mesAtual()));
    return bot(nd, `✅ ${base.tipo === 'GASTO' ? 'Despesa' : 'Receita'} de ${brl(base.valor)} registrada em ${cat.descricao}.\nSaldo atual do mês: ${brl(c.saldoAtual)}.`);
  };
  const lista = (tipo) => d.categorias.filter((c) => c.tipo === tipo).map((c, i) => `${i + 1} - ${c.descricao}`).join('\n');

  // RN007: pedir dados que faltam
  if (est?.passo === 'categoria') {
    const opcoes = d.categorias.filter((c) => c.tipo === est.tipo);
    const cat = opcoes[parseInt(t, 10) - 1] || achaCategoria(d, t, est.tipo);
    if (!cat) return bot(d, 'Não entendi a categoria. Responda com o número ou digite "menu" para cancelar.\n' + lista(est.tipo));
    return registrar(est, cat);
  }
  const tipo = detectarTipo(t) || est?.tipo;
  if (!tipo) return bot(d, 'Não entendi a mensagem.\n\n' + MENU);
  const valor = parseValor(texto);
  if (!valor) return bot({ ...d, estado: { passo: 'dados', tipo } }, 'Qual foi o valor? Ex.: 45,90 mercado');
  const cat = achaCategoria(d, t, tipo);
  if (!cat) return bot({ ...d, estado: { passo: 'categoria', tipo, valor, descricao: texto } }, `Em qual categoria devo registrar ${brl(valor)}? Responda com o número:\n${lista(tipo)}`);
  return registrar({ tipo, valor, descricao: texto }, cat);
}
