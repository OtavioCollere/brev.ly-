# Frontend Web (Brev.ly) Specification

## Problem Statement

O backend do Brev.ly (`server/`, já implementado) expõe criar/listar/deletar/resolver+contar/exportar links encurtados. Falta a SPA React que consome essa API: uma página para cadastrar e listar links, uma página de redirecionamento que resolve o link curto, e uma página de "não encontrado". A fidelidade ao Figma (`Encurtador de Links (Community)/`) e uma boa experiência de carregamento/erro/vazio são requisitos explícitos do desafio.

## Goals

- [ ] SPA Vite + React + TypeScript consumindo 100% do contrato do backend (AD-001 a AD-008 em `.specs/STATE.md`)
- [ ] 3 rotas: raiz (form + listagem), redirecionamento dinâmico, não encontrado — fiel ao Figma (cores, tipografia, componentes do Style Guide)
- [ ] Mobile-first, responsivo (Figma tem frames Desktop 1366px e Mobile 390px para as 4 telas)
- [ ] Estados de UX explícitos: carregando, vazio, erro, ações bloqueadas quando a aplicação não está pronta

## Fonte de design

`Encurtador de Links (Community)/` no repo (export do Figma). Como os SVGs exportados têm texto convertido em path (não dá pra copiar/colar texto do arquivo), o conteúdo visual foi extraído renderizando os SVGs como imagem (`qlmanage`) — cores, tipografia, componentes e cópia de texto das 4 telas (Links, Redirect, Empty, Not Found) abaixo refletem o que foi visto nessas imagens. Duas ressalvas conhecidas:
- O painel "Meus links" e o card de Redirect/404 aparecem cortados na borda direita do frame nos exports (a própria arte no Figma extrapola o artboard) — linha de item da lista (ícone de deletar, contagem de acessos, botão de exportar CSV) não ficou 100% visível; essas posições foram inferidas do conjunto de ícones do Style Guide e ficam registradas como assumption abaixo.
- O texto "Esta fonte pode ser substituída por..." no Style Guide ficou cortado — tratado como não-bloqueante (Open Sans está disponível via Google Fonts, sem necessidade de substituição).

### Style Guide extraído

**Cores**
| Token | Hex |
| --- | --- |
| blue-base | `#2C46B1` |
| blue-dark | `#2C4091` |
| white | `#FFFFFF` |
| gray-100 | `#F9F9FB` |
| gray-200 | `#E4E6EC` |
| gray-300 | `#CDCFD5` |
| gray-400 | `#74798B` |
| gray-500 | `#4D505C` |
| gray-600 | `#1F2025` |
| danger | `#B12C4D` |

Sem cor de "sucesso" dedicada no Style Guide — feedback positivo (ex. "copiado") deve usar a paleta existente (azul/cinza), não inventar verde.

**Tipografia** — família Open Sans:
| Nome | Tamanho | Line-height | Peso |
| --- | --- | --- | --- |
| Text Xl | 24px | 32px | Bold |
| Text Lg | 18px | 24px | Bold |
| Text Md | 14px | 18px | SemiBold |
| Text Sm | 12px | 16px | Regular & SemiBold |
| Text Xs | 10px | 14px | Regular, Uppercase |

**Ícones** — Phosphor Icons: duplicar/copiar, lixeira, alerta (triângulo), download, link (corrente).

**Botões**: Primary (fundo azul-base / hover azul-dark / disabled azul claro dessaturado) e Secondary (fundo cinza-100, borda em hover, texto acinzentado quando disabled) — ambos com variante ícone+label e ícone sozinho.

**Input**: label uppercase (Text Xs) acima, borda cinza-300 default, borda azul-base quando ativo/focado, borda + label + mensagem de erro (com ícone de alerta) em vermelho (`danger`) no estado de erro.

### Páginas extraídas

**Links (rota raiz `/`)**: header com logo "brev.ly" (ícone + wordmark), dois cards lado a lado no desktop (empilhados no mobile): "Novo link" (form) e "Meus links" (listagem). Form: campo "LINK ORIGINAL" (placeholder `www.exemplo.com.br`), campo "LINK ENCURTADO" (mostra o prefixo `brev.ly/` dentro do próprio input), botão "Salvar link" (full width). Listagem: título "Meus links", cada item mostra o link encurtado em azul e a URL original em cinza abaixo, separados por uma linha divisória.

**Empty (estado vazio da listagem)**: mesmo layout, painel "Meus links" mostra um ícone de corrente + texto uppercase "AINDA NÃO EXISTEM LINKS CADASTRADOS" (texto parcialmente cortado no export, mas a leitura é inequívoca) no lugar da lista. Botão "Salvar link" aparece na cor disabled (azul claro) quando o form está vazio — confirma que o botão de submit é desabilitado por estado do form, não só em requests em andamento.

**Redirect (rota dinâmica `/:url`)**: card centralizado com logo, título "Redirecionando...", texto "O link será aberto automaticamente em alguns instantes." e "Não foi redirecionado? Acesse aqui" (link).

**Not Found (`*`)**: card centralizado com ilustração "404" (vetor do Style Guide), título "Link não encontrado", texto "O link que você está tentando acessar não existe, foi removido ou é uma URL inválida. Saiba mais em brev.ly."

## Out of Scope

| Feature | Reason |
| --- | --- |
| Metadados OpenGraph, upload de imagem, interface otimista, SSR (Next/Remix) | Seção "Quer ir além?" do enunciado — explicitamente fora da correção obrigatória |
| Autenticação | Não exigida; ferramenta pública, backend não tem auth |
| Edição de link existente | Backend não expõe update (decisão já tomada na spec do backend) |
| Confirmação modal antes de deletar | Não exigida pelo enunciado; escopo extra (precisaria de um sistema de modal só pra isso) |
| Analytics além da contagem de acessos | Não exigido |
| Multi-idioma / i18n | App é em pt-BR, sem requisito de outro idioma |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Roteamento | React Router (`createBrowserRouter`), 2 rotas: `/` e `*` (catch-all). O catch-all tenta resolver o primeiro segmento do path como `shortUrl` via API; se resolver, mostra o card "Redirecionando..." e redireciona; se falhar (404), o MESMO componente renderiza o conteúdo de "Not Found" | Unifica "rota inexistente" e "shortUrl que não existe" no mesmo fluxo, exatamente como o enunciado descreve (ambos os casos caem na página de "recurso não encontrado") | n |
| Normalização da URL original | Se o usuário digitar sem protocolo (ex. `www.exemplo.com.br`, igual ao placeholder do Figma), o form tenta `https://` + valor antes de validar/enviar; se ainda assim não for uma URL válida, mostra erro inline | O placeholder do Figma não mostra protocolo, mas o backend (AD-003) exige `http(s)://` — auto-completar evita fricção do usuário sem enfraquecer a validação do backend | n ⭐ ponto de maior incerteza |
| Campo "Link encurtado" | Prefixo fixo `brev.ly/` visível dentro do input (não editável), usuário só digita o slug; o valor enviado como `shortUrl` pro backend é só o slug | Bate com o mockup do Figma e com o formato de `shortUrl` que o backend espera (AD-002, sem domínio) | n |
| Copiar link encurtado | Clicar no texto azul `brev.ly/slug` de um item da lista copia a URL completa (`https://brev.ly/slug`) pra área de transferência, com feedback visual (ex. tooltip/toast "Link copiado!") | Ícone de "copiar" está no Style Guide; padrão comum em encurtadores; não há confirmação pixel-perfect porque a linha do item ficou cortada no export do Figma | n ⭐ inferido, não confirmado visualmente |
| Deletar link | Ícone de lixeira por item, sem modal de confirmação — deleta ao clicar | Não exigido pelo enunciado; modal de confirmação seria escopo extra não pedido | n |
| Botão de exportar CSV | Botão secundário (ícone de download + texto) no cabeçalho do card "Meus links", desabilitado quando a lista está vazia | Ícone de download está no Style Guide; posição inferida (corte no export impediu confirmar visualmente); desabilitar quando vazio seque o padrão de "bloqueio de ações" pedido no enunciado | n ⭐ inferido, não confirmado visualmente |
| Paginação da listagem | Controles simples "Anterior / Próxima" no rodapé do card da lista, usando `page`/`limit` (default 10) do backend (AD-005) | O Figma não mostra paginação visível (mockup só tem 4 itens de exemplo); escolha simples e suficiente pro volume esperado do desafio | n |
| Delay do redirect automático | ~1.5s de espera antes de `window.location.replace(originalUrl)`; o link "Acesse aqui" fica ativo assim que a API responde (não precisa esperar o delay) | O texto "será aberto automaticamente em alguns instantes" indica uma pausa intencional, não um redirect instantâneo | n |
| Reset do form após criar | Limpa os campos "Link original"/"Link encurtado" após um `POST /links` bem-sucedido | Comportamento padrão esperado — o card "Novo link" deve ficar pronto pro próximo cadastro | n |
| Notificação de erro/sucesso | Toast/inline simples, construído sem lib nova (sem cor de sucesso dedicada no Style Guide — usar azul/cinza) | Não há um design de toast no Figma capturado; manter simples evita inventar um componente visual não especificado | n |
| Gerenciador de pacotes | npm | Mesma decisão e razão do backend — maximiza compatibilidade de quem for rodar/avaliar | n |
| Bibliotecas flexíveis do enunciado | Usar as 4: TailwindCSS, React Query, React Hook Form, Zod | Enunciado recomenda explicitamente pra DX; sem razão pra divergir | n |

**Open questions:** nenhuma — todas resolvidas ou registradas acima. Os 3 itens marcados ⭐ são os de maior incerteza visual (linha da lista ficou cortada no export do Figma) — vale checar contra o Figma de verdade se possível antes/durante o Design.

---

## User Stories

### P1: Cadastrar e listar links ⭐ MVP

**User Story**: Como usuário do Brev.ly, quero cadastrar uma URL longa com um apelido curto e ver a lista dos links que já cadastrei, para começar a usar o encurtador.

**Why P1**: É a página raiz, o loop central do produto — sem isso não há o que testar nas outras páginas.

**Acceptance Criteria**:

1. WHEN a página raiz carrega THEN o sistema SHALL buscar a listagem (`GET /links`) e exibir um estado de carregamento até a resposta chegar.
2. WHEN o usuário preenche "Link original" (com ou sem protocolo) e "Link encurtado" (slug válido) e clica "Salvar link" THEN o sistema SHALL chamar `POST /links`, limpar o form e inserir o novo link no topo da listagem em caso de sucesso.
3. WHEN o campo "Link encurtado" não casa com `^[a-zA-Z0-9-_]{1,60}$` THEN o sistema SHALL impedir o envio e mostrar uma mensagem de erro inline no campo, sem chamar a API.
4. WHEN o campo "Link original" não é uma URL válida mesmo após tentar completar com `https://` THEN o sistema SHALL impedir o envio e mostrar erro inline, sem chamar a API.
5. WHEN a API responde `409` (slug já existe) THEN o sistema SHALL mostrar a mensagem de erro retornada no campo "Link encurtado", sem limpar o form.
6. WHEN o form está vazio ou inválido, ou uma criação está em andamento THEN o botão "Salvar link" SHALL ficar desabilitado (visual disabled do Style Guide).
7. WHEN não existe nenhum link cadastrado THEN o sistema SHALL mostrar o estado vazio (ícone + "Ainda não existem links cadastrados") no lugar da lista.
8. WHEN a busca da listagem falhar (erro de rede/servidor) THEN o sistema SHALL mostrar um estado de erro com opção de tentar novamente, sem quebrar a página.
9. WHEN o usuário clica no texto azul de um link encurtado na lista THEN o sistema SHALL copiar a URL completa (`https://brev.ly/slug`) pra área de transferência e mostrar um feedback visual de sucesso.
10. WHEN a listagem tem mais links do que cabem em uma página (`total > limit`) THEN o sistema SHALL exibir controles de paginação (Anterior/Próxima) que buscam a página correspondente via `GET /links?page=&limit=`.

**Independent Test**: Abrir a raiz sem nenhum link (vê empty state), cadastrar um link, ver ele aparecer na lista, recarregar a página e confirmar que persiste (veio da API).

---

### P2: Deletar link e exportar CSV

**User Story**: Como usuário do Brev.ly, quero remover um link que não uso mais e baixar um relatório dos meus links, para manter minha lista organizada e ter um backup dos dados.

**Why P2**: Depende da listagem (P1) já funcionando; são ações secundárias sobre um estado que já existe.

**Acceptance Criteria**:

1. WHEN o usuário clica no ícone de deletar de um item THEN o sistema SHALL chamar `DELETE /links/:id` e remover o item da lista imediatamente após sucesso (sem precisar recarregar a página).
2. WHEN a exclusão falha THEN o sistema SHALL manter o item na lista e mostrar uma notificação de erro.
3. WHEN existe pelo menos 1 link cadastrado THEN o botão de exportar CSV SHALL estar habilitado; ao clicar, o sistema SHALL chamar `GET /links/export` e iniciar o download/abertura da URL retornada.
4. WHEN não existe nenhum link cadastrado THEN o botão de exportar CSV SHALL ficar desabilitado.
5. WHEN a exportação falha (erro do backend) THEN o sistema SHALL mostrar uma notificação de erro, sem travar a página.

**Independent Test**: Com 2+ links cadastrados, deletar um e confirmar que some da lista sem reload; clicar em exportar e confirmar que a URL do CSV abre/baixa.

---

### P3: Redirecionamento e página não encontrada

**User Story**: Como visitante que recebeu um link `brev.ly/algo`, quero ser levado pro destino original automaticamente, e ver uma mensagem clara se o link não existir.

**Why P3**: Depende do backend já funcionar (P1 do backend); são rotas isoladas, mais simples, e naturalmente as últimas a integrar.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/:algumSlug` THEN o sistema SHALL chamar `GET /links/:algumSlug`, mostrar o card "Redirecionando..." e, em caso de sucesso, redirecionar (`window.location`) para a URL original após um breve delay.
2. WHEN a API resolve o link com sucesso THEN o link "Acesse aqui" SHALL apontar pra URL original e funcionar mesmo antes do redirect automático disparar.
3. WHEN a API responde `404` para o slug acessado THEN o sistema SHALL mostrar o conteúdo de "Link não encontrado" (mesmo componente usado pra rotas inexistentes).
4. WHEN o usuário acessa qualquer rota que não seja `/` nem um slug resolvível THEN o sistema SHALL mostrar "Link não encontrado".

**Independent Test**: Acessar um slug existente (redireciona pro destino, contador incrementa — visível numa nova consulta à listagem), acessar um slug inexistente (mostra not found), acessar uma rota aleatória tipo `/xyz-nao-existe` (mostra not found).

---

## Edge Cases

- WHEN o usuário digita um slug com maiúsculas/minúsculas misturadas THEN o sistema SHALL tratar como case-sensitive (mesmo slug com case diferente é um valor diferente), consistente com o backend.
- WHEN o texto do "Link original" já vem com `http://` (não `https://`) THEN o sistema SHALL aceitar sem modificar (só completa quando não há protocolo nenhum).
- WHEN a listagem tem só 1 página (menos que o `limit`) THEN os controles de paginação SHALL ficar ocultos ou desabilitados, não quebrados.
- WHEN a janela é redimensionada entre mobile e desktop THEN o layout SHALL se adaptar (cards empilhados ↔ lado a lado) sem perder estado do form.
- WHEN o usuário submete o form muito rápido (duplo clique) THEN o sistema SHALL prevenir envio duplicado (botão desabilitado durante o request).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status | Task(s) |
| --- | --- | --- | --- | --- |
| FORM-01 | P1: Criar link (happy path) | Tasks | In Tasks | T11 |
| FORM-02 | P1: Rejeitar slug mal formatado | Tasks | In Tasks | T11 |
| FORM-03 | P1: Rejeitar URL original mal formatada | Tasks | In Tasks | T11 |
| FORM-04 | P1: Slug duplicado (409 do backend) | Tasks | In Tasks | T11 |
| FORM-05 | P1: Botão desabilitado por estado | Tasks | In Tasks | T7, T11 |
| LIST-01 | P1: Carregar listagem | Tasks | In Tasks | T13 |
| LIST-02 | P1: Estado vazio | Tasks | In Tasks | T13 |
| LIST-03 | P1: Estado de erro na listagem | Tasks | In Tasks | T13 |
| LIST-04 | P1: Copiar link encurtado | Tasks | In Tasks | T12 |
| LIST-05 | P1: Paginação | Tasks | In Tasks | T13 |
| DEL-01 | P2: Deletar link | Tasks | In Tasks | T12 |
| DEL-02 | P2: Erro ao deletar | Tasks | In Tasks | T12 |
| CSV-01 | P2: Exportar CSV habilitado | Tasks | In Tasks | T14 |
| CSV-02 | P2: Exportar CSV desabilitado (lista vazia) | Tasks | In Tasks | T14 |
| CSV-03 | P2: Erro ao exportar | Tasks | In Tasks | T14 |
| REDIR-01 | P3: Resolver + redirecionar | Tasks | In Tasks | T16 |
| REDIR-02 | P3: Link manual "Acesse aqui" | Tasks | In Tasks | T16 |
| REDIR-03 | P3: Slug inexistente → not found | Tasks | In Tasks | T16 |
| NF-01 | P3: Rota desconhecida → not found | Tasks | In Tasks | T16 |

**ID format:** `[CATEGORY]-[NUMBER]` — `FORM` (cadastro), `LIST` (listagem), `DEL` (remoção), `CSV` (exportação), `REDIR` (redirecionamento), `NF` (não encontrado)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 19 total, 19 mapped to tasks (`.specs/features/frontend-web/tasks.md`), 0 unmapped ✅

---

## Success Criteria

- [ ] As 3 páginas (raiz, redirect, not found) funcionam ponta a ponta contra o backend real (`server/`)
- [ ] Fidelidade visual ao Figma: cores, tipografia, componentes (botões/inputs) batem com o Style Guide extraído
- [ ] Responsivo: usável tanto em ~390px (mobile) quanto em ~1366px (desktop)
- [ ] Nenhuma ação fica "pendurada" sem feedback (loading/erro/vazio sempre visíveis quando aplicável)
- [ ] `.env.example` com `VITE_FRONTEND_URL` e `VITE_BACKEND_URL`, app lê `VITE_BACKEND_URL` pra chamar a API
