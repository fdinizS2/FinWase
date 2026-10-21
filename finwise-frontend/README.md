# FinWise — Frontend (React + Vite)

Sistema web de gestão financeira pessoal com chatbot de WhatsApp simulado.

## Como rodar
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera a pasta dist/
```

## O que está implementado (ligado à documentação)
| Documento | Tela / arquivo |
|---|---|
| UC001 Consultar sugestões | `pages/Sugestoes.jsx` (perfil conservador/moderado/agressivo) |
| UC002 / UC003 Manter gastos e receitas | `pages/Transacoes.jsx` (CRUD, filtros, categorias novas) |
| UC004 Consultar relatórios, RF012 | `pages/Relatorios.jsx` (gerar, filtrar, consultar, exportar CSV, compartilhar) |
| UC005 Consultar dashboards | `pages/Dashboard.jsx` (filtros, saldo atual/projetado, “Sem registros”) |
| UC006 Simular investimento | `pages/Simulador.jsx` (pop-up de dados e de resultado) |
| Chatbot WhatsApp (RN006, RN007, RI003, RI007) | `pages/WhatsApp.jsx` + `bot.js` |
| RNF02 / RI004 autenticação, RNF16 onboarding | `App.jsx` |
| RN001–RN005, RN008, RI002 | `lib.js` (validar, consolidar, dados por usuário) |

## Próximo passo: backend Spring Boot
Todo acesso a dados está em `src/lib.js` (hoje em `localStorage`). Mapa sugerido de endpoints:

- `POST /api/auth/cadastro`, `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/transacoes` (`tipo=ENTRADA|GASTO`) e `PATCH /api/transacoes/{id}/situacao`
- `GET/POST /api/categorias`
- `GET /api/consolidado?competencia=YYYY-MM`
- `GET/POST /api/relatorios`
- `GET /api/sugestoes?perfil=`
- `POST /api/simulacoes` e `GET /api/simulacoes`
- `POST /api/webhook/whatsapp` (substitui `bot.js`; grava em `interacao_whatsapp`)
