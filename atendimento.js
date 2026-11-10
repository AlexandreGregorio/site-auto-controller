/* =====================================================================
 * Auto Controller System – Central de atendimento do site (v40.1)
 * ---------------------------------------------------------------------
 * Une num só lugar:
 *   - as dúvidas frequentes (antigo "Tire suas dúvidas");
 *   - a triagem por setor (suporte, financeiro, comercial, ocorrência,
 *     ordem de serviço), que monta um resumo e manda pelo WhatsApp ou
 *     e-mail do setor certo.
 * Substitui assistente.js e chat-ao-vivo.js (o chat ao vivo saiu do site).
 *
 * COMO FUNCIONA
 *   1. Apresentação: boas-vindas e coleta de nome e empresa/placa, para que
 *      todo resumo enviado ao WhatsApp ou e-mail já saia identificado.
 *   2. Menu de setores e dúvidas (a identificação vale para toda a conversa).
 *   3. Perguntas curtas › resumo pronto › o visitante envia pelo WhatsApp
 *      ou e-mail. Nada sai do aparelho sem o visitante tocar no botão.
 *   4. Digitar uma dúvida a qualquer momento busca nas perguntas frequentes.
 *   5. "Roubo", "furto", "assalto"... em qualquer ponto: fluxo de prioridade.
 *
 * O QUE EDITAR
 *   - CONFIG: números, e-mails e links.
 *   - FLUXO: textos, opções e perguntas de cada setor.
 *   - DUVIDAS_EXTRAS: respostas além das perguntas frequentes da página
 *     (as perguntas da seção #faq entram sozinhas).
 * ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------ CONFIG ------------------------------ */
  var CONFIG = {
    whatsSuporte: '552134963942',       // Suporte técnico (21) 3496-3942
    whatsAtendimento: '5521975988587',  // Atendimento (21) 97598-8587
    telSuporte: '+552134963942',        // Ligação direta (roubo ou furto)
    email: {
      suporte: 'suporte@autocontrollersystem.com.br',
      financeiro: 'financeiro@autocontrollersystem.com.br',
      comercial: 'comercial@autocontrollersystem.com.br',
      atendimento: 'atendimento@autocontrollersystem.com.br'
    },
    urlPlataforma: 'https://gestao.autocontrollersystem.com.br',
    // Formulário "Solicitar atendimento técnico" (Apps Script)
    urlFormularioOS: 'https://script.google.com/macros/s/AKfycbzJ_DV1L9kXMomIuG3_3sHV-OYKAkoXitFosEpXJYjXuYYOd0pHFJPQZP9YWFRV_DYZ-Q/exec'
  };

  var DESTINOS = {
    suporte:     { nome: 'Suporte técnico', whats: CONFIG.whatsSuporte,     fone: '(21) 3496-3942',  email: CONFIG.email.suporte },
    financeiro:  { nome: 'Financeiro',      whats: CONFIG.whatsAtendimento, fone: '(21) 97598-8587', email: CONFIG.email.financeiro },
    comercial:   { nome: 'Comercial',       whats: CONFIG.whatsAtendimento, fone: '(21) 97598-8587', email: CONFIG.email.comercial },
    atendimento: { nome: 'Atendimento',     whats: CONFIG.whatsAtendimento, fone: '(21) 97598-8587', email: CONFIG.email.atendimento }
  };

  var PALAVRAS_ROUBO = /\b(roub|furt|assalt|levaram|sequestr)/i;

  /* ------------------------------ FLUXO ------------------------------- */
  /* Opção: { rotulo, destino, aviso?, perguntas[], acao?, prioridade?, urgente? }
     Pergunta: { campo, texto, opcoes?, placa? }   (sem opcoes = resposta livre)
     Ações: 'formOS' | 'consultaOS' | 'orcamento' | 'irPara' | 'roubo'        */
  var FLUXO = {
    suporte: {
      titulo: 'Suporte técnico',
      texto: 'Sobre qual assunto você precisa de suporte?',
      opcoes: [
        { rotulo: 'Plataforma ou aplicativo', destino: 'suporte',
          perguntas: [{ campo: 'Mensagem', texto: 'Conte em poucas palavras o que está acontecendo (acesso, senha, tela, relatório...).' }] },
        { rotulo: 'Rastreador sem sinal', destino: 'suporte',
          aviso: 'Antes de seguir, confira se o veículo não está parado há muito tempo ou com a bateria desligada.',
          perguntas: [
            { campo: 'Placa', texto: 'Qual a placa do veículo?', placa: true },
            { campo: 'Situação', texto: 'O veículo está rodando agora?', opcoes: ['Sim, está rodando', 'Não, está parado'] },
            { campo: 'Desde quando', texto: 'Desde quando a posição não atualiza?' }
          ] },
        { rotulo: 'Câmeras', destino: 'suporte',
          perguntas: [
            { campo: 'Placa', texto: 'Qual a placa do veículo?', placa: true },
            { campo: 'Problema', texto: 'O que está acontecendo?', opcoes: ['Câmera sem imagem', 'Imagem escura ou obstruída', 'Não está gravando', 'Outro'] },
            { campo: 'Câmera', texto: 'Qual câmera?', opcoes: ['Frontal', 'Cabine', 'Lateral', 'Traseira', 'Não sei'] }
          ] },
        { rotulo: 'Alertas e configurações', destino: 'suporte',
          aviso: 'Os ajustes de alertas e configurações são feitos pela equipe Auto Controller.',
          perguntas: [
            { campo: 'Alerta', texto: 'Qual alerta ou configuração?', opcoes: ['Câmeras com IA (ADAS/DMS)', 'Velocidade', 'Cercas e locais', 'Outro'] },
            { campo: 'Mensagem', texto: 'O que precisa mudar?' }
          ] },
        { rotulo: 'Visita técnica', acao: 'irPara', para: 'os' }
      ]
    },
    financeiro: {
      titulo: 'Financeiro',
      texto: 'Como podemos ajudar no financeiro?',
      opcoes: [
        { rotulo: '2ª via de boleto', destino: 'financeiro',
          perguntas: [{ campo: 'Mês de referência', texto: 'De qual mês é o boleto?' }] },
        { rotulo: 'Informar pagamento', destino: 'financeiro',
          aviso: 'Ao enviar pelo WhatsApp, anexe o comprovante na conversa.',
          perguntas: [{ campo: 'Pagamento', texto: 'Informe a data e o valor do pagamento.' }] },
        { rotulo: 'Dúvida sobre cobrança', destino: 'financeiro',
          perguntas: [{ campo: 'Mensagem', texto: 'Qual é a sua dúvida?' }] },
        { rotulo: 'Nota fiscal', destino: 'financeiro',
          perguntas: [{ campo: 'Mês de referência', texto: 'De qual mês é a nota fiscal?' }] }
      ]
    },
    comercial: {
      titulo: 'Comercial',
      texto: 'Sobre o que você quer falar com o comercial?',
      opcoes: [
        { rotulo: 'Pedir orçamento', acao: 'orcamento' },
        { rotulo: 'Conhecer os planos', destino: 'comercial',
          aviso: 'Temos três planos: <b>Lite</b>, <b>Standard</b> e <b>Premium</b>. Um especialista explica as diferenças e indica o mais adequado para a sua frota.',
          perguntas: [{ campo: 'Plano de interesse', texto: 'Qual plano você quer conhecer?', opcoes: ['Lite', 'Standard', 'Premium', 'Quero indicação'] }] },
        { rotulo: 'Incluir veículos no contrato', destino: 'comercial',
          perguntas: [{ campo: 'Quantidade de veículos', texto: 'Quantos veículos quer incluir?' }] },
        { rotulo: 'Falar com especialista', destino: 'comercial', perguntas: [] }
      ]
    },
    ocorrencia: {
      titulo: 'Ocorrência com o veículo',
      texto: 'Qual é a ocorrência ou solicitação?',
      opcoes: [
        { rotulo: 'Roubo ou furto', acao: 'roubo' },
        { rotulo: 'Batida ou acidente', destino: 'suporte', prioridade: true,
          perguntas: [
            { campo: 'Placa', texto: 'Qual a placa do veículo?', placa: true },
            { campo: 'Data e horário', texto: 'Quando aconteceu? Informe a data e o horário aproximado.' },
            { campo: 'Local', texto: 'Onde aconteceu?' },
            { campo: 'Imagens da câmera', texto: 'Precisa das imagens da câmera desse momento?', opcoes: ['Sim', 'Não'] }
          ] },
        { rotulo: 'Imagem ou vídeo da câmera', destino: 'suporte',
          aviso: 'As imagens são enviadas conforme o período disponível na gravação.',
          perguntas: [
            { campo: 'Placa', texto: 'Qual a placa do veículo?', placa: true },
            { campo: 'Câmera', texto: 'De qual câmera?', opcoes: ['Frontal', 'Cabine', 'Lateral', 'Traseira', 'Todas'] },
            { campo: 'Data e horário', texto: 'Informe a data e o horário (ou o período). Ex.: 29/10, das 14h às 15h.' },
            { campo: 'Motivo', texto: 'Qual o motivo da solicitação?' }
          ] },
        { rotulo: 'Posição do veículo', destino: 'suporte',
          aviso: 'A posição em tempo real também aparece na plataforma Auto Controller System.',
          perguntas: [
            { campo: 'Placa', texto: 'Qual a placa do veículo?', placa: true },
            { campo: 'Período', texto: 'Precisa da posição atual ou de um período anterior?', opcoes: ['Posição atual', 'Período anterior'] },
            { campo: 'Detalhes', texto: 'Se for um período anterior, informe a data e o horário. Se for a atual, digite "atual".' }
          ] },
        { rotulo: 'Bloqueio ou desbloqueio', destino: 'suporte', prioridade: true, urgente: true,
          aviso: 'Por segurança, a central confirma o pedido com o responsável antes de executar.',
          perguntas: [
            { campo: 'Placa', texto: 'Qual a placa do veículo?', placa: true },
            { campo: 'Pedido', texto: 'O que você precisa?', opcoes: ['Bloquear', 'Desbloquear'] },
            { campo: 'Motivo', texto: 'Qual o motivo?' }
          ] }
      ]
    },
    os: {
      titulo: 'Ordem de serviço',
      texto: 'O que você precisa sobre ordem de serviço?',
      opcoes: [
        { rotulo: 'Solicitar atendimento técnico', acao: 'formOS' },
        { rotulo: 'Acompanhar uma OS', acao: 'consultaOS' },
        { rotulo: 'Reagendar ou cancelar visita', destino: 'suporte',
          perguntas: [
            { campo: 'Número da OS', texto: 'Qual o número da OS?' },
            { campo: 'Pedido', texto: 'O que deseja?', opcoes: ['Reagendar', 'Cancelar'] },
            { campo: 'Mensagem', texto: 'Se quiser, informe a melhor data ou o motivo.' }
          ] }
      ]
    },
    outros: {
      titulo: 'Outros assuntos', direto: true, destino: 'atendimento',
      perguntas: [{ campo: 'Mensagem', texto: 'Escreva o assunto e vamos encaminhar para o setor certo.' }]
    }
  };

  var MENU_PRINCIPAL = [
    { chave: 'duvidas', rotulo: 'Dúvidas sobre os serviços' },
    { chave: 'suporte', rotulo: 'Suporte técnico' },
    { chave: 'financeiro', rotulo: 'Financeiro' },
    { chave: 'comercial', rotulo: 'Comercial e orçamento' },
    { chave: 'ocorrencia', rotulo: 'Ocorrência com o veículo' },
    { chave: 'os', rotulo: 'Ordem de serviço' },
    { chave: 'outros', rotulo: 'Outros assuntos' }
  ];

  /* Respostas além das perguntas frequentes da página.
     termos: palavras que levam a esta resposta (sem acento). */
  var DUVIDAS_EXTRAS = [
    { pergunta: 'Quais são os planos?',
      termos: 'plano planos lite standard premium preco valor quanto custa mensalidade diferenca',
      resposta: 'São três planos:<br><b>Lite</b>: localização em tempo real, histórico de percursos, cercas virtuais, bloqueio remoto e alertas.<br><b>Standard</b>: tudo do Lite, mais gestão de motoristas, análise de condução, consumo de combustível e controle de despesas.<br><b>Premium</b>: tudo do Standard, mais câmeras com IA (ADAS e DMS), ranking de motoristas, pneus, inspeções e sensores.<br>Os valores são sob consulta, de acordo com o tamanho da frota.',
      link: { rotulo: 'Ver os planos', href: '#planos' }, depois: 'comercial' },
    { pergunta: 'Como funcionam as câmeras com IA?',
      termos: 'camera cameras video videomonitoramento ia inteligencia artificial adas dms fadiga distracao celular colisao',
      resposta: 'As câmeras com Inteligência Artificial analisam a via e o motorista em tempo real. O <b>ADAS</b> avisa sobre risco de colisão, troca de faixa e pedestre à frente. O <b>DMS</b> avisa sobre fadiga, distração, uso de celular e outros comportamentos de risco. Os eventos ficam gravados em vídeo.',
      depois: 'comercial' },
    { pergunta: 'O que é a telemetria?',
      termos: 'telemetria combustivel consumo economia rpm frenagem aceleracao conducao motorista',
      resposta: 'A telemetria mostra como o veículo é conduzido: velocidade, RPM, frenagens, acelerações e curvas bruscas, além do consumo de combustível pela distância percorrida. Com esses dados, a frota reduz custos e corrige hábitos de direção.',
      link: { rotulo: 'Conhecer a telemetria', href: 'telemetria-veicular.html' }, depois: 'comercial' },
    { pergunta: 'Vocês fazem controle de abastecimento?',
      termos: 'abastecimento abastecer posto litro litros combustivel planilha controle',
      resposta: 'Sim. O controle de abastecimento cruza os abastecimentos com a quilometragem do rastreador, para mostrar o consumo real de cada veículo e apontar diferenças.',
      link: { rotulo: 'Ver controle de abastecimento', href: 'controle-de-abastecimento.html' }, depois: 'comercial' },
    { pergunta: 'Como acesso a plataforma?',
      termos: 'acesso acessar entrar login plataforma sistema site usuario senha esqueci',
      resposta: 'A plataforma Auto Controller System fica no endereço abaixo. Se esqueceu a senha ou não consegue entrar, o suporte técnico ajuda.',
      link: { rotulo: 'Abrir a plataforma', href: CONFIG.urlPlataforma, fora: true }, depois: 'suporte' }
  ];

  var STOP = ' a o e as os de da do das dos em no na nos nas um uma para por com sem que qual quais como meu minha seu sua eu voce voces ser tem ter sobre e ou se mais muito isso esse essa este esta ja nao sim oi ola bom boa dia tarde noite quero gostaria preciso saber ';

  /* --------------------------- ELEMENTOS ------------------------------ */
  var painel = document.getElementById('assistentePainel');
  if (!painel) return;
  // Clona os controles para descartar comportamentos antigos (assistente.js)
  function limpo(id) {
    var e = document.getElementById(id);
    if (!e) return null;
    var c = e.cloneNode(true); e.parentNode.replaceChild(c, e); return c;
  }
  var botao = limpo('assistenteBotao');
  var fechar = limpo('assistenteFechar');
  var form = limpo('assistenteForm');
  var corpo = document.getElementById('assistenteMensagens');
  var campo = document.getElementById('assistenteCampo');
  var reiniciar = document.getElementById('assistenteReiniciar');

  /* ----------------------------- ESTADO ------------------------------- */
  var estado, aoResponder = null, opcoesAtuais = [], naoEntendidas = 0, ocupado = 0, fila = null, base = null;
  function novoEstado() {
    estado = { nome: estado ? estado.nome : '', ident: estado ? estado.ident : '', setor: '', assunto: '', respostas: [], prioridade: false };
  }

  /* --------------------------- DESENHO -------------------------------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* Rolagem: a conversa abre no topo e, a cada resposta, a tela para no
     início do trecho novo (a mensagem do visitante), sem pular para o fim. */
  var marco = null;
  function rolar() {
    var max = corpo.scrollHeight - corpo.clientHeight;
    var alvo = 0;
    if (marco && marco.isConnected) alvo = marco.getBoundingClientRect().top - corpo.getBoundingClientRect().top + corpo.scrollTop - 10;
    corpo.scrollTop = Math.max(0, Math.min(max, alvo));
  }
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function bot(html, atraso) {
    ocupado++;
    var d = el('div', 'msg msg--assistente msg--digitando', '<span></span><span></span><span></span>');
    corpo.appendChild(d); rolar();
    return espera(atraso === undefined ? 380 : atraso).then(function () {
      d.remove();
      var m = el('div', 'msg msg--assistente', html);
      corpo.appendChild(m); rolar(); ocupado--;
      return m;
    });
  }
  function visitante(t) { marco = el('div', 'msg msg--visitante', esc(t)); corpo.appendChild(marco); rolar(); }

  /* Botões de escolha. itens: [{ rotulo, fn, sec? }] */
  function botoes(itens, rodape) {
    limparBotoes();
    var lista = itens.slice();
    if (rodape !== false) {
      lista.push({ rotulo: 'Voltar ao menu', fn: menuPrincipal, sec: true });
      lista.push({ rotulo: 'Falar com atendente', fn: falarAtendente, sec: true });
    }
    opcoesAtuais = lista;
    var box = el('div', 'msg-opcoes ac-opcoes');
    var n = 0;
    lista.forEach(function (it, i) {
      var b = el('button', 'msg-opcao' + (it.sec ? ' msg-opcao--voltar' : ''));
      b.type = 'button';
      b.innerHTML = (it.sec ? '' : '<span class="ac-num">' + (++n) + '</span>') + esc(it.rotulo);
      b.addEventListener('click', function () { escolher(i); });
      box.appendChild(b);
    });
    corpo.appendChild(box); rolar();
    if (fila !== null) { var t = fila; fila = null; setTimeout(function () { tratar(t, true); }, 0); }
  }
  function limparBotoes() {
    corpo.querySelectorAll('.ac-opcoes:not(.ac-usado)').forEach(function (b) { b.classList.add('ac-usado'); b.querySelectorAll('button').forEach(function (x) { x.disabled = true; }); });
    opcoesAtuais = [];
  }
  function escolher(i) {
    var it = opcoesAtuais[i];
    if (!it) return;
    naoEntendidas = 0;
    visitante(it.rotulo);
    limparBotoes();
    aoResponder = null;
    it.fn();
  }
  function linkBotao(rotulo, href, fora, alvo) {
    var box = el('div', 'msg-acoes ac-links');
    var a = el('a', 'msg-acao', esc(rotulo));
    a.href = href;
    if (fora) { a.target = '_blank'; a.rel = 'noopener'; }
    if (alvo) a.addEventListener('click', alvo);
    box.appendChild(a); corpo.appendChild(box); rolar();
  }

  /* --------------------------- ENTRADA -------------------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = campo.value.trim();
    if (!t) return;
    campo.value = '';
    tratar(t, false);
  });

  function normal(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function tratar(t, mostrado) {
    function cli() { if (!mostrado) visitante(t); }

    if (PALAVRAS_ROUBO.test(normal(t)) && estado.assunto !== 'Roubo ou furto') {
      cli(); limparBotoes(); aoResponder = null; fluxoRoubo(); return;
    }
    // Número de uma opção visível
    if (opcoesAtuais.length && /^\d{1,2}$/.test(t)) {
      var principais = opcoesAtuais.filter(function (o) { return !o.sec; });
      var p = principais[parseInt(t, 10) - 1];
      if (p) { escolher(opcoesAtuais.indexOf(p)); return; }
    }
    // Texto igual ou parecido com uma opção
    if (opcoesAtuais.length && normal(t).length >= 3) {
      var achou = -1;
      opcoesAtuais.forEach(function (o, i) { if (achou < 0 && normal(o.rotulo).indexOf(normal(t)) >= 0) achou = i; });
      if (achou >= 0) { escolher(achou); return; }
    }
    if (aoResponder) { cli(); var f = aoResponder; aoResponder = null; f(t); return; }
    if (ocupado > 0 && !opcoesAtuais.length) { cli(); fila = t; return; }

    // Texto livre: procura nas dúvidas
    cli();
    var r = buscar(t);
    if (r.length) { naoEntendidas = 0; limparBotoes(); responderDuvida(r[0], r.slice(1, 3)); return; }

    naoEntendidas++;
    if (naoEntendidas >= 2) {
      naoEntendidas = 0;
      bot('Não consegui entender. Se preferir, encaminho você para um atendente.').then(function () {
        botoes([{ rotulo: 'Falar com atendente', fn: falarAtendente }, { rotulo: 'Voltar ao menu', fn: menuPrincipal }], false);
      });
    } else {
      bot('Não encontrei uma resposta para isso. Tente com outras palavras, escolha uma opção acima ou digite o número dela.');
    }
  }

  function perguntar(texto) {
    return new Promise(function (res) {
      bot(texto).then(function () {
        if (fila !== null) { var t = fila; fila = null; res(t); return; }
        aoResponder = res; campo.focus();
      });
    });
  }
  function escolhaRapida(texto, opcoes) {
    return new Promise(function (res) {
      bot(texto).then(function () { botoes(opcoes.map(function (o) { return { rotulo: o, fn: function () { res(o); } }; })); });
    });
  }
  function pareceplaca(s) { return /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i.test(String(s).replace(/\s/g, '')); }

  /* ----------------------- DÚVIDAS (FAQ) ------------------------------ */
  function montarBase() {
    if (base) return base;
    base = [];
    document.querySelectorAll('#faq .faq-item').forEach(function (item) {
      var q = item.querySelector('.faq-question span'), a = item.querySelector('.faq-answer');
      if (!q || !a) return;
      var pergunta = q.textContent.trim();
      var resposta = esc(a.textContent.replace(/\s+/g, ' ').trim());
      var extra = {};
      if (/atendimento t[eé]cnico/i.test(pergunta)) extra = { acao: 'formOS' };
      base.push({ pergunta: pergunta, resposta: resposta, termos: normal(pergunta + ' ' + a.textContent), acao: extra.acao, depois: /bloque|jammer|desbloque/i.test(pergunta) ? 'suporte' : 'comercial' });
    });
    DUVIDAS_EXTRAS.forEach(function (d) { base.push({ pergunta: d.pergunta, resposta: d.resposta, termos: normal(d.pergunta + ' ' + d.termos), link: d.link, depois: d.depois }); });
    base.forEach(function (d) { d.radicais = radicais(d.termos); });
    return base;
  }
  function radicais(s) {
    var out = {};
    normal(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).forEach(function (w) {
      if (w.length < 3 || STOP.indexOf(' ' + w + ' ') >= 0) return;
      out[w.slice(0, 5)] = 1;
    });
    return out;
  }
  function buscar(t) {
    var q = Object.keys(radicais(t));
    if (!q.length) return [];
    return montarBase().map(function (d) {
      var p = 0; q.forEach(function (w) { if (d.radicais[w]) p++; });
      if (normal(d.pergunta).indexOf(normal(t)) >= 0) p += 2;
      return { d: d, p: p };
    }).filter(function (x) { return x.p > 0; })
      .sort(function (a, b) { return b.p - a.p; })
      .map(function (x) { return x.d; });
  }

  function menuDuvidas() {
    estado.setor = 'Dúvidas';
    bot('Escolha uma dúvida ou digite a sua pergunta:').then(function () {
      botoes(montarBase().map(function (d) { return { rotulo: d.pergunta, fn: function () { responderDuvida(d); } }; }));
    });
  }
  function responderDuvida(d, parecidas) {
    bot('<b>' + esc(d.pergunta) + '</b><br>' + d.resposta, 450).then(function () {
      if (d.link) linkBotao(d.link.rotulo, d.link.href, d.link.fora, d.link.fora ? null : function () { painelFechar(); });
      if (d.acao === 'formOS' && CONFIG.urlFormularioOS) linkBotao('Abrir ordem de serviço', CONFIG.urlFormularioOS, true);
      return bot('Isso resolveu a sua dúvida?');
    }).then(function () {
      var itens = [{ rotulo: 'Sim, obrigado', fn: encerrarDuvida }];
      itens.push({ rotulo: d.depois === 'suporte' ? 'Falar com o suporte' : 'Falar com um especialista', fn: function () {
        if (d.depois === 'suporte') abrirSetor('suporte');
        else abrirOpcao(FLUXO.comercial.opcoes[3], 'Comercial');
      } });
      (parecidas || []).forEach(function (p) { itens.push({ rotulo: p.pergunta, fn: function () { responderDuvida(p); } }); });
      itens.push({ rotulo: 'Outras dúvidas', fn: menuDuvidas });
      botoes(itens);
    });
  }
  function encerrarDuvida() {
    bot('Que bom! Se precisar de mais alguma coisa, é só escolher uma opção.').then(function () { menuPrincipal(true); });
  }

  /* ---------------------------- ETAPAS -------------------------------- */
  function iniciar() {
    estado = null; novoEstado();
    corpo.innerHTML = ''; marco = null; corpo.scrollTop = 0;
    // Apresentação: coleta nome e empresa/placa logo no início, para que
    // tudo o que for enviado ao WhatsApp ou e-mail já saia identificado.
    bot('Olá! Esta é a central de atendimento da <b>Auto Controller System</b>. Tire suas dúvidas ou fale com o setor certo.', 250)
      .then(function () { return identificar(); })
      .then(function () { return bot('Prazer, ' + esc(primeiroNome()) + '! Como podemos ajudar? Escolha uma opção ou digite a sua dúvida:'); })
      .then(function () { menuPrincipal(true); });
  }

  function menuPrincipal(semTexto) {
    novoEstado();
    var p = semTexto === true ? Promise.resolve() : bot('Como podemos ajudar? Escolha uma opção ou digite a sua dúvida:');
    p.then(function () {
      var itens = MENU_PRINCIPAL.map(function (m) { return { rotulo: m.rotulo, fn: function () { abrirSetor(m.chave); } }; });
      itens.push({ rotulo: 'Falar com atendente', fn: falarAtendente, sec: true });
      botoes(itens, false);
    });
  }

  /* Pede nome e empresa/placa só quando o atendimento vai para um setor */
  function identificar() {
    if (estado.nome && estado.ident) return Promise.resolve();
    var p = estado.nome ? Promise.resolve(estado.nome) : perguntar('Para começar, qual é o seu nome?');
    return p.then(function (n) {
      // Nome com iniciais maiúsculas ("marcos silva" › "Marcos Silva")
      estado.nome = String(n).trim().toLowerCase().replace(/(^|\s)(\S)/g, function (m, e, l) { return e + l.toUpperCase(); }).replace(/ (Da|De|Do|Das|Dos|E) /g, function (m) { return m.toLowerCase(); });
      if (estado.ident) return estado.ident;
      return perguntar('Obrigado, ' + esc(primeiroNome()) + '. Qual é a sua empresa? Se já for cliente, pode informar também a placa do veículo.');
    }).then(function (i) { estado.ident = i; });
  }
  function primeiroNome() {
    var n = String(estado.nome || '').trim().split(/\s+/)[0] || '';
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  function abrirSetor(chave) {
    if (chave === 'duvidas') return menuDuvidas();
    var s = FLUXO[chave];
    estado.setor = s.titulo;
    if (s.direto) return abrirOpcao({ rotulo: '', destino: s.destino, perguntas: s.perguntas }, s.titulo);
    bot(s.texto).then(function () {
      botoes(s.opcoes.map(function (op) { return { rotulo: op.rotulo, fn: function () { abrirOpcao(op, s.titulo); } }; }));
    });
  }

  function abrirOpcao(op, setor) {
    if (setor) estado.setor = setor;
    if (op.acao === 'irPara') return abrirSetor(op.para);
    if (op.acao === 'roubo') return fluxoRoubo();
    if (op.acao === 'orcamento') return abrirOrcamento();
    if (op.acao === 'formOS') return abrirFormOS();
    if (op.acao === 'consultaOS') return consultarOS();
    estado.assunto = op.rotulo;
    if (op.prioridade) estado.prioridade = true;
    var p = op.aviso ? bot(op.aviso) : Promise.resolve();
    p.then(identificar).then(function () { return seguirPerguntas(op); });
  }

  function seguirPerguntas(op) {
    var lista = op.perguntas || [], i = 0;
    function proxima() {
      if (i >= lista.length) return mostrarResumo(DESTINOS[op.destino], !!op.urgente);
      var pq = lista[i++];
      if (pq.placa && pareceplaca(estado.ident)) return proxima();
      var r = pq.opcoes ? escolhaRapida(pq.texto, pq.opcoes) : perguntar(pq.texto);
      return r.then(function (v) {
        estado.respostas.push([pq.campo, v]);
        if (v === 'Sim, está rodando') estado.prioridade = true;
        return proxima();
      });
    }
    return proxima();
  }

  /* Roubo ou furto: sem menus, prioridade */
  function fluxoRoubo() {
    estado.setor = 'Ocorrência com o veículo'; estado.assunto = 'Roubo ou furto'; estado.prioridade = true; estado.respostas = [];
    bot('<b>Vamos agir agora.</b> Ligue para a nossa central ou envie o aviso pelo WhatsApp do suporte.').then(function () {
      linkAcoes([{ rotulo: 'Ligar agora · (21) 3496-3942', href: 'tel:' + CONFIG.telSuporte, pri: true }]);
      return pareceplaca(estado.ident) ? estado.ident.toUpperCase() : perguntar('Qual a placa do veículo?');
    }).then(function (placa) {
      if (placa !== String(estado.ident).toUpperCase()) estado.respostas.push(['Placa', placa]);
      return perguntar('Onde e a que horas aconteceu? Se não souber, digite "não sei".');
    }).then(function (onde) {
      estado.respostas.push(['Local e horário', onde]);
      return bot('Assim que possível, registre o boletim de ocorrência. A nossa equipe acompanha o veículo pela plataforma.');
    }).then(function () { mostrarResumo(DESTINOS.suporte, true); });
  }

  /* Orçamento: usa o formulário do próprio site (orcamento.js) */
  function abrirOrcamento() {
    bot('O pedido de orçamento é rápido: conte um pouco da sua frota e um especialista responde pelo WhatsApp.').then(function () {
      linkBotao('Abrir formulário de orçamento', '#orcamento', false, function (e) {
        var gatilho = document.querySelector('[data-abrir-orcamento]');
        if (gatilho) { e.preventDefault(); painelFechar(); gatilho.click(); }
      });
      botoes([{ rotulo: 'Prefiro falar com um especialista', fn: function () { abrirOpcao(FLUXO.comercial.opcoes[3], 'Comercial'); } }]);
    });
  }

  /* Atendimento técnico: formulário do Apps Script (gera a OS) */
  function abrirFormOS() {
    bot('Para agendar, preencha o formulário de atendimento técnico. Ele já gera a sua ordem de serviço e a equipe entra em contato.').then(function () {
      linkBotao('Abrir ordem de serviço', CONFIG.urlFormularioOS, true);
      botoes([{ rotulo: 'Prefiro enviar pelo WhatsApp', fn: function () {
        abrirOpcao({ rotulo: 'Solicitar atendimento técnico', destino: 'suporte', perguntas: [
          { campo: 'Placa', texto: 'Qual a placa do veículo?', placa: true },
          { campo: 'Serviço', texto: 'Qual serviço?', opcoes: ['Instalação', 'Manutenção', 'Retirada', 'Outro'] },
          { campo: 'Local', texto: 'Em qual bairro/cidade o veículo vai estar?' }
        ] }, 'Ordem de serviço');
      } }]);
    });
  }

  /* Consulta de OS: usa a Central do cliente do site (central-cliente.js) */
  function consultarOS() {
    estado.assunto = 'Acompanhar OS';
    perguntar('Informe o número da OS (ex.: OS-2026-1031 ou só 1031).').then(function (num) {
      var abrir = document.querySelector('[data-abrir-central]');
      var osForm = document.getElementById('osForm'), osNum = document.getElementById('osNumero');
      if (abrir && osForm && osNum) {
        return bot('Vou abrir a Central do cliente com a sua OS.').then(function () {
          linkBotao('Ver a etapa da OS ' + num, '#central', false, function (e) {
            e.preventDefault(); painelFechar(); abrir.click();
            setTimeout(function () {
              osNum.value = num;
              if (osForm.requestSubmit) osForm.requestSubmit(); else osForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }, 250);
          });
          botoes([{ rotulo: 'Falar com o suporte sobre esta OS', fn: function () {
            estado.respostas = [['Número da OS', num]]; identificar().then(function () { mostrarResumo(DESTINOS.suporte); });
          } }]);
        });
      }
      estado.respostas = [['Número da OS', num]];
      return identificar().then(function () { mostrarResumo(DESTINOS.suporte); });
    });
  }

  /* ---------------------------- RESUMO -------------------------------- */
  function textoResumo() {
    var l = [];
    l.push((estado.prioridade ? '[PRIORIDADE] ' : '') + String(estado.setor || 'Atendimento').toUpperCase() + (estado.assunto ? ' › ' + estado.assunto : ''));
    if (estado.nome) l.push('Nome: ' + estado.nome);
    if (estado.ident) l.push('Empresa/placa: ' + estado.ident);
    estado.respostas.forEach(function (r) { l.push(r[0] + ': ' + r[1]); });
    l.push('(Enviado pela central de atendimento do site)');
    return l.join('\n');
  }
  function linkAcoes(itens, dentro) {
    var box = el('div', 'msg-acoes');
    itens.forEach(function (it) {
      var a = el(it.botao ? 'button' : 'a', 'msg-acao' + (it.pri ? ' msg-acao--chat' : ' ac-sec'), esc(it.rotulo));
      if (it.botao) { a.type = 'button'; a.addEventListener('click', it.botao); }
      else { a.href = it.href; if (/^https?:/.test(it.href)) { a.target = '_blank'; a.rel = 'noopener'; } }
      box.appendChild(a);
    });
    (dentro || corpo).appendChild(box); rolar();
    return box;
  }
  function mostrarResumo(dest, urgente) {
    var txt = textoResumo();
    bot(urgente ? 'Envie também o aviso por escrito, com os dados abaixo:'
      : 'Pronto! Envie o resumo abaixo e o <b>' + esc(dest.nome) + '</b> já recebe tudo o que precisa:').then(function () {
      var card = el('div', 'ac-resumo');
      card.appendChild(el('pre', '', esc(txt)));
      var acoes = [];
      if (urgente) acoes.push({ rotulo: 'Ligar agora', href: 'tel:' + CONFIG.telSuporte, pri: true });
      acoes.push({ rotulo: 'Enviar pelo WhatsApp', href: 'https://wa.me/' + dest.whats + '?text=' + encodeURIComponent(txt), pri: !urgente });
      acoes.push({ rotulo: 'Enviar por e-mail', href: 'mailto:' + dest.email + '?subject=' + encodeURIComponent('Central de atendimento – ' + (estado.setor || 'Atendimento') + (estado.ident ? ' – ' + estado.ident : '')) + '&body=' + encodeURIComponent(txt) });
      var copiar = { rotulo: 'Copiar resumo', botao: function (e) {
        var b = e.currentTarget;
        Promise.resolve().then(function () { return navigator.clipboard.writeText(txt); })
          .then(function () { b.textContent = 'Resumo copiado'; })
          .catch(function () { b.textContent = 'Selecione o texto acima para copiar'; });
      } };
      acoes.push(copiar);
      linkAcoes(acoes, card);
      card.appendChild(el('p', 'ac-contato', 'WhatsApp ' + dest.fone + ' · ' + esc(dest.email)));
      corpo.appendChild(card); rolar();
      botoes([{ rotulo: 'Novo atendimento', fn: menuPrincipal }], false);
    });
  }

  function falarAtendente() {
    if (!estado.setor) estado.setor = 'Atendimento';
    estado.assunto = estado.assunto || 'Pediu atendente';
    identificar().then(function () { return perguntar('Certo. Em poucas palavras, qual é o assunto?'); }).then(function (msg) {
      estado.respostas.push(['Mensagem', msg]);
      mostrarResumo(/suporte|ordem|ocorr/i.test(estado.setor) ? DESTINOS.suporte : DESTINOS.atendimento);
    });
  }

  /* ------------------------ ABRIR / FECHAR ---------------------------- */
  var iniciado = false;
  function painelAbrir() {
    painel.hidden = false;
    document.body.classList.add('assistente-aberto');
    if (botao) botao.setAttribute('aria-expanded', 'true');
    if (!iniciado) { iniciado = true; iniciar(); }
    setTimeout(function () { if (window.matchMedia('(min-width: 769px)').matches) campo.focus(); }, 60);
  }
  function painelFechar() {
    painel.hidden = true;
    document.body.classList.remove('assistente-aberto');
    if (botao) { botao.setAttribute('aria-expanded', 'false'); botao.focus({ preventScroll: true }); }
  }
  if (botao) botao.addEventListener('click', function () { painel.hidden ? painelAbrir() : painelFechar(); });
  if (fechar) fechar.addEventListener('click', painelFechar);
  if (reiniciar) reiniciar.addEventListener('click', function () { iniciado = true; iniciar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !painel.hidden) painelFechar(); });
  // Qualquer botão/link do site com data-abrir-assistente abre a central
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('[data-abrir-assistente]');
    if (!g) return;
    e.preventDefault(); e.stopImmediatePropagation();
    painelAbrir();
  }, true);
  // Link direto: autocontrollersystem.com.br/#atendimento
  if (location.hash === '#atendimento') painelAbrir();

  // API simples para outros scripts
  window.CentralAtendimento = { abrir: painelAbrir, fechar: painelFechar };
})();
