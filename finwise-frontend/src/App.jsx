import { useState } from 'react';
import { LayoutDashboard, TrendingDown, TrendingUp, FileText, Lightbulb, Calculator, MessageCircle, UserRound, LogOut } from 'lucide-react';
import { cadastrar, entrar, sair, usuarioDaSessao, atualizarUsuario, useDb, uid } from './lib';
import { Modal, Erros } from './ui';
import Dashboard from './pages/Dashboard';
import Transacoes from './pages/Transacoes';
import Relatorios from './pages/Relatorios';
import Sugestoes, { PERFIS } from './pages/Sugestoes';
import Simulador from './pages/Simulador';
import WhatsApp from './pages/WhatsApp';

const PAGINAS = [
  { id: 'dashboard', rot: 'Dashboard', Icon: LayoutDashboard },
  { id: 'gastos', rot: 'Meus gastos', Icon: TrendingDown },
  { id: 'receitas', rot: 'Minhas receitas', Icon: TrendingUp },
  { id: 'relatorios', rot: 'Relatórios', Icon: FileText },
  { id: 'sugestoes', rot: 'Sugestões', Icon: Lightbulb },
  { id: 'simulador', rot: 'Simular investimento', Icon: Calculator },
  { id: 'whatsapp', rot: 'WhatsApp', Icon: MessageCircle },
  { id: 'perfil', rot: 'Perfil', Icon: UserRound },
];

export default function App() {
  const [user, setUser] = useState(usuarioDaSessao);
  const [toasts, setToasts] = useState([]);
  const toast = (msg, tipo = 'ok') => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  return (
    <>
      {user ? <Shell key={user.id} user={user} setUser={setUser} toast={toast} /> : <Auth onAuth={setUser} />}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={'toast ' + t.tipo}>{t.msg}</div>)}</div>
    </>
  );
}

function Auth({ onAuth }) {
  const [modo, setModo] = useState('login');
  const [f, setF] = useState({ nome: '', email: '', senha: '', telefone: '', salario: '' });
  const [erros, setErros] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const cad = modo === 'cadastro';

  const enviar = async (e) => {
    e.preventDefault();
    const er = [];
    if (cad && f.nome.trim().length < 2) er.push('Informe seu nome.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.push('Informe um e-mail válido.');
    if (f.senha.length < 6) er.push('A senha deve ter ao menos 6 caracteres.');
    if (er.length) return setErros(er);
    setBusy(true);
    try { onAuth(cad ? await cadastrar(f) : await entrar(f.email, f.senha)); }
    catch (x) { setErros([x.message]); setBusy(false); }
  };

  return (
    <div className="auth">
      <div className="auth-lado">
        <h1>FinWise</h1>
        <p>Saiba para onde vai o seu dinheiro. Registre gastos e receitas no site ou mandando uma mensagem no WhatsApp.</p>
        <ul>
          <li>Dashboard com saldo atual e projetado</li>
          <li>Registro rápido pelo chatbot</li>
          <li>Simulador de investimentos e sugestões</li>
        </ul>
      </div>
      <form className="auth-form" onSubmit={enviar}>
        <h2>{cad ? 'Criar conta' : 'Entrar'}</h2>
        {cad && <label>Nome<input value={f.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" /></label>}
        <label>E-mail<input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></label>
        <label>Senha<input type="password" value={f.senha} onChange={(e) => set('senha', e.target.value)} autoComplete={cad ? 'new-password' : 'current-password'} /></label>
        {cad && (
          <div className="duas">
            <label>WhatsApp com DDD<input value={f.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="5511999999999" inputMode="tel" /></label>
            <label>Salário (opcional)<input type="number" min="0" step="0.01" value={f.salario} onChange={(e) => set('salario', e.target.value)} /></label>
          </div>
        )}
        <Erros lista={erros} />
        <button className="btn grande" disabled={busy}>{cad ? 'Criar conta' : 'Entrar'}</button>
        <button type="button" className="link" onClick={() => { setModo(cad ? 'login' : 'cadastro'); setErros([]); }}>
          {cad ? 'Já tenho conta' : 'Ainda não tenho conta'}
        </button>
      </form>
    </div>
  );
}

function Onboarding({ onFim }) {
  const [i, setI] = useState(0);
  const [perfil, setPerfil] = useState('moderado');
  const passos = [
    { t: 'Seu painel', c: 'O dashboard mostra o saldo atual, o saldo projetado e para onde vai o dinheiro. Use os filtros de mês e categoria para explorar.' },
    { t: 'Registre pelo WhatsApp', c: 'Mande “gastei 45,90 no mercado” ou digite 1 para uma nova despesa. O chatbot registra e responde com o saldo do mês.' },
    { t: 'Qual é o seu perfil?', c: null },
  ];
  const p = passos[i];
  return (
    <Modal titulo={`Bem-vindo ao FinWise (${i + 1}/3)`} onClose={() => onFim(perfil)}>
      <h4>{p.t}</h4>
      {p.c ? <p>{p.c}</p> : (
        <div className="perfis">
          {Object.entries(PERFIS).map(([k, v]) => (
            <label key={k} className={'perfil' + (perfil === k ? ' sel' : '')}><input type="radio" checked={perfil === k} onChange={() => setPerfil(k)} /><b>{v.nome}</b><span>{v.desc}</span></label>
          ))}
        </div>
      )}
      <div className="acoes">
        {i > 0 && <button className="btn sec" onClick={() => setI(i - 1)}>Voltar</button>}
        {i < 2 ? <button className="btn" onClick={() => setI(i + 1)}>Continuar</button> : <button className="btn" onClick={() => onFim(perfil)}>Começar</button>}
      </div>
    </Modal>
  );
}

function Perfil({ user, setUser, toast }) {
  const [f, setF] = useState({ nome: user.nome, telefone: user.telefone || '', salario: user.salario ?? '' });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const salvar = (e) => {
    e.preventDefault();
    try { setUser(atualizarUsuario(user.id, f)); toast('Perfil atualizado com sucesso.'); }
    catch (x) { toast(x.message, 'erro'); }
  };
  return (
    <>
      <header className="topo"><h1>Perfil</h1></header>
      <form className="card form estreito" onSubmit={salvar}>
        <label>Nome<input value={f.nome} onChange={(e) => set('nome', e.target.value)} /></label>
        <label>E-mail<input value={user.email} disabled /></label>
        <label>WhatsApp com DDD<input value={f.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="5511999999999" /></label>
        <label>Salário<input type="number" min="0" step="0.01" value={f.salario} onChange={(e) => set('salario', e.target.value)} /></label>
        <div className="acoes"><button className="btn">Salvar alterações</button></div>
      </form>
    </>
  );
}

function Shell({ user, setUser, toast }) {
  const [db, update] = useDb(user.id);
  const [pag, setPag] = useState('dashboard');
  const P = { db, update, user, toast };
  return (
    <div className="app">
      <aside className="side">
        <div className="marca">FinWise</div>
        <nav>
          {PAGINAS.map(({ id, rot, Icon }) => (
            <button key={id} className={pag === id ? 'ativo' : ''} onClick={() => setPag(id)} aria-label={rot}><Icon size={18} /><span>{rot}</span></button>
          ))}
        </nav>
        <button className="sair" onClick={() => { sair(); setUser(null); }} aria-label="Sair"><LogOut size={18} /><span>Sair</span></button>
      </aside>
      <main className="main">
        {pag === 'dashboard' && <Dashboard {...P} />}
        {pag === 'gastos' && <Transacoes tipo="GASTO" {...P} />}
        {pag === 'receitas' && <Transacoes tipo="ENTRADA" {...P} />}
        {pag === 'relatorios' && <Relatorios {...P} />}
        {pag === 'sugestoes' && <Sugestoes {...P} />}
        {pag === 'simulador' && <Simulador {...P} />}
        {pag === 'whatsapp' && <WhatsApp {...P} />}
        {pag === 'perfil' && <Perfil user={user} setUser={setUser} toast={toast} />}
      </main>
      {!db.onboarded && <Onboarding onFim={(perfil) => update((d) => ({ ...d, onboarded: true, perfil }))} />}
    </div>
  );
}
