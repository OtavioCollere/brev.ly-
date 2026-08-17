# Brev.ly — Web

SPA React do encurtador de URLs Brev.ly. Feita com Vite + React + TypeScript, consumindo a API em [`../server`](../server).

Resolve o desafio prático **Frontend** da Rocketseat (trilha Fundamentos Técnicos e Estratégicos), seguindo o layout do [Figma do desafio](https://www.figma.com).

## Stack

- **TypeScript**
- **React** + **Vite** (SPA, sem framework)
- **React Router** — roteamento
- **TanStack React Query** — cache/loading/erro das chamadas de API
- **React Hook Form** + **Zod** — formulário e validação
- **Tailwind CSS** — estilização, tema mapeado 1:1 com o Style Guide do Figma
- **Vitest** + **Testing Library** — testes

## Rodando localmente

Pré-requisitos: Node.js 20+, o [backend](../server) rodando (local ou já deployado).

```bash
npm install
cp .env.example .env
# preencha VITE_BACKEND_URL com a URL do backend
npm run dev
```

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `VITE_BACKEND_URL` | URL base da API (ex. `http://localhost:3333`) |
| `VITE_FRONTEND_URL` | URL pública deste próprio app (usada, por exemplo, se algo precisar montar o link completo `brev.ly/slug`) |

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento (Vite) |
| `npm run build` | Gera a build de produção em `dist/` |
| `npm run preview` | Serve a build de produção localmente |
| `npm test` | Roda a suíte de testes (Vitest + Testing Library) |
| `npm run typecheck` | Checagem de tipos sem emitir arquivos |

## Páginas

- **`/`** — formulário de cadastro ("Novo link") + listagem paginada dos links cadastrados ("Meus links"), com estados de carregamento, vazio e erro; copiar link, deletar e exportar CSV.
- **`/:slug`** — página de redirecionamento: resolve o slug na API (que já incrementa o contador de acessos), mostra "Redirecionando..." e leva o navegador pro destino original após um instante (com link manual de fallback).
- **qualquer outra rota, ou um slug que não existe** — página "Link não encontrado".

## Decisões de projeto

- O campo "Link encurtado" do formulário mostra o prefixo fixo `brev.ly/` e o usuário só digita o slug — o valor mandado pra API é só o slug, sem domínio (bate com o formato que o backend espera).
- Se a URL original for digitada sem `http://`/`https://`, o formulário tenta completar com `https://` antes de validar — evita fricção sem enfraquecer a validação (o backend exige protocolo).
- Deletar um link não pede confirmação (não fazia parte do escopo obrigatório).
- Paginação simples (Anterior/Próxima), aparece só quando há mais links do que cabem numa página.

Mais detalhes de arquitetura, o Style Guide extraído do Figma (cores, tipografia, ícones) e o raciocínio completo por trás de cada decisão estão em [`.specs/features/frontend-web/`](../.specs/features/frontend-web/) e no log de decisões em [`.specs/STATE.md`](../.specs/STATE.md).

## Testes

```bash
npm test
```

43 testes (Vitest + Testing Library) cobrindo formulário, listagem, exportação, página de redirecionamento e os hooks de dados (React Query com `QueryClientProvider` real, só a chamada HTTP é mockada).
