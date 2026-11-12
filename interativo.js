/* ==========================================================================
   RECURSOS INTERATIVOS – AUTO CONTROLLER SYSTEM
   1. Abas de Soluções passando sozinhas (com barra de tempo)
   2. Veículo interativo (pontos clicáveis)
   3. Quiz "Descubra o plano ideal"
   4. Elementos que surgem suavemente ao rolar a página
   Quem prefere menos movimento (configuração do sistema) não vê animações
   nem a troca automática das abas.
   ========================================================================== */

(function () {
  const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    abasAutomaticas();
    carrosselSolucoes();
    veiculoInterativo();
    quizPlano();
    revelarAoRolar();
    cabecalhoAoRolar();
    contarIndicadores();
    videoComCapa();
    buscaFaq();
    linksPendentes();
    simulador();
    centralDoCliente();
  });

  /* ---------- 11. Central do cliente em janela ---------- */
  function centralDoCliente() {
    const fundo = document.getElementById("centralFundo");
    if (!fundo) return;
    let origem = null;
    function abrir(btn) {
      origem = btn || null;
      fundo.hidden = false;
      document.body.classList.add("quiz-aberto");
      document.getElementById("centralFechar").focus();
      // fecha o menu do celular, se estiver aberto
      const menu = document.getElementById("navMenu"), toggle = document.getElementById("menuToggle");
      if (menu && menu.classList.contains("active") && toggle) toggle.click();
      const area = document.getElementById("areaClienteMenu");
      if (area) { area.hidden = true; const b = document.getElementById("areaClienteBotao"); if (b) b.setAttribute("aria-expanded", "false"); }
    }
    function fechar() {
      fundo.hidden = true;
      document.body.classList.remove("quiz-aberto");
      if (location.hash === "#central") history.replaceState(null, "", location.pathname + location.search);
      if (origem) origem.focus();
    }
    document.querySelectorAll("[data-abrir-central]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); abrir(a); });
    });
    document.getElementById("centralFechar").addEventListener("click", fechar);
    fundo.addEventListener("click", function (e) { if (e.target === fundo) fechar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !fundo.hidden) fechar(); });
    if (location.hash === "#central") abrir();
    window.addEventListener("hashchange", function () { if (location.hash === "#central") abrir(); });
  }

  /* ---------- 10. Simulador de economia ---------- */
  const ECONOMIA_COMBUSTIVEL = 0.15; // 15%: valor mais citado nas pesquisas (CNT "até 15%"; Dep. de Energia dos EUA 10–15%; mercado 15–25%) – pesquisa de 26/10/2026

  function simulador() {
    const ids = ["simVeiculos", "simKm", "simConsumo", "simPreco"];
    const el = {};
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
    if (!el.simVeiculos) return;
    const real = function (n) { return "R$ " + Math.round(n).toLocaleString("pt-BR"); };
    const num = function (n, d) { return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }); };
    document.getElementById("simPercentual").textContent = Math.round(ECONOMIA_COMBUSTIVEL * 100) + "%";
    function calcular() {
      const veic = Number(el.simVeiculos.value), km = Number(el.simKm.value);
      const consumo = Number(el.simConsumo.value), preco = Number(el.simPreco.value);
      // Litros por mês = km rodados ÷ consumo (km/L); economia = litros economizados × preço do litro
      const litros = veic * km / consumo;
      const litrosEco = litros * ECONOMIA_COMBUSTIVEL;
      const mes = litrosEco * preco;
      document.getElementById("simVeiculosValor").textContent = veic;
      document.getElementById("simKmValor").textContent = num(km, 0) + " km";
      document.getElementById("simConsumoValor").textContent = num(consumo, 1) + " km/L";
      document.getElementById("simPrecoValor").textContent = "R$ " + num(preco, 2);
      document.getElementById("simLitros").textContent = num(Math.round(litros), 0) + " L";
      document.getElementById("simLitrosEco").textContent = num(Math.round(litrosEco), 0) + " L";
      document.getElementById("simAtual").textContent = real(litros * preco);
      document.getElementById("simMes").textContent = real(mes);
      document.getElementById("simAno").textContent = real(mes * 12);
      ids.forEach(function (id) {
        const r = el[id];
        r.style.setProperty("--pct", ((r.value - r.min) / (r.max - r.min) * 100) + "%");
      });
      const msg = "Olá! Fiz a simulação no site: " + veic + " veículos, " + num(km, 0) + " km por veículo no mês, consumo de " +
        num(consumo, 1) + " km/L. Economia estimada de " + real(mes * 12) + " por ano. Gostaria de uma proposta.";
      document.getElementById("simProposta").href = "https://wa.me/5521975988587?text=" + encodeURIComponent(msg);
    }
    ids.forEach(function (id) { el[id].addEventListener("input", calcular); });
    calcular();
  }


  /* ---------- 5. Cabeçalho mais compacto ao rolar ---------- */
  function cabecalhoAoRolar() {
    const topo = document.querySelector(".site-header");
    if (!topo) return;
    function atualizar() { topo.classList.toggle("rolado", window.scrollY > 40); }
    window.addEventListener("scroll", atualizar, { passive: true });
    atualizar();
  }

  /* ---------- 6. Indicadores contando ao aparecer ---------- */
  function contarIndicadores() {
    const nums = document.querySelectorAll("[data-contar]");
    if (!nums.length || menosMovimento || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (!it.isIntersecting) return;
        obs.unobserve(it.target);
        const el = it.target, fim = Number(el.dataset.contar);
        const pre = el.dataset.prefixo || "", suf = el.dataset.sufixo || "";
        const t0 = performance.now(), dur = 1400;
        (function passo(t) {
          const p = Math.min(1, (t - t0) / dur), v = Math.round(fim * (1 - Math.pow(1 - p, 3)));
          el.textContent = pre + v + suf;
          if (p < 1) requestAnimationFrame(passo);
        })(t0);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { obs.observe(n); });
  }

  /* ---------- 7. Vídeo com botão "Assistir" sobre a capa ---------- */
  function videoComCapa() {
    const caixa = document.getElementById("videoInst");
    const botao = document.getElementById("videoPlay");
    if (!caixa || !botao) return;
    const video = caixa.querySelector("video");
    botao.addEventListener("click", function () { caixa.classList.add("tocando"); video.play(); video.focus(); });
    video.addEventListener("play", function () { caixa.classList.add("tocando"); });
  }

  /* ---------- 8. Busca nas perguntas frequentes ---------- */
  function buscaFaq() {
    const campo = document.getElementById("faqBusca");
    if (!campo) return;
    const itens = Array.from(document.querySelectorAll(".faq-item"));
    const vazio = document.getElementById("faqVazio");
    const norm = function (t) { return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };
    campo.addEventListener("input", function () {
      const q = norm(campo.value.trim());
      let achou = 0;
      itens.forEach(function (it) {
        const ok = !q || norm(it.innerText).indexOf(q) > -1;
        it.hidden = !ok;
        if (ok) achou++;
      });
      vazio.hidden = achou > 0;
    });
  }

  /* ---------- 9. Links ainda não definidos (ex.: AC Rastreio) ---------- */
  function linksPendentes() {
    document.querySelectorAll("[data-link-pendente]").forEach(function (a) {
      if (a.getAttribute("href") !== "#") return;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        window.open("https://wa.me/552134963942?text=" + encodeURIComponent("Olá! Preciso do acesso à plataforma AC Rastreio."), "_blank", "noopener");
      });
    });
  }

  /* ---------- 1. Abas automáticas ---------- */
  const TEMPO_ABA = 8000; // 8 segundos por aba

  function abasAutomaticas() {
    const caixa = document.getElementById("abasSolucoes");
    if (!caixa) return;
    const botoes = Array.from(caixa.querySelectorAll(".tab-btn"));
    const paineis = Array.from(caixa.querySelectorAll(".tab-content"));
    if (!botoes.length) return;

    caixa.style.setProperty("--tempo-aba", TEMPO_ABA + "ms");
    let atual = Math.max(0, botoes.findIndex(function (b) { return b.classList.contains("active"); }));
    let timer = null;
    let pausado = false;
    let visivel = false;

    function ativar(i) {
      atual = (i + botoes.length) % botoes.length;
      botoes.forEach(function (b, n) {
        const ativo = n === atual;
        b.classList.toggle("active", ativo);
        b.setAttribute("aria-selected", ativo ? "true" : "false");
        b.classList.remove("tocando");
      });
      paineis.forEach(function (p, n) { p.classList.toggle("active", n === atual); });
      reiniciar();
    }

    function reiniciar() {
      clearTimeout(timer);
      botoes.forEach(function (b) { b.classList.remove("tocando"); });
      if (menosMovimento || pausado || !visivel) return;
      void botoes[atual].offsetWidth; // reinicia a animação da barra
      botoes[atual].classList.add("tocando");
      timer = setTimeout(function () { ativar(atual + 1); }, TEMPO_ABA);
    }

    // Clique do visitante: troca na hora e recomeça a contagem
    botoes.forEach(function (b, n) {
      b.removeAttribute("onclick");
      b.addEventListener("click", function () { ativar(n); });
    });

    // Pausa enquanto o mouse está sobre as abas ou o foco está nelas
    caixa.addEventListener("mouseenter", function () { pausado = true; reiniciar(); });
    caixa.addEventListener("mouseleave", function () { pausado = false; reiniciar(); });
    caixa.addEventListener("focusin", function () { pausado = true; reiniciar(); });
    caixa.addEventListener("focusout", function () { pausado = false; reiniciar(); });

    // Só passa sozinha quando a seção está na tela
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (itens) {
        visivel = itens[0].isIntersecting;
        reiniciar();
      }, { threshold: 0.35 }).observe(caixa);
    } else {
      visivel = true;
      reiniciar();
    }
  }

  /* ---------- 1b. Carrossel de soluções (cards) ---------- */
  const TEMPO_CARD = 4000; // 4 segundos por card

  function carrosselSolucoes() {
    const caixa = document.getElementById("carrosselSolucoes");
    if (!caixa) return;
    const trilho = caixa.querySelector(".carrossel-trilho");
    const cards = Array.from(trilho.querySelectorAll(".sol-card"));
    const pontosCaixa = document.getElementById("carrosselPontos");
    if (!cards.length) return;
    const ehMobile = window.matchMedia("(max-width: 600px)").matches;

    // ---------- Janela de detalhes (comum aos dois modos) ----------
    const fundo = document.getElementById("solFundo");
    let origem = null;
    function fechar() { fundo.hidden = true; document.body.classList.remove("quiz-aberto"); if (origem) origem.focus(); }
    function ligarDetalhes(c, cliqueNoCard) {
      const botao = c.querySelector(".sol-mais");
      function abrir() {
        origem = botao;
        document.getElementById("solTag").textContent = c.querySelector(".sol-tag").textContent;
        document.getElementById("solTitulo").textContent = c.querySelector("h3").textContent;
        document.getElementById("solTexto").textContent = c.querySelector(".sol-corpo p").textContent;
        const pag = document.getElementById("solPagina");
        if (pag) pag.href = c.dataset.pagina || "rastreamento-veicular.html";
        const lista = document.getElementById("solLista");
        lista.innerHTML = "";
        lista.appendChild(c.querySelector(".sol-detalhes").content.cloneNode(true));
        fundo.hidden = false;
        document.body.classList.add("quiz-aberto");
        document.getElementById("solFechar").focus();
      }
      if (botao) botao.addEventListener("click", function (e) { e.stopPropagation(); abrir(); });
      // No celular o toque no card serve só para deslizar; os detalhes abrem pelo botão "+".
      if (cliqueNoCard) c.addEventListener("click", abrir);
    }
    cards.forEach(function (c) { ligarDetalhes(c, !ehMobile); });
    document.getElementById("solFechar").addEventListener("click", fechar);
    fundo.addEventListener("click", function (e) { if (e.target === fundo) fechar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !fundo.hidden) fechar(); });

    function marcar(i) {
      Array.from(pontosCaixa.children).forEach(function (p, n) {
        const a = n === i;
        p.classList.toggle("ativo", a);
        p.setAttribute("aria-current", a ? "true" : "false");
      });
    }

    /* =============== CELULAR: deslizar fluido e infinito, sem passar sozinho =============== */
    if (ehMobile) {
      // Clones nas pontas: o loop não tem fim (do último volta ao primeiro deslizando).
      const clFim = cards[cards.length - 1].cloneNode(true);
      const clIni = cards[0].cloneNode(true);
      [clFim, clIni].forEach(function (cl) {
        cl.classList.add("sol-clone");
        cl.setAttribute("aria-hidden", "true");
        cl.querySelectorAll("button, a, input, [tabindex]").forEach(function (b) { b.tabIndex = -1; });
      });
      trilho.insertBefore(clFim, cards[0]);
      trilho.appendChild(clIni);
      const todos = Array.from(trilho.querySelectorAll(".sol-card")); // [clFim, c0..cN, clIni]

      function passo() { return Math.max(1, todos[1].offsetLeft - todos[0].offsetLeft); }
      function posReal(i) { return todos[i + 1].offsetLeft - trilho.offsetLeft; }
      function irReal(i, suave) {
        if (suave) { trilho.scrollTo({ left: posReal(i), behavior: "smooth" }); return; }
        // Pulo instantâneo e invisível (clone -> card real): desliga o snap para não ser "puxado" de volta.
        var snap = trilho.style.scrollSnapType;
        trilho.style.scrollSnapType = "none";
        trilho.scrollLeft = posReal(i);
        requestAnimationFrame(function () { trilho.style.scrollSnapType = snap || ""; });
      }

      // Pontos: um por card real
      pontosCaixa.innerHTML = "";
      cards.forEach(function (_, i) {
        const p = document.createElement("button");
        p.type = "button";
        p.className = "carrossel-ponto";
        p.setAttribute("aria-label", "Ir para o card " + (i + 1));
        p.addEventListener("click", function () { irReal(i, true); marcar(i); });
        pontosCaixa.appendChild(p);
      });
      marcar(0);
      requestAnimationFrame(function () { trilho.scrollLeft = posReal(0); });

      // Quando o deslize assenta: se parou num clone, salta invisível para o card real equivalente.
      let saltando = false;
      function assentou() {
        if (saltando) return;
        const idx = Math.round((trilho.scrollLeft - posReal(0)) / passo());
        if (idx < 0) { saltando = true; irReal(cards.length - 1, false); marcar(cards.length - 1); requestAnimationFrame(function () { saltando = false; }); }
        else if (idx > cards.length - 1) { saltando = true; irReal(0, false); marcar(0); requestAnimationFrame(function () { saltando = false; }); }
        else { marcar(Math.max(0, Math.min(cards.length - 1, idx))); }
      }
      let t;
      trilho.addEventListener("scroll", function () {
        // atualiza o ponto na hora (sem saltar); o salto só quando assenta
        const idx = Math.round((trilho.scrollLeft - posReal(0)) / passo());
        if (idx >= 0 && idx <= cards.length - 1) marcar(idx);
        clearTimeout(t);
        t = setTimeout(assentou, 140);
      }, { passive: true });
      if ("onscrollend" in window) trilho.addEventListener("scrollend", assentou);

      window.addEventListener("resize", function () { requestAnimationFrame(function () { trilho.scrollLeft = posReal(0); }); });
      return;
    }

    /* =============== COMPUTADOR: setas e pontos (sem passar sozinho) =============== */
    let atual = 0;
    function porTela() { const w = cards[0].getBoundingClientRect().width || 1; return Math.max(1, Math.round(trilho.clientWidth / w)); }
    function paradas() { return Math.max(1, cards.length - porTela() + 1); }
    function montarPontos() {
      pontosCaixa.innerHTML = "";
      for (let i = 0; i < paradas(); i++) {
        const p = document.createElement("button");
        p.type = "button";
        p.className = "carrossel-ponto";
        p.setAttribute("aria-label", "Ir para o card " + (i + 1));
        p.addEventListener("click", function () { ir(i); });
        pontosCaixa.appendChild(p);
      }
      marcar(atual);
    }
    function ir(i) {
      const total = paradas();
      atual = (i + total) % total;   // setas também dão a volta (não param na ponta)
      trilho.scrollTo({ left: cards[atual].offsetLeft - trilho.offsetLeft, behavior: menosMovimento ? "auto" : "smooth" });
      marcar(atual);
    }
    let rolando;
    trilho.addEventListener("scroll", function () {
      clearTimeout(rolando);
      rolando = setTimeout(function () {
        let melhor = 0, dist = Infinity;
        cards.forEach(function (c, i) { const d = Math.abs(c.offsetLeft - trilho.offsetLeft - trilho.scrollLeft); if (d < dist) { dist = d; melhor = i; } });
        melhor = Math.min(melhor, paradas() - 1);
        if (melhor !== atual) { atual = melhor; marcar(atual); }
      }, 120);
    }, { passive: true });
    document.querySelectorAll(".carrossel-seta").forEach(function (b) { b.addEventListener("click", function () { ir(atual + Number(b.dataset.dir)); }); });
    window.addEventListener("resize", function () { montarPontos(); ir(Math.min(atual, paradas() - 1)); });
    montarPontos();
  }

  /* ---------- 2. Veículo interativo ---------- */
  const PONTOS = [
    { titulo: "Câmera frontal com ADAS", texto: "Filma a via e avisa o motorista sobre risco de colisão, troca de faixa e pedestres à frente." },
    { titulo: "Câmera de cabine com DMS", texto: "Identifica fadiga, uso de celular, cigarro e distração, e gera alerta na hora." },
    { titulo: "Rastreamento em tempo real", texto: "A posição do veículo chega à plataforma o tempo todo, com histórico de rotas e paradas." },
    { titulo: "Telemetria", texto: "Velocidade, RPM e ignição acompanhados de perto, com alertas de excesso e condução de risco." },
    { titulo: "Bloqueio em duas camadas", texto: "Bloqueio pela plataforma e bloqueador inteligente, que age sozinho contra jammer e violação." }
  ];

  function veiculoInterativo() {
    const pontos = Array.from(document.querySelectorAll(".ponto"));
    const titulo = document.getElementById("pontoTitulo");
    const texto = document.getElementById("pontoTexto");
    const numero = document.getElementById("pontoNumero");
    if (!pontos.length || !titulo) return;
    let atual = 0;

    function mostrar(i) {
      atual = (i + PONTOS.length) % PONTOS.length;
      pontos.forEach(function (p, n) {
        p.classList.toggle("ativo", n === atual);
        p.setAttribute("aria-pressed", n === atual ? "true" : "false");
      });
      titulo.textContent = PONTOS[atual].titulo;
      texto.textContent = PONTOS[atual].texto;
      numero.textContent = (atual + 1) + " de " + PONTOS.length;
    }

    pontos.forEach(function (p) {
      p.addEventListener("click", function () { mostrar(Number(p.dataset.ponto)); });
    });
    document.querySelectorAll(".veiculo-btn").forEach(function (b) {
      b.addEventListener("click", function () { mostrar(atual + Number(b.dataset.passo)); });
    });
    mostrar(0);
  }

  /* ---------- 3. Quiz do plano ideal ---------- */
  const PLANOS = {
    lite: {
      nome: "Lite",
      texto: "O essencial para saber onde estão os seus veículos: localização em tempo real, histórico de rotas, cercas virtuais, bloqueio remoto, alertas e relatórios.",
      id: "plano-lite"
    },
    standard: {
      nome: "Standard",
      texto: "Tudo do Lite, mais gestão de motoristas, análise de condução, consumo de combustível, controle de despesas e gráficos de desempenho.",
      id: "plano-standard"
    },
    premium: {
      nome: "Premium",
      texto: "Tudo do Standard, mais câmeras com vídeo, alertas de colisão, fadiga e distração (ADAS e DMS) e ranking de motoristas.",
      id: "plano-premium"
    }
  };
  const FROTA = { poucos: "até 5 veículos", media: "de 6 a 30 veículos", grande: "mais de 30 veículos" };

  function quizPlano() {
    const quiz = document.getElementById("quizPlano");
    if (!quiz) return;
    const etapas = Array.from(quiz.querySelectorAll(".quiz-etapa"));
    const resultado = quiz.querySelector(".quiz-resultado");
    const barra = document.getElementById("quizBarra");
    let respostas = [];

    function irPara(i) {
      etapas.forEach(function (e, n) { e.hidden = n !== i; });
      resultado.hidden = true;
      barra.style.width = (i / etapas.length * 100) + "%";
    }

    function mostrarResultado() {
      const motoristas = respostas[1] === "sim";
      const cameras = respostas[2] === "sim";
      const chave = cameras ? "premium" : (motoristas ? "standard" : "lite");
      const plano = PLANOS[chave];
      etapas.forEach(function (e) { e.hidden = true; });
      resultado.hidden = false;
      barra.style.width = "100%";
      document.getElementById("quizPlanoNome").textContent = plano.nome;
      document.getElementById("quizPlanoTexto").textContent = plano.texto;
      document.getElementById("quizVer").href = "#" + plano.id;
      const msg = "Olá! Fiz o teste no site e o plano indicado foi o " + plano.nome +
        ". Minha frota tem " + FROTA[respostas[0]] + ". Gostaria de receber uma proposta.";
      document.getElementById("quizProposta").href = "https://wa.me/5521975988587?text=" + encodeURIComponent(msg);

      // Destaca o card do plano indicado por alguns segundos
      document.querySelectorAll(".plan-card").forEach(function (c) { c.classList.remove("plan-card--indicado"); });
      const card = document.getElementById(plano.id);
      if (card) card.classList.add("plan-card--indicado");
    }

    quiz.querySelectorAll(".quiz-opcao").forEach(function (b) {
      b.addEventListener("click", function () {
        const etapa = Number(b.closest(".quiz-etapa").dataset.etapa);
        respostas[etapa] = b.dataset.resposta;
        if (etapa + 1 < etapas.length) irPara(etapa + 1); else mostrarResultado();
      });
    });
    // Janela (modal): abre pelo botão "Descobrir meu plano" e fecha no X, no fundo ou com Esc
    const fundo = document.getElementById("quizFundo");
    const abrir = document.getElementById("quizAbrir");
    function fechar() {
      fundo.hidden = true;
      document.body.classList.remove("quiz-aberto");
      abrir.focus();
    }
    abrir.addEventListener("click", function () {
      respostas = [];
      irPara(0);
      fundo.hidden = false;
      document.body.classList.add("quiz-aberto");
      quiz.querySelector(".quiz-opcao").focus();
    });
    document.getElementById("quizFechar").addEventListener("click", fechar);
    fundo.addEventListener("click", function (e) { if (e.target === fundo) fechar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !fundo.hidden) fechar(); });
    // "Ver o plano": fecha a janela e leva até o card destacado
    document.getElementById("quizVer").addEventListener("click", fechar);

    document.getElementById("quizRefazer").addEventListener("click", function () {
      respostas = [];
      document.querySelectorAll(".plan-card").forEach(function (c) { c.classList.remove("plan-card--indicado"); });
      irPara(0);
    });
    irPara(0);
  }

  /* ---------- 4. Surgir ao rolar ---------- */
  function revelarAoRolar() {
    const itens = document.querySelectorAll("[data-revelar]");
    if (menosMovimento || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("revelar-ativo");
    const obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("revelado"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    itens.forEach(function (el) { obs.observe(el); });
  }
})();
