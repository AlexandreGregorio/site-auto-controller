/* ==========================================================================
   CONTROLE DE ABASTECIMENTO · Auto Controller System (v39)
   - Tudo fica no navegador do cliente (localStorage). Nada é enviado para a Auto Controller.
   - Km/L pelo método do tanque cheio: do tanque cheio anterior até o atual, somando os
     litros dos abastecimentos parciais do meio.
   - Excel (.xlsx) montado aqui mesmo, com a logo principal; PDF com o jsPDF (carregado
     só quando o cliente pede o PDF), em A4 deitado.
   ========================================================================== */
(function () {
  'use strict';
  var CHAVE = 'ac-abastecimento-v1';
  var LOGO = 'assets/logo-auto-controller.png';   // logo principal (fundo claro) para Excel e PDF
  var COMBUSTIVEIS = ['Diesel S10', 'Diesel S500', 'Gasolina', 'Etanol', 'GNV'];
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------------- dados ---------------- */
  var salvarOk = true;
  function vazio() { return { versao: 1, empresa: '', exemplos: false, veiculos: [], motoristas: [], precos: {}, abastecimentos: [] }; }
  function carregar() {
    try {
      var t = localStorage.getItem(CHAVE);
      if (t) { var d = JSON.parse(t); if (d && d.abastecimentos) return normalizar(d); }
      return null;
    } catch (e) { salvarOk = false; return null; }
  }
  function normalizar(d) {
    var v = vazio();
    v.empresa = String(d.empresa || '').slice(0, 60);
    v.exemplos = !!d.exemplos;
    v.veiculos = (d.veiculos || []).filter(function (x) { return x && x.id && x.placa; });
    v.motoristas = (d.motoristas || []).filter(function (x) { return x && x.id && x.nome; });
    v.precos = d.precos && typeof d.precos === 'object' ? d.precos : {};
    v.abastecimentos = (d.abastecimentos || []).filter(function (x) { return x && x.id && x.data && x.veiculo; });
    return v;
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(D)); salvarOk = true; }
    catch (e) { salvarOk = false; }
    $('#aviso-armazenamento').hidden = salvarOk;
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* Exemplos: veículos genéricos (sem marca), placas e nomes fictícios */
  function exemplos() {
    var d = vazio();
    d.exemplos = true; d.empresa = 'Frota Exemplo';
    d.precos = { 'Diesel S10': 6.05, 'Diesel S500': 5.95, 'Gasolina': 6.29, 'Etanol': 4.19, 'GNV': 4.79 };
    d.veiculos = [
      { id: 'v1', placa: 'EXE1A01', descricao: 'Utilitário leve', combustivel: 'Gasolina', meta: 10.5 },
      { id: 'v2', placa: 'EXE2B02', descricao: 'Caminhão 3/4', combustivel: 'Diesel S10', meta: 8 },
      { id: 'v3', placa: 'EXE3C03', descricao: 'Caminhão 3/4', combustivel: 'Diesel S10', meta: 8 },
      { id: 'v4', placa: 'EXE4D04', descricao: 'Caminhão toco', combustivel: 'Diesel S10', meta: 3.2 }
    ];
    d.motoristas = [{ id: 'm1', nome: 'Motorista A' }, { id: 'm2', nome: 'Motorista B' }, { id: 'm3', nome: 'Motorista C' }, { id: 'm4', nome: 'Motorista D' }];
    var hoje = new Date(), mes = function (dia) { var x = new Date(hoje.getFullYear(), hoje.getMonth() - 1, dia); return iso(x); };
    var L = [
      ['v1', 'm1', 1, 61040, 40.0, 6.25], ['v2', 'm2', 2, 70120, 90.0, 6.05], ['v3', 'm3', 2, 92920, 95.0, 6.05], ['v4', 'm4', 3, 187560, 205.0, 6.05],
      ['v1', 'm1', 9, 61607, 52.0, 6.29], ['v3', 'm3', 10, 93666, 91.4, 6.05], ['v2', 'm2', 12, 70828, 88.0, 6.09],
      ['v4', 'm4', 14, 188232, 198.0, 6.05], ['v1', 'm1', 18, 62028, 38.5, 6.35], ['v3', 'm3', 20, 94310, 98.2, 6.05, 'Lavagem no posto'],
      ['v2', 'm2', 24, 71540, 88.0, 6.09], ['v4', 'm4', 26, 188920, 210.5, 6.05], ['v1', 'm1', 28, 62480, 42.0, 6.29]
    ];
    d.abastecimentos = L.map(function (x, i) {
      var v = d.veiculos.filter(function (y) { return y.id === x[0]; })[0];
      return { id: 'a' + i, data: mes(x[2]), veiculo: x[0], motorista: x[1], combustivel: v.combustivel, litros: x[4], preco: x[5], km: x[3], cheio: true, obs: x[6] || '' };
    });
    return d;
  }

  var D = carregar();
  if (!D) { D = exemplos(); if (salvarOk) salvar(); }

  /* ---------------- formatos ---------------- */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function br(s) { return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : ''; }
  function num(v, c) { return (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }); }
  function rs(v) { return (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function ler(s) {   // aceita 1.234,56 · 1234,56 · 1234.56
    s = String(s == null ? '' : s).trim().replace(/[R$\s]/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return parseFloat(s);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function veic(id) { return D.veiculos.filter(function (v) { return v.id === id; })[0] || null; }
  function mot(id) { return D.motoristas.filter(function (m) { return m.id === id; })[0] || null; }
  function placaFmt(p) { p = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return p.length === 7 ? p.slice(0, 3) + '-' + p.slice(3) : p; }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3200); }

  /* ---------------- cálculo (tanque cheio) ---------------- */
  function calcular() {
    var porV = {};
    D.abastecimentos.forEach(function (a) { (porV[a.veiculo] = porV[a.veiculo] || []).push(a); });
    var r = {};
    Object.keys(porV).forEach(function (vid) {
      var l = porV[vid].slice().sort(function (a, b) { return a.km - b.km || (a.data < b.data ? -1 : 1); });
      var prevKm = null, ultCheio = null, acum = 0;
      l.forEach(function (a) {
        var x = { rodados: prevKm == null ? null : a.km - prevKm, kml: null, dist: 0, litrosCiclo: 0, primeiro: prevKm == null };
        if (a.cheio !== false) {
          if (ultCheio != null && a.km > ultCheio) { x.dist = a.km - ultCheio; x.litrosCiclo = acum + a.litros; x.kml = x.dist / x.litrosCiclo; }
          ultCheio = a.km; acum = 0;
        } else { acum += a.litros; x.parcial = true; }
        prevKm = a.km;
        r[a.id] = x;
      });
    });
    return r;
  }
  function cor(kml, meta) { if (kml == null || !meta) return ''; return kml >= meta ? 'g' : (kml >= meta * 0.9 ? 'y' : 'r'); }

  /* ---------------- filtros ---------------- */
  var F = { veiculo: '', motorista: '', combustivel: '', de: '', ate: '' };
  function filtrados() {
    return D.abastecimentos.filter(function (a) {
      return (!F.veiculo || a.veiculo === F.veiculo) && (!F.motorista || a.motorista === F.motorista) &&
        (!F.combustivel || a.combustivel === F.combustivel) && (!F.de || a.data >= F.de) && (!F.ate || a.data <= F.ate);
    }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : b.km - a.km; });
  }
  function periodoTxt(lista) {
    if (F.de || F.ate) return (F.de ? br(F.de) : 'início') + ' a ' + (F.ate ? br(F.ate) : 'hoje');
    if (!lista.length) return 'sem registros';
    var ds = lista.map(function (a) { return a.data; }).sort();
    return br(ds[0]) + ' a ' + br(ds[ds.length - 1]);
  }

  /* ---------------- resumo (tela, relatório, Excel, PDF) ---------------- */
  function resumo(lista, C) {
    var t = { gasto: 0, litros: 0, km: 0, dist: 0, litrosCiclo: 0, n: lista.length };
    var pv = {}, pm = {};
    lista.forEach(function (a) {
      var c = C[a.id] || {}, total = a.litros * a.preco;
      t.gasto += total; t.litros += a.litros; if (c.rodados > 0) t.km += c.rodados;
      if (c.kml != null) { t.dist += c.dist; t.litrosCiclo += c.litrosCiclo; }
      [[pv, a.veiculo], [pm, a.motorista || '_']].forEach(function (p) {
        var o = p[0][p[1]] = p[0][p[1]] || { n: 0, gasto: 0, litros: 0, km: 0, dist: 0, litrosCiclo: 0 };
        o.n++; o.gasto += total; o.litros += a.litros; if (c.rodados > 0) o.km += c.rodados;
        if (c.kml != null) { o.dist += c.dist; o.litrosCiclo += c.litrosCiclo; }
      });
    });
    var kml = function (o) { return o.litrosCiclo ? o.dist / o.litrosCiclo : null; };
    t.kml = kml(t); t.custoKm = t.km ? t.gasto / t.km : null;
    var veiculos = Object.keys(pv).map(function (id) { var v = veic(id) || { placa: '?', descricao: '', meta: null }; var o = pv[id]; return { id: id, placa: v.placa, descricao: v.descricao, meta: v.meta, n: o.n, gasto: o.gasto, litros: o.litros, km: o.km, kml: kml(o), custoKm: o.km ? o.gasto / o.km : null }; })
      .sort(function (a, b) { return a.placa < b.placa ? -1 : 1; });
    var motoristas = Object.keys(pm).map(function (id) { var m = mot(id); var o = pm[id]; return { id: id, nome: m ? m.nome : 'Sem motorista', n: o.n, gasto: o.gasto, litros: o.litros, km: o.km, kml: kml(o), custoKm: o.km ? o.gasto / o.km : null }; })
      .sort(function (a, b) { return a.nome < b.nome ? -1 : 1; });
    // meta "média" (ponderada pelos litros) para a cor do card de média
    var mL = 0, mS = 0; veiculos.forEach(function (v) { if (v.meta && v.kml != null) { mS += v.meta * v.litros; mL += v.litros; } });
    t.meta = mL ? mS / mL : null;
    return { t: t, veiculos: veiculos, motoristas: motoristas };
  }

  /* ---------------- tela ---------------- */
  function opcoes(sel, itens, vazioTxt, atual) {
    sel.innerHTML = (vazioTxt != null ? '<option value="">' + esc(vazioTxt) + '</option>' : '') +
      itens.map(function (i) { return '<option value="' + esc(i[0]) + '"' + (i[0] === atual ? ' selected' : '') + '>' + esc(i[1]) + '</option>'; }).join('');
  }
  function listasFiltro() {
    var f = $('#filtros');
    opcoes(f.veiculo, D.veiculos.map(function (v) { return [v.id, placaFmt(v.placa) + (v.descricao ? ' · ' + v.descricao : '')]; }), 'Todos', F.veiculo);
    opcoes(f.motorista, D.motoristas.map(function (m) { return [m.id, m.nome]; }), 'Todos', F.motorista);
    opcoes(f.combustivel, COMBUSTIVEIS.map(function (c) { return [c, c]; }), 'Todos', F.combustivel);
  }
  function render() {
    var C = calcular(), lista = filtrados(), R = resumo(lista, C), t = R.t;
    $('#aviso-exemplos').hidden = !D.exemplos;
    $('#aviso-armazenamento').hidden = salvarOk;
    var dif = t.kml != null && t.meta ? (t.kml / t.meta - 1) * 100 : null;
    $('#kpis').innerHTML =
      '<div class="kpi"><span>Gasto no período</span><b>' + rs(t.gasto) + '</b><em>' + esc(periodoTxt(lista)) + '</em></div>' +
      '<div class="kpi"><span>Litros abastecidos</span><b>' + num(t.litros, 1) + ' L</b><em>' + t.n + ' abastecimento' + (t.n === 1 ? '' : 's') + '</em></div>' +
      '<div class="kpi"><span>Km rodados</span><b>' + num(t.km, 0) + ' km</b><em>' + R.veiculos.length + ' veículo' + (R.veiculos.length === 1 ? '' : 's') + '</em></div>' +
      '<div class="kpi ' + cor(t.kml, t.meta) + '"><span>Média do período</span><b>' + (t.kml != null ? num(t.kml, 2) + ' km/L' : '—') + '</b><em>' + (dif == null ? 'precisa de 2 tanques cheios' : (Math.abs(dif) < 0.5 ? 'na meta' : num(Math.abs(dif), 0) + '% ' + (dif > 0 ? 'acima' : 'abaixo') + ' da meta (' + num(t.meta, 1) + ')')) + '</em></div>' +
      '<div class="kpi"><span>Custo por km</span><b>' + (t.custoKm != null ? rs(t.custoKm) : '—') + '</b><em>combustível</em></div>';

    $('#info-lista').textContent = lista.length + ' registro' + (lista.length === 1 ? '' : 's') + ' · mais recentes primeiro';
    $('#vazio').hidden = lista.length > 0;
    $('#lista').innerHTML = lista.map(function (a) {
      var v = veic(a.veiculo) || {}, m = mot(a.motorista), c = C[a.id] || {}, k = cor(c.kml, v.meta);
      var kmlTxt = c.kml != null ? '<span class="kml ' + k + '"><i></i>' + num(c.kml, 2) + '</span>' + (v.meta ? '<small>meta ' + num(v.meta, 1) + '</small>' : '')
        : '<span class="kml p">' + (c.parcial ? 'parcial' : (c.primeiro ? '1º registro' : '—')) + '</span><small>' + (c.parcial ? 'entra no próximo cheio' : (c.primeiro ? 'base para o próximo' : '')) + '</small>';
      return '<tr><td data-r="Data">' + br(a.data) + '</td>' +
        '<td data-r="Veículo"><span class="placa">' + esc(placaFmt(v.placa)) + '</span>' + (v.descricao ? '<small>' + esc(v.descricao) + '</small>' : '') + '</td>' +
        '<td data-r="Combustível"><span class="tag">' + esc(a.combustivel) + '</span></td>' +
        '<td class="n" data-r="Litros">' + num(a.litros, 1) + '</td><td class="n" data-r="R$/L">' + rs(a.preco) + '</td>' +
        '<td class="n" data-r="Total"><b>' + rs(a.litros * a.preco) + '</b></td><td class="n" data-r="Km atual">' + num(a.km, 0) + '</td>' +
        '<td class="n" data-r="Km rodados">' + (c.rodados != null ? num(c.rodados, 0) : '—') + '</td>' +
        '<td data-r="Km/L">' + kmlTxt + '</td>' +
        '<td data-r="Motorista">' + (m ? esc(m.nome) : '—') + (a.obs ? '<small>' + esc(a.obs) + '</small>' : '') + '</td>' +
        '<td class="ac"><div class="ac"><button type="button" class="btn-q" data-editar="' + esc(a.id) + '" aria-label="Editar"><svg class="ic"><use href="#a-editar"/></svg></button>' +
        '<button type="button" class="btn-q" data-excluir="' + esc(a.id) + '" aria-label="Excluir"><svg class="ic"><use href="#a-lixo"/></svg></button></div></td></tr>';
    }).join('');

    var maxRef = 1.3;
    $('#por-veiculo').innerHTML = R.veiculos.length ? R.veiculos.map(function (v) {
      var k = cor(v.kml, v.meta), ref = (v.meta || v.kml || 1) * maxRef, p = v.kml != null ? Math.min(100, v.kml / ref * 100) : 0;
      return '<div class="vei"><div class="l"><span><span class="placa">' + esc(placaFmt(v.placa)) + '</span> <small>' + esc(v.descricao || '') + '</small></span><b class="' + (k === 'r' ? 'r' : '') + '">' + (v.kml != null ? num(v.kml, 2) + ' km/L' : '<small>sem tanque cheio</small>') + '</b></div>' +
        '<div class="bar"><span class="' + k + '" data-w="' + p.toFixed(1) + '"></span>' + (v.meta ? '<em data-l="' + (100 / maxRef).toFixed(1) + '"></em>' : '') + '</div></div>';
    }).join('') : '<p class="ab-vazio">Cadastre veículos e abastecimentos para ver o km/L.</p>';
    // larguras pelo CSSOM (sem estilo escrito no HTML)
    $$('#por-veiculo [data-w]').forEach(function (s) { s.style.width = s.getAttribute('data-w') + '%'; });
    $$('#por-veiculo [data-l]').forEach(function (s) { s.style.left = s.getAttribute('data-l') + '%'; });

    // alerta: o pior abastecimento abaixo de 85% da meta no período
    var pior = null;
    lista.forEach(function (a) { var v = veic(a.veiculo), c = C[a.id]; if (v && v.meta && c && c.kml != null) { var r = c.kml / v.meta; if (r < 0.85 && (!pior || r < pior.r)) pior = { a: a, v: v, r: r }; } });
    $('#alertas').innerHTML = pior ? '<p class="ab-alerta"><b>Atenção:</b> ' + esc(placaFmt(pior.v.placa)) + ' fez ' + num(C[pior.a.id].kml, 2) + ' km/L em ' + br(pior.a.data) + ', ' + num((1 - pior.r) * 100, 0) + '% abaixo da meta. Pode ser km digitado errado, vazamento, problema mecânico ou desvio.</p>' : '';
  }

  /* ---------------- janelas ---------------- */
  function abrir(id) { var d = document.getElementById(id); if (!d) return; prepara[id] && prepara[id](); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function fechar(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  var prepara = {
    'dlg-abast': function () { formAbast(null); },
    'dlg-veiculos': function () { listaVeiculos(); formVeiculo(null); },
    'dlg-motoristas': function () { listaMotoristas(); formMotorista(null); },
    'dlg-precos': function () {
      $('#campos-precos').innerHTML = COMBUSTIVEIS.map(function (c) { return '<label>' + esc(c) + ' (R$/L)<input name="' + esc(c) + '" inputmode="decimal" value="' + (D.precos[c] ? num(D.precos[c], 2) : '') + '" placeholder="0,00"></label>'; }).join('');
    },
    'dlg-relatorio': relatorio
  };

  /* abastecimento */
  function formAbast(a) {
    var f = $('#f-abast');
    if (!D.veiculos.length) { setTimeout(function () { fechar($('#dlg-abast')); toast('Cadastre um veículo primeiro.'); abrir('dlg-veiculos'); }, 0); return; }
    $('#t-abast').textContent = a ? 'Editar abastecimento' : 'Novo abastecimento';
    f.id.value = a ? a.id : '';
    f.data.value = a ? a.data : iso(new Date());
    opcoes(f.veiculo, D.veiculos.map(function (v) { return [v.id, placaFmt(v.placa) + (v.descricao ? ' · ' + v.descricao : '')]; }), null, a ? a.veiculo : (F.veiculo || D.veiculos[0].id));
    opcoes(f.motorista, D.motoristas.map(function (m) { return [m.id, m.nome]; }), '—', a ? a.motorista : (F.motorista || ''));
    opcoes(f.combustivel, COMBUSTIVEIS.map(function (c) { return [c, c]; }), null, a ? a.combustivel : (veic(f.veiculo.value).combustivel || COMBUSTIVEIS[0]));
    f.litros.value = a ? num(a.litros, 1).replace(/\./g, '') : '';
    f.preco.value = a ? num(a.preco, 2) : (D.precos[f.combustivel.value] ? num(D.precos[f.combustivel.value], 2) : '');
    f.total.value = a ? num(a.litros * a.preco, 2) : '';
    f.km.value = a ? String(a.km) : '';
    f.cheio.checked = a ? a.cheio !== false : true;
    f.obs.value = a ? a.obs || '' : '';
    $('#erro-abast').hidden = true;
    dicaKm();
  }
  function ultimoKm(vid, exceto) {
    var k = null; D.abastecimentos.forEach(function (a) { if (a.veiculo === vid && a.id !== exceto && (k == null || a.km > k)) k = a.km; }); return k;
  }
  function dicaKm() { var f = $('#f-abast'), k = ultimoKm(f.veiculo.value, f.id.value); $('#dica-km').textContent = k != null ? 'Último registrado: ' + num(k, 0) + ' km' : 'Primeiro registro deste veículo'; }
  function totalAuto(origem) {
    var f = $('#f-abast'), l = ler(f.litros.value), p = ler(f.preco.value), t = ler(f.total.value);
    if (origem === 'total') { if (l > 0 && t > 0) f.preco.value = num(t / l, 3); }
    else if (l > 0 && p > 0) f.total.value = num(l * p, 2);
  }
  function salvarAbast(ev) {
    ev.preventDefault();
    var f = $('#f-abast'), err = $('#erro-abast');
    var l = ler(f.litros.value), p = ler(f.preco.value), t = ler(f.total.value), km = Math.round(ler(f.km.value));
    if (!(p > 0) && l > 0 && t > 0) p = t / l;
    var msg = !f.data.value ? 'Informe a data.' : !(l > 0) ? 'Informe os litros.' : !(p > 0) ? 'Informe o preço do litro ou o total pago.' : !(km >= 0) || isNaN(km) ? 'Informe o km do painel (hodômetro).' : '';
    if (!msg) { var dup = D.abastecimentos.filter(function (a) { return a.veiculo === f.veiculo.value && a.km === km && a.id !== f.id.value; })[0]; if (dup) msg = 'Já existe um abastecimento deste veículo com ' + num(km, 0) + ' km (' + br(dup.data) + ').'; }
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    var a = { id: f.id.value || uid(), data: f.data.value, veiculo: f.veiculo.value, motorista: f.motorista.value, combustivel: f.combustivel.value,
      litros: Math.round(l * 100) / 100, preco: Math.round(p * 1000) / 1000, km: km, cheio: f.cheio.checked, obs: f.obs.value.trim().slice(0, 120) };
    var i = D.abastecimentos.findIndex(function (x) { return x.id === a.id; });
    if (i >= 0) D.abastecimentos[i] = a; else D.abastecimentos.push(a);
    if (!D.precos[a.combustivel]) D.precos[a.combustivel] = a.preco;
    salvar(); render(); fechar($('#dlg-abast'));
    toast(i >= 0 ? 'Abastecimento atualizado.' : 'Abastecimento salvo.');
  }

  /* veículos */
  function listaVeiculos() {
    var n = {}; D.abastecimentos.forEach(function (a) { n[a.veiculo] = (n[a.veiculo] || 0) + 1; });
    $('#lista-veiculos').innerHTML = D.veiculos.length ? D.veiculos.map(function (v) {
      return '<div class="it"><span class="placa">' + esc(placaFmt(v.placa)) + '</span><div><b>' + esc(v.descricao || 'Sem descrição') + '</b><small>' + esc(v.combustivel || '') + (v.meta ? ' · meta ' + num(v.meta, 1) + ' km/L' : ' · sem meta') + ' · ' + (n[v.id] || 0) + ' abastecimento' + (n[v.id] === 1 ? '' : 's') + '</small></div>' +
        '<button type="button" class="btn-q" data-ed-veiculo="' + esc(v.id) + '" aria-label="Editar"><svg class="ic"><use href="#a-editar"/></svg></button><button type="button" class="btn-q" data-rm-veiculo="' + esc(v.id) + '" aria-label="Excluir"><svg class="ic"><use href="#a-lixo"/></svg></button></div>';
    }).join('') : '<p class="vz">Nenhum veículo ainda.</p>';
  }
  function formVeiculo(v) {
    var f = $('#f-veiculo');
    $('#t-veiculo-form').textContent = v ? 'Editar ' + placaFmt(v.placa) : 'Adicionar veículo';
    f.id.value = v ? v.id : ''; f.placa.value = v ? placaFmt(v.placa) : ''; f.descricao.value = v ? v.descricao || '' : '';
    opcoes(f.combustivel, COMBUSTIVEIS.map(function (c) { return [c, c]; }), null, v ? v.combustivel : 'Diesel S10');
    f.meta.value = v && v.meta ? num(v.meta, 1) : '';
    $('[data-novo-veiculo]').hidden = !v; $('.ab-erro', f).hidden = true;
  }
  function salvarVeiculo(ev) {
    ev.preventDefault();
    var f = $('#f-veiculo'), err = $('.ab-erro', f), placa = f.placa.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    var meta = ler(f.meta.value);
    var msg = placa.length < 5 ? 'Informe a placa.' : D.veiculos.some(function (v) { return v.placa === placa && v.id !== f.id.value; }) ? 'Essa placa já está cadastrada.' : (f.meta.value && !(meta > 0 && meta < 100)) ? 'Meta de km/L inválida.' : '';
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    var v = { id: f.id.value || uid(), placa: placa, descricao: f.descricao.value.trim().slice(0, 40), combustivel: f.combustivel.value, meta: meta > 0 ? Math.round(meta * 10) / 10 : null };
    var i = D.veiculos.findIndex(function (x) { return x.id === v.id; });
    if (i >= 0) D.veiculos[i] = v; else D.veiculos.push(v);
    salvar(); listaVeiculos(); formVeiculo(null); listasFiltro(); render();
    toast('Veículo ' + placaFmt(placa) + ' salvo.');
  }
  /* motoristas */
  function listaMotoristas() {
    var n = {}; D.abastecimentos.forEach(function (a) { if (a.motorista) n[a.motorista] = (n[a.motorista] || 0) + 1; });
    $('#lista-motoristas').innerHTML = D.motoristas.length ? D.motoristas.map(function (m) {
      return '<div class="it"><div><b>' + esc(m.nome) + '</b><small>' + (n[m.id] || 0) + ' abastecimento' + (n[m.id] === 1 ? '' : 's') + '</small></div>' +
        '<button type="button" class="btn-q" data-ed-motorista="' + esc(m.id) + '" aria-label="Editar"><svg class="ic"><use href="#a-editar"/></svg></button><button type="button" class="btn-q" data-rm-motorista="' + esc(m.id) + '" aria-label="Excluir"><svg class="ic"><use href="#a-lixo"/></svg></button></div>';
    }).join('') : '<p class="vz">Nenhum motorista ainda.</p>';
  }
  function formMotorista(m) {
    var f = $('#f-motorista');
    $('#t-motorista-form').textContent = m ? 'Editar motorista' : 'Adicionar motorista';
    f.id.value = m ? m.id : ''; f.nome.value = m ? m.nome : '';
    $('[data-novo-motorista]').hidden = !m; $('.ab-erro', f).hidden = true;
  }
  function salvarMotorista(ev) {
    ev.preventDefault();
    var f = $('#f-motorista'), err = $('.ab-erro', f), nome = f.nome.value.trim().slice(0, 50);
    if (!nome) { err.textContent = 'Informe o nome.'; err.hidden = false; return; }
    var m = { id: f.id.value || uid(), nome: nome };
    var i = D.motoristas.findIndex(function (x) { return x.id === m.id; });
    if (i >= 0) D.motoristas[i] = m; else D.motoristas.push(m);
    salvar(); listaMotoristas(); formMotorista(null); listasFiltro(); render();
    toast('Motorista salvo.');
  }

  /* relatório */
  function linhasRel(R, tipo) {
    var cab = tipo === 'v' ? '<th>Veículo</th>' : '<th>Motorista</th>';
    var h = '<thead><tr>' + cab + '<th class="n">Abast.</th><th class="n">Litros</th><th class="n">Gasto</th><th class="n">Km</th><th>Km/L</th><th class="n">R$/km</th></tr></thead><tbody>';
    var itens = tipo === 'v' ? R.veiculos : R.motoristas;
    h += itens.map(function (x) {
      var k = tipo === 'v' ? cor(x.kml, x.meta) : '';
      return '<tr><td>' + (tipo === 'v' ? '<span class="placa">' + esc(placaFmt(x.placa)) + '</span> ' + esc(x.descricao || '') : esc(x.nome)) + '</td><td class="n">' + x.n + '</td><td class="n">' + num(x.litros, 1) + '</td><td class="n">' + rs(x.gasto) + '</td><td class="n">' + num(x.km, 0) + '</td><td>' +
        (x.kml != null ? '<span class="kml ' + k + '"><i></i>' + num(x.kml, 2) + '</span>' + (x.meta ? ' <small>meta ' + num(x.meta, 1) + '</small>' : '') : '—') + '</td><td class="n">' + (x.custoKm != null ? rs(x.custoKm) : '—') + '</td></tr>';
    }).join('') || '<tr><td colspan="7">Sem dados no período.</td></tr>';
    return h + '</tbody><tfoot><tr><td>Total</td><td class="n">' + R.t.n + '</td><td class="n">' + num(R.t.litros, 1) + '</td><td class="n">' + rs(R.t.gasto) + '</td><td class="n">' + num(R.t.km, 0) + '</td><td>' + (R.t.kml != null ? num(R.t.kml, 2) : '—') + '</td><td class="n">' + (R.t.custoKm != null ? rs(R.t.custoKm) : '—') + '</td></tr></tfoot>';
  }
  function relatorio() {
    var lista = filtrados(), R = resumo(lista, calcular());
    $('#rel-periodo').textContent = 'Período: ' + periodoTxt(lista) + (F.veiculo || F.motorista || F.combustivel ? ' · com os filtros aplicados' : '') + '. O Excel e o PDF saem com estes mesmos dados.';
    $('#empresa').value = D.empresa || '';
    $('#rel-veiculos').innerHTML = linhasRel(R, 'v');
    $('#rel-motoristas').innerHTML = linhasRel(R, 'm');
  }

  /* ---------------- arquivos ---------------- */
  function baixar(blob, nome) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function nomeArq(ext) {
    var e = (D.empresa || 'frota').normalize ? (D.empresa || 'frota').normalize('NFD').replace(/[̀-ͯ]/g, '') : (D.empresa || 'frota');
    return 'Abastecimento_' + e.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + iso(new Date()) + '.' + ext;
  }
  function logoBytes() {
    return fetch(LOGO).then(function (r) { if (!r.ok) throw new Error('logo'); return r.arrayBuffer(); })
      .then(function (buf) { return new Promise(function (ok) { var img = new Image(); img.onload = function () { ok({ buf: new Uint8Array(buf), w: img.naturalWidth, h: img.naturalHeight, url: URL.createObjectURL(new Blob([buf], { type: 'image/png' })) }); }; img.onerror = function () { ok({ buf: new Uint8Array(buf), w: 480, h: 93 }); }; img.src = URL.createObjectURL(new Blob([buf], { type: 'image/png' })); }); })
      .catch(function () { return null; });
  }
  function dadosExport() {
    var C = calcular(), lista = filtrados().slice().reverse(), R = resumo(lista, C);
    return { C: C, lista: lista, R: R, periodo: periodoTxt(lista), empresa: D.empresa || '', gerado: br(iso(new Date())) };
  }

  /* ---- ZIP simples (sem compressão) para o .xlsx ---- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(arquivos) {   // [{nome, dados: Uint8Array}]
    var enc = new TextEncoder(), partes = [], central = [], pos = 0;
    var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    arquivos.forEach(function (a) {
      var nome = enc.encode(a.nome), d = a.dados, c = crc32(d);
      var cab = [].concat([0x50, 0x4B, 0x03, 0x04], u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nome.length), u16(0));
      partes.push(new Uint8Array(cab), nome, d);
      central.push(new Uint8Array([].concat([0x50, 0x4B, 0x01, 0x02], u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nome.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(pos))), nome);
      pos += cab.length + nome.length + d.length;
    });
    var tam = central.reduce(function (s, x) { return s + x.length; }, 0);
    var fim = new Uint8Array([].concat([0x50, 0x4B, 0x05, 0x06], u16(0), u16(0), u16(arquivos.length), u16(arquivos.length), u32(tam), u32(pos), u16(0)));
    return new Blob(partes.concat(central, [fim]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---- Excel com a identidade da Auto Controller ---- */
  function gerarExcel() {
    var X = dadosExport();
    return logoBytes().then(function (logo) {
      var x = function (s) { return String(s == null ? '' : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
      var col = function (i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
      var serial = function (d) { return Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000); };
      /* estilos: 0 normal · 1 título · 2 faixa · 3 subtítulo · 4 cabeçalho · 5/6 texto · 7/8 número · 9/10 dinheiro · 11/12 data · 13/14 1 casa · 15/16 2 casas
                  17 total txt · 18 total dinheiro · 19 total num · 20 total 2 casas · 21 verde · 22 amarelo · 23 vermelho · 24 placa · 25 placa zebra · 26 total 1 casa */
      var estilos = (function () {
        var fonts = '<font><sz val="10.5"/><color rgb="FF1F2430"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="15"/><color rgb="FF3E5F99"/><name val="Calibri"/><family val="2"/></font>' +
          '<font><sz val="9.5"/><color rgb="FF3E5F99"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
          '<font><b/><sz val="10.5"/><color rgb="FF1F2430"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="10.5"/><color rgb="FF1E7A48"/><name val="Calibri"/><family val="2"/></font>' +
          '<font><b/><sz val="10.5"/><color rgb="FF9A6A12"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="10.5"/><color rgb="FFB03A2E"/><name val="Calibri"/><family val="2"/></font>' +
          '<font><b/><sz val="10.5"/><color rgb="FF2F3744"/><name val="Consolas"/><family val="3"/></font>';
        var fill = function (c) { return '<fill><patternFill patternType="solid"><fgColor rgb="FF' + c + '"/><bgColor indexed="64"/></patternFill></fill>'; };
        var fills = '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + fill('FFFFFF') + fill('EEF3FB') + fill('1B1F27') + fill('F6F8FC') + fill('E8F6EE') + fill('FDF4E4') + fill('FCEDEC');
        var borders = '<border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFDCE1EA"/></left><right style="thin"><color rgb="FFDCE1EA"/></right><top style="thin"><color rgb="FFDCE1EA"/></top><bottom style="thin"><color rgb="FFDCE1EA"/></bottom><diagonal/></border>' +
          '<border><left/><right/><top style="medium"><color rgb="FF4F6FA8"/></top><bottom style="thin"><color rgb="FFDCE1EA"/></bottom><diagonal/></border>';
        var xf = function (f, fi, b, n, a) { return '<xf numFmtId="' + (n || 0) + '" fontId="' + f + '" fillId="' + fi + '" borderId="' + b + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1"' + (n ? ' applyNumberFormat="1"' : '') + ' applyAlignment="1">' + (a || '<alignment vertical="center"/>') + '</xf>'; };
        var dir = '<alignment horizontal="right" vertical="center"/>', cen = '<alignment horizontal="center" vertical="center"/>';
        var l = [xf(0, 0, 0), xf(1, 2, 0, 0, dir), xf(0, 2, 0), xf(2, 3, 0, 0, '<alignment vertical="center" indent="1"/>'), xf(3, 4, 1, 0, '<alignment vertical="center" wrapText="1"/>'),
          xf(0, 0, 1), xf(0, 5, 1), xf(0, 0, 1, 3), xf(0, 5, 1, 3), xf(0, 0, 1, 164), xf(0, 5, 1, 164), xf(0, 0, 1, 165, cen), xf(0, 5, 1, 165, cen), xf(0, 0, 1, 166), xf(0, 5, 1, 166), xf(0, 0, 1, 4), xf(0, 5, 1, 4),
          xf(4, 3, 2), xf(4, 3, 2, 164), xf(4, 3, 2, 3), xf(4, 3, 2, 4), xf(5, 6, 1, 4, cen), xf(6, 7, 1, 4, cen), xf(7, 8, 1, 4, cen), xf(8, 0, 1, 0, cen), xf(8, 5, 1, 0, cen), xf(4, 3, 2, 166)];
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="#,##0.0"/></numFmts>' +
          '<fonts count="9">' + fonts + '</fonts><fills count="9">' + fills + '</fills><borders count="3">' + borders + '</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + l.length + '">' + l.join('') + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
      })();
      var EST = { txt: [5, 6], num: [7, 8], din: [9, 10], data: [11, 12], d1: [13, 14], d2: [15, 16], placa: [24, 25] };
      var TOT = { txt: 17, din: 18, num: 19, d2: 20, d1: 26 };
      function celula(ref, v, tipo, z) {
        if (v && typeof v === 'object' && v.n != null) return '<c r="' + ref + '" s="' + (v.s != null ? v.s : EST[tipo][z]) + '"><v>' + v.n + '</v></c>';
        if (v && typeof v === 'object' && v.f) return '<c r="' + ref + '" s="' + (v.s != null ? v.s : EST[tipo][z]) + '"><f>' + x(v.f) + '</f>' + (v.v != null && !isNaN(v.v) ? '<v>' + v.v + '</v>' : '') + '</c>';
        if (tipo === 'data' && v) return '<c r="' + ref + '" s="' + EST.data[z] + '"><v>' + serial(v) + '</v></c>';
        if (tipo !== 'txt' && tipo !== 'placa' && typeof v === 'number' && !isNaN(v)) return '<c r="' + ref + '" s="' + EST[tipo][z] + '"><v>' + v + '</v></c>';
        return '<c r="' + ref + '" s="' + (EST[tipo] ? EST[tipo][z] : 5) + '" t="inlineStr"><is><t xml:space="preserve">' + x(v == null ? '' : v) + '</t></is></c>';
      }
      /* uma aba: cabeçalho com a logo (linhas 1-4), dados a partir da 5 */
      function aba(nome, titulo, cols, linhas, total, comLogo) {
        var nc = cols.length, ult = col(nc - 1), rows = [];
        var r1 = ''; for (var i = 0; i < nc; i++) r1 += '<c r="' + col(i) + '1" s="' + (i === nc - 1 ? 1 : 2) + '"' + (i === nc - 1 ? ' t="inlineStr"><is><t>' + x(titulo) + '</t></is></c>' : '/>');
        rows.push('<row r="1" ht="44" customHeight="1">' + r1 + '</row>');
        var sub = (X.empresa ? X.empresa + ' · ' : '') + 'Período: ' + X.periodo + ' · gerado em ' + X.gerado + ' · Controle de abastecimento Auto Controller';
        var r2 = ''; for (i = 0; i < nc; i++) r2 += '<c r="' + col(i) + '2" s="3"' + (i === 0 ? ' t="inlineStr"><is><t>' + x(sub) + '</t></is></c>' : '/>');
        rows.push('<row r="2" ht="20" customHeight="1">' + r2 + '</row><row r="3" ht="6" customHeight="1"/>');
        rows.push('<row r="4" ht="26" customHeight="1">' + cols.map(function (c, i) { return '<c r="' + col(i) + '4" s="4" t="inlineStr"><is><t>' + x(c[0]) + '</t></is></c>'; }).join('') + '</row>');
        var n = 5;
        linhas.forEach(function (l, k) {
          var z = k % 2;
          rows.push('<row r="' + n + '" ht="18" customHeight="1">' + cols.map(function (c, i) { var v = typeof l[i] === 'function' ? l[i](n) : l[i]; return celula(col(i) + n, v, c[2], z); }).join('') + '</row>');
          n++;
        });
        var fimDados = Math.max(5, n - 1);
        if (total) {
          rows.push('<row r="' + n + '" ht="20" customHeight="1">' + cols.map(function (c, i) {
            var v = typeof total[i] === 'function' ? total[i](5, fimDados) : total[i];
            var s = TOT[c[2]] != null ? TOT[c[2]] : TOT.txt;
            if (v && typeof v === 'object' && v.n != null) return '<c r="' + col(i) + n + '" s="' + s + '"><v>' + v.n + '</v></c>';
            if (v && typeof v === 'object' && v.f) return '<c r="' + col(i) + n + '" s="' + s + '"><f>' + x(v.f) + '</f>' + (v.v != null && !isNaN(v.v) ? '<v>' + v.v + '</v>' : '') + '</c>';
            return '<c r="' + col(i) + n + '" s="' + TOT.txt + '" t="inlineStr"><is><t>' + x(v == null ? '' : v) + '</t></is></c>';
          }).join('') + '</row>');
        }
        var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
          '<sheetFormatPr defaultRowHeight="15"/><cols>' + cols.map(function (c, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + c[1] + '" customWidth="1"/>'; }).join('') + '</cols>' +
          '<sheetData>' + rows.join('') + '</sheetData>' + (linhas.length ? '<autoFilter ref="A4:' + ult + fimDados + '"/>' : '') +
          '<mergeCells count="1"><mergeCell ref="A2:' + ult + '2"/></mergeCells><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
          '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L&amp;8Auto Controller System · Gestão inteligente&amp;R&amp;8Página &amp;P de &amp;N</oddFooter></headerFooter>' +
          (comLogo ? '<drawing r:id="rId1"/>' : '') + '</worksheet>';
        return { nome: nome, xml: xml, fim: fimDados, ult: ult, temFiltro: linhas.length > 0 };
      }
      var C = X.C;
      var kmlEst = function (k) { return k === 'g' ? 21 : k === 'y' ? 22 : k === 'r' ? 23 : null; };
      /* 1. Abastecimentos */
      var colsA = [['Data', 11, 'data'], ['Placa', 11, 'placa'], ['Veículo', 18, 'txt'], ['Motorista', 18, 'txt'], ['Combustível', 13, 'txt'], ['Litros', 9, 'd1'], ['R$/L', 10, 'din'], ['Total (Litros × R$/L)', 15, 'din'],
        ['Km atual', 11, 'num'], ['Km rodados', 11, 'num'], ['Km/L', 9, 'd2'], ['Meta km/L', 10, 'd1'], ['Tanque', 9, 'txt'], ['Observação', 26, 'txt']];
      var linhasA = X.lista.map(function (a) {
        var v = veic(a.veiculo) || {}, m = mot(a.motorista), c = C[a.id] || {}, k = cor(c.kml, v.meta);
        return [a.data, placaFmt(v.placa), v.descricao || '', m ? m.nome : '', a.combustivel, a.litros, a.preco,
          function (r) { return { f: 'F' + r + '*G' + r, v: Math.round(a.litros * a.preco * 100) / 100 }; },
          a.km, c.rodados != null ? c.rodados : '', c.kml != null ? (kmlEst(k) != null ? { n: Math.round(c.kml * 100) / 100, s: kmlEst(k) } : Math.round(c.kml * 100) / 100) : (c.parcial ? 'parcial' : ''),
          v.meta || '', a.cheio === false ? 'parcial' : 'cheio', a.obs || ''];
      });
      var totA = ['Total do período', '', '', '', '', function (i, f) { return { f: 'SUBTOTAL(9,F' + i + ':F' + f + ')', v: X.R.t.litros }; }, '', function (i, f) { return { f: 'SUBTOTAL(9,H' + i + ':H' + f + ')', v: Math.round(X.R.t.gasto * 100) / 100 }; }, '',
        function (i, f) { return { f: 'SUBTOTAL(9,J' + i + ':J' + f + ')', v: X.R.t.km }; }, X.R.t.kml != null ? { n: Math.round(X.R.t.kml * 100) / 100 } : '', '', '', ''];
      /* 2. Por veículo · 3. Por motorista */
      var colsR = function (prim) { return [[prim, 22, 'txt'], ['Descrição', 18, 'txt'], ['Abastecimentos', 14, 'num'], ['Litros', 11, 'd1'], ['Gasto', 14, 'din'], ['Km rodados', 12, 'num'], ['Km/L', 9, 'd2'], ['Meta km/L', 10, 'd1'], ['R$ por km', 11, 'din']]; };
      var linhaR = function (o, ehV) {
        var k = ehV ? cor(o.kml, o.meta) : '';
        return [ehV ? placaFmt(o.placa) : o.nome, ehV ? o.descricao || '' : '', o.n, Math.round(o.litros * 10) / 10, Math.round(o.gasto * 100) / 100, o.km,
          o.kml != null ? (kmlEst(k) != null ? { n: Math.round(o.kml * 100) / 100, s: kmlEst(k) } : Math.round(o.kml * 100) / 100) : '',
          ehV && o.meta ? o.meta : '', function (r) { return { f: 'IF(F' + r + '>0,E' + r + '/F' + r + ',"")', v: o.km ? Math.round(o.gasto / o.km * 100) / 100 : null }; }];
      };
      var totR = ['Total', '', function (i, f) { return { f: 'SUBTOTAL(9,C' + i + ':C' + f + ')', v: X.R.t.n }; }, function (i, f) { return { f: 'SUBTOTAL(9,D' + i + ':D' + f + ')', v: Math.round(X.R.t.litros * 10) / 10 }; }, function (i, f) { return { f: 'SUBTOTAL(9,E' + i + ':E' + f + ')', v: Math.round(X.R.t.gasto * 100) / 100 }; },
        function (i, f) { return { f: 'SUBTOTAL(9,F' + i + ':F' + f + ')', v: X.R.t.km }; }, X.R.t.kml != null ? { n: Math.round(X.R.t.kml * 100) / 100 } : '', '', X.R.t.custoKm != null ? { n: Math.round(X.R.t.custoKm * 100) / 100 } : ''];
      var abas = [
        aba('Abastecimentos', 'Relatório de abastecimento', colsA, linhasA, totA, !!logo),
        aba('Por veículo', 'Consumo por veículo', colsR('Placa'), X.R.veiculos.map(function (o) { return linhaR(o, true); }), totR, !!logo),
        aba('Por motorista', 'Consumo por motorista', colsR('Motorista'), X.R.motoristas.map(function (o) { return linhaR(o, false); }), totR, !!logo),
        aba('Legenda', 'Como ler este relatório', [['Item', 22, 'txt'], ['O que significa', 90, 'txt']], [
          ['Km rodados', 'Km atual menos o km do abastecimento anterior do mesmo veículo.'],
          ['Km/L', 'Calculado de um tanque cheio até o próximo: km percorridos ÷ litros colocados nesse intervalo (inclui os parciais).'],
          ['Parcial', 'Abastecimento sem encher o tanque: os litros entram na conta do próximo tanque cheio.'],
          ['Verde', 'Km/L igual ou acima da meta do veículo.'], ['Amarelo', 'Até 10% abaixo da meta.'], ['Vermelho', 'Mais de 10% abaixo da meta: confira km digitado, vazamento, manutenção ou desvio.'],
          ['Total (Litros × R$/L)', 'Fórmula da planilha: muda sozinha se você corrigir litros ou preço.'],
          ['Dados', 'Gerado no Controle de abastecimento gratuito da Auto Controller (autocontrollersystem.com.br). Os dados ficam no navegador de quem usa.']
        ], null, !!logo)
      ];
      var enc = new TextEncoder(), A = [], add = function (n, s) { A.push({ nome: n, dados: typeof s === 'string' ? enc.encode(s) : s }); };
      var R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', PR = 'http://schemas.openxmlformats.org/package/2006/relationships';
      add('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        abas.map(function (a, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' + (logo ? '<Override PartName="/xl/drawings/drawing' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ''); }).join('') +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
      add('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + PR + '"><Relationship Id="rId1" Type="' + R + '/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
      add('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Relatório de abastecimento</dc:title><dc:creator>Auto Controller System</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().slice(0, 19) + 'Z</dcterms:created></cp:coreProperties>');
      add('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="' + R + '"><sheets>' +
        abas.map(function (a, i) { return '<sheet name="' + x(a.nome) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets><definedNames>' +
        abas.map(function (a, i) { return (a.temFiltro ? '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + x(a.nome) + '\'!$A$4:$' + a.ult + '$' + a.fim + '</definedName>' : '') + '<definedName name="_xlnm.Print_Titles" localSheetId="' + i + '">\'' + x(a.nome) + '\'!$4:$4</definedName>'; }).join('') +
        '</definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
      add('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + PR + '">' +
        abas.map(function (a, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + R + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
        '<Relationship Id="rId' + (abas.length + 1) + '" Type="' + R + '/styles" Target="styles.xml"/></Relationships>');
      add('xl/styles.xml', estilos);
      var cx = 2000250, cy = logo ? Math.round(cx * logo.h / logo.w) : 0;
      abas.forEach(function (a, i) {
        add('xl/worksheets/sheet' + (i + 1) + '.xml', a.xml);
        if (!logo) return;
        add('xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + PR + '"><Relationship Id="rId1" Type="' + R + '/drawing" Target="../drawings/drawing' + (i + 1) + '.xml"/></Relationships>');
        add('xl/drawings/drawing' + (i + 1) + '.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="' + R + '">' +
          '<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>95250</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>95250</xdr:rowOff></xdr:from><xdr:ext cx="' + cx + '" cy="' + cy + '"/>' +
          '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo Auto Controller"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
          '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>');
        add('xl/drawings/_rels/drawing' + (i + 1) + '.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + PR + '"><Relationship Id="rId1" Type="' + R + '/image" Target="../media/image1.png"/></Relationships>');
      });
      if (logo) add('xl/media/image1.png', logo.buf);
      baixar(zip(A), nomeArq('xlsx'));
    });
  }

  /* ---- PDF (A4 deitado) com a logo principal ---- */
  function carregarScript(src) { return new Promise(function (ok, erro) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); }); }
  function gerarPDF() {
    var X = dadosExport();
    return (window.jspdf ? Promise.resolve() : carregarScript('assets/jspdf.min.js')).then(logoBytes).then(function (logo) {
      var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      var W = 297, H = 210, M = 12, y;
      var GRAF = [27, 31, 39], AZUL = [79, 111, 168], MUDO = [91, 100, 117], LIN = [225, 228, 234];
      var cores = { g: [30, 122, 72], y: [210, 154, 46], r: [176, 58, 46] };
      var t = function (s) { return String(s == null ? '' : s).replace(/−/g, '-'); };
      function cabecalho(titulo) {
        if (logo) doc.addImage(dataLogo || logo.buf, 'PNG', M, 9, 52, 52 * logo.h / logo.w);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor.apply(doc, GRAF); doc.text(titulo, W - M, 15, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, MUDO);
        doc.text(t((X.empresa ? X.empresa + ' · ' : '') + 'Período: ' + X.periodo + ' · gerado em ' + X.gerado), W - M, 21, { align: 'right' });
        doc.setDrawColor.apply(doc, GRAF); doc.setLineWidth(0.8); doc.line(M, 25, W - M, 25);
        y = 31;
      }
      var dataLogo = null;
      return (logo ? new Promise(function (ok) { var c = document.createElement('canvas'), img = new Image(); img.onload = function () { c.width = img.naturalWidth; c.height = img.naturalHeight; var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0); dataLogo = c.toDataURL('image/png'); ok(); }; img.onerror = function () { logo = null; ok(); }; img.src = logo.url; }) : Promise.resolve()).then(function () {
        function tabela(cols, linhas, total) {   // cols: [titulo, largura mm, alinhamento]
          var x0 = M, alt = 6.4;
          function cab() {
            doc.setFillColor.apply(doc, GRAF); doc.rect(M, y, W - 2 * M, 7.5, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(255, 255, 255);
            var x = x0; cols.forEach(function (c) { doc.text(t(c[0]).toUpperCase(), c[2] === 'r' ? x + c[1] - 2 : x + 2, y + 4.9, { align: c[2] === 'r' ? 'right' : 'left' }); x += c[1]; });
            y += 7.5;
          }
          cab();
          doc.setFontSize(8.6);
          linhas.forEach(function (l, i) {
            if (y + alt > H - 16) { doc.addPage(); cabecalho(tituloAtual + ' (continuação)'); cab(); doc.setFontSize(8.6); }
            if (i % 2) { doc.setFillColor(247, 248, 250); doc.rect(M, y, W - 2 * M, alt, 'F'); }
            var x = x0;
            cols.forEach(function (c, j) {
              var v = l[j], k = null;
              if (v && typeof v === 'object') { k = v.k; v = v.t; }
              doc.setFont('helvetica', j === 0 || k ? 'bold' : 'normal');
              if (k && cores[k]) { doc.setFillColor.apply(doc, cores[k]); doc.circle(x + c[1] - 2 - doc.getTextWidth(t(v)) - 2.2, y + alt / 2, 1.1, 'F'); }
              doc.setTextColor.apply(doc, k === 'r' ? cores.r : GRAF);
              var txt = t(v); while (txt.length > 3 && doc.getTextWidth(txt) > c[1] - 3) txt = txt.slice(0, -2) + '…';
              doc.text(txt, c[2] === 'r' ? x + c[1] - 2 : x + 2, y + 4.3, { align: c[2] === 'r' ? 'right' : 'left' });
              x += c[1];
            });
            doc.setDrawColor.apply(doc, LIN); doc.setLineWidth(0.2); doc.line(M, y + alt, W - M, y + alt);
            y += alt;
          });
          if (total) {
            if (y + 7 > H - 16) { doc.addPage(); cabecalho(tituloAtual + ' (continuação)'); }
            doc.setFillColor(238, 243, 251); doc.rect(M, y, W - 2 * M, 7, 'F'); doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, GRAF);
            var x = x0; cols.forEach(function (c, j) { doc.text(t(total[j]), c[2] === 'r' ? x + c[1] - 2 : x + 2, y + 4.7, { align: c[2] === 'r' ? 'right' : 'left' }); x += c[1]; });
            y += 7;
          }
          if (!linhas.length) { doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, MUDO); doc.text('Sem abastecimentos no período.', M + 2, y + 5); y += 8; }
        }
        var tituloAtual = 'Relatório de abastecimento';
        cabecalho(tituloAtual);
        // indicadores
        var T = X.R.t, ks = [['Gasto', rs(T.gasto)], ['Litros', num(T.litros, 1) + ' L'], ['Km rodados', num(T.km, 0) + ' km'], ['Média km/L', T.kml != null ? num(T.kml, 2) : '—'], ['Custo por km', T.custoKm != null ? rs(T.custoKm) : '—']];
        var kw = (W - 2 * M - 4 * 4) / 5;
        ks.forEach(function (k, i) {
          var x = M + i * (kw + 4);
          doc.setDrawColor.apply(doc, LIN); doc.setLineWidth(0.3); doc.roundedRect(x, y, kw, 15, 1.5, 1.5, 'S');
          doc.setFillColor.apply(doc, AZUL); doc.rect(x, y, 1.2, 15, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor.apply(doc, MUDO); doc.text(k[0], x + 4, y + 5.2);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor.apply(doc, GRAF); doc.text(t(k[1]), x + 4, y + 11.8);
        });
        y += 21;
        var C = X.C;
        tabela([['Data', 20, 'l'], ['Placa', 20, 'l'], ['Veículo', 33, 'l'], ['Combustível', 24, 'l'], ['Litros', 16, 'r'], ['R$/L', 17, 'r'], ['Total', 24, 'r'], ['Km atual', 20, 'r'], ['Km rod.', 17, 'r'], ['Km/L', 18, 'r'], ['Motorista', 30, 'l'], ['Obs.', 34, 'l']],
          X.lista.map(function (a) {
            var v = veic(a.veiculo) || {}, m = mot(a.motorista), c = C[a.id] || {};
            return [br(a.data), placaFmt(v.placa), v.descricao || '', a.combustivel, num(a.litros, 1), num(a.preco, 2), num(a.litros * a.preco, 2), num(a.km, 0), c.rodados != null ? num(c.rodados, 0) : '-',
              c.kml != null ? { t: num(c.kml, 2), k: cor(c.kml, v.meta) } : (c.parcial ? 'parcial' : '-'), m ? m.nome : '-', a.obs || ''];
          }),
          ['Total', '', '', '', num(T.litros, 1), '', num(T.gasto, 2), '', num(T.km, 0), T.kml != null ? num(T.kml, 2) : '-', '', '']);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, MUDO);
        if (y + 6 < H - 16) doc.text('Km/L de tanque cheio a tanque cheio. Verde: na meta · amarelo: até 10% abaixo · vermelho: mais de 10% abaixo.', M, y + 5);
        // resumo por veículo e por motorista
        doc.addPage(); tituloAtual = 'Resumo por veículo e motorista'; cabecalho(tituloAtual);
        var colsR = function (p) { return [[p, 70, 'l'], ['Abastecimentos', 30, 'r'], ['Litros', 28, 'r'], ['Gasto', 34, 'r'], ['Km rodados', 30, 'r'], ['Km/L', 26, 'r'], ['Meta', 22, 'r'], ['R$ por km', 33, 'r']]; };
        var totR = ['Total', String(T.n), num(T.litros, 1), rs(T.gasto), num(T.km, 0), T.kml != null ? num(T.kml, 2) : '-', '', T.custoKm != null ? rs(T.custoKm) : '-'];
        tabela(colsR('Veículo'), X.R.veiculos.map(function (o) { return [placaFmt(o.placa) + (o.descricao ? ' · ' + o.descricao : ''), String(o.n), num(o.litros, 1), rs(o.gasto), num(o.km, 0), o.kml != null ? { t: num(o.kml, 2), k: cor(o.kml, o.meta) } : '-', o.meta ? num(o.meta, 1) : '-', o.custoKm != null ? rs(o.custoKm) : '-']; }), totR);
        y += 8;
        if (y > H - 50) { doc.addPage(); cabecalho(tituloAtual); }
        tabela(colsR('Motorista'), X.R.motoristas.map(function (o) { return [o.nome, String(o.n), num(o.litros, 1), rs(o.gasto), num(o.km, 0), o.kml != null ? num(o.kml, 2) : '-', '', o.custoKm != null ? rs(o.custoKm) : '-']; }), totR);
        // rodapé em todas as páginas
        var np = doc.internal.getNumberOfPages();
        for (var i = 1; i <= np; i++) {
          doc.setPage(i); doc.setDrawColor.apply(doc, LIN); doc.setLineWidth(0.3); doc.line(M, H - 11, W - M, H - 11);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, GRAF); doc.text('Auto Controller System', M, H - 7);
          var wb = doc.getTextWidth('Auto Controller System');
          doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, MUDO); doc.text('·  autocontrollersystem.com.br  ·  Controle de abastecimento', M + wb + 1.8, H - 7);
          doc.text('página ' + i + ' de ' + np, W - M, H - 7, { align: 'right' });
        }
        var nome = nomeArq('pdf'), blob = doc.output('blob');
        var arq = typeof File === 'function' ? new File([blob], nome, { type: 'application/pdf' }) : null;
        if (arq && navigator.canShare && /Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.canShare({ files: [arq] })) return navigator.share({ files: [arq], title: 'Relatório de abastecimento' }).catch(function () {});
        baixar(blob, nome);
      });
    });
  }
  function exportar(tipo, botao) {
    if (!D.abastecimentos.length) { toast('Registre ao menos um abastecimento para exportar.'); return; }
    var b = botao, antes = b ? b.innerHTML : '';
    if (b) { b.disabled = true; b.lastChild.textContent = 'Gerando…'; }
    (tipo === 'pdf' ? gerarPDF() : gerarExcel()).then(function () { toast(tipo === 'pdf' ? 'PDF gerado.' : 'Planilha gerada.'); })
      .catch(function () { toast('Não consegui gerar o arquivo. Tente de novo.'); })
      .then(function () { if (b) { b.disabled = false; b.innerHTML = antes; } });
  }

  /* backup e restauração */
  function backup() {
    var blob = new Blob([JSON.stringify({ app: 'controle-de-abastecimento-ac', salvo_em: new Date().toISOString(), dados: D }, null, 1)], { type: 'application/json' });
    baixar(blob, 'backup-abastecimento-' + iso(new Date()) + '.json');
    toast('Backup baixado. Guarde o arquivo em local seguro.');
  }
  function restaurar(arq) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result), d = j && j.dados ? j.dados : j;
        if (!d || !Array.isArray(d.abastecimentos) || !Array.isArray(d.veiculos)) throw new Error('formato');
        var n = normalizar(d);
        if (!confirm('Restaurar o backup com ' + n.veiculos.length + ' veículo(s) e ' + n.abastecimentos.length + ' abastecimento(s)? Os dados atuais deste navegador serão substituídos.')) return;
        D = n; D.exemplos = false; salvar(); F = { veiculo: '', motorista: '', combustivel: '', de: '', ate: '' }; $('#filtros').reset(); listasFiltro(); render();
        toast('Backup restaurado.');
      } catch (e) { toast('Este arquivo não é um backup do controle de abastecimento.'); }
    };
    r.readAsText(arq);
  }

  /* ---------------- eventos ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('button, a'); if (!el) return;
    var d;
    if (el.hasAttribute('data-abrir')) abrir(el.getAttribute('data-abrir'));
    else if (el.hasAttribute('data-fechar')) fechar(el.closest('dialog'));
    else if ((d = el.getAttribute('data-editar'))) { abrir('dlg-abast'); formAbast(D.abastecimentos.filter(function (a) { return a.id === d; })[0]); }
    else if ((d = el.getAttribute('data-excluir'))) {
      var a = D.abastecimentos.filter(function (x) { return x.id === d; })[0];
      if (a && confirm('Excluir o abastecimento de ' + br(a.data) + ' (' + placaFmt((veic(a.veiculo) || {}).placa) + ')?')) { D.abastecimentos = D.abastecimentos.filter(function (x) { return x.id !== d; }); salvar(); render(); toast('Abastecimento excluído.'); }
    }
    else if ((d = el.getAttribute('data-ed-veiculo'))) formVeiculo(veic(d));
    else if ((d = el.getAttribute('data-rm-veiculo'))) {
      var v = veic(d), n = D.abastecimentos.filter(function (a) { return a.veiculo === d; }).length;
      if (v && confirm('Excluir o veículo ' + placaFmt(v.placa) + (n ? ' e os ' + n + ' abastecimento(s) dele' : '') + '?')) {
        D.veiculos = D.veiculos.filter(function (x) { return x.id !== d; }); D.abastecimentos = D.abastecimentos.filter(function (a) { return a.veiculo !== d; });
        if (F.veiculo === d) F.veiculo = ''; salvar(); listaVeiculos(); listasFiltro(); render();
      }
    }
    else if ((d = el.getAttribute('data-ed-motorista'))) formMotorista(mot(d));
    else if ((d = el.getAttribute('data-rm-motorista'))) {
      var m = mot(d);
      if (m && confirm('Excluir ' + m.nome + '? Os abastecimentos dele ficam, sem motorista.')) {
        D.motoristas = D.motoristas.filter(function (x) { return x.id !== d; }); D.abastecimentos.forEach(function (a) { if (a.motorista === d) a.motorista = ''; });
        if (F.motorista === d) F.motorista = ''; salvar(); listaMotoristas(); listasFiltro(); render();
      }
    }
    else if (el.hasAttribute('data-novo-veiculo')) formVeiculo(null);
    else if (el.hasAttribute('data-novo-motorista')) formMotorista(null);
    else if (el.hasAttribute('data-exportar')) exportar(el.getAttribute('data-exportar'), el);
    else if (el.id === 'b-excel') exportar('excel', el);
    else if (el.id === 'b-pdf') exportar('pdf', el);
    else if (el.id === 'b-backup') backup();
    else if (el.id === 'b-restaurar') $('#arq-restaurar').click();
    else if (el.id === 'b-limpar') { $('#filtros').reset(); F = { veiculo: '', motorista: '', combustivel: '', de: '', ate: '' }; render(); }
    else if (el.id === 'b-limpar-exemplos') {
      if (confirm('Apagar os dados de exemplo e começar com a sua frota?')) { var p = D.precos; D = vazio(); D.precos = p; salvar(); listasFiltro(); render(); abrir('dlg-veiculos'); }
    }
    else if (el.id === 'b-exemplos') {
      if (!D.abastecimentos.length || confirm('Carregar os exemplos vai substituir os dados atuais deste navegador. Continuar?')) { D = exemplos(); salvar(); listasFiltro(); render(); fechar(el.closest('dialog')); }
    }
    else if (el.id === 'b-apagar-tudo') {
      if (confirm('Apagar todos os veículos, motoristas e abastecimentos deste navegador? Faça um Backup antes, se quiser guardar.')) { D = vazio(); salvar(); listasFiltro(); render(); fechar(el.closest('dialog')); }
    }
  });
  $('#arq-restaurar').addEventListener('change', function () { if (this.files[0]) restaurar(this.files[0]); this.value = ''; });
  $('#filtros').addEventListener('submit', function (e) {
    e.preventDefault(); var f = this;
    F = { veiculo: f.veiculo.value, motorista: f.motorista.value, combustivel: f.combustivel.value, de: f.de.value, ate: f.ate.value };
    if (F.de && F.ate && F.de > F.ate) { var x = F.de; F.de = F.ate; F.ate = x; f.de.value = F.de; f.ate.value = F.ate; }
    render();
  });
  $('#f-abast').addEventListener('submit', salvarAbast);
  $('#f-abast').addEventListener('input', function (e) { var n = e.target.name; if (n === 'litros' || n === 'preco') totalAuto(n); else if (n === 'total') totalAuto('total'); });
  $('#f-abast').addEventListener('change', function (e) {
    var f = this;
    if (e.target.name === 'veiculo') { var v = veic(f.veiculo.value); if (v && v.combustivel) f.combustivel.value = v.combustivel; dicaKm(); }
    if (e.target.name === 'veiculo' || e.target.name === 'combustivel') { if (!f.id.value && D.precos[f.combustivel.value]) { f.preco.value = num(D.precos[f.combustivel.value], 2); totalAuto('preco'); } }
  });
  $('#f-veiculo').addEventListener('submit', salvarVeiculo);
  $('#f-motorista').addEventListener('submit', salvarMotorista);
  $('#f-precos').addEventListener('submit', function (e) {
    e.preventDefault();
    $$('#campos-precos input').forEach(function (i) { var v = ler(i.value); if (v > 0) D.precos[i.name] = Math.round(v * 1000) / 1000; else delete D.precos[i.name]; });
    salvar(); fechar($('#dlg-precos')); toast('Preços salvos.');
  });
  $('#empresa').addEventListener('change', function () { D.empresa = this.value.trim().slice(0, 60); salvar(); });
  // fechar a janela tocando fora dela
  $$('.ab-dlg').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) fechar(d); }); });

  listasFiltro();
  render();
})();
