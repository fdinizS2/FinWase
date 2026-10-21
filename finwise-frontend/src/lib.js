// Camada de dados do FinWise.
// Hoje persiste no localStorage (um "banco" separado por usuário => RN001/RN008).
// Quando o backend Spring Boot existir, troque o corpo destas funções por chamadas fetch() à API REST.
import { useState, useEffect } from 'react';

const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const pad = (n) => String(n).padStart(2, '0');

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const mesAtual = () => hoje().slice(0, 7);
export const brl = (v) => (Math.round((v || 0) * 100) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataBR = (d) => (d ? d.split('-').reverse().join('/') : '—');
export const mesLabel = (m) => { const [y, mm] = m.split('-').map(Number); return new Date(y, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); };

/* ---------- Autenticação (RNF02 / RI004) ---------- */
async function hash(s) { // apenas para o protótipo; o backend usará BCrypt
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const pub = ({ senhaHash, ...u }) => u;

export async function cadastrar({ nome, email, senha, telefone, salario }) {
  const users = get('fw_users', []);
  email = email.trim().toLowerCase();
  const tel = (telefone || '').replace(/\D/g, '');
  if (users.some((u) => u.email === email)) throw new Error('Este e-mail já está cadastrado.');
  if (tel && users.some((u) => u.telefone === tel)) throw new Error('Este telefone já está cadastrado.');
  const u = { id: uid(), nome: nome.trim(), email, senhaHash: await hash(senha), telefone: tel, salario: salario === '' || salario == null ? null : Number(salario), criadoEm: new Date().toISOString() };
  set('fw_users', [...users, u]);
  set('fw_session', u.id);
  return pub(u);
}
export async function entrar(email, senha) {
  const u = get('fw_users', []).find((x) => x.email === email.trim().toLowerCase());
  if (!u || u.senhaHash !== (await hash(senha))) throw new Error('E-mail ou senha incorretos.');
  set('fw_session', u.id);
  return pub(u);
}
export const sair = () => localStorage.removeItem('fw_session');
export const usuarioDaSessao = () => { const u = get('fw_users', []).find((x) => x.id === get('fw_session', null)); return u ? pub(u) : null; };
export function atualizarUsuario(id, patch) {
  const users = get('fw_users', []);
  const i = users.findIndex((u) => u.id === id);
  const tel = (patch.telefone || '').replace(/\D/g, '');
  if (tel && users.some((u) => u.id !== id && u.telefone === tel)) throw new Error('Este telefone já está em outra conta.');
  users[i] = { ...users[i], nome: patch.nome.trim() || users[i].nome, telefone: tel, salario: patch.salario === '' || patch.salario == null ? null : Number(patch.salario) };
  set('fw_users', users);
  return pub(users[i]);
}

/* ---------- Dados do usuário ---------- */
export const CATEGORIAS_PADRAO = [
  { id: 'c1', descricao: 'Salário', tipo: 'ENTRADA' },
  { id: 'c2', descricao: 'Rendimentos', tipo: 'ENTRADA' },
  { id: 'c3', descricao: 'Alimentação', tipo: 'GASTO' },
  { id: 'c4', descricao: 'Moradia', tipo: 'GASTO' },
  { id: 'c5', descricao: 'Transporte', tipo: 'GASTO' },
  { id: 'c6', descricao: 'Lazer', tipo: 'GASTO' },
  { id: 'c7', descricao: 'Saúde', tipo: 'GASTO' },
];
const novoDb = () => ({ transacoes: [], categorias: CATEGORIAS_PADRAO, simulacoes: [], relatorios: [], chat: [], estado: null, perfil: 'moderado', onboarded: false });

export function useDb(userId) {
  const [db, setDb] = useState(() => ({ ...novoDb(), ...get('fw_db_' + userId, {}) }));
  useEffect(() => { set('fw_db_' + userId, db); }, [db, userId]);
  return [db, setDb]; // setDb(fn(prev) => next)
}

/* ---------- Regras de negócio ---------- */
export function validar(t, categorias) { // RN003 / RI002
  const e = [];
  if (!(t.valor > 0)) e.push('Informe um valor maior que zero.');
  if (!t.data) e.push('Informe a data.');
  const c = categorias.find((x) => x.id === t.categoriaId);
  if (!c || c.tipo !== t.tipo) e.push('Escolha uma categoria compatível com o tipo.');
  if (t.tipo === 'GASTO' && !t.dataVencimento) e.push('Informe a data de vencimento.');
  return e;
}

export function consolidar(txs) { // RN004 / RN005
  let totalEntradas = 0, totalGastos = 0, saldoAtual = 0, saldoProjetado = 0;
  for (const t of txs) {
    if (t.tipo === 'ENTRADA') { totalEntradas += t.valor; saldoProjetado += t.valor; if (t.recebido) saldoAtual += t.valor; }
    else { totalGastos += t.valor; saldoProjetado -= t.valor; if (t.pago) saldoAtual -= t.valor; }
  }
  return { totalEntradas, totalGastos, saldoAtual, saldoProjetado };
}

export function porCategoria(txs, categorias, tipo) {
  const m = {};
  for (const t of txs) if (t.tipo === tipo) m[t.categoriaId] = (m[t.categoriaId] || 0) + t.valor;
  return Object.entries(m)
    .map(([id, total]) => ({ id, nome: categorias.find((c) => c.id === id)?.descricao || 'Sem categoria', total }))
    .sort((a, b) => b.total - a.total);
}

export function simular({ aporteInicial, aporteMensal, taxa, prazo }) { // juros compostos, aporte no fim de cada mês
  const i = taxa / 100, f = Math.pow(1 + i, prazo);
  const montante = aporteInicial * f + (i === 0 ? aporteMensal * prazo : aporteMensal * ((f - 1) / i));
  const investido = aporteInicial + aporteMensal * prazo;
  return { montante, investido, juros: montante - investido };
}
