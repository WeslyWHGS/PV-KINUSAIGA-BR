(function () {
  'use strict';

  var reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===== CARROSSEL INFINITO (auto-scroll + arrastar) ===== */
  function iniciarCarrossel(container, track, direcao, velocidade) {
    container.classList.add('js-carousel');

    var metade = track.scrollWidth / 2;
    var posicao = direcao === 1 ? -metade : 0;
    var rafId = 0;
    var ultimoTempo = 0;
    var pausado = false;
    var visivel = false;
    var timeoutRetomar = 0;

    function normalizar(valor, limite) {
      if (limite <= 0) return 0;
      var n = valor % limite;
      if (n > 0) n -= limite;
      return n;
    }

    function aplicar() {
      track.style.transform = 'translate3d(' + posicao + 'px,0,0)';
    }

    function recalcular() {
      metade = track.scrollWidth / 2 || 1;
      posicao = normalizar(posicao, metade);
      aplicar();
    }

    function frame(tempo) {
      if (!ultimoTempo) ultimoTempo = tempo;
      var dt = Math.min((tempo - ultimoTempo) / 1000, 0.05);
      ultimoTempo = tempo;
      if (!pausado && !reduzirMovimento) {
        posicao = normalizar(posicao + direcao * velocidade * dt, metade);
        aplicar();
      }
      rafId = requestAnimationFrame(frame);
    }

    function iniciar() {
      if (rafId || reduzirMovimento || !visivel || document.hidden) return;
      ultimoTempo = 0;
      rafId = requestAnimationFrame(frame);
    }

    function parar() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        ultimoTempo = 0;
      }
    }

    function pausar() {
      pausado = true;
      clearTimeout(timeoutRetomar);
    }

    function agendarRetomada() {
      clearTimeout(timeoutRetomar);
      timeoutRetomar = setTimeout(function () {
        pausado = false;
        ultimoTempo = 0;
      }, 900);
    }

    aplicar();

    // Arrastar com mouse/dedo
    var arrastando = false;
    var inicioX = 0;
    var posicaoInicial = 0;
    var ponteiroId = null;

    container.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      arrastando = true;
      ponteiroId = e.pointerId;
      inicioX = e.clientX;
      posicaoInicial = posicao;
      pausar();
      container.classList.add('is-dragging');
    });

    container.addEventListener('pointermove', function (e) {
      if (!arrastando || e.pointerId !== ponteiroId) return;
      var delta = e.clientX - inicioX;
      if (Math.abs(delta) > 4) {
        try { container.setPointerCapture(e.pointerId); } catch (err) {}
      }
      posicao = normalizar(posicaoInicial + delta, metade);
      aplicar();
    }, { passive: true });

    function soltar(e) {
      if (!arrastando || (ponteiroId !== null && e.pointerId !== ponteiroId)) return;
      arrastando = false;
      ponteiroId = null;
      container.classList.remove('is-dragging');
      agendarRetomada();
    }

    container.addEventListener('pointerup', soltar);
    container.addEventListener('pointercancel', soltar);
    container.addEventListener('mouseenter', pausar);
    container.addEventListener('mouseleave', function () {
      if (!arrastando) agendarRetomada();
    });
    container.addEventListener('wheel', function () {
      pausar();
      agendarRetomada();
    }, { passive: true });
    container.addEventListener('dragstart', function (e) { e.preventDefault(); });

    if ('ResizeObserver' in window) new ResizeObserver(recalcular).observe(track);
    window.addEventListener('load', recalcular);

    new IntersectionObserver(function (entradas) {
      visivel = !!(entradas[0] && entradas[0].isIntersecting);
      if (visivel) iniciar(); else parar();
    }, { rootMargin: '200px 0px' }).observe(container);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar(); else iniciar();
    });
  }

  [
    { container: 'carousel', track: 'track', dir: -1, speed: 40 },
    { container: 'carousel2', track: 'track2', dir: -1, speed: 38 },
    { container: 'carousel3', track: 'track3', dir: 1, speed: 36 },
    { container: 'carousel4', track: 'track4', dir: -1, speed: 34 }
  ].forEach(function (c) {
    var container = document.getElementById(c.container);
    var track = document.getElementById(c.track);
    if (container && track) iniciarCarrossel(container, track, c.dir, c.speed);
  });

  /* ===== PASSO A PASSO (slides com vídeo) ===== */
  var stepsCarousel = document.getElementById('steps-carousel');
  var stepsTrack = document.getElementById('steps-track');

  if (stepsCarousel && stepsTrack) {
    var slides = Array.prototype.slice.call(stepsTrack.querySelectorAll('.step-slide'));
    var dots = Array.prototype.slice.call(stepsCarousel.querySelectorAll('.steps-dot'));
    var videos = slides.map(function (s) { return s.querySelector('video'); });
    var atual = 0;
    var stepsVisivel = false;

    function atualizarSteps() {
      var slide = slides[atual];
      if (!slide) return;
      var larguraViewport = stepsTrack.parentElement ? stepsTrack.parentElement.clientWidth : 0;
      var deslocamento = slide.offsetLeft - (larguraViewport - slide.offsetWidth) / 2;
      stepsTrack.style.transform = 'translate3d(' + (-deslocamento) + 'px, 0, 0)';

      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === atual); });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === atual);
        d.setAttribute('aria-selected', i === atual ? 'true' : 'false');
      });
      videos.forEach(function (v, i) {
        if (!v) return;
        if (i === atual && stepsVisivel && !reduzirMovimento) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }

    function irPara(i) {
      atual = (i + slides.length) % slides.length;
      atualizarSteps();
    }

    new IntersectionObserver(function (entradas) {
      stepsVisivel = entradas.some(function (e) { return e.isIntersecting; });
      if (stepsVisivel) atualizarSteps();
      else videos.forEach(function (v) { if (v) v.pause(); });
    }, { threshold: 0.35 }).observe(stepsCarousel);

    var prev = stepsCarousel.querySelector('.steps-arrow--prev');
    var next = stepsCarousel.querySelector('.steps-arrow--next');
    if (prev) prev.addEventListener('click', function () { irPara(atual - 1); });
    if (next) next.addEventListener('click', function () { irPara(atual + 1); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { irPara(i); });
    });

    // Swipe no celular
    var toqueX = 0;
    var toqueY = 0;
    var tocando = false;
    var viewport = stepsTrack.parentElement;

    if (viewport) {
      viewport.addEventListener('touchstart', function (e) {
        var t = e.touches[0];
        if (!t) return;
        toqueX = t.clientX;
        toqueY = t.clientY;
        tocando = true;
      }, { passive: true });

      viewport.addEventListener('touchend', function (e) {
        if (!tocando) return;
        tocando = false;
        var t = e.changedTouches[0];
        if (!t) return;
        var dx = t.clientX - toqueX;
        var dy = t.clientY - toqueY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) irPara(atual + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }

    window.addEventListener('resize', atualizarSteps);
    atualizarSteps();
  }

  /* ===== PROTEÇÃO DAS IMAGENS (sem arrastar / sem botão direito) ===== */
  function bloquearImagem(e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  }
  document.querySelectorAll('img').forEach(function (img) { img.setAttribute('draggable', 'false'); });
  document.addEventListener('contextmenu', bloquearImagem);
  document.addEventListener('dragstart', bloquearImagem);

  /* ===== DATA DE AJUSTE DO PREÇO (sempre a data de hoje) ===== */
  var dataAjuste = document.getElementById('data-ajuste-preco');
  if (dataAjuste) {
    dataAjuste.textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /* ===== FAQ (acordeão, uma pergunta aberta por vez) ===== */
  document.querySelectorAll('.faq-question').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var item = botao.parentElement;
      var aberto = botao.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-item.open').forEach(function (el) {
        el.classList.remove('open');
        var q = el.querySelector('.faq-question');
        if (q) q.setAttribute('aria-expanded', 'false');
      });
      if (!aberto && item) {
        item.classList.add('open');
        botao.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ===== CÍRCULO ANIMADO NO PREÇO DO KIT COMPLETO ===== */
  var circulo = document.querySelector('.animated-circle');
  if (circulo) {
    var obsCirculo = new IntersectionObserver(function (entradas) {
      if (entradas[0] && entradas[0].isIntersecting) {
        circulo.classList.add('draw-active');
        obsCirculo.disconnect();
      }
    }, { threshold: 0.3 });
    obsCirculo.observe(circulo);
  }
})();
