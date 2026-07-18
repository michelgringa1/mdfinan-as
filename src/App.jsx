import { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  AreaChart, Area, CartesianGrid
} from "recharts";
import {
  Upload, LayoutDashboard, ListOrdered, TrendingUp, Settings2,
  Trash2, Plus, AlertTriangle, Check, Loader2, FileText, X, Wand2,
  Receipt, ChevronLeft, ChevronRight
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* CONFIG PADRÃO                                                       */
/* ------------------------------------------------------------------ */

// Categorias do Organizze da Dricka. Despesa serve para PF e PJ (o lado é eixo à parte).
const CAT_DESPESA = [
  { c: "Academia", subs: ["Suplementos"] },
  { c: "Anúncios", subs: [] },
  { c: "Anúncios Terceiros", subs: [] },
  { c: "Assinaturas e serviços", subs: ["Club Milhas", "Streaming"] },
  { c: "Carro", subs: ["Fixos (Ipva)", "Manutenção"] },
  { c: "Casa", subs: ["Gás", "Internet", "Luz", "Moradia", "Telefonia"] },
  { c: "Casal", subs: ["Datas Comemorativas"] },
  { c: "Casamento", subs: [] },
  { c: "Compras", subs: ["Compras Casa"] },
  { c: "Cuidados pessoais", subs: [] },
  { c: "Delivery", subs: [] },
  { c: "Dívidas e empréstimos", subs: [] },
  { c: "Doações", subs: [] },
  { c: "Educação", subs: ["Cursos", "Eventos", "Livros"] },
  { c: "Impostos e Taxas", subs: [] },
  { c: "Investimentos", subs: [] },
  { c: "Lazer e hobbies", subs: ["Conect", "Passeios extras"] },
  { c: "Mercado", subs: ["Água"] },
  { c: "Outros", subs: [] },
  { c: "Presentes", subs: [] },
  { c: "Restaurantes e Cafés", subs: [] },
  { c: "Roupas/Calçados", subs: [] },
  { c: "Saúde", subs: ["Consultas", "Farmácia"] },
  { c: "Trabalho", subs: ["Contador", "Ferramentas", "Impostos", "Suporte"] },
  { c: "Transporte", subs: ["Aplicativos", "Estacionamento", "Gasolina"] },
  { c: "Viagens", subs: ["Europa Abril/26", "Visitar o Pai"] },
];
const CAT_RECEITA = [
  { c: "Afiliados", subs: [] },
  { c: "Anúncios Terceiros Gestão", subs: [] },
  { c: "Ecommerce", subs: [] },
  { c: "Empréstimos", subs: [] },
  { c: "Gestão Fármasi / Guinho", subs: [] },
  { c: "Hotmart (produtor + afiliado)", subs: [] },
  { c: "Investimentos", subs: [] },
  { c: "Outras receitas", subs: [] },
  { c: "Produtor - Casal Turbinado", subs: [] },
  { c: "Salário", subs: [] },
];

// Despesa (PF ou PJ) usa CAT_DESPESA; entrada (IN) usa CAT_RECEITA.
const catsDe = (tipo) => (tipo === "IN" ? CAT_RECEITA : CAT_DESPESA);
const primeiraCat = (tipo) => catsDe(tipo)[0]?.c || "";
// Lista plana (categoria + subcategorias) para validação/busca.
const catsPlanas = (tipo) => catsDe(tipo).flatMap((g) => [g.c, ...g.subs]);

// Opções do <select> com subcategorias agrupadas.
function OpcoesCat({ tipo }) {
  return catsDe(tipo).map((g) =>
    g.subs.length ? (
      <optgroup key={g.c} label={g.c}>
        <option value={g.c}>{g.c}</option>
        {g.subs.map((s) => <option key={s} value={s}>{`↳ ${s}`}</option>)}
      </optgroup>
    ) : (
      <option key={g.c} value={g.c}>{g.c}</option>
    )
  );
}

const CONFIG_PADRAO = {
  _cfgV: 3,
  cartoes: ["Cartão principal", "Cartão secundário", "Conta corrente"],
  regras: [
    { m: "GOOGLE", c: "Anúncios", t: "PJ" },
    { m: "META", c: "Anúncios", t: "PJ" },
    { m: "FACEBK", c: "Anúncios", t: "PJ" },
    { m: "FACEBOOK", c: "Anúncios", t: "PJ" },
    { m: "HOSTINGER", c: "Ferramentas", t: "PJ" },
    { m: "OPENAI", c: "Ferramentas", t: "PJ" },
    { m: "CANVA", c: "Ferramentas", t: "PJ" },
    { m: "IFOOD", c: "Delivery", t: "PF" },
    { m: "UBER", c: "Aplicativos", t: "PF" },
    { m: "POSTO", c: "Gasolina", t: "PF" },
    { m: "FARMA", c: "Farmácia", t: "PF" },
    { m: "DROGA", c: "Farmácia", t: "PF" },
    { m: "MERCADO", c: "Mercado", t: "PF" },
    { m: "NETFLIX", c: "Streaming", t: "PF" },
    { m: "SPOTIFY", c: "Streaming", t: "PF" },
    { m: "HBO", c: "Streaming", t: "PF" },
    // Regras do extrato da conta C6 MD Network (calibradas com a Dricka em jul/26).
    // Usadas pelo classificador de extrato (Fase 1) além do de fatura.
    { m: "LAUNCH PAD", c: "Hotmart (produtor + afiliado)", t: "IN" },
    { m: "PAGME", c: "Contador", t: "PJ" },
    { m: "CARLOS MICHEL DA SILVA DUTRA", c: "", t: "TRANSFER", para: "Conta C6 PF Michel" },
    { m: "PGTO FAT CARTAO C6", c: "", t: "PAGAMENTO_FATURA", cartao: "C6 MD Network", conta: "Conta C6 MD Network" },
  ],
  fixas: [
    { nome: "Aluguel", valor: 6000, dia: 5, tipo: "PF", cat: "Moradia" },
  ],
  // Contas — saldo CALCULADO. inv:true = conta de investimento, fora do fluxo de caixa.
  contas: [
    { nome: "Dinheiro", saldoInicial: 0 },
    { nome: "Conta C6 PF Michel", saldoInicial: 0 },
    { nome: "Conta NuBank MD Network", saldoInicial: 0 },
    { nome: "Wise Casal PJ", saldoInicial: 0 },
    { nome: "Conta NuBank Dricka", saldoInicial: 0 },
    { nome: "Conta NuBank Michel PF", saldoInicial: 0 },
    { nome: "Conta C6 MD Network", saldoInicial: 0 },
    { nome: "NuInvest Dricka", saldoInicial: 0, inv: true },
    { nome: "C6 Investimentos", saldoInicial: 0, inv: true },
    { nome: "Rico Invest Ações", saldoInicial: 0, inv: true },
    { nome: "NuInvest Ações", saldoInicial: 0, inv: true },
    { nome: "Criptos NuInvest", saldoInicial: 0, inv: true },
    { nome: "Ajustes Passados", saldoInicial: 0 },
  ],
  // Cartões — limite e vencimento são config; a FATURA é calculada dos lançamentos importados.
  cards: [
    { nome: "C6 PF Michel", limite: 0, venc: "" },
    { nome: "Azul PF Michel", limite: 0, venc: "" },
    { nome: "C6 MD Network", limite: 0, venc: "" },
    { nome: "Dricka PJ - C6", limite: 0, venc: "" },
    { nome: "Michel PJ - Inter", limite: 0, venc: "" },
    { nome: "Nubank MD Network - Cartão", limite: 0, venc: "" },
    { nome: "Nubank PF Michel", limite: 0, venc: "" },
    { nome: "Nubank PF Dricka", limite: 0, venc: "" },
    { nome: "CeA", limite: 0, venc: "" },
  ],
  // Contas a pagar — lista de compromissos datados. 'pago' você marca no painel.
  aPagar: [
    { id: "ap01", nome: "Tim Michel", valor: 38.78, venc: "2026-07-07", pago: false },
    { id: "ap02", nome: "Tim Dricka", valor: 38.99, venc: "2026-07-07", pago: false },
    { id: "ap03", nome: "Condomínio", valor: 346.19, venc: "2026-07-10", pago: false },
    { id: "ap04", nome: "Internet", valor: 127.69, venc: "2026-07-10", pago: false },
    { id: "ap05", nome: "Aluguel", valor: 1800, venc: "2026-07-16", pago: false },
    { id: "ap06", nome: "Fatura Nubank PF Michel", valor: 159.26, venc: "2026-07-16", pago: false },
    { id: "ap07", nome: "Fatura C6 PF Michel", valor: 7660.69, venc: "2026-07-17", pago: false },
    { id: "ap08", nome: "Fatura Azul PF Michel", valor: 1635.22, venc: "2026-07-17", pago: false },
  ],
};

const K_TXN = "fin:txns:v1";
const K_CFG = "fin:cfg:v1";
const K_MOV = "fin:mov:v1"; // razão das contas (movimentos que mexem em saldo)

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const brl = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const mesLabel = (ym) => {
  const [y, m] = ym.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[+m - 1]}/${y.slice(2)}`;
};

const hojeYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const addMeses = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const uid = () => Math.random().toString(36).slice(2, 10);

// Extrai o "nome" que o banco mostra numa descrição de PIX/pagamento, pra usar de gatilho.
// Ex.: "Saída PIX Pix enviado para TIM S A" -> "TIM S A"
const nomeBanco = (desc) => {
  let s = (desc || "")
    .replace(/^(Sa[íi]da PIX|Entrada PIX|Pagamento|D[ée]bito de Cart[ãa]o|Outros gastos|Devolu[çc][ãa]o PIX)\s*/i, "")
    .replace(/Pix (enviado para|recebido de|recebido c6 de|recebido)\s*/i, "")
    .replace(/^\d[\d.\/-]*\s+/, "") // remove CNPJ/números no começo
    .trim();
  return s.slice(0, 40);
};

// Data de hoje em ISO (YYYY-MM-DD) — comparação de vencimento por string funciona.
const hojeISO = () => new Date().toISOString().slice(0, 10);
// "2026-07-16" -> "16/07"
const dataBR = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m ? `${d}/${m}` : iso;
};
// Fontes de lançamento = nomes de cartões + contas (fallback: lista legada cartoes).
const fontesDe = (cfg) => {
  const cards = (cfg.cards || []).map((c) => c.nome);
  const contas = (cfg.contas || []).map((c) => c.nome);
  const u = [...cards, ...contas];
  return u.length ? u : (cfg.cartoes || []);
};

// Saldo da conta = saldo inicial + soma dos movimentos daquela conta.
const saldoConta = (conta, movimentos) =>
  Number(conta.saldoInicial || 0) +
  (movimentos || []).filter((m) => m.conta === conta.nome).reduce((s, m) => s + Number(m.valor || 0), 0);

// A origem escolhida é uma conta bancária (mexe em saldo) ou um cartão (vai pra fatura)?
const ehConta = (cfg, nome) => (cfg.contas || []).some((c) => c.nome === nome);

// Assinatura para detectar importação repetida: descrição + valor + mês.
const normDesc = (s) => (s || "").toUpperCase().replace(/\s+/g, " ").trim();
const assinaturaTxn = (t) =>
  `${normDesc(t.desc)}|${(Number(t.valor) || 0).toFixed(2)}|${t.mes}`;

function aplicarRegras(desc, regras, contaAtual) {
  const d = (desc || "").toUpperCase();
  for (const r of regras || []) {
    // Regra com escopo de conta só vale ao importar o extrato daquela conta.
    if (r.conta && contaAtual && r.conta !== contaAtual) continue;
    if (d.includes((r.m || "").toUpperCase())) {
      return { cat: r.c, tipo: r.t, para: r.para, cartao: r.cartao, apelido: r.apelido };
    }
  }
  return null;
}

/* ---- Extração robusta de faturas (sem truncar) ------------------- */

const PROMPT_EXTRACAO = `Extraia TODAS as transações desta fatura de cartão brasileira.
Responda APENAS com um array JSON, sem markdown, sem explicação.
Formato compacto de cada item:
{"d":"DD/MM","s":"descricao","v":00.00,"pa":1,"pt":1}
- v = valor em reais, número positivo (estornos/pagamentos recebidos como valor negativo)
- pa = parcela atual, pt = total de parcelas. Se não for parcelado, use 1 e 1.
- Se a descrição indicar "03/06" ou "PARC 3/6", preencha pa=3 e pt=6.
- Ignore linhas de saldo, limite, total da fatura e encargos informativos.`;

// Puxa todos os objetos {...} completos de um array JSON, mesmo cortado no meio.
function extrairObjetos(texto) {
  const objs = [];
  const inicio = texto.indexOf("[");
  const corpo = inicio >= 0 ? texto.slice(inicio + 1) : texto;
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < corpo.length; i++) {
    const ch = corpo[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try { objs.push(JSON.parse(corpo.slice(start, i + 1))); } catch { /* fragmento inválido */ }
        start = -1;
      }
    } else if (ch === "]" && depth === 0) break;
  }
  return objs;
}

async function chamarAPI(blocos, promptExtra) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: [...blocos, { type: "text", text: PROMPT_EXTRACAO + (promptExtra || "") }] }],
    }),
  });
  const data = await r.json();
  if (data?.type === "error") throw new Error(data?.error?.message || "erro da API");
  const txt = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  return { txt, stop: data.stop_reason };
}

const assinatura = (o) => `${o?.d}|${o?.s}|${o?.v}|${o?.pa}|${o?.pt}`;

// Extrai de UMA fonte (um arquivo ou um bloco de texto), continuando se truncar.
async function extrairDeFonte(blocos, onProgresso) {
  let itens = [];
  let extra = "";
  for (let passo = 0; passo < 6; passo++) {
    const { txt, stop } = await chamarAPI(blocos, extra);
    let novos = extrairObjetos(txt);
    // continuação pode repetir a âncora: remove a sobreposição com a cauda já lida
    if (itens.length && novos.length) {
      const cauda = new Set(itens.slice(-8).map(assinatura));
      while (novos.length && cauda.has(assinatura(novos[0]))) novos.shift();
    }
    itens = itens.concat(novos);
    if (stop !== "max_tokens") break; // terminou de verdade
    const ultimo = itens[itens.length - 1];
    if (!ultimo) break; // truncou sem nada aproveitável
    extra = `\n\nVocê já extraiu até esta transação: "${ultimo.s}" (R$ ${ultimo.v}, ${ultimo.d}). ` +
      `Continue a extração a partir da PRÓXIMA linha da fatura, na mesma ordem, SEM repetir nenhuma anterior. ` +
      `Responda apenas com o array JSON das transações restantes.`;
    onProgresso && onProgresso(itens.length);
  }
  return itens;
}

/* ---- Extração de EXTRATO de conta (qualquer banco/formato) -------- */

const PROMPT_EXTRATO = `Extraia TODAS as transações deste extrato bancário brasileiro (qualquer banco, qualquer formato — PDF, texto colado, print).
Responda APENAS com um array JSON, sem markdown, sem explicação.
Formato compacto de cada item:
{"d":"DD/MM","s":"descricao","v":00.00}
- v = valor em reais, COM SINAL: positivo para entrada/crédito, negativo para saída/débito/pagamento.
- Preserve a descrição original da linha (nome do recebedor/pagador, tipo de operação).
- Ignore linhas de "Saldo do dia", totais de resumo mensal, cabeçalhos e informações de atendimento.
- Uma linha por transação, na ordem em que aparecem.`;

async function chamarAPIExtrato(blocos, promptExtra) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: [...blocos, { type: "text", text: PROMPT_EXTRATO + (promptExtra || "") }] }],
    }),
  });
  const data = await r.json();
  if (data?.type === "error") throw new Error(data?.error?.message || "erro da API");
  const txt = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  return { txt, stop: data.stop_reason };
}

const assinaturaExtrato = (o) => `${o?.d}|${o?.s}|${o?.v}`;

async function extrairExtratoDeFonte(blocos, onProgresso) {
  let itens = [];
  let extra = "";
  for (let passo = 0; passo < 6; passo++) {
    const { txt, stop } = await chamarAPIExtrato(blocos, extra);
    let novos = extrairObjetos(txt);
    if (itens.length && novos.length) {
      const cauda = new Set(itens.slice(-8).map(assinaturaExtrato));
      while (novos.length && cauda.has(assinaturaExtrato(novos[0]))) novos.shift();
    }
    itens = itens.concat(novos);
    if (stop !== "max_tokens") break;
    const ultimo = itens[itens.length - 1];
    if (!ultimo) break;
    extra = `\n\nVocê já extraiu até esta transação: "${ultimo.s}" (R$ ${ultimo.v}, ${ultimo.d}). ` +
      `Continue a extração a partir da PRÓXIMA linha do extrato, na mesma ordem, SEM repetir nenhuma anterior. ` +
      `Responda apenas com o array JSON das transações restantes.`;
    onProgresso && onProgresso(itens.length);
  }
  return itens;
}

// Data "DD/MM" do extrato + ano de referência -> "YYYY-MM-DD" (assume ano corrente; se o mês
// já passou bastante à frente do mês de hoje, deixa como está — extratos raramente cruzam ano
// sem dizer, e o usuário confere na revisão).
const isoDeExtrato = (dm, anoRef) => {
  const [d, m] = (dm || "").split("/");
  if (!d || !m) return "";
  return `${anoRef}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

// Classifica uma linha do extrato usando: 1) match com movimento previsto já lançado,
// 2) regras aprendidas (despesa/receita/transferência/pagamento de fatura), 3) deixa em branco p/ perguntar.
function classificarLinhaExtrato(linha, contaNome, cfg, mov) {
  const abs = Math.abs(linha.v);
  const iso = linha.dataISO;

  // 1) Já existe um movimento "a conciliar" nesta conta com valor e data próximos (±2 dias)?
  const candidato = (mov || []).find((m) => {
    if (m.conta !== contaNome || m.conciliado) return false;
    if (Math.abs(Math.abs(m.valor) - abs) > 0.01) return false;
    if (!iso || !m.data) return false;
    const dias = Math.abs((new Date(iso) - new Date(m.data)) / 86400000);
    return dias <= 2;
  });
  if (candidato) return { acao: "conciliar", movId: candidato.id, sugestaoTexto: candidato.desc };

  // 1b) É a OUTRA PONTA de uma transferência entre contas suas?
  // Existe uma transferência em OUTRA conta, com o valor oposto (sinal contrário),
  // data próxima, ainda não pareada, cujo destino é esta conta (ou destino em branco)?
  const outraPonta = (mov || []).find((m) => {
    if (m.tipo !== "transferencia" || m.conta === contaNome) return false;
    if (m.ref?.pareado) return false;                          // já casada com a outra ponta
    if (Math.abs(m.valor + linha.v) > 0.01) return false;      // sinais opostos, mesmo módulo
    if (!iso || !m.data) return false;
    const dias = Math.abs((new Date(iso) - new Date(m.data)) / 86400000);
    if (dias > 3) return false;
    const destino = m.ref?.destino;
    return !destino || destino === contaNome;                  // destino bate (ou não foi informado)
  });
  if (outraPonta) {
    return { acao: "transferencia", contaOrigemPar: outraPonta.conta, parId: outraPonta.id, sugestaoTexto: `↔ ${outraPonta.conta}` };
  }

  // 2) Regras aprendidas (com escopo da conta que está sendo importada)
  const regra = aplicarRegras(linha.s, cfg.regras || [], contaNome);
  const apelido = regra?.apelido || "";
  if (regra?.tipo === "TRANSFER") return { acao: "transferencia", contaDestino: regra.para, apelido };
  if (regra?.tipo === "PAGAMENTO_FATURA") return { acao: "pagamento", cartaoAlvo: regra.cartao, apelido };
  if (regra?.tipo === "IN") return { acao: "receita", cat: regra.cat, apelido };
  if (regra?.tipo === "PJ" || regra?.tipo === "PF") return { acao: "despesa", tipo: regra.tipo, cat: regra.cat, apelido };

  // 3) Sem regra: propõe pelo sinal, mas sem categoria — usuário confirma.
  return linha.v >= 0 ? { acao: "receita", cat: "" } : { acao: "despesa", tipo: "", cat: "" };
}



/* ------------------------------------------------------------------ */
/* APP                                                                 */
/* ------------------------------------------------------------------ */

export default function PainelFinanceiro() {
  const [aba, setAba] = useState("painel");
  const [txns, setTxns] = useState([]);
  const [mov, setMov] = useState([]); // razão das contas
  const [cfg, setCfg] = useState(CONFIG_PADRAO);
  const [mes, setMes] = useState(hojeYM());
  const [extratoAlvo, setExtratoAlvo] = useState(null); // conta/cartão aberto no Extrato
  const abrirExtrato = (nome) => { setExtratoAlvo(nome); setAba("lanc"); };
  const [carregando, setCarregando] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await window.storage.get(K_TXN);
        if (t?.value) setTxns(JSON.parse(t.value));
      } catch { /* primeira vez */ }
      try {
        const c = await window.storage.get(K_CFG);
        if (c?.value) {
          const merged = { ...CONFIG_PADRAO, ...JSON.parse(c.value) };
          // Merge por nome: garante que toda conta/cartão do setup real exista,
          // sem apagar o que o usuário já tem nem tocar em saldo. Idempotente.
          const nomesConta = new Set((merged.contas || []).map((x) => x.nome));
          const faltamContas = CONFIG_PADRAO.contas.filter((x) => !nomesConta.has(x.nome));
          const nomesCard = new Set((merged.cards || []).map((x) => x.nome));
          const faltamCards = CONFIG_PADRAO.cards.filter((x) => !nomesCard.has(x.nome));
          // Regras: mesma lógica — completa por padrão "m" (o gatilho da regra), sem duplicar
          // nem sobrescrever regras que o usuário já aprendeu/editou.
          const gatilhos = new Set((merged.regras || []).map((r) => (r.m || "").toUpperCase()));
          const faltamRegras = CONFIG_PADRAO.regras.filter((r) => !gatilhos.has((r.m || "").toUpperCase()));
          if (faltamContas.length || faltamCards.length || faltamRegras.length) {
            merged.contas = [...(merged.contas || []), ...faltamContas.map((x) => ({ ...x }))];
            merged.cards = [...(merged.cards || []), ...faltamCards.map((x) => ({ ...x }))];
            merged.regras = [...(merged.regras || []), ...faltamRegras.map((x) => ({ ...x }))];
            window.storage.set(K_CFG, JSON.stringify(merged)).catch(() => {});
          }
          // Garante saldoInicial em toda conta (preserva marca de investimento).
          merged.contas = (merged.contas || []).map((x) => ({
            nome: x.nome,
            saldoInicial: x.saldoInicial ?? 0,
            ...(x.inv ? { inv: true } : {}),
          }));
          // Top-up de recorrentes: garante previsão do mês atual e do próximo em Contas a pagar.
          if ((merged.recorrentes || []).length) {
            const ap = [...(merged.aPagar || [])];
            const meses = [hojeYM(), addMeses(hojeYM(), 1)];
            let mudou = false;
            (merged.recorrentes || []).forEach((r) => {
              meses.forEach((ym) => {
                const existe = ap.some((c) => c.serieId === r.id && (c.venc || "").slice(0, 7) === ym);
                if (!existe) {
                  const dia = String(r.dia || 1).padStart(2, "0");
                  ap.push({ id: uid(), nome: r.apelido, apelido: r.apelido, valor: r.valor, venc: `${ym}-${dia}`, pago: false, tipo: "recorrente", gatilho: r.gatilho, lado: r.lado, cat: r.cat, conta: r.conta, serieId: r.id });
                  mudou = true;
                }
              });
            });
            if (mudou) { merged.aPagar = ap; window.storage.set(K_CFG, JSON.stringify(merged)).catch(() => {}); }
          }
          setCfg(merged);
        }
      } catch { /* primeira vez */ }
      try {
        const m = await window.storage.get(K_MOV);
        if (m?.value) setMov(JSON.parse(m.value));
      } catch { /* primeira vez */ }
      setCarregando(false);
    })();
  }, []);

  const aviso = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const salvarTxns = async (novos) => {
    setTxns(novos);
    try { await window.storage.set(K_TXN, JSON.stringify(novos)); }
    catch { aviso("Não consegui salvar. Tente de novo."); }
  };

  const salvarMov = async (novos) => {
    setMov(novos);
    try { await window.storage.set(K_MOV, JSON.stringify(novos)); }
    catch { aviso("Não consegui salvar os movimentos."); }
  };

  const salvarCfg = async (novo) => {
    setCfg(novo);
    try { await window.storage.set(K_CFG, JSON.stringify(novo)); }
    catch { aviso("Não consegui salvar os ajustes."); }
  };

  const mesesDisponiveis = useMemo(() => {
    const s = new Set(txns.map((t) => t.mes));
    s.add(hojeYM());
    return [...s].sort().reverse();
  }, [txns]);

  const doMes = useMemo(() => txns.filter((t) => t.mes === mes), [txns, mes]);

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap');

        :root{
          --ink:#14162a; --surface:#1c1f38; --surface2:#242844; --line:#31365a;
          --pj:#4fd1c5; --pf:#f2b544; --in:#6ee7a8; --alerta:#ff6b6b;
          --txt:#eef0fa; --mut:#8a90b0;
        }
        *{box-sizing:border-box;}
        .app{
          background:var(--ink); color:var(--txt); min-height:100vh;
          font-family:'IBM Plex Sans',system-ui,sans-serif; padding:20px;
        }
        .num{font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums;}
        h1,h2,h3,.disp{font-family:'Space Grotesk',sans-serif; letter-spacing:-.02em; margin:0;}

        .top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:20px;}
        .brand h1{font-size:22px;font-weight:700;}
        .brand p{margin:2px 0 0;color:var(--mut);font-size:12.5px;}

        .tabs{display:flex;gap:4px;background:var(--surface);padding:4px;border-radius:12px;flex-wrap:wrap;}
        .tab{display:flex;align-items:center;gap:6px;background:none;border:0;color:var(--mut);
          padding:8px 13px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:500;
          font-family:inherit;transition:.15s;}
        .tab:hover{color:var(--txt);}
        .tab.on{background:var(--surface2);color:var(--txt);}

        .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;}
        .grid{display:grid;gap:14px;}
        .kpis{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));}
        .kpi .lbl{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;}
        .kpi .val{font-size:23px;font-weight:600;margin-top:7px;}

        /* SIGNATURE: a barra do desmisturado */
        .split{margin-top:6px;}
        .splitbar{display:flex;height:34px;border-radius:9px;overflow:hidden;border:1px solid var(--line);}
        .splitseg{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;
          font-family:'IBM Plex Mono',monospace;color:#14162a;transition:width .5s ease;white-space:nowrap;overflow:hidden;}
        .splitleg{display:flex;gap:18px;margin-top:10px;font-size:12px;color:var(--mut);flex-wrap:wrap;}
        .dot{width:9px;height:9px;border-radius:3px;display:inline-block;margin-right:6px;}

        .pagar-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(49,54,90,.5);font-size:13px;}
        .pagar-row:last-child{border-bottom:none;}
        .pagar-row .check{width:19px;height:19px;border-radius:5px;border:1.5px solid var(--line);background:transparent;
          display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--in);flex:none;padding:0;}
        .pagar-row .check:hover{border-color:var(--in);}
        .pagar-row.pago{opacity:.5;}
        .pagar-row.pago .check{background:var(--in);border-color:var(--in);color:#14162a;}
        .pagar-row.pago .nome{text-decoration:line-through;}

        .modal-bg{position:fixed;inset:0;background:rgba(8,9,20,.66);display:flex;align-items:center;
          justify-content:center;z-index:50;padding:20px;}
        .modal{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px;
          width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.4);}
        .modal h3{font-size:15px;margin:0 0 3px;}
        .modal .campo{margin-top:12px;}
        .modal .campo label{display:block;font-size:11px;color:var(--mut);text-transform:uppercase;
          letter-spacing:.06em;font-weight:600;margin-bottom:5px;}
        .modal .campo select,.modal .campo input{width:100%;}
        .modal .acoes{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}
        .subh{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin:12px 0 4px;color:var(--mut);}
        .subh.red{color:var(--alerta);}
        .edit-row{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(49,54,90,.5);flex-wrap:wrap;}

        .mesnav{display:flex;align-items:center;gap:10px;}
        .mesnav button{width:30px;height:30px;border-radius:8px;border:1px solid var(--line);background:var(--surface2);
          color:var(--txt);display:flex;align-items:center;justify-content:center;cursor:pointer;}
        .mesnav button:hover{border-color:var(--pj);}
        .mesnav .rot{min-width:88px;text-align:center;font-weight:600;font-size:13px;text-transform:capitalize;}
        .badge{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:600;}
        .badge.ok{background:rgba(110,231,168,.15);color:var(--in);}
        .badge.prev{background:rgba(242,181,68,.15);color:var(--pf);}
        .clickrow{cursor:pointer;}
        .clickrow:hover td{background:rgba(255,255,255,.03);}

        .lanc-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
        .filtros{display:flex;gap:10px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);
          border-radius:14px;padding:12px;}
        .filtros .fbox{display:flex;flex-direction:column;gap:4px;flex:1 1 150px;min-width:130px;}
        .filtros .fbox label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);padding-left:2px;}
        .filtros select{width:100%;}
        .saldocard{display:flex;align-items:center;justify-content:space-between;gap:16px;
          background:linear-gradient(135deg,var(--surface),var(--surface2));border:1px solid var(--line);
          border-radius:14px;padding:16px 18px;flex-wrap:wrap;}

        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{text-align:left;color:var(--mut);font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;
          padding:8px 8px;border-bottom:1px solid var(--line);font-weight:600;}
        td{padding:9px 8px;border-bottom:1px solid rgba(49,54,90,.5);}
        tr.row{position:relative;}
        .spine{width:3px;border-radius:2px;height:22px;display:block;}

        select,input{background:var(--surface2);border:1px solid var(--line);color:var(--txt);
          border-radius:8px;padding:7px 9px;font-size:12.5px;font-family:inherit;outline:none;}
        select:focus,input:focus{border-color:var(--pj);}
        input[type=file]{display:none;}

        .btn{display:inline-flex;align-items:center;gap:7px;background:var(--pj);color:#0d1024;border:0;
          border-radius:9px;padding:10px 15px;font-size:13px;font-weight:600;cursor:pointer;
          font-family:inherit;transition:.15s;}
        .btn:hover{filter:brightness(1.1);}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .btn.ghost{background:var(--surface2);color:var(--txt);border:1px solid var(--line);}
        .btn.sm{padding:6px 11px;font-size:12px;}
        .icon{background:none;border:0;color:var(--mut);cursor:pointer;padding:4px;border-radius:6px;}
        .icon:hover{color:var(--alerta);}

        .drop{border:1.5px dashed var(--line);border-radius:14px;padding:38px 20px;text-align:center;
          cursor:pointer;transition:.18s;background:var(--surface);}
        .drop:hover{border-color:var(--pj);background:var(--surface2);}

        .alertbox{display:flex;align-items:center;gap:10px;background:rgba(255,107,107,.1);
          border:1px solid rgba(255,107,107,.35);border-radius:11px;padding:11px 14px;font-size:13px;}

        .pill{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;font-family:'IBM Plex Mono',monospace;}
        .empty{text-align:center;padding:44px 20px;color:var(--mut);font-size:13.5px;}
        .toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--surface2);
          border:1px solid var(--line);padding:11px 18px;border-radius:10px;font-size:13px;z-index:99;}
        .scroll{overflow-x:auto;}
        @media (max-width:640px){ .app{padding:13px;} .kpi .val{font-size:19px;} }
        @media (prefers-reduced-motion:reduce){ *{transition:none!important;animation:none!important;} }
      `}</style>

      <div className="top">
        <div className="brand">
          <h1>Desmistura</h1>
          <p>Faturas entram bagunçadas. Saem separadas em PF e PJ.</p>
        </div>
        <div className="tabs">
          {[
            ["painel", "Painel", LayoutDashboard],
            ["importar", "Importar fatura", Upload],
            ["lanc", "Lançamentos", ListOrdered],
            ["prev", "Previsão", TrendingUp],
            ["cfg", "Ajustes", Settings2],
          ].map(([id, txt, Ico]) => (
            <button key={id} className={`tab ${aba === id ? "on" : ""}`} onClick={() => setAba(id)}>
              <Ico size={14} /> {txt}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="empty"><Loader2 size={20} className="spin" /> Carregando…</div>
      ) : (
        <>
          {aba === "painel" && (
            <Painel doMes={doMes} mes={mes} setMes={setMes} meses={mesesDisponiveis} cfg={cfg} salvarCfg={salvarCfg} mov={mov} salvarMov={salvarMov} abrirExtrato={abrirExtrato} />
          )}
          {aba === "importar" && (
            <Importar cfg={cfg} txns={txns} salvarTxns={salvarTxns} salvarCfg={salvarCfg} aviso={aviso} irPara={setAba} mov={mov} salvarMov={salvarMov} />
          )}
          {aba === "lanc" && (
            <Lancamentos txns={txns} mes={mes} setMes={setMes} cfg={cfg} salvarTxns={salvarTxns}
              mov={mov} salvarMov={salvarMov} salvarCfg={salvarCfg} aviso={aviso} alvoInicial={extratoAlvo} />
          )}
          {aba === "prev" && <Previsao txns={txns} cfg={cfg} />}
          {aba === "cfg" && <Ajustes cfg={cfg} salvarCfg={salvarCfg} txns={txns} salvarTxns={salvarTxns} aviso={aviso} mov={mov} salvarMov={salvarMov} />}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAINEL                                                              */
/* ------------------------------------------------------------------ */

function ModalPagar({ conta, contas, onConfirmar, onCancelar }) {
  const cash = contas.filter((c) => !c.inv);
  const lista = cash.length ? cash : contas;
  const [origem, setOrigem] = useState(lista[0]?.nome || "");
  const [data, setData] = useState((conta.venc && conta.venc.length === 10) ? conta.venc : hojeISO());
  const [valor, setValor] = useState(String(conta.valor ?? ""));

  return (
    <div className="modal-bg" onClick={onCancelar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Pagar “{conta.nome}”</h3>
        <p style={{ color: "var(--mut)", fontSize: 12, margin: 0 }}>O valor sai do saldo da conta escolhida.</p>

        <div className="campo">
          <label>De qual conta saiu o dinheiro?</label>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {contas.map((c) => (
              <option key={c.nome} value={c.nome}>{c.nome}{c.inv ? " (investimento)" : ""}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div className="campo" style={{ flex: 1 }}>
            <label>Valor</label>
            <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="campo" style={{ flex: 1 }}>
            <label>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <div className="acoes">
          <button className="btn ghost sm" onClick={onCancelar}>Cancelar</button>
          <button className="btn sm" disabled={!origem || !valor}
            onClick={() => onConfirmar({ origem, data, valor: Math.abs(Number(valor) || 0) })}>
            <Check size={14} /> Confirmar pagamento
          </button>
        </div>
      </div>
    </div>
  );
}

function Painel({ doMes, mes, setMes, meses, cfg, salvarCfg, mov, salvarMov, abrirExtrato }) {
  const ent = doMes.filter((t) => t.tipo === "IN").reduce((s, t) => s + t.valor, 0);
  const pj = doMes.filter((t) => t.tipo === "PJ").reduce((s, t) => s + t.valor, 0);
  const pf = doMes.filter((t) => t.tipo === "PF").reduce((s, t) => s + t.valor, 0);
  const saidas = pj + pf;
  const saldo = ent - saidas;
  const tot = saidas || 1;

  // Contas: saldo CALCULADO. Investimentos ficam à parte (fora do fluxo de caixa).
  const contasTodas = cfg.contas || [];
  const contas = contasTodas.filter((c) => !c.inv);
  const investimentos = contasTodas.filter((c) => c.inv);
  const saldoDe = (c) => saldoConta(c, mov);
  const saldoGeral = contas.reduce((s, c) => s + saldoDe(c), 0);
  const totalInv = investimentos.reduce((s, c) => s + saldoDe(c), 0);
  const cards = cfg.cards || [];
  const faturaDe = (nome) =>
    doMes.filter((t) => t.cartao === nome && t.tipo !== "IN").reduce((s, t) => s + t.valor, 0);

  // Contas a pagar
  const hojeDia = hojeISO();
  const aPagar = cfg.aPagar || [];
  const abertasRaw = aPagar.filter((c) => !c.pago);
  // Recorrente/parcela: mostrar só a PRÓXIMA de cada série (a de menor vencimento).
  const proxDaSerie = {};
  abertasRaw.forEach((c) => {
    if (!c.serieId) return;
    if (!proxDaSerie[c.serieId] || c.venc < proxDaSerie[c.serieId].venc) proxDaSerie[c.serieId] = c;
  });
  const abertas = abertasRaw.filter((c) => !c.serieId || proxDaSerie[c.serieId].id === c.id);
  const pagas = aPagar.filter((c) => c.pago);
  const atrasadas = abertas.filter((c) => c.venc < hojeDia).sort((a, b) => a.venc.localeCompare(b.venc));
  const proximas = abertas.filter((c) => c.venc >= hojeDia).sort((a, b) => a.venc.localeCompare(b.venc));
  const totalAberto = abertas.reduce((s, c) => s + Number(c.valor || 0), 0);

  const [pagando, setPagando] = useState(null); // conta a pagar aberta no modal

  // Confirma o pagamento: cria um movimento de saída na conta escolhida e marca paga.
  const confirmarPagamento = ({ origem, data, valor }) => {
    const m = {
      id: uid(),
      conta: origem,
      data,
      valor: -Math.abs(valor),
      desc: `Pagamento: ${pagando.nome}`,
      tipo: "pagamento",
      ref: { kind: "aPagar", id: pagando.id },
      origem: "manual",
      conciliado: false,
    };
    salvarMov([...(mov || []), m]);
    salvarCfg({
      ...cfg,
      aPagar: aPagar.map((c) => (c.id === pagando.id
        ? { ...c, pago: true, movId: m.id, pagoConta: origem, pagoData: data }
        : c)),
    });
    setPagando(null);
  };

  // Desmarca: remove o movimento vinculado e o saldo volta.
  const desmarcarPagamento = (conta) => {
    salvarMov((mov || []).filter((m) => m.id !== conta.movId));
    salvarCfg({
      ...cfg,
      aPagar: aPagar.map((c) => (c.id === conta.id
        ? { ...c, pago: false, movId: undefined, pagoConta: undefined, pagoData: undefined }
        : c)),
    });
  };

  const porCat = useMemo(() => {
    const m = {};
    doMes.filter((t) => t.tipo !== "IN").forEach((t) => {
      const k = t.cat || "Sem categoria";
      if (!m[k]) m[k] = { cat: k, valor: 0, tipo: t.tipo };
      m[k].valor += t.valor;
    });
    return Object.values(m).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [doMes]);

  const porCartao = useMemo(() => {
    const m = {};
    doMes.filter((t) => t.tipo !== "IN").forEach((t) => {
      const k = t.cartao || "—";
      m[k] = (m[k] || 0) + t.valor;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [doMes]);

  const hoje = new Date().getDate();
  const vencendo = (cfg.fixas || []).filter((f) => f.dia >= hoje && f.dia <= hoje + 10);

  const semCat = doMes.filter((t) => !t.cat).length;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <span style={{ color: "var(--mut)", fontSize: 12.5 }}>
          {doMes.length} lançamento{doMes.length !== 1 ? "s" : ""}
        </span>
        {semCat > 0 && (
          <span className="pill" style={{ background: "rgba(255,107,107,.15)", color: "var(--alerta)" }}>
            {semCat} sem categoria
          </span>
        )}
      </div>

      {vencendo.length > 0 && (
        <div className="alertbox">
          <AlertTriangle size={17} color="var(--alerta)" />
          <span>
            Vence nos próximos 10 dias:{" "}
            <strong>{vencendo.map((v) => `${v.nome} (dia ${v.dia})`).join(" · ")}</strong>
          </span>
        </div>
      )}

      <div className="grid kpis">
        <Kpi lbl="Entradas" val={ent} cor="var(--in)" />
        <Kpi lbl="Saídas" val={saidas} cor="var(--txt)" />
        <Kpi lbl="Saldo do mês" val={saldo} cor={saldo >= 0 ? "var(--in)" : "var(--alerta)"} />
        <Kpi lbl="Gasto PJ" val={pj} cor="var(--pj)" />
        <Kpi lbl="Gasto PF" val={pf} cor="var(--pf)" />
      </div>

      {/* SIGNATURE: a barra do desmisturado */}
      <div className="card split">
        <div style={{ fontSize: 11, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: 9 }}>
          O que era misturado
        </div>
        <div className="splitbar">
          <div className="splitseg" style={{ width: `${(pj / tot) * 100}%`, background: "var(--pj)" }}>
            {pj / tot > 0.12 && `${Math.round((pj / tot) * 100)}% PJ`}
          </div>
          <div className="splitseg" style={{ width: `${(pf / tot) * 100}%`, background: "var(--pf)" }}>
            {pf / tot > 0.12 && `${Math.round((pf / tot) * 100)}% PF`}
          </div>
        </div>
        <div className="splitleg">
          <span><i className="dot" style={{ background: "var(--pj)" }} />Empresa · {brl(pj)}</span>
          <span><i className="dot" style={{ background: "var(--pf)" }} />Pessoal · {brl(pf)}</span>
        </div>
      </div>

      {/* Contas a pagar */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <h3 style={{ fontSize: 14 }}>Contas a pagar</h3>
          <span className="num" style={{ fontSize: 12.5, color: abertas.length ? "var(--txt)" : "var(--mut)" }}>
            {abertas.length ? `${brl(totalAberto)} em aberto` : "tudo em dia"}
          </span>
        </div>
        {atrasadas.length > 0 && <div className="subh red">Atrasadas</div>}
        {atrasadas.map((c) => (
          <div key={c.id} className="pagar-row">
            <button className="check" onClick={() => setPagando(c)} title="Registrar pagamento" />
            <span className="nome" style={{ flex: 1 }}>{c.apelido || c.nome}{c.tipo === "recorrente" && <span title="recorrente" style={{ color: "var(--pj)" }}> ↻</span>}</span>
            <span className="num" style={{ color: "var(--alerta)", fontSize: 12 }}>{dataBR(c.venc)}</span>
            <span className="num" style={{ fontWeight: 600, minWidth: 92, textAlign: "right", color: "var(--alerta)" }}>{brl(c.valor)}</span>
          </div>
        ))}
        {proximas.length > 0 && <div className="subh">Próximas</div>}
        {proximas.map((c) => (
          <div key={c.id} className="pagar-row">
            <button className="check" onClick={() => setPagando(c)} title="Registrar pagamento" />
            <span className="nome" style={{ flex: 1 }}>{c.apelido || c.nome}{c.tipo === "recorrente" && <span title="recorrente" style={{ color: "var(--pj)" }}> ↻</span>}</span>
            <span className="num" style={{ color: "var(--mut)", fontSize: 12 }}>{dataBR(c.venc)}</span>
            <span className="num" style={{ fontWeight: 600, minWidth: 92, textAlign: "right" }}>{brl(c.valor)}</span>
          </div>
        ))}
        {abertas.length === 0 && <div className="empty">Nenhuma conta em aberto.</div>}

        {pagas.length > 0 && <div className="subh">Pagas</div>}
        {pagas.map((c) => (
          <div key={c.id} className="pagar-row pago">
            <button className="check" onClick={() => desmarcarPagamento(c)} title="Desfazer pagamento"><Check size={12} /></button>
            <span className="nome" style={{ flex: 1 }}>
              {c.nome}
              {c.pagoConta && <span style={{ color: "var(--mut)", fontSize: 11 }}> · saiu de {c.pagoConta}</span>}
            </span>
            <span className="num" style={{ color: "var(--mut)", fontSize: 12 }}>{dataBR(c.pagoData || c.venc)}</span>
            <span className="num" style={{ fontWeight: 600, minWidth: 92, textAlign: "right", color: "var(--mut)" }}>{brl(c.valor)}</span>
          </div>
        ))}
      </div>

      {pagando && (
        <ModalPagar
          conta={pagando}
          contas={contasTodas}
          onConfirmar={confirmarPagamento}
          onCancelar={() => setPagando(null)}
        />
      )}

      {/* Resumo de contas e cartões */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <h3 style={{ fontSize: 14 }}>Minhas contas</h3>
            <span className="num" style={{ fontSize: 13, fontWeight: 600, color: saldoGeral < 0 ? "var(--alerta)" : "var(--txt)" }}>{brl(saldoGeral)}</span>
          </div>
          <p style={{ color: "var(--mut)", fontSize: 11, margin: "0 0 8px" }}>Saldo calculado pelos extratos importados.</p>
          {contas.length === 0 ? (
            <div className="empty">Nenhuma conta cadastrada.</div>
          ) : (
            <table>
              <tbody>
                {contas.map((c) => {
                  const sc = saldoDe(c);
                  return (
                    <tr key={c.nome} className="clickrow" onClick={() => abrirExtrato(c.nome)}>
                      <td>{c.nome}</td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 600, color: sc < 0 ? "var(--alerta)" : "var(--txt)" }}>
                        {brl(sc)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {investimentos.length > 0 && (
            <>
              <div className="subh" style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
                <span>Investimentos · fora do fluxo</span>
                <span className="num" style={{ textTransform: "none", letterSpacing: 0 }}>{brl(totalInv)}</span>
              </div>
              <table>
                <tbody>
                  {investimentos.map((c) => (
                    <tr key={c.nome} className="clickrow" onClick={() => abrirExtrato(c.nome)}>
                      <td style={{ color: "var(--mut)" }}>{c.nome}</td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 600, color: "var(--mut)" }}>{brl(saldoDe(c))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Meus cartões</h3>
          {cards.length === 0 ? (
            <div className="empty">Nenhum cartão cadastrado.</div>
          ) : (
            <table>
              <tbody>
                {cards.map((c) => {
                  const fat = faturaDe(c.nome);
                  return (
                    <tr key={c.nome} className="clickrow" onClick={() => abrirExtrato(c.nome)}>
                      <td>
                        {c.nome}
                        <div style={{ color: "var(--mut)", fontSize: 11, marginTop: 2 }} className="num">
                          limite {brl(c.limite)} · vence {c.venc}
                        </div>
                      </td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                        {brl(fat)}
                        <div style={{ color: "var(--mut)", fontSize: 10.5, fontWeight: 400, marginTop: 2 }}>fatura</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Maiores categorias</h3>
          {porCat.length === 0 ? (
            <div className="empty">Sem gastos neste mês.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, porCat.length * 34)}>
              <BarChart data={porCat} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="cat" width={128} tick={{ fill: "#8a90b0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => brl(v)}
                  contentStyle={{ background: "#242844", border: "1px solid #31365a", borderRadius: 9, fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,.04)" }}
                />
                <Bar dataKey="valor" radius={[0, 5, 5, 0]}>
                  {porCat.map((c, i) => (
                    <Cell key={i} fill={c.tipo === "PJ" ? "#4fd1c5" : "#f2b544"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Por cartão / conta</h3>
          {porCartao.length === 0 ? (
            <div className="empty">Sem gastos neste mês.</div>
          ) : (
            <table>
              <tbody>
                {porCartao.map(([c, v]) => (
                  <tr key={c}>
                    <td>{c}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{brl(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ lbl, val, cor }) {
  return (
    <div className="card kpi">
      <div className="lbl">{lbl}</div>
      <div className="val num" style={{ color: cor }}>{brl(val)}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* IMPORTAR                                                            */
/* ------------------------------------------------------------------ */

function Importar({ cfg, txns, salvarTxns, salvarCfg, aviso, irPara, mov, salvarMov }) {
  const [modo, setModo] = useState("fatura");
  const fontes = fontesDe(cfg);
  const [cartao, setCartao] = useState(fontes[0]);
  const [mesRef, setMesRef] = useState(hojeYM());
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [extraidos, setExtraidos] = useState([]);
  const [erro, setErro] = useState(null);
  const [texto, setTexto] = useState("");
  const inputRef = useRef(null);

  // Converte itens crus {d,s,v,pa,pt} em lançamentos e joga na revisão.
  const montar = (arr) => {
    const novos = arr.map((x) => {
      const rr = aplicarRegras(x.s, cfg.regras);
      // Numa fatura de cartão só valem regras de lado (PF/PJ/IN). Regras de extrato
      // (transferência, pagamento de fatura) não se aplicam aqui.
      const regra = rr && (rr.tipo === "PF" || rr.tipo === "PJ" || rr.tipo === "IN") ? rr : null;
      const nomeExib = rr?.apelido || x.s || "";
      return {
        id: uid(),
        mes: mesRef,
        data: x.d || "",
        desc: nomeExib,
        valor: Math.abs(Number(x.v) || 0),
        tipo: regra?.tipo || "",
        cat: regra?.cat || "",
        sug: regra ? { tipo: regra.tipo, cat: regra.cat } : null, // o que a regra sugeriu (ou nada)
        cartao,
        pa: Number(x.pa) || 1,
        pt: Number(x.pt) || 1,
      };
    });
    setExtraidos(novos);
    if (!novos.length) setErro("Não achei transações. Tente um print mais nítido.");
  };

  // Linhas que já parecem existir (mesma descrição + valor + mês).
  const assinaturasExistentes = useMemo(
    () => new Set(txns.map(assinaturaTxn)),
    [txns]
  );
  const ehDup = (t) => assinaturasExistentes.has(assinaturaTxn(t));

  // UMA chamada por arquivo; junta os resultados de todos.
  const lerArquivos = async (files) => {
    if (!files?.length) return;
    const lista = Array.from(files);
    setLendo(true); setErro(null); setProgresso("");
    try {
      let todos = [];
      for (let idx = 0; idx < lista.length; idx++) {
        const f = lista[idx];
        const rotulo = lista.length > 1 ? `Arquivo ${idx + 1} de ${lista.length}` : "";
        setProgresso(rotulo);
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = () => rej(new Error("falha ao ler"));
          r.readAsDataURL(f);
        });
        const bloco = f.type === "application/pdf"
          ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
          : { type: "image", source: { type: "base64", media_type: f.type || "image/jpeg", data: b64 } };
        // se o arquivo for grande e truncar, extrairDeFonte continua sozinho
        const itens = await extrairDeFonte([bloco], (n) =>
          setProgresso(`${rotulo ? rotulo + " · " : ""}${n} linhas…`));
        todos = todos.concat(itens);
      }
      montar(todos);
    } catch (e) {
      setErro("Não consegui ler o arquivo. Tente um print mais nítido ou cole o texto abaixo.");
    } finally {
      setLendo(false); setProgresso("");
    }
  };

  const lerTexto = async () => {
    if (!texto.trim()) return;
    setLendo(true); setErro(null); setProgresso("");
    try {
      const linhas = texto.split("\n").filter((l) => l.trim());
      const TAM = 50;
      let todos = [];
      if (linhas.length <= TAM) {
        todos = await extrairDeFonte([{ type: "text", text: texto }],
          (n) => setProgresso(`${n} linhas…`));
      } else {
        // texto muito longo: quebra em blocos e concatena
        const blocos = [];
        for (let i = 0; i < linhas.length; i += TAM) blocos.push(linhas.slice(i, i + TAM).join("\n"));
        for (let i = 0; i < blocos.length; i++) {
          setProgresso(`Bloco ${i + 1} de ${blocos.length}…`);
          const itens = await extrairDeFonte([{ type: "text", text: blocos[i] }]);
          todos = todos.concat(itens);
        }
      }
      montar(todos);
    } catch (e) {
      setErro("A leitura falhou. Tente novamente ou cole o texto da fatura.");
    } finally {
      setLendo(false); setProgresso("");
    }
  };

  const mudar = (id, campo, val) => {
    setExtraidos((p) => p.map((t) => (t.id === id ? { ...t, [campo]: val } : t)));
  };

  const confirmar = async () => {
    const semCat = extraidos.filter((t) => !t.tipo).length;

    // Aprendizado: SÓ cria regra para descrição nova (sem regra que já a cubra).
    // Correção pontual de uma linha que veio de regra é EXCEÇÃO daquela linha —
    // nunca apaga, sobrescreve nem gera regra concorrente. A regra segue de pé.
    const regras = [...cfg.regras];
    let excecoes = 0;
    extraidos.forEach((t) => {
      if (!t.tipo || !t.cat) return;            // sem categoria: nada a aprender
      if (t.sug) {                              // uma regra já sugeriu algo aqui
        const mudou = t.sug.tipo !== t.tipo || t.sug.cat !== t.cat;
        if (mudou) excecoes++;                  // você corrigiu: exceção da linha, regra intacta
        return;                                 // em ambos os casos, não mexe nas regras
      }
      // descrição nova, sem regra: essa sim vira regra
      const chave = (t.desc || "").toUpperCase().split(/\s+/).slice(0, 2).join(" ");
      if (chave.length < 4) return;
      if (!regras.some((r) => r.m === chave)) regras.push({ m: chave, c: t.cat, t: t.tipo });
    });

    // não guarda o campo auxiliar 'sug' junto dos lançamentos salvos
    const paraSalvar = extraidos.map(({ sug, ...t }) => t);

    await salvarCfg({ ...cfg, regras });
    await salvarTxns([...txns, ...paraSalvar]);
    setExtraidos([]); setTexto("");
    const extra = excecoes ? ` ${excecoes} correção(ões) valem só nesta fatura.` : "";
    aviso((semCat ? `Salvo. ${semCat} lançamento(s) sem categoria.` : "Fatura salva e categorizada.") + extra);
    irPara("painel");
  };

  if (extraidos.length > 0) {
    const semTipo = extraidos.filter((t) => !t.tipo).length;
    const dups = extraidos.filter(ehDup);
    return (
      <div className="grid" style={{ gap: 14 }}>
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15 }}>{extraidos.length} transações encontradas</h3>
            <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "4px 0 0" }}>
              {semTipo === 0
                ? "Todas categorizadas pelas regras. Confira e salve."
                : `${semTipo} precisam de PF ou PJ. O resto veio pronto pelas regras.`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => setExtraidos([])}>Descartar</button>
            <button className="btn" onClick={confirmar}><Check size={15} /> Salvar lançamentos</button>
          </div>
        </div>

        {dups.length > 0 && (
          <div className="alertbox" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={17} color="var(--alerta)" />
              <span>
                <strong>{dups.length}</strong> {dups.length === 1 ? "linha já parece estar" : "linhas já parecem estar"} em{" "}
                <strong>{mesLabel(mesRef)}</strong>. Estão marcadas abaixo — você decide.
              </span>
            </span>
            <button className="btn ghost sm" onClick={() => setExtraidos((p) => p.filter((t) => !ehDup(t)))}>
              Remover as repetidas
            </button>
          </div>
        )}

        <div className="card scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 8 }}></th>
                <th>Data</th><th>Descrição</th><th style={{ textAlign: "right" }}>Valor</th>
                <th>Lado</th><th>Categoria</th><th style={{ width: 34 }}></th>
              </tr>
            </thead>
            <tbody>
              {extraidos.map((t) => (
                <tr key={t.id} className="row" style={ehDup(t) ? { background: "rgba(255,107,107,.06)" } : undefined}>
                  <td>
                    <span className="spine" style={{
                      background: t.tipo === "PJ" ? "var(--pj)" : t.tipo === "PF" ? "var(--pf)"
                        : t.tipo === "IN" ? "var(--in)" : "var(--line)",
                    }} />
                  </td>
                  <td className="num" style={{ color: "var(--mut)" }}>{t.data}</td>
                  <td>
                    {t.desc}
                    {t.sug && (t.sug.tipo !== t.tipo || t.sug.cat !== t.cat) && (
                      <span className="pill" style={{ background: "var(--surface2)", color: "var(--mut)", marginLeft: 7 }}>
                        corrigida
                      </span>
                    )}
                    {ehDup(t) && (
                      <span className="pill" style={{ background: "rgba(255,107,107,.15)", color: "var(--alerta)", marginLeft: 7 }}>
                        repetida?
                      </span>
                    )}
                    {t.pt > 1 && (
                      <span className="pill" style={{ background: "var(--surface2)", color: "var(--mut)", marginLeft: 7 }}>
                        {t.pa}/{t.pt}
                      </span>
                    )}
                  </td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{brl(t.valor)}</td>
                  <td>
                    <select value={t.tipo} onChange={(e) => { mudar(t.id, "tipo", e.target.value); mudar(t.id, "cat", ""); }}>
                      <option value="">—</option>
                      <option value="PJ">PJ</option>
                      <option value="PF">PF</option>
                      <option value="IN">Entrada</option>
                    </select>
                  </td>
                  <td>
                    <select value={t.cat} onChange={(e) => mudar(t.id, "cat", e.target.value)} disabled={!t.tipo}>
                      <option value="">—</option>
                      <OpcoesCat tipo={t.tipo} />
                    </select>
                  </td>
                  <td>
                    <button className="icon" onClick={() => setExtraidos((p) => p.filter((x) => x.id !== t.id))}>
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 14, maxWidth: 780 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`btn sm ${modo === "fatura" ? "" : "ghost"}`} onClick={() => setModo("fatura")}>Fatura de cartão</button>
        <button className={`btn sm ${modo === "extrato" ? "" : "ghost"}`} onClick={() => setModo("extrato")}><Receipt size={14} /> Extrato de conta</button>
      </div>

      {modo === "extrato" ? (
        <ImportarExtrato cfg={cfg} mov={mov} salvarMov={salvarMov} txns={txns} salvarTxns={salvarTxns} aviso={aviso} irPara={irPara} />
      ) : (
      <>
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--mut)" }}>
            Cartão / conta
            <select value={cartao} onChange={(e) => setCartao(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
              {fontes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "var(--mut)" }}>
            Mês de referência
            <input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} style={{ width: "100%", marginTop: 6 }} />
          </label>
        </div>
      </div>

      <div className="drop" onClick={() => !lendo && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple
          onChange={(e) => lerArquivos(e.target.files)} />
        {lendo ? (
          <>
            <Loader2 size={26} color="var(--pj)" />
            <h3 style={{ fontSize: 15, marginTop: 12 }}>Lendo a fatura…</h3>
            <p style={{ color: "var(--mut)", fontSize: 12.5, marginTop: 5 }}>
              {progresso || "Isso leva alguns segundos."}
            </p>
          </>
        ) : (
          <>
            <Upload size={26} color="var(--pj)" />
            <h3 style={{ fontSize: 15, marginTop: 12 }}>Solte o print ou o PDF da fatura</h3>
            <p style={{ color: "var(--mut)", fontSize: 12.5, marginTop: 5 }}>
              Pode mandar vários de uma vez. PNG, JPG ou PDF.
            </p>
          </>
        )}
      </div>

      {erro && <div className="alertbox"><AlertTriangle size={16} color="var(--alerta)" /> {erro}</div>}

      <div className="card">
        <h3 style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
          <FileText size={15} color="var(--mut)" /> Ou cole o texto da fatura
        </h3>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5}
          placeholder="Cole aqui as linhas copiadas do app do banco…"
          style={{
            width: "100%", marginTop: 10, background: "var(--surface2)", border: "1px solid var(--line)",
            color: "var(--txt)", borderRadius: 8, padding: 10, fontSize: 12.5, fontFamily: "'IBM Plex Mono',monospace",
            resize: "vertical", outline: "none",
          }} />
        <button className="btn sm" style={{ marginTop: 10 }} onClick={lerTexto} disabled={lendo || !texto.trim()}>
          <Wand2 size={14} /> Ler texto colado
        </button>
      </div>
      </>
      )}
    </div>
  );
}

function BlocoRegra({ l, mudar }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--mut)" }}>
        <input type="checkbox" checked={l.virarRegra} onChange={(e) => mudar(l.id, "virarRegra", e.target.checked)} style={{ width: "auto" }} />
        criar regra
      </label>
      {l.virarRegra && (
        <input value={l.gatilhoRegra} onChange={(e) => mudar(l.id, "gatilhoRegra", e.target.value)}
          title="Gatilho: trecho da descrição que dispara a regra" placeholder="gatilho"
          style={{ width: 130, fontSize: 11.5, padding: "3px 6px" }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* IMPORTAR EXTRATO (Fase 1)                                           */
/* ------------------------------------------------------------------ */

function ImportarExtrato({ cfg, mov, salvarMov, txns, salvarTxns, aviso, irPara }) {
  const contas = cfg.contas || [];
  const [contaNome, setContaNome] = useState(contas[0]?.nome || "");
  const [anoRef, setAnoRef] = useState(String(new Date().getFullYear()));
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState(null);
  const [texto, setTexto] = useState("");
  const [linhas, setLinhas] = useState([]); // linhas em revisão
  const inputRef = useRef(null);

  // Fingerprint de movimentos JÁ importados de extrato nesta conta — protege contra reimportar o mesmo período.
  const assinaturasImportadas = useMemo(() => {
    const s = new Set();
    (mov || []).forEach((m) => {
      if (m.conta === contaNome && m.origem === "extrato") {
        s.add(`${m.data}|${(Math.abs(m.valor)).toFixed(2)}`);
      }
    });
    return s;
  }, [mov, contaNome]);

  const montar = (itens) => {
    const vistos = new Set(); // dedup dentro da própria leva (mesma linha lida 2x por continuação)
    const prontas = [];
    itens.forEach((x) => {
      const dataISO = isoDeExtrato(x.d, anoRef);
      const valor = Number(x.v) || 0;
      const chaveLeva = `${dataISO}|${valor.toFixed(2)}|${(x.s || "").slice(0, 20)}`;
      if (vistos.has(chaveLeva)) return;
      vistos.add(chaveLeva);

      const jaImportada = assinaturasImportadas.has(`${dataISO}|${Math.abs(valor).toFixed(2)}`);
      const cls = jaImportada ? { acao: "duplicada" } : classificarLinhaExtrato({ ...x, v: valor, dataISO }, contaNome, cfg, mov);

      prontas.push({
        id: uid(), data: x.d || "", dataISO,
        desc: cls.apelido || x.s || "",   // exibe o apelido quando a regra tem um
        descBanco: x.s || "",             // guarda o texto cru do banco
        valor,
        acao: cls.acao, tipo: cls.tipo || "", cat: cls.cat || "",
        contaDestino: cls.contaDestino || "", cartaoAlvo: cls.cartaoAlvo || "",
        parId: cls.parId || null, contaOrigemPar: cls.contaOrigemPar || "",
        movId: cls.movId || null, matchDesc: cls.sugestaoTexto || "",
        aceitarMatch: cls.acao === "conciliar",
        incluirMesmoDup: false,
        // criação opcional de regra (só quando o usuário marcar na revisão)
        virarRegra: false,
        gatilhoRegra: (x.s || "").toUpperCase().split(/\s+/).filter((w) => w.length > 2).slice(0, 2).join(" "),
      });
    });
    setLinhas(prontas);
    if (!prontas.length) setErro("Não achei transações. Tente um arquivo mais nítido.");
  };

  const lerArquivos = async (files) => {
    if (!files?.length) return;
    const lista = Array.from(files);
    setLendo(true); setErro(null); setProgresso("");
    try {
      let todos = [];
      for (let idx = 0; idx < lista.length; idx++) {
        const f = lista[idx];
        const rotulo = lista.length > 1 ? `Arquivo ${idx + 1} de ${lista.length}` : "";
        setProgresso(rotulo);
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = () => rej(new Error("falha ao ler"));
          r.readAsDataURL(f);
        });
        const bloco = f.type === "application/pdf"
          ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
          : { type: "image", source: { type: "base64", media_type: f.type || "image/jpeg", data: b64 } };
        const itens = await extrairExtratoDeFonte([bloco], (n) =>
          setProgresso(`${rotulo ? rotulo + " · " : ""}${n} linhas…`));
        todos = todos.concat(itens);
      }
      montar(todos);
    } catch (e) {
      setErro("Não consegui ler o arquivo. Tente novamente ou cole o texto abaixo.");
    } finally {
      setLendo(false); setProgresso("");
    }
  };

  const lerTexto = async () => {
    if (!texto.trim()) return;
    setLendo(true); setErro(null); setProgresso("");
    try {
      const linhasTxt = texto.split("\n").filter((l) => l.trim());
      const TAM = 60;
      let todos = [];
      if (linhasTxt.length <= TAM) {
        todos = await extrairExtratoDeFonte([{ type: "text", text: texto }], (n) => setProgresso(`${n} linhas…`));
      } else {
        const blocos = [];
        for (let i = 0; i < linhasTxt.length; i += TAM) blocos.push(linhasTxt.slice(i, i + TAM).join("\n"));
        for (let i = 0; i < blocos.length; i++) {
          setProgresso(`Bloco ${i + 1} de ${blocos.length}…`);
          todos = todos.concat(await extrairExtratoDeFonte([{ type: "text", text: blocos[i] }]));
        }
      }
      montar(todos);
    } catch (e) {
      setErro("A leitura falhou. Tente novamente ou cole o texto do extrato.");
    } finally {
      setLendo(false); setProgresso("");
    }
  };

  const mudar = (id, campo, val) => setLinhas((p) => p.map((l) => (l.id === id ? { ...l, [campo]: val } : l)));

  const pendentes = linhas.filter((l) => l.acao === "despesa" && (!l.tipo || !l.cat));
  const pendentesReceita = linhas.filter((l) => l.acao === "receita" && !l.cat);
  const conciliaveis = linhas.filter((l) => l.acao === "conciliar");
  const duplicadas = linhas.filter((l) => l.acao === "duplicada" && !l.incluirMesmoDup);

  const confirmar = async () => {
    let novoMov = [...(mov || [])];
    let novoTxns = [...txns];
    let novasRegras = [...(cfg.regras || [])];
    let nConciliadas = 0, nNovas = 0, nIgnoradas = 0;

    linhas.forEach((l) => {
      if (l.acao === "duplicada" && !l.incluirMesmoDup) { nIgnoradas++; return; }

      if (l.acao === "conciliar" && l.aceitarMatch) {
        novoMov = novoMov.map((m) => (m.id === l.movId ? { ...m, conciliado: true, descBanco: l.desc } : m));
        nConciliadas++;
        return;
      }

      // "conciliar" recusado vira lançamento novo pelo sinal, igual não-match:
      const ehDespesaSemTipo = (l.acao === "despesa" || (l.acao === "conciliar" && !l.aceitarMatch && l.valor < 0)) && !l.tipo;

      if (l.acao === "receita" || (l.acao === "conciliar" && !l.aceitarMatch && l.valor >= 0)) {
        const txnId = uid();
        const apel = l.desc && l.descBanco && l.desc !== l.descBanco ? l.desc : "";
        const raw = l.descBanco || l.desc;
        novoTxns.push({ id: txnId, mes: l.dataISO.slice(0, 7), data: l.data, desc: raw, apelido: apel, valor: Math.abs(l.valor), tipo: "IN", cat: l.cat || "", cartao: contaNome, pa: 1, pt: 1 });
        novoMov.push({ id: uid(), conta: contaNome, data: l.dataISO, valor: Math.abs(l.valor), desc: raw, apelido: apel, tipo: "lancamento", ref: { kind: "txn", id: txnId }, origem: "extrato", conciliado: true });
        nNovas++;
      } else if (l.acao === "despesa" || (l.acao === "conciliar" && !l.aceitarMatch)) {
        const txnId = uid();
        const apel = l.desc && l.descBanco && l.desc !== l.descBanco ? l.desc : "";
        const raw = l.descBanco || l.desc;
        novoTxns.push({ id: txnId, mes: l.dataISO.slice(0, 7), data: l.data, desc: raw, apelido: apel, valor: Math.abs(l.valor), tipo: l.tipo || "PF", cat: l.cat || "", cartao: contaNome, pa: 1, pt: 1 });
        novoMov.push({ id: uid(), conta: contaNome, data: l.dataISO, valor: -Math.abs(l.valor), desc: raw, apelido: apel, tipo: "lancamento", ref: { kind: "txn", id: txnId }, origem: "extrato", conciliado: true });
        // Sem aprendizado automático: no dia a dia o app não cria regra sozinho.
        // Regra nova é sempre manual (Ajustes). Correção aqui vale só para esta linha.
        nNovas++;
      } else if (l.acao === "pagamento") {
        novoMov.push({ id: uid(), conta: contaNome, data: l.dataISO, valor: -Math.abs(l.valor), desc: l.desc, tipo: "pagamento", ref: { kind: "cartao", nome: l.cartaoAlvo }, origem: "extrato", conciliado: true });
        nNovas++;
      } else if (l.acao === "transferencia") {
        // Se casou com a outra ponta (transferência já registrada em outra conta),
        // liga as duas e marca ambas como pareadas — não é receita nem gasto.
        const novo = { id: uid(), conta: contaNome, data: l.dataISO, valor: l.valor, desc: l.desc, tipo: "transferencia", origem: "extrato", conciliado: true };
        if (l.parId) {
          novo.ref = { kind: "transfer", par: l.parId };
          novoMov = novoMov.map((m) => (m.id === l.parId ? { ...m, ref: { ...(m.ref || {}), pareado: true, par: novo.id } } : m));
        } else {
          novo.ref = { kind: "transfer", destino: l.contaDestino || null };
        }
        novoMov.push(novo);
        nNovas++;
      }
    });

    // Regras que o usuário marcou "criar regra" na revisão (só despesa/receita com gatilho).
    let nRegras = 0;
    linhas.forEach((l) => {
      if (!l.virarRegra || !(l.acao === "despesa" || l.acao === "receita")) return;
      const g = (l.gatilhoRegra || "").trim().toUpperCase();
      if (g.length < 3) return;
      const lado = l.acao === "receita" ? "IN" : l.tipo;
      if (!lado || !l.cat) return;
      if (novasRegras.some((r) => (r.m || "").toUpperCase() === g && (r.conta || "") === "")) return;
      novasRegras.push({ m: g, c: l.cat, t: lado });
      nRegras++;
    });

    // Auto-check: linha do extrato que bate com previsão recorrente/parcela (gatilho + mês) -> marca paga
    let apAtualizado = [...(cfg.aPagar || [])];
    let nChecked = 0;
    linhas.forEach((l) => {
      if (l.acao === "duplicada" && !l.incluirMesmoDup) return;
      if (!(l.acao === "despesa" || l.acao === "pagamento")) return;
      const txtL = (l.descBanco || l.desc || "").toUpperCase();
      const ymL = (l.dataISO || "").slice(0, 7);
      const idx = apAtualizado.findIndex((c) =>
        !c.pago && c.gatilho && (c.tipo === "recorrente" || c.tipo === "parcela") &&
        (c.venc || "").slice(0, 7) === ymL &&
        txtL.includes((c.gatilho || "").toUpperCase())
      );
      if (idx >= 0) {
        apAtualizado[idx] = { ...apAtualizado[idx], pago: true, pagoData: l.dataISO, valor: Math.abs(l.valor), pagoConta: contaNome };
        nChecked++;
      }
    });

    const cfgFinal = { ...cfg };
    if (nRegras > 0) cfgFinal.regras = novasRegras;
    if (nChecked > 0) cfgFinal.aPagar = apAtualizado;
    if (nRegras > 0 || nChecked > 0) await salvarCfg(cfgFinal);
    await salvarMov(novoMov);
    await salvarTxns(novoTxns);
    setLinhas([]); setTexto("");
    aviso(`Extrato lançado: ${nConciliadas} conciliada(s), ${nNovas} nova(s)${nChecked ? `, ${nChecked} conta(s) fixa(s) baixada(s)` : ""}${nRegras ? `, ${nRegras} regra(s)` : ""}.`);
    irPara("painel");
  };

  // ---------- Revisão ----------
  if (linhas.length > 0) {
    return (
      <div className="grid" style={{ gap: 14 }}>
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15 }}>{linhas.length} linhas de "{contaNome}"</h3>
            <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "4px 0 0" }}>
              {conciliaveis.length > 0 && `${conciliaveis.length} batem com o que você já lançou. `}
              {(pendentes.length + pendentesReceita.length) > 0 && `${pendentes.length + pendentesReceita.length} precisam de categoria. `}
              {duplicadas.length > 0 && `${duplicadas.length} já importadas antes (ignoradas).`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => setLinhas([])}>Descartar</button>
            <button className="btn" onClick={confirmar}><Check size={15} /> Confirmar e lançar</button>
          </div>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>O que é</th><th>Detalhe</th><th style={{ textAlign: "right" }}>Valor</th></tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="row" style={l.acao === "duplicada" ? { opacity: 0.5 } : undefined}>
                  <td className="num" style={{ color: "var(--mut)" }}>{l.data}</td>
                  <td style={{ maxWidth: 220 }}>{l.desc}</td>
                  <td>
                    {l.acao === "duplicada" ? (
                      <span className="pill" style={{ background: "rgba(255,107,107,.15)", color: "var(--alerta)" }}>já importada</span>
                    ) : l.acao === "conciliar" ? (
                      <span className="badge ok">bate com lançamento</span>
                    ) : (
                      <select value={l.acao} onChange={(e) => mudar(l.id, "acao", e.target.value)}>
                        <option value="receita">Receita</option>
                        <option value="despesa">Despesa</option>
                        <option value="pagamento">Pagamento de fatura</option>
                        <option value="transferencia">Transferência</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {l.acao === "duplicada" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--mut)" }}>
                        <input type="checkbox" checked={l.incluirMesmoDup} onChange={(e) => mudar(l.id, "incluirMesmoDup", e.target.checked)} style={{ width: "auto" }} />
                        importar mesmo assim
                      </label>
                    )}
                    {l.acao === "conciliar" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 11.5, color: "var(--mut)" }}>= "{l.matchDesc}"</span>
                        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                          <input type="checkbox" checked={l.aceitarMatch} onChange={(e) => mudar(l.id, "aceitarMatch", e.target.checked)} style={{ width: "auto" }} />
                          {l.aceitarMatch ? "é o mesmo" : "não é — classificar como novo"}
                        </label>
                      </div>
                    )}
                    {l.acao === "receita" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <select value={l.cat} onChange={(e) => mudar(l.id, "cat", e.target.value)}>
                          <option value="">— categoria —</option>
                          <OpcoesCat tipo="IN" />
                        </select>
                        {l.cat && <BlocoRegra l={l} mudar={mudar} />}
                      </div>
                    )}
                    {l.acao === "despesa" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select value={l.tipo} onChange={(e) => mudar(l.id, "tipo", e.target.value)}>
                            <option value="">PF/PJ?</option><option value="PJ">PJ</option><option value="PF">PF</option>
                          </select>
                          <select value={l.cat} onChange={(e) => mudar(l.id, "cat", e.target.value)} disabled={!l.tipo}>
                            <option value="">categoria</option>
                            <OpcoesCat tipo={l.tipo || "PF"} />
                          </select>
                        </div>
                        {l.tipo && l.cat && <BlocoRegra l={l} mudar={mudar} />}
                      </div>
                    )}
                    {l.acao === "pagamento" && (
                      <select value={l.cartaoAlvo} onChange={(e) => mudar(l.id, "cartaoAlvo", e.target.value)}>
                        <option value="">— qual cartão —</option>
                        {(cfg.cards || []).map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                      </select>
                    )}
                    {l.acao === "transferencia" && (
                      l.parId ? (
                        <span className="badge ok" title="Casou com uma transferência de outra conta">↔ {l.contaOrigemPar}</span>
                      ) : (
                        <select value={l.contaDestino} onChange={(e) => mudar(l.id, "contaDestino", e.target.value)}>
                          <option value="">— {l.valor < 0 ? "pra qual conta" : "de qual conta"} —</option>
                          {contas.filter((c) => c.nome !== contaNome).map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                        </select>
                      )
                    )}
                  </td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600, color: l.valor < 0 ? "var(--alerta)" : "var(--in)" }}>
                    {l.valor < 0 ? "−" : "+"}{brl(Math.abs(l.valor))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------- Formulário de upload ----------
  return (
    <div className="grid" style={{ gap: 14, maxWidth: 780 }}>
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--mut)" }}>
            Conta
            <select value={contaNome} onChange={(e) => setContaNome(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
              {contas.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "var(--mut)" }}>
            Ano do extrato
            <input value={anoRef} onChange={(e) => setAnoRef(e.target.value)} style={{ width: "100%", marginTop: 6 }} />
          </label>
        </div>
      </div>

      <div className="drop" onClick={() => !lendo && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple onChange={(e) => lerArquivos(e.target.files)} />
        {lendo ? (
          <>
            <Loader2 size={26} color="var(--pj)" />
            <h3 style={{ fontSize: 15, marginTop: 12 }}>Lendo o extrato…</h3>
            <p style={{ color: "var(--mut)", fontSize: 12.5, marginTop: 5 }}>{progresso || "Isso leva alguns segundos."}</p>
          </>
        ) : (
          <>
            <Receipt size={26} color="var(--pj)" />
            <h3 style={{ fontSize: 15, marginTop: 12 }}>Solte o extrato da conta (PDF, print)</h3>
            <p style={{ color: "var(--mut)", fontSize: 12.5, marginTop: 5 }}>Pode mandar vários meses de uma vez.</p>
          </>
        )}
      </div>

      {erro && <div className="alertbox"><AlertTriangle size={16} color="var(--alerta)" /> {erro}</div>}

      <div className="card">
        <h3 style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
          <FileText size={15} color="var(--mut)" /> Ou cole o texto do extrato
        </h3>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5}
          placeholder="Cole aqui as linhas copiadas do app do banco…"
          style={{ width: "100%", marginTop: 10, background: "var(--surface2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 8, padding: 10, fontSize: 12.5, fontFamily: "'IBM Plex Mono',monospace", resize: "vertical", outline: "none" }} />
        <button className="btn sm" style={{ marginTop: 10 }} onClick={lerTexto} disabled={lendo || !texto.trim()}>
          <Wand2 size={14} /> Ler texto colado
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LANÇAMENTOS                                                         */
/* ------------------------------------------------------------------ */

function Lancamentos({ txns, mes, setMes, cfg, salvarTxns, mov, salvarMov, salvarCfg, aviso, alvoInicial }) {
  const contas = cfg.contas || [];
  const cards = cfg.cards || [];
  const [fonte, setFonte] = useState(alvoInicial || "__todas__");
  const [fLado, setFLado] = useState("");
  const [fCat, setFCat] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [mesX, setMesX] = useState(mes || hojeYM());
  const [editando, setEditando] = useState(null);
  const [editTxn, setEditTxn] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const ehCartao = cards.some((c) => c.nome === fonte);
  const ehContaSel = contas.some((c) => c.nome === fonte);
  const txnById = useMemo(() => { const o = {}; (txns || []).forEach((t) => (o[t.id] = t)); return o; }, [txns]);

  const saldoContaAte = (nome, ym) => {
    const ini = Number((contas.find((c) => c.nome === nome)?.saldoInicial) || 0);
    const soma = (mov || []).filter((m) => m.conta === nome && (m.data || "").slice(0, 7) <= ym).reduce((s, m) => s + Number(m.valor || 0), 0);
    return ini + soma;
  };

  // ---- monta as linhas conforme a fonte ----
  const ladoDeMov = (m) => {
    if (m.tipo === "transferencia") return "TRANSF";
    if (m.tipo === "pagamento") return "FATURA";
    if (m.ref?.kind === "txn") return txnById[m.ref.id]?.tipo || "";
    return m.valor >= 0 ? "IN" : "";
  };
  const catDeMov = (m) => (m.ref?.kind === "txn" ? (txnById[m.ref.id]?.cat || "") : "");

  let linhas = [];
  if (ehCartao) {
    linhas = (txns || []).filter((t) => t.cartao === fonte && t.mes === mesX)
      .map((t) => ({ tipoLinha: "txn", raw: t, id: t.id, data: t.data, desc: t.desc, apelido: t.apelido, valor: t.tipo === "IN" ? t.valor : -t.valor, lado: t.tipo, cat: t.cat, pa: t.pa, pt: t.pt }));
  } else {
    const filtroConta = ehContaSel ? (m) => m.conta === fonte : () => true;
    linhas = (mov || []).filter((m) => filtroConta(m) && (m.data || "").slice(0, 7) === mesX)
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""))
      .map((m) => ({ tipoLinha: "mov", raw: m, id: m.id, data: dataBR(m.data), desc: m.desc, apelido: m.apelido, valor: Number(m.valor || 0), lado: ladoDeMov(m), cat: catDeMov(m) }));
  }

  // ---- filtros lado/categoria/tipo ----
  linhas = linhas.filter((l) => {
    if (fLado && l.lado !== fLado) return false;
    if (fCat && l.cat !== fCat) return false;
    if (fTipo === "entrada" && l.valor < 0) return false;
    if (fTipo === "saida" && (l.valor >= 0 || l.lado === "TRANSF")) return false;
    if (fTipo === "transferencia" && l.lado !== "TRANSF") return false;
    return true;
  });

  const catsUsadas = useMemo(() => {
    const s = new Set(); linhas.forEach((l) => l.cat && s.add(l.cat)); return [...s].sort();
  }, [fonte, mesX, mov, txns]);

  const corLado = (lado) => lado === "PJ" ? "var(--pj)" : lado === "PF" ? "var(--pf)" : lado === "IN" ? "var(--in)" : "var(--line)";
  const rotuloLado = (lado) => lado === "TRANSF" ? "transf." : lado === "FATURA" ? "fatura" : lado === "IN" ? "entrada" : lado || "";

  // ---- card do topo ----
  const cardTopo = (() => {
    if (ehContaSel) {
      const saldo = saldoContaAte(fonte, mesX);
      return <div className="saldocard">
        <div>
          <div className="subh" style={{ margin: 0 }}>Saldo · {fonte}</div>
          <div style={{ color: "var(--mut)", fontSize: 11.5, marginTop: 2 }}>ao fim de {mesLabel(mesX)}</div>
        </div>
        <div className="num" style={{ fontSize: 28, fontWeight: 700, color: saldo < 0 ? "var(--alerta)" : "var(--in)" }}>{brl(saldo)}</div>
      </div>;
    }
    if (ehCartao) {
      const compras = (txns || []).filter((t) => t.cartao === fonte && t.mes === mesX);
      const total = compras.filter((t) => t.tipo !== "IN").reduce((s, t) => s + t.valor, 0);
      const card = cards.find((c) => c.nome === fonte) || {};
      return <div className="saldocard">
        <div>
          <div className="subh" style={{ margin: 0 }}>Fatura · {fonte}</div>
          <div style={{ color: "var(--mut)", fontSize: 11.5, marginTop: 2 }}>
            {card.fechamento ? `fecha dia ${card.fechamento} · ` : ""}{card.venc ? `vence dia ${card.venc}` : "cadastre datas em Ajustes"}
          </div>
        </div>
        <div className="num" style={{ fontSize: 28, fontWeight: 700 }}>{brl(total)}</div>
      </div>;
    }
    return null;
  })();

  return (
    <div className="grid" style={{ gap: 14 }}>
      {/* cabeçalho: mês + botão lançar */}
      <div className="lanc-head">
        <div className="mesnav">
          <button onClick={() => setMesX(addMeses(mesX, -1))}><ChevronLeft size={16} /></button>
          <span className="rot">{mesLabel(mesX)}</span>
          <button onClick={() => setMesX(addMeses(mesX, 1))}><ChevronRight size={16} /></button>
        </div>
        <button className="btn sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Lançar à mão</button>
      </div>

      {/* filtros */}
      <div className="filtros">
        <div className="fbox">
          <label>Conta / cartão</label>
          <select value={fonte} onChange={(e) => { setFonte(e.target.value); setFCat(""); }}>
            <option value="__todas__">Todas as contas</option>
            <optgroup label="Contas">{contas.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}</optgroup>
            <optgroup label="Cartões">{cards.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}</optgroup>
          </select>
        </div>
        <div className="fbox">
          <label>Lado</label>
          <select value={fLado} onChange={(e) => setFLado(e.target.value)}>
            <option value="">Todos</option><option value="PJ">Empresa (PJ)</option><option value="PF">Pessoal (PF)</option><option value="IN">Entrada</option>
          </select>
        </div>
        <div className="fbox">
          <label>Categoria</label>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="">Todas</option>
            {catsUsadas.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="fbox">
          <label>Movimento</label>
          <select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="">Tudo</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="transferencia">Transferências</option>
          </select>
        </div>
      </div>

      {cardTopo}

      <div className="card scroll">
        {linhas.length === 0 ? (
          <div className="empty">Nada em {mesLabel(mesX)} com esse filtro.</div>
        ) : (
          <table>
            <thead><tr>
              <th style={{ width: 8 }}></th><th>Data</th><th>Descrição</th>
              <th style={{ textAlign: "right" }}>Valor</th><th>Lado</th><th>Categoria</th>
            </tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="clickrow" onClick={() => l.tipoLinha === "mov" ? abrirEdicaoMov(l.raw) : setEditTxn(l.raw)}>
                  <td><span className="spine" style={{ background: corLado(l.lado) }} /></td>
                  <td className="num" style={{ color: "var(--mut)" }}>{l.data || "—"}</td>
                  <td>
                    {l.desc}
                    {l.apelido && <span style={{ color: "var(--pj)", fontSize: 11 }}> · {l.apelido}</span>}
                    {l.pt > 1 && <span className="pill" style={{ background: "var(--surface2)", color: "var(--mut)", marginLeft: 7 }}>{l.pa}/{l.pt}</span>}
                  </td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600, color: l.valor < 0 ? "var(--alerta)" : "var(--in)" }}>
                    {l.valor < 0 ? "−" : "+"}{brl(Math.abs(l.valor))}
                  </td>
                  <td><span style={{ fontSize: 11, color: corLado(l.lado), fontWeight: 600 }}>{rotuloLado(l.lado)}</span></td>
                  <td style={{ color: "var(--mut)", fontSize: 12 }}>{l.cat || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <ModalEditarMov m={editando} cfg={cfg} contaAtual={editando.conta}
          onSalvar={(campos) => salvarEdicaoMov(editando, campos)} onCancelar={() => setEditando(null)} />
      )}
      {editTxn && (
        <ModalEditarTxn t={editTxn} onSalvar={(campos) => { salvarTxns((txns || []).map((x) => x.id === editTxn.id ? { ...x, ...campos } : x)); setEditTxn(null); }}
          onRemover={() => { salvarTxns((txns || []).filter((x) => x.id !== editTxn.id)); setEditTxn(null); }} onCancelar={() => setEditTxn(null)} />
      )}
      {addOpen && (
        <ModalAdd cfg={cfg} mesX={mesX} onCancelar={() => setAddOpen(false)}
          onAdd={(payload) => { adicionarManual(payload); setAddOpen(false); }} />
      )}
    </div>
  );

  function abrirEdicaoMov(m) {
    let ladoCache = "", catCache = "";
    if (m.ref?.kind === "txn") { const t = txnById[m.ref.id]; if (t) { ladoCache = t.tipo; catCache = t.cat; } }
    setEditando({ ...m, ladoCache, catCache });
  }

  function salvarEdicaoMov(m, campos) {
    const { desc, apelido, novoKind, lado, cat, destino, cartao } = campos;
    let novoTxns = [...(txns || [])];
    const novoTipo = (novoKind === "despesa" || novoKind === "receita") ? "lancamento" : novoKind;
    let ref = m.ref || {};
    const tinhaTxn = m.ref?.kind === "txn";
    if (novoKind === "despesa" || novoKind === "receita") {
      const ladoFinal = novoKind === "receita" ? "IN" : lado;
      if (tinhaTxn) novoTxns = novoTxns.map((t) => (t.id === m.ref.id ? { ...t, desc, apelido, tipo: ladoFinal, cat } : t));
      else { const tid = uid(); novoTxns.push({ id: tid, lote: m.lote, mes: (m.data || "").slice(0, 7), data: dataBR(m.data), desc, apelido, valor: Math.abs(m.valor), tipo: ladoFinal, cat, cartao: m.conta, pa: 1, pt: 1 }); ref = { kind: "txn", id: tid }; }
    } else {
      if (tinhaTxn) novoTxns = novoTxns.filter((t) => t.id !== m.ref.id);
      ref = novoKind === "pagamento" ? { kind: "cartao", nome: cartao } : { kind: "transfer", destino: destino || null };
    }
    const novoMov = (mov || []).map((x) => (x.id === m.id ? { ...x, desc, apelido, tipo: novoTipo, ref, natureza: campos.natureza, gatilhoRec: campos.gatilho, parcela: campos.parcela } : x));
    salvarMov(novoMov); salvarTxns(novoTxns);
    if (salvarCfg && (campos.natureza === "recorrente" || campos.natureza === "parcela")) {
      const nomeExib = apelido || desc, valorEst = Math.abs(m.valor), baseYM = (m.data || "").slice(0, 7), dia = String(campos.venc || 1).padStart(2, "0"), serieId = uid();
      let novasAP = [...(cfg.aPagar || [])];
      if (campos.natureza === "recorrente") {
        for (let k = 1; k <= 2; k++) { const ym = addMeses(baseYM, k); novasAP.push({ id: uid(), nome: desc, apelido: nomeExib, valor: valorEst, venc: `${ym}-${dia}`, pago: false, tipo: "recorrente", gatilho: campos.gatilho, lado: campos.lado, cat: campos.cat, conta: m.conta, serieId }); }
        salvarCfg({ ...cfg, aPagar: novasAP, recorrentes: [...(cfg.recorrentes || []), { id: serieId, apelido: nomeExib, gatilho: campos.gatilho, dia: Number(campos.venc) || 1, valor: valorEst, lado: campos.lado, cat: campos.cat, conta: m.conta }] });
      } else {
        const n = campos.parcela?.n || 1, total = campos.parcela?.total || 2;
        for (let k = 1; k <= total - n; k++) { const ym = addMeses(baseYM, k); novasAP.push({ id: uid(), nome: desc, apelido: `${nomeExib} ${n + k}/${total}`, valor: valorEst, venc: `${ym}-${dia}`, pago: false, tipo: "parcela", gatilho: campos.gatilho, lado: campos.lado, cat: campos.cat, conta: m.conta, serieId, parcela: { n: n + k, total } }); }
        salvarCfg({ ...cfg, aPagar: novasAP });
      }
    }
    setEditando(null);
  }

  function adicionarManual(p) {
    // p = { desc, valor, data, tipo:"entrada"|"saida"|"transferencia", origem, lado, cat, destino }
    const val = Math.abs(Number(p.valor) || 0);
    if (!p.desc || !val) return;
    if (p.tipo === "transferencia") {
      salvarMov([...(mov || []), { id: uid(), conta: p.origem, data: p.data, valor: -val, desc: p.desc, tipo: "transferencia", ref: { kind: "transfer", destino: p.destino || null }, origem: "manual", conciliado: false }]);
      return;
    }
    const ladoTxn = p.tipo === "entrada" ? "IN" : (p.lado || "PF");
    const txnId = uid();
    salvarTxns([...(txns || []), { id: txnId, mes: (p.data || "").slice(0, 7), data: dataBR(p.data), desc: p.desc, valor: val, tipo: ladoTxn, cat: p.cat || "", cartao: p.origem, pa: 1, pt: 1 }]);
    if (ehConta(cfg, p.origem)) {
      const sinal = p.tipo === "entrada" ? 1 : -1;
      salvarMov([...(mov || []), { id: uid(), conta: p.origem, data: p.data, valor: sinal * val, desc: p.desc, tipo: "lancamento", ref: { kind: "txn", id: txnId }, origem: "manual", conciliado: false }]);
    }
  }
}

// Edição leve de uma compra de cartão (txn)
function ModalEditarTxn({ t, onSalvar, onCancelar, onRemover }) {
  const [desc, setDesc] = useState(t.desc || "");
  const [apelido, setApelido] = useState(t.apelido || "");
  const [lado, setLado] = useState(t.tipo || "");
  const [cat, setCat] = useState(t.cat || "");
  return (
    <div className="modal-bg" onClick={onCancelar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Editar compra do cartão</h3>
        <p style={{ color: "var(--mut)", fontSize: 12, margin: 0 }}>{t.data} · {brl(t.valor)}{t.pt > 1 ? ` · ${t.pa}/${t.pt}` : ""}</p>
        <div className="campo"><label>Descrição</label><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="campo"><label>Apelido</label><input value={apelido} onChange={(e) => setApelido(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="campo" style={{ flex: 1 }}><label>Lado</label>
            <select value={lado} onChange={(e) => { setLado(e.target.value); setCat(""); }}><option value="">—</option><option value="PJ">PJ</option><option value="PF">PF</option><option value="IN">Entrada</option></select>
          </div>
          <div className="campo" style={{ flex: 1 }}><label>Categoria</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)} disabled={!lado}><option value="">—</option><OpcoesCat tipo={lado || "PF"} /></select>
          </div>
        </div>
        <div className="acoes" style={{ justifyContent: "space-between" }}>
          <button className="icon" onClick={onRemover} title="Excluir"><Trash2 size={15} /></button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost sm" onClick={onCancelar}>Cancelar</button>
            <button className="btn sm" onClick={() => onSalvar({ desc, apelido, tipo: lado, cat })}><Check size={14} /> Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lançar à mão: entrada / saída / transferência
function ModalAdd({ cfg, mesX, onAdd, onCancelar }) {
  const fontes = fontesDe(cfg);
  const contas = (cfg.contas || []).map((c) => c.nome);
  const [tipo, setTipo] = useState("saida");
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(`${mesX}-01`);
  const [origem, setOrigem] = useState(fontes[0] || "");
  const [lado, setLado] = useState("PF");
  const [cat, setCat] = useState("");
  const [destino, setDestino] = useState("");

  return (
    <div className="modal-bg" onClick={onCancelar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Lançar à mão</h3>
        <div className="campo"><label>O que é</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="entrada">Entrada</option><option value="saida">Saída</option><option value="transferencia">Transferência</option>
          </select>
        </div>
        <div className="campo"><label>Descrição</label><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="campo" style={{ flex: 1 }}><label>Valor</label><input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></div>
          <div className="campo" style={{ flex: 1 }}><label>Data</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        </div>
        <div className="campo"><label>{tipo === "transferencia" ? "Sai de qual conta" : "De onde sai / entra"}</label>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)}>{fontes.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        {tipo === "saida" && (
          <div style={{ display: "flex", gap: 10 }}>
            <div className="campo" style={{ flex: 1 }}><label>Lado</label>
              <select value={lado} onChange={(e) => { setLado(e.target.value); setCat(""); }}><option value="PJ">PJ</option><option value="PF">PF</option></select>
            </div>
            <div className="campo" style={{ flex: 1 }}><label>Categoria</label>
              <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">—</option><OpcoesCat tipo={lado} /></select>
            </div>
          </div>
        )}
        {tipo === "entrada" && (
          <div className="campo"><label>Categoria</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">—</option><OpcoesCat tipo="IN" /></select>
          </div>
        )}
        {tipo === "transferencia" && (
          <div className="campo"><label>Vai para qual conta</label>
            <select value={destino} onChange={(e) => setDestino(e.target.value)}><option value="">—</option>{contas.filter((c) => c !== origem).map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
        )}
        <div className="acoes">
          <button className="btn ghost sm" onClick={onCancelar}>Cancelar</button>
          <button className="btn sm" onClick={() => onAdd({ desc, valor, data, tipo, origem, lado, cat, destino })}><Plus size={14} /> Adicionar</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PREVISÃO                                                            */
/* ------------------------------------------------------------------ */

function ModalEditarMov({ m, cfg, contaAtual, onSalvar, onCancelar }) {
  const kindInicial = m.tipo === "pagamento" ? "pagamento"
    : m.tipo === "transferencia" ? "transferencia"
    : m.valor >= 0 ? "receita" : "despesa";
  const [kind, setKind] = useState(kindInicial);
  const [desc, setDesc] = useState(m.desc || "");
  const [apelido, setApelido] = useState(m.apelido || "");
  const [lado, setLado] = useState(kindInicial === "receita" ? "IN" : (m.ladoCache || ""));
  const [cat, setCat] = useState(m.catCache || "");
  const [destino, setDestino] = useState(m.ref?.destino || "");
  const [cartao, setCartao] = useState(m.ref?.nome || "");
  const [natureza, setNatureza] = useState(m.natureza || "avulsa"); // avulsa | recorrente | parcela
  const [venc, setVenc] = useState(String(new Date(m.data || Date.now()).getUTCDate()));
  const [pTotal, setPTotal] = useState(m.parcela?.total || 2);
  const [pN, setPN] = useState(m.parcela?.n || 1);
  const [gatilho, setGatilho] = useState(m.gatilhoRec || nomeBanco(m.desc || ""));
  const contas = (cfg.contas || []).filter((c) => c.nome !== contaAtual);

  // opções de tipo dependem do sinal (não dá receita negativa nem despesa positiva)
  const opcoesTipo = m.valor >= 0
    ? [["receita", "Receita"], ["transferencia", "Transferência (entrada)"]]
    : [["despesa", "Despesa"], ["pagamento", "Pagamento de fatura"], ["transferencia", "Transferência (saída)"]];

  const salvar = () => {
    onSalvar({
      desc, apelido, novoKind: kind, lado: kind === "receita" ? "IN" : lado, cat, destino, cartao,
      natureza, venc: Number(venc) || 1, gatilho,
      parcela: natureza === "parcela" ? { n: Number(pN) || 1, total: Number(pTotal) || 2 } : null,
    });
  };

  return (
    <div className="modal-bg" onClick={onCancelar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Editar lançamento</h3>
        <p style={{ color: "var(--mut)", fontSize: 12, margin: 0 }}>
          {dataBR(m.data)} · {m.valor < 0 ? "−" : "+"}{brl(Math.abs(m.valor))} <span style={{ opacity: .7 }}>(valor e data travados — vêm do banco)</span>
        </p>

        <div className="campo">
          <label>O que é</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {opcoesTipo.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="campo">
          <label>Descrição</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="campo">
          <label>Apelido (opcional)</label>
          <input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="nome curto complementar" />
        </div>

        {kind === "despesa" && (
          <div style={{ display: "flex", gap: 10 }}>
            <div className="campo" style={{ flex: 1 }}>
              <label>Lado</label>
              <select value={lado} onChange={(e) => { setLado(e.target.value); setCat(""); }}>
                <option value="">—</option><option value="PJ">PJ</option><option value="PF">PF</option>
              </select>
            </div>
            <div className="campo" style={{ flex: 1 }}>
              <label>Categoria</label>
              <select value={cat} onChange={(e) => setCat(e.target.value)} disabled={!lado}>
                <option value="">—</option>
                <OpcoesCat tipo={lado || "PF"} />
              </select>
            </div>
          </div>
        )}
        {kind === "receita" && (
          <div className="campo">
            <label>Categoria</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">—</option>
              <OpcoesCat tipo="IN" />
            </select>
          </div>
        )}
        {kind === "transferencia" && (
          <div className="campo">
            <label>{m.valor < 0 ? "Para qual conta" : "De qual conta"}</label>
            <select value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">—</option>
              {contas.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
        )}
        {kind === "pagamento" && (
          <div className="campo">
            <label>Cartão da fatura</label>
            <select value={cartao} onChange={(e) => setCartao(e.target.value)}>
              <option value="">—</option>
              {(cfg.cards || []).map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
        )}

        {(kind === "despesa" || kind === "pagamento") && (
          <div style={{ borderTop: "1px solid rgba(49,54,90,.5)", marginTop: 6, paddingTop: 10 }}>
            <div className="campo">
              <label>Natureza</label>
              <select value={natureza} onChange={(e) => setNatureza(e.target.value)}>
                <option value="avulsa">Avulsa</option>
                <option value="recorrente">Recorrente (todo mês) ↻</option>
                <option value="parcela">Parcelada</option>
              </select>
            </div>
            {natureza === "recorrente" && (
              <div style={{ display: "flex", gap: 10 }}>
                <div className="campo" style={{ flex: 1 }}>
                  <label>Dia do vencimento</label>
                  <input type="number" min="1" max="31" value={venc} onChange={(e) => setVenc(e.target.value)} />
                </div>
                <div className="campo" style={{ flex: 2 }}>
                  <label>Quem o banco mostra (gatilho)</label>
                  <input value={gatilho} onChange={(e) => setGatilho(e.target.value)} placeholder="ex.: TIM S A" />
                </div>
              </div>
            )}
            {natureza === "parcela" && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div className="campo" style={{ flex: 1 }}>
                  <label>Parcela nº</label>
                  <input type="number" min="1" value={pN} onChange={(e) => setPN(e.target.value)} />
                </div>
                <div className="campo" style={{ flex: 1 }}>
                  <label>de</label>
                  <input type="number" min="1" value={pTotal} onChange={(e) => setPTotal(e.target.value)} />
                </div>
                <div className="campo" style={{ flex: 2 }}>
                  <label>Gatilho</label>
                  <input value={gatilho} onChange={(e) => setGatilho(e.target.value)} />
                </div>
              </div>
            )}
            {natureza === "recorrente" && <p style={{ color: "var(--mut)", fontSize: 11.5, margin: "2px 0 0" }}>Vai aparecer todo mês em Contas a pagar. O próximo extrato dá o check sozinho.</p>}
            {natureza === "parcela" && <p style={{ color: "var(--mut)", fontSize: 11.5, margin: "2px 0 0" }}>Cria as {pTotal} parcelas em Contas a pagar. Cada extrato dá o check da sua.</p>}
          </div>
        )}

        <div className="acoes">
          <button className="btn ghost sm" onClick={onCancelar}>Cancelar</button>
          <button className="btn sm" onClick={salvar}><Check size={14} /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EXTRATO                                                             */
/* ------------------------------------------------------------------ */

function Extrato({ cfg, mov, txns, alvo, setAlvo, salvarMov, salvarTxns, salvarCfg }) {
  const contas = cfg.contas || [];
  const cards = cfg.cards || [];
  const [editando, setEditando] = useState(null); // movimento em edição

  // Abre edição preenchendo lado/categoria a partir do txn ligado (se houver).
  const abrirEdicao = (m) => {
    let ladoCache = "", catCache = "";
    if (m.ref?.kind === "txn") {
      const t = (txns || []).find((x) => x.id === m.ref.id);
      if (t) { ladoCache = t.tipo; catCache = t.cat; }
    }
    setEditando({ ...m, ladoCache, catCache });
  };

  // Salva edições de UM movimento, inclusive troca de tipo (cria/remove o txn da desmistura).
  const salvarEdicao = (m, campos) => {
    const { desc, apelido, novoKind, lado, cat, destino, cartao } = campos;
    let novoTxns = [...(txns || [])];
    const novoTipo = (novoKind === "despesa" || novoKind === "receita") ? "lancamento" : novoKind;
    let ref = m.ref || {};
    const tinhaTxn = m.ref?.kind === "txn";

    if (novoKind === "despesa" || novoKind === "receita") {
      const ladoFinal = novoKind === "receita" ? "IN" : lado;
      if (tinhaTxn) {
        novoTxns = novoTxns.map((t) => (t.id === m.ref.id ? { ...t, desc, apelido, tipo: ladoFinal, cat } : t));
      } else {
        const tid = uid();
        novoTxns.push({ id: tid, lote: m.lote, mes: (m.data || "").slice(0, 7), data: dataBR(m.data), desc, apelido, valor: Math.abs(m.valor), tipo: ladoFinal, cat, cartao: m.conta, pa: 1, pt: 1 });
        ref = { kind: "txn", id: tid };
      }
    } else {
      // pagamento / transferência não têm linha na desmistura
      if (tinhaTxn) novoTxns = novoTxns.filter((t) => t.id !== m.ref.id);
      ref = novoKind === "pagamento" ? { kind: "cartao", nome: cartao } : { kind: "transfer", destino: destino || null };
    }

    const novoMov = (mov || []).map((x) => (x.id === m.id ? { ...x, desc, apelido, tipo: novoTipo, ref, natureza: campos.natureza, gatilhoRec: campos.gatilho, parcela: campos.parcela } : x));
    salvarMov(novoMov);
    salvarTxns(novoTxns);

    // Recorrente / Parcelada -> cria previsões em Contas a pagar
    if (salvarCfg && (campos.natureza === "recorrente" || campos.natureza === "parcela")) {
      const nomeExib = apelido || desc;
      const valorEst = Math.abs(m.valor);
      const baseYM = (m.data || "").slice(0, 7);
      const dia = String(campos.venc || 1).padStart(2, "0");
      const serieId = uid();
      let novasAP = [...(cfg.aPagar || [])];

      if (campos.natureza === "recorrente") {
        // adiciona previsão dos próximos 2 meses (o load depois vai completando)
        for (let k = 1; k <= 2; k++) {
          const ym = addMeses(baseYM, k);
          novasAP.push({ id: uid(), nome: desc, apelido: nomeExib, valor: valorEst, venc: `${ym}-${dia}`, pago: false, tipo: "recorrente", gatilho: campos.gatilho, lado: campos.lado, cat: campos.cat, conta: m.conta, serieId });
        }
        const rec = { id: serieId, apelido: nomeExib, gatilho: campos.gatilho, dia: Number(campos.venc) || 1, valor: valorEst, lado: campos.lado, cat: campos.cat, conta: m.conta };
        salvarCfg({ ...cfg, aPagar: novasAP, recorrentes: [...(cfg.recorrentes || []), rec] });
      } else {
        // parcela: cria as futuras (n+1 .. total)
        const n = campos.parcela?.n || 1, total = campos.parcela?.total || 2;
        for (let k = 1; k <= total - n; k++) {
          const ym = addMeses(baseYM, k);
          novasAP.push({ id: uid(), nome: desc, apelido: `${nomeExib} ${n + k}/${total}`, valor: valorEst, venc: `${ym}-${dia}`, pago: false, tipo: "parcela", gatilho: campos.gatilho, lado: campos.lado, cat: campos.cat, conta: m.conta, serieId, parcela: { n: n + k, total } });
        }
        salvarCfg({ ...cfg, aPagar: novasAP });
      }
    }
    setEditando(null);
  };
  const fontes = [
    ...contas.map((c) => ({ nome: c.nome, kind: "conta", ref: c })),
    ...cards.map((c) => ({ nome: c.nome, kind: "cartao" })),
  ];
  const sel = fontes.find((f) => f.nome === alvo) || fontes[0];
  const [mesX, setMesX] = useState(hojeYM());

  if (!sel) return <div className="empty">Cadastre uma conta ou cartão em Ajustes.</div>;

  const Header = (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <select value={sel.nome} onChange={(e) => setAlvo(e.target.value)} style={{ minWidth: 220 }}>
        <optgroup label="Contas">
          {contas.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
        </optgroup>
        <optgroup label="Cartões">
          {cards.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
        </optgroup>
      </select>
      <div className="mesnav">
        <button onClick={() => setMesX(addMeses(mesX, -1))}><ChevronLeft size={16} /></button>
        <span className="rot">{mesLabel(mesX)}</span>
        <button onClick={() => setMesX(addMeses(mesX, 1))}><ChevronRight size={16} /></button>
      </div>
    </div>
  );

  // ---------- CONTA: extrato de saldo ----------
  if (sel.kind === "conta") {
    const inicial = Number(sel.ref.saldoInicial || 0);
    const doAlvo = (mov || []).filter((m) => m.conta === sel.nome)
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));
    // saldo corrente acumulado
    let corr = inicial;
    const comSaldo = doAlvo.map((m) => { corr += Number(m.valor || 0); return { ...m, saldoApos: corr }; });
    const doMes = comSaldo.filter((m) => (m.data || "").slice(0, 7) === mesX);
    const abertura = comSaldo.filter((m) => (m.data || "").slice(0, 7) < mesX).slice(-1)[0]?.saldoApos ?? inicial;
    const fechamento = doMes.slice(-1)[0]?.saldoApos ?? abertura;

    return (
      <div className="grid" style={{ gap: 14 }}>
        {Header}
        <div className="grid kpis">
          <Kpi lbl="Saldo de abertura" val={abertura} cor="var(--mut)" />
          <Kpi lbl="Saldo no fim do mês" val={fechamento} cor={fechamento < 0 ? "var(--alerta)" : "var(--in)"} />
        </div>
        <div className="card">
          {doMes.length === 0 ? (
            <div className="empty">Sem movimentos em {mesLabel(mesX)}.</div>
          ) : (
            <table>
              <thead><tr><th>Data</th><th>Descrição</th><th></th><th style={{ textAlign: "right" }}>Valor</th><th style={{ textAlign: "right" }}>Saldo</th></tr></thead>
              <tbody>
                {doMes.map((m) => (
                  <tr key={m.id} className="clickrow" onClick={() => abrirEdicao(m)}>
                    <td className="num" style={{ color: "var(--mut)" }}>{dataBR(m.data)}</td>
                    <td>
                      {m.desc || "—"}
                      {m.apelido && <span style={{ color: "var(--pj)", fontSize: 11 }}> · {m.apelido}</span>}
                    </td>
                    <td>
                      {m.origem === "manual" && (
                        <span className={`badge ${m.conciliado ? "ok" : "prev"}`} title={m.conciliado ? "Confirmado pelo extrato do banco" : "Registrado por você; falta o extrato do banco confirmar"}>{m.conciliado ? "conciliado" : "a conciliar"}</span>
                      )}
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600, color: m.valor < 0 ? "var(--alerta)" : "var(--in)" }}>
                      {m.valor < 0 ? "−" : "+"}{brl(Math.abs(m.valor))}
                    </td>
                    <td className="num" style={{ textAlign: "right", color: "var(--mut)" }}>{brl(m.saldoApos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {editando && (
          <ModalEditarMov m={editando} cfg={cfg} contaAtual={sel.nome}
            onSalvar={(campos) => salvarEdicao(editando, campos)} onCancelar={() => setEditando(null)} />
        )}
      </div>
    );
  }

  // ---------- CARTÃO: fatura do ciclo ----------
  const compras = (txns || []).filter((t) => t.cartao === sel.nome && t.mes === mesX);
  const totalFatura = compras.filter((t) => t.tipo !== "IN").reduce((s, t) => s + t.valor, 0);
  const corLado = (t) => t.tipo === "PJ" ? "var(--pj)" : t.tipo === "PF" ? "var(--pf)" : t.tipo === "IN" ? "var(--in)" : "var(--line)";

  return (
    <div className="grid" style={{ gap: 14 }}>
      {Header}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: 14 }}>Fatura de {mesLabel(mesX)}</h3>
        <span className="num" style={{ fontWeight: 600 }}>{brl(totalFatura)}</span>
      </div>
      <div className="card">
        {compras.length === 0 ? (
          <div className="empty">Nenhuma compra desse cartão em {mesLabel(mesX)}.</div>
        ) : (
          <table>
            <thead><tr><th></th><th>Data</th><th>Descrição</th><th>Categoria</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
            <tbody>
              {compras.map((t) => (
                <tr key={t.id} className="row">
                  <td style={{ width: 8 }}><span className="spine" style={{ background: corLado(t) }} /></td>
                  <td className="num" style={{ color: "var(--mut)" }}>{t.data}</td>
                  <td>
                    {t.desc}
                    {t.pt > 1 && <span className="pill" style={{ background: "var(--surface2)", color: "var(--mut)", marginLeft: 7 }}>{t.pa}/{t.pt}</span>}
                  </td>
                  <td style={{ color: "var(--mut)", fontSize: 12 }}>{t.cat || "—"}</td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{brl(t.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Previsao({ txns, cfg }) {
  const dados = useMemo(() => {
    const base = hojeYM();
    const fixasTot = (cfg.fixas || []).reduce((s, f) => s + Number(f.valor || 0), 0);

    return Array.from({ length: 6 }, (_, i) => {
      const ym = addMeses(base, i);
      let parcelas = 0;
      txns.forEach((t) => {
        if (t.tipo === "IN" || t.pt <= 1) return;
        // quantos meses depois do mês da fatura essa parcela ainda cai?
        const restantes = t.pt - t.pa;
        const offset = mesesEntre(t.mes, ym);
        if (offset > 0 && offset <= restantes) parcelas += t.valor;
      });
      return {
        mes: mesLabel(ym),
        Parcelas: Math.round(parcelas),
        Fixas: fixasTot,
        total: Math.round(parcelas) + fixasTot,
      };
    });
  }, [txns, cfg]);

  const comprometido = dados.reduce((s, d) => s + d.total, 0);
  const parceladoTotal = dados.reduce((s, d) => s + d.Parcelas, 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid kpis">
        <Kpi lbl="Comprometido · 6 meses" val={comprometido} cor="var(--alerta)" />
        <Kpi lbl="Só parcelas futuras" val={parceladoTotal} cor="var(--pf)" />
        <Kpi lbl="Média por mês" val={comprometido / 6} cor="var(--txt)" />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>O que já está comprometido</h3>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 16px" }}>
          Parcelas que ainda vão cair + contas fixas. Isso sai do caixa mesmo que vocês não gastem mais nada.
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#31365a" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: "#8a90b0", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8a90b0", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => brl(v)}
              contentStyle={{ background: "#242844", border: "1px solid #31365a", borderRadius: 9, fontSize: 12 }} />
            <Area type="monotone" dataKey="Fixas" stackId="1" stroke="#f2b544" fill="#f2b544" fillOpacity={0.28} />
            <Area type="monotone" dataKey="Parcelas" stackId="1" stroke="#4fd1c5" fill="#4fd1c5" fillOpacity={0.28} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function mesesEntre(a, b) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

/* ------------------------------------------------------------------ */
/* AJUSTES                                                             */
/* ------------------------------------------------------------------ */

function Ajustes({ cfg, salvarCfg, txns, salvarTxns, aviso, mov, salvarMov }) {
  const [conta, setConta] = useState({ nome: "", saldoInicial: "" });
  const [card, setCard] = useState({ nome: "", limite: "", venc: "" });
  const [pagar, setPagar] = useState({ nome: "", valor: "", venc: "" });
  const [fixa, setFixa] = useState({ nome: "", valor: "", dia: "", tipo: "PF", cat: "Contas da casa" });
  const [buscaRegra, setBuscaRegra] = useState("");
  const [backup, setBackup] = useState(null);
  const [loteRegras, setLoteRegras] = useState("");
  const [novaRegra, setNovaRegra] = useState({ m: "", t: "PF", c: "", apelido: "", conta: "" });

  const contas = cfg.contas || [];
  const cards = cfg.cards || [];
  const aPagar = cfg.aPagar || [];
  const regrasFiltradas = (cfg.regras || []).filter((r) =>
    (r.m || "").toUpperCase().includes(buscaRegra.toUpperCase())
  );

  // Aplica um lote do Claude: array = só regras; objeto = regras + histórico (movimentos).
  const aplicarLote = () => {
    let parsed;
    try { parsed = JSON.parse(loteRegras); } catch { aviso("JSON inválido. Confira o formato."); return; }

    if (Array.isArray(parsed)) {
      const gat = new Set((cfg.regras || []).map((r) => `${(r.m || "").toUpperCase()}|${r.conta || ""}`));
      const novas = parsed.filter((r) => r.m && !gat.has(`${r.m.toUpperCase()}|${r.conta || ""}`));
      salvarCfg({ ...cfg, regras: [...(cfg.regras || []), ...novas] });
      setLoteRegras(""); aviso(`${novas.length} regra(s) adicionada(s).`);
      return;
    }

    const { lote, conta, saldoInicial, regras = [], movimentos = [] } = parsed;
    if (!conta) { aviso("Falta 'conta' no lote."); return; }
    const loteId = uid();

    const gat = new Set((cfg.regras || []).map((r) => `${(r.m || "").toUpperCase()}|${r.conta || ""}`));
    const novasRegras = regras.filter((r) => r.m && !gat.has(`${r.m.toUpperCase()}|${r.conta || ""}`));

    // IDEMPOTENTE: remove tudo que já existe de EXTRATO desta conta (inclusive órfãos
    // de testes antigos e lotes fantasma), pra reimportar não entulhar nem bloquear.
    const txnIdsRemover = new Set((mov || [])
      .filter((m) => m.conta === conta && m.origem === "extrato" && m.ref?.kind === "txn")
      .map((m) => m.ref.id));
    const novoMov = (mov || []).filter((m) => !(m.conta === conta && m.origem === "extrato"));
    const novoTxns = (txns || []).filter((t) => !txnIdsRemover.has(t.id));
    const vistos = new Set();
    let nMov = 0, nDup = 0;

    (movimentos || []).forEach((l) => {
      const fp = `${l.data}|${Math.abs(l.valor).toFixed(2)}|${(l.desc || "").slice(0, 16)}`;
      if (vistos.has(fp)) { nDup++; return; } // dedup dentro do próprio lote
      vistos.add(fp);
      const nomeExib = l.apelido || l.desc; // fallback
      if (l.kind === "receita") {
        const tid = uid();
        novoTxns.push({ id: tid, lote: loteId, mes: l.data.slice(0, 7), data: dataBR(l.data), desc: l.desc, apelido: l.apelido || "", valor: Math.abs(l.valor), tipo: "IN", cat: l.cat || "", cartao: conta, pa: 1, pt: 1 });
        novoMov.push({ id: uid(), lote: loteId, conta, data: l.data, valor: Math.abs(l.valor), desc: l.desc, apelido: l.apelido || "", tipo: "lancamento", ref: { kind: "txn", id: tid }, origem: "extrato", conciliado: false });
      } else if (l.kind === "despesa") {
        const tid = uid();
        novoTxns.push({ id: tid, lote: loteId, mes: l.data.slice(0, 7), data: dataBR(l.data), desc: l.desc, apelido: l.apelido || "", valor: Math.abs(l.valor), tipo: l.lado || "PF", cat: l.cat || "", cartao: conta, pa: 1, pt: 1 });
        novoMov.push({ id: uid(), lote: loteId, conta, data: l.data, valor: -Math.abs(l.valor), desc: l.desc, apelido: l.apelido || "", tipo: "lancamento", ref: { kind: "txn", id: tid }, origem: "extrato", conciliado: false });
      } else if (l.kind === "pagamento") {
        novoMov.push({ id: uid(), lote: loteId, conta, data: l.data, valor: -Math.abs(l.valor), desc: l.desc, apelido: l.apelido || "", tipo: "pagamento", ref: { kind: "cartao", nome: l.cartao || "" }, origem: "extrato", conciliado: false });
      } else if (l.kind === "transferencia") {
        const dest = l.destino ? ` → ${l.destino}` : "";
        novoMov.push({ id: uid(), lote: loteId, conta, data: l.data, valor: l.valor, desc: `${l.desc}${dest}`, apelido: l.apelido || "", tipo: "transferencia", ref: { kind: "transfer", destino: l.destino || null }, origem: "extrato", conciliado: false });
      }
      nMov++;
    });

    const contasNovas = (cfg.contas || []).map((c) => (c.nome === conta ? { ...c, saldoInicial: (saldoInicial ?? c.saldoInicial) } : c));
    // remove lotes antigos da MESMA conta (evita entradas fantasma duplicadas)
    const lotesLimpos = (cfg.lotes || []).filter((l) => l.conta !== conta);
    const lotes = [...lotesLimpos, { id: loteId, nome: lote || conta, conta, quando: hojeISO(), nMov, saldoAnterior: 0 }];

    salvarCfg({ ...cfg, regras: [...(cfg.regras || []), ...novasRegras], contas: contasNovas, lotes });
    salvarMov(novoMov);
    salvarTxns(novoTxns);
    setLoteRegras("");
    aviso(`Lote "${lote || conta}": ${nMov} movimentos, ${novasRegras.length} regras novas.`);
  };

  const desfazerLote = (loteId) => {
    const lote = (cfg.lotes || []).find((l) => l.id === loteId);
    // remove movimentos + txns do lote E também órfãos de extrato da mesma conta
    const conta = lote?.conta;
    const txnIdsRemover = new Set((mov || [])
      .filter((m) => (m.lote === loteId || (conta && m.conta === conta && m.origem === "extrato")) && m.ref?.kind === "txn")
      .map((m) => m.ref.id));
    salvarMov((mov || []).filter((m) => !(m.lote === loteId || (conta && m.conta === conta && m.origem === "extrato"))));
    salvarTxns(txns.filter((t) => t.lote !== loteId && !txnIdsRemover.has(t.id)));
    const contasNovas = (cfg.contas || []).map((c) => (conta && c.nome === conta ? { ...c, saldoInicial: 0 } : c));
    salvarCfg({ ...cfg, contas: contasNovas, lotes: (cfg.lotes || []).filter((l) => l.id !== loteId) });
    aviso("Lote desfeito.");
  };

  return (
    <div className="grid" style={{ gap: 14, maxWidth: 780 }}>
      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Minhas contas</h3>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 12px" }}>
          O saldo é calculado pelos extratos. O saldo inicial começa em 0 — só mexa se precisar de um ponto de partida.
        </p>
        {contas.map((c, i) => (
          <div key={i} className="edit-row">
            <input value={c.nome} onChange={(e) => salvarCfg({ ...cfg, contas: contas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} style={{ flex: 1, minWidth: 130 }} />
            <input type="number" title="Saldo inicial" value={c.saldoInicial} onChange={(e) => salvarCfg({ ...cfg, contas: contas.map((x, j) => (j === i ? { ...x, saldoInicial: Number(e.target.value) } : x)) })} style={{ width: 90 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--mut)" }} title="Conta de investimento (fora do fluxo de caixa)">
              <input type="checkbox" checked={!!c.inv} onChange={(e) => salvarCfg({ ...cfg, contas: contas.map((x, j) => (j === i ? { ...x, inv: e.target.checked } : x)) })} style={{ width: "auto" }} />
              invest.
            </label>
            <span className="num" style={{ width: 100, textAlign: "right", fontWeight: 600, color: saldoConta(c, mov) < 0 ? "var(--alerta)" : "var(--mut)" }} title="Saldo calculado">
              {brl(saldoConta(c, mov))}
            </span>
            <button className="icon" onClick={() => salvarCfg({ ...cfg, contas: contas.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input placeholder="Nome da conta" value={conta.nome} onChange={(e) => setConta({ ...conta, nome: e.target.value })} style={{ flex: 1, minWidth: 130 }} />
          <input placeholder="Saldo inicial" type="number" value={conta.saldoInicial} onChange={(e) => setConta({ ...conta, saldoInicial: e.target.value })} style={{ width: 120 }} />
          <button className="btn sm" onClick={() => {
            if (!conta.nome.trim()) return;
            salvarCfg({ ...cfg, contas: [...contas, { nome: conta.nome.trim(), saldoInicial: Number(conta.saldoInicial) || 0 }] });
            setConta({ nome: "", saldoInicial: "" });
          }}><Plus size={14} /> Adicionar</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Meus cartões</h3>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 12px" }}>
          Limite e vencimento ficam aqui. A fatura de cada cartão é calculada dos lançamentos importados.
        </p>
        {cards.map((c, i) => (
          <div key={i} className="edit-row">
            <input value={c.nome} onChange={(e) => salvarCfg({ ...cfg, cards: cards.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} style={{ flex: 1, minWidth: 120 }} />
            <input type="number" placeholder="Limite" value={c.limite} onChange={(e) => salvarCfg({ ...cfg, cards: cards.map((x, j) => (j === i ? { ...x, limite: Number(e.target.value) } : x)) })} style={{ width: 100 }} />
            <input placeholder="venc 17" value={c.venc} onChange={(e) => salvarCfg({ ...cfg, cards: cards.map((x, j) => (j === i ? { ...x, venc: e.target.value } : x)) })} style={{ width: 64 }} title="Dia do vencimento" />
            <input placeholder="fecha 8" value={c.fechamento || ""} onChange={(e) => salvarCfg({ ...cfg, cards: cards.map((x, j) => (j === i ? { ...x, fechamento: e.target.value } : x)) })} style={{ width: 64 }} title="Dia do fechamento" />
            <button className="icon" onClick={() => salvarCfg({ ...cfg, cards: cards.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input placeholder="Nome do cartão" value={card.nome} onChange={(e) => setCard({ ...card, nome: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
          <input placeholder="Limite" type="number" value={card.limite} onChange={(e) => setCard({ ...card, limite: e.target.value })} style={{ width: 100 }} />
          <input placeholder="Venc. 17/7" value={card.venc} onChange={(e) => setCard({ ...card, venc: e.target.value })} style={{ width: 90 }} />
          <button className="btn sm" onClick={() => {
            if (!card.nome.trim()) return;
            salvarCfg({ ...cfg, cards: [...cards, { nome: card.nome.trim(), limite: Number(card.limite) || 0, venc: card.venc.trim() }] });
            setCard({ nome: "", limite: "", venc: "" });
          }}><Plus size={14} /> Adicionar</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Contas a pagar</h3>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 12px" }}>
          Compromissos datados. No painel você marca cada um como pago.
        </p>
        {aPagar.map((c, i) => (
          <div key={c.id || i} className="edit-row">
            <input value={c.nome} onChange={(e) => salvarCfg({ ...cfg, aPagar: aPagar.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} style={{ flex: 1, minWidth: 120 }} />
            <input type="number" value={c.valor} onChange={(e) => salvarCfg({ ...cfg, aPagar: aPagar.map((x, j) => (j === i ? { ...x, valor: Number(e.target.value) } : x)) })} style={{ width: 100 }} />
            <input type="date" value={c.venc} onChange={(e) => salvarCfg({ ...cfg, aPagar: aPagar.map((x, j) => (j === i ? { ...x, venc: e.target.value } : x)) })} style={{ width: 150 }} />
            <button className="icon" onClick={() => salvarCfg({ ...cfg, aPagar: aPagar.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input placeholder="Nome" value={pagar.nome} onChange={(e) => setPagar({ ...pagar, nome: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
          <input placeholder="Valor" type="number" value={pagar.valor} onChange={(e) => setPagar({ ...pagar, valor: e.target.value })} style={{ width: 100 }} />
          <input type="date" value={pagar.venc} onChange={(e) => setPagar({ ...pagar, venc: e.target.value })} style={{ width: 150 }} />
          <button className="btn sm" onClick={() => {
            if (!pagar.nome.trim() || !pagar.venc) return;
            salvarCfg({ ...cfg, aPagar: [...aPagar, { id: uid(), nome: pagar.nome.trim(), valor: Number(pagar.valor) || 0, venc: pagar.venc, pago: false }] });
            setPagar({ nome: "", valor: "", venc: "" });
          }}><Plus size={14} /> Adicionar</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Contas fixas do mês</h3>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 12px" }}>
          Entram sozinhas na previsão e no aviso de vencimento.
        </p>
        {(cfg.fixas || []).map((f, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(49,54,90,.5)" }}>
            <span style={{ fontSize: 13 }}>
              <i className="dot" style={{ background: f.tipo === "PJ" ? "var(--pj)" : "var(--pf)" }} />
              {f.nome} <span style={{ color: "var(--mut)" }}>· dia {f.dia}</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="num" style={{ fontWeight: 600, fontSize: 13 }}>{brl(f.valor)}</span>
              <button className="icon" onClick={() => salvarCfg({ ...cfg, fixas: cfg.fixas.filter((_, j) => j !== i) })}>
                <Trash2 size={14} />
              </button>
            </span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input placeholder="Nome" value={fixa.nome} onChange={(e) => setFixa({ ...fixa, nome: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
          <input placeholder="Valor" type="number" value={fixa.valor} onChange={(e) => setFixa({ ...fixa, valor: e.target.value })} style={{ width: 100 }} />
          <input placeholder="Dia" type="number" min="1" max="31" value={fixa.dia} onChange={(e) => setFixa({ ...fixa, dia: e.target.value })} style={{ width: 70 }} />
          <select value={fixa.tipo} onChange={(e) => setFixa({ ...fixa, tipo: e.target.value })}>
            <option value="PF">PF</option><option value="PJ">PJ</option>
          </select>
          <button className="btn sm" onClick={() => {
            if (!fixa.nome || !fixa.valor || !fixa.dia) return;
            salvarCfg({ ...cfg, fixas: [...(cfg.fixas || []), { ...fixa, valor: Number(fixa.valor), dia: Number(fixa.dia) }] });
            setFixa({ nome: "", valor: "", dia: "", tipo: "PF", cat: "Contas da casa" });
          }}><Plus size={14} /> Adicionar</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Regras de categorização</h3>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 12px" }}>
          Toda vez que você categoriza algo novo, vira regra. Na próxima fatura, já vem pronto.
        </p>
        <div className="scroll" style={{ maxHeight: 240, overflowY: "auto" }}>
          <table>
            <tbody>
              {cfg.regras.map((r, i) => (
                <tr key={i}>
                  <td className="num" style={{ fontSize: 12 }}>{r.m}</td>
                  <td style={{ color: "var(--mut)", fontSize: 12 }}>{r.c}</td>
                  <td>
                    <span className="pill" style={{
                      background: r.t === "PJ" ? "rgba(79,209,197,.15)" : "rgba(242,181,68,.15)",
                      color: r.t === "PJ" ? "var(--pj)" : "var(--pf)",
                    }}>{r.t}</span>
                  </td>
                  <td style={{ width: 34 }}>
                    <button className="icon" onClick={() => salvarCfg({ ...cfg, regras: cfg.regras.filter((_, j) => j !== i) })}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h3 style={{ fontSize: 14 }}>Regras aprendidas</h3>
          <span className="num" style={{ fontSize: 11.5, color: "var(--mut)" }}>{(cfg.regras || []).length} regras</span>
        </div>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 12px" }}>
          É o que o app usa pra classificar sozinho. "Gatilho" = trecho da descrição; "vira" = categoria + lado (ou transferência/pagamento de fatura).
        </p>
        <input placeholder="Buscar por gatilho…" value={buscaRegra} onChange={(e) => setBuscaRegra(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
        {regrasFiltradas.length === 0 ? (
          <div className="empty">Nenhuma regra encontrada.</div>
        ) : (
          regrasFiltradas.map((r) => {
            const i = (cfg.regras || []).indexOf(r);
            return (
              <div key={`${r.m}-${i}`} className="edit-row">
                <span className="num" style={{ flex: 1, minWidth: 140, fontSize: 12.5 }}>{r.m}</span>
                <span style={{ color: "var(--mut)" }}>→</span>
                <span style={{ flex: 1, minWidth: 160, fontSize: 12.5 }}>
                  {r.t === "TRANSFER" ? `Transferência → ${r.para}`
                    : r.t === "PAGAMENTO_FATURA" ? `Fatura → ${r.cartao}`
                    : `${r.c} · ${r.t}`}
                  {r.apelido && <span style={{ color: "var(--pj)", fontSize: 11 }}> · “{r.apelido}”</span>}
                  {r.conta && <span style={{ color: "var(--mut)", fontSize: 10.5 }}> · só {r.conta}</span>}
                </span>
                <button className="icon" onClick={() => salvarCfg({ ...cfg, regras: (cfg.regras || []).filter((_, j) => j !== i) })} title="Remover regra">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}

        <div style={{ borderTop: "1px solid rgba(49,54,90,.5)", marginTop: 12, paddingTop: 12 }}>
          <div className="subh" style={{ margin: "0 0 8px" }}>Criar regra à mão</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Gatilho (trecho da descrição)" value={novaRegra.m} onChange={(e) => setNovaRegra({ ...novaRegra, m: e.target.value })} style={{ flex: 1, minWidth: 150 }} />
            <select value={novaRegra.t} onChange={(e) => setNovaRegra({ ...novaRegra, t: e.target.value, c: "" })}>
              <option value="PF">PF</option><option value="PJ">PJ</option><option value="IN">Entrada</option>
            </select>
            <select value={novaRegra.c} onChange={(e) => setNovaRegra({ ...novaRegra, c: e.target.value })}>
              <option value="">— categoria —</option>
              <OpcoesCat tipo={novaRegra.t} />
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <input placeholder="Apelido (opcional)" value={novaRegra.apelido} onChange={(e) => setNovaRegra({ ...novaRegra, apelido: e.target.value })} style={{ flex: 1, minWidth: 120 }} />
            <select value={novaRegra.conta} onChange={(e) => setNovaRegra({ ...novaRegra, conta: e.target.value })} title="Escopo: vale só nesta conta (opcional)">
              <option value="">todas as contas</option>
              {(cfg.contas || []).map((c) => <option key={c.nome} value={c.nome}>só {c.nome}</option>)}
            </select>
            <button className="btn sm" onClick={() => {
              if (!novaRegra.m.trim() || !novaRegra.c) { aviso("Preencha gatilho e categoria."); return; }
              const nova = { m: novaRegra.m.trim().toUpperCase(), c: novaRegra.c, t: novaRegra.t };
              if (novaRegra.apelido.trim()) nova.apelido = novaRegra.apelido.trim();
              if (novaRegra.conta) nova.conta = novaRegra.conta;
              salvarCfg({ ...cfg, regras: [...(cfg.regras || []), nova] });
              setNovaRegra({ m: "", t: "PF", c: "", apelido: "", conta: "" });
            }}><Plus size={14} /> Criar regra</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Importar lote do Claude</h3>
        <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 10px" }}>
          Cole o JSON que o Claude gerar cruzando extrato + prints. Entra tudo de uma vez, com etiqueta e botão desfazer. Não duplica o que já existe.
        </p>
        <textarea value={loteRegras} onChange={(e) => setLoteRegras(e.target.value)} rows={4}
          placeholder='{"lote":"...","conta":"...","saldoInicial":0,"regras":[...],"movimentos":[...]}'
          style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 8, padding: 10, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", resize: "vertical", outline: "none" }} />
        <button className="btn sm" style={{ marginTop: 10 }} onClick={aplicarLote} disabled={!loteRegras.trim()}>
          <Plus size={14} /> Importar lote
        </button>

        {(cfg.lotes || []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="subh">Lotes importados</div>
            {(cfg.lotes || []).map((l) => (
              <div key={l.id} className="edit-row">
                <span style={{ flex: 1, fontSize: 12.5 }}>{l.nome}</span>
                <span className="num" style={{ color: "var(--mut)", fontSize: 11.5 }}>{l.nMov} mov.</span>
                <button className="btn ghost sm" onClick={() => desfazerLote(l.id)}>Desfazer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>Dados</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn ghost sm" onClick={() => {
            setBackup(JSON.stringify({ txns, cfg, mov }, null, 2));
          }}>Exportar tudo (JSON)</button>
          <button className="btn ghost sm" style={{ color: "var(--alerta)" }} onClick={() => {
            if (confirm("Apagar todos os lançamentos? Isso não volta.")) {
              salvarTxns([]); aviso("Lançamentos apagados.");
            }
          }}>Apagar lançamentos</button>
        </div>
      </div>

      {backup !== null && (
        <div className="modal-bg" onClick={() => setBackup(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h3>Backup dos dados</h3>
            <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 10px" }}>
              Toque em Copiar e cole aqui no chat pra eu subir pro Supabase.
            </p>
            <textarea readOnly value={backup} rows={8} onFocus={(e) => e.target.select()}
              style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", resize: "vertical", outline: "none" }} />
            <div className="acoes">
              <button className="btn ghost sm" onClick={() => setBackup(null)}>Fechar</button>
              <button className="btn sm" onClick={() => {
                try { navigator.clipboard.writeText(backup); aviso("Copiado!"); }
                catch { aviso("Selecione o texto e copie manualmente."); }
              }}><Check size={14} /> Copiar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
