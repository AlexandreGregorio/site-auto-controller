/* ==========================================================================
   v41 – DEPOIMENTOS E FALE COM A DIRETORIA
   - Depoimentos aprovados: vêm da Central AC (/central/api/site_depoimentos.php).
     Sem nenhum aprovado, o bloco "Quem confia na Auto Controller" fica escondido.
   - Formulário de depoimento e o da diretoria: enviam para a Central AC.
   ========================================================================== */
(function () {
  "use strict";
  var API = "/central/api/";

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function iniciais(nome) {
    var p = String(nome || "").trim().split(/\s+/);
    return ((p[0] || "")[0] || "").toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : "") || "").toUpperCase();
  }

  /* ---------- Depoimentos aprovados ---------- */
  function carregarDepoimentos() {
    var caixa = document.getElementById("depoPublicados");
    var lista = document.getElementById("depoLista");
    if (!caixa || !lista || !window.fetch) return;
    fetch(API + "site_depoimentos.php", { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var itens = d && d.ok && d.depoimentos ? d.depoimentos : [];
        if (!itens.length) return;
        lista.innerHTML = itens.slice(0, 6).map(function (x) {
          var nota = Math.max(1, Math.min(5, parseInt(x.nota, 10) || 5));
          var sub = [x.cargo, x.empresa].filter(Boolean).join(" · ");
          return '<figure class="depoimento">' +
            '<span class="depo-nota-ver" role="img" aria-label="Nota ' + nota + ' de 5">' + "★".repeat(nota) + "<i>" + "★".repeat(5 - nota) + "</i></span>" +
            "<blockquote>" + esc(x.texto) + "</blockquote>" +
            "<figcaption><strong>" + esc(x.nome) + "</strong>" + (sub ? "<span>" + esc(sub) + "</span>" : "") + "</figcaption></figure>";
        }).join("");
        caixa.hidden = false;
      })
      .catch(function () { /* sem conexão com a Central: o bloco continua escondido */ });
  }

  /* ---------- Estrelas da nota ---------- */
  function estrelas(form) {
    var labels = form.querySelectorAll(".depo-estrelas label");
    function pintar(ate) {
      labels.forEach(function (l, i) { l.classList.toggle("acesa", i < ate); });
    }
    function marcada() {
      var c = form.querySelector('input[name="nota"]:checked');
      return c ? parseInt(c.value, 10) : 0;
    }
    labels.forEach(function (l, i) {
      l.addEventListener("mouseenter", function () { pintar(i + 1); });
      l.addEventListener("mouseleave", function () { pintar(marcada()); });
      l.querySelector("input").addEventListener("change", function () { pintar(marcada()); });
    });
  }

  /* ---------- Envio dos formulários ---------- */
  function contatoOk(v) {
    v = String(v || "").trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
    var d = v.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 13;
  }

  function preparar(form, endpoint, conferir) {
    if (!form) return;
    var erro = form.querySelector(".orc-erro");
    var botao = form.querySelector('button[type="submit"]');
    var ok = form.parentNode.querySelector(".depo-ok");
    function mostrarErro(t) { erro.textContent = t; erro.hidden = false; }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      erro.hidden = true;
      var msg = conferir(form);
      if (msg) { mostrarErro(msg); return; }
      var dados = new FormData(form);
      botao.disabled = true;
      var rotulo = botao.querySelector("span").textContent;
      botao.querySelector("span").textContent = "Enviando…";
      fetch(API + endpoint, { method: "POST", body: dados, credentials: "omit" })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (d && d.ok) {
            form.hidden = true;
            if (ok) { ok.hidden = false; ok.setAttribute("tabindex", "-1"); ok.focus(); }
            if (typeof window.acsEvento === "function") window.acsEvento(endpoint.replace(".php", ""));
          } else {
            mostrarErro((d && d.erro) || "Não foi possível enviar agora. Tente de novo em instantes.");
          }
        })
        .catch(function () { mostrarErro("Não foi possível enviar agora. Verifique a sua conexão e tente de novo."); })
        .then(function () { botao.disabled = false; botao.querySelector("span").textContent = rotulo; });
    });
  }

  /* ---------- v42: menu do celular — "Soluções" abre/fecha; logo volta ao topo ---------- */
  function navMobile() {
    var mq = window.matchMedia("(max-width: 900px)");
    var sub = document.querySelector(".nav-sub");
    var linkSub = sub && sub.querySelector(".nav-link--sub");
    if (sub && linkSub) {
      linkSub.setAttribute("aria-expanded", "true");           // começa aberto
      linkSub.addEventListener("click", function (e) {
        if (!mq.matches) return;                                // no computador segue com o hover
        e.preventDefault();
        e.stopImmediatePropagation();                           // não deixa o script.js rolar/navegar
        var fechado = sub.classList.toggle("fechado");
        linkSub.setAttribute("aria-expanded", fechado ? "false" : "true");
      }, true);                                                 // captura: roda antes de outros cliques
    }
    // Logo: na home volta ao topo (sem recarregar) e fecha o menu; em subpáginas navega normal.
    var logo = document.querySelector(".logo-container");
    if (logo) {
      logo.addEventListener("click", function (e) {
        var href = logo.getAttribute("href") || "";
        if (href !== "#" && href !== "" && href !== "#inicio" && href !== "#topo") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var nav = document.getElementById("navMenu"), tog = document.getElementById("menuToggle");
        if (nav) nav.classList.remove("active");
        if (tog) { tog.classList.remove("active"); tog.setAttribute("aria-expanded", "false"); }
        document.body.classList.remove("menu-aberto");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, true);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    carregarDepoimentos();
    navMobile();

    var depo = document.getElementById("depoForm");
    if (depo) {
      estrelas(depo);
      preparar(depo, "site_depoimento.php", function (f) {
        if (f.nome.value.trim().length < 2) return "Informe o seu nome.";
        if (!contatoOk(f.contato.value)) return "Informe um WhatsApp com DDD ou um e-mail válido.";
        if (!f.querySelector('input[name="nota"]:checked')) return "Escolha uma nota de 1 a 5 estrelas.";
        if (f.texto.value.trim().length < 10) return "Escreva o seu depoimento.";
        if (!f.privacidade.checked) return "É preciso aceitar a Política de Privacidade.";
        return "";
      });
    }

    var dir = document.getElementById("diretoriaForm");
    preparar(dir, "site_diretoria.php", function (f) {
      if (f.nome.value.trim().length < 2) return "Informe o seu nome.";
      if (!contatoOk(f.contato.value)) return "Informe um WhatsApp com DDD ou um e-mail válido.";
      if (!f.assunto.value) return "Escolha o assunto.";
      if (f.mensagem.value.trim().length < 10) return "Escreva a sua mensagem.";
      var a = f.anexo.files && f.anexo.files[0];
      if (a && a.size > 5 * 1024 * 1024) return "O arquivo pode ter no máximo 5 MB.";
      if (a && !/\.(pdf|jpe?g|png)$/i.test(a.name)) return "Envie o arquivo em PDF, JPG ou PNG.";
      if (!f.privacidade.checked) return "É preciso aceitar a Política de Privacidade.";
      return "";
    });
  });
})();
