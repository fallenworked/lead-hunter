(function(){
  'use strict';
  var state = { leads: [], city: '', niche: '', user: null, limit: 3, resultLimit: 10, lastTotal: 0, favorites: [] };
  function $(id){ return document.getElementById(id); }
  function esc(s){
    s = String(s == null ? '' : s);
    return s.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
  }
  var PRESETS = ['стоматология','кафе','парикмахерская','автосервис','аптека','салон красоты','фитнес','юрист','пекарня','оптика','цветы','мебель','кофейня','ветклиника'];

  window.addEventListener('error', function(e){
    var pl = $('preloader'), app = $('app');
    if(pl) pl.classList.add('hide');
    if(app) app.classList.add('show');
  });

  function preload(){
    return new Promise(function(resolve){
      var bar = $('preloaderBar'), pct = $('preloaderPct'), fin = false;
      function finish(){
        if(fin) return; fin = true;
        var pl = $('preloader'), app = $('app');
        if(pl) pl.classList.add('hide');
        if(app) app.classList.add('show');
        setTimeout(resolve, 300);
      }
      var safety = setTimeout(finish, 3500);
      if(!bar || !pct){ clearTimeout(safety); finish(); return; }
      var p = 0;
      function step(){
        p += 5;
        if(p > 100) p = 100;
        bar.style.setProperty('--progress', p + '%');
        pct.textContent = p + '%';
        if(p < 100) setTimeout(step, 40);
        else { clearTimeout(safety); setTimeout(finish, 250); }
      }
      step();
    });
  }

  function renderPresets(){
    var el = $('presets');
    if(!el) return;
    var html = '';
    for(var i = 0; i < PRESETS.length; i++){
      html += '<div class="preset" data-v="' + esc(PRESETS[i]) + '">' + esc(PRESETS[i]) + '</div>';
    }
    el.innerHTML = html;
  }

  function renderSkeleton(){
    var g = $('grid');
    if(!g) return;
    var html = '';
    for(var i = 0; i < 6; i++) html += '<div class="skeleton"></div>';
    g.innerHTML = html;
  }

  function animateNumber(el, target){
    if(!el) return;
    var start = parseInt(el.textContent, 10) || 0;
    var t0 = new Date().getTime();
    function tick(){
      var k = (new Date().getTime() - t0) / 600;
      if(k > 1) k = 1;
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.floor(start + (target - start) * eased);
      if(k < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }

  function pad2(n){ n = String(n); return n.length < 2 ? '0' + n : n; }

  function isFavorite(lead){
    for(var i = 0; i < state.favorites.length; i++){
      var f = state.favorites[i];
      if(f.name === lead.name && (f.addr || '') === (lead.addr || '')) return f;
    }
    return null;
  }

  function render(){
    var g = $('grid');
    if(!g) return;
    var leads = state.leads;
    if(!leads.length){
      g.innerHTML = '<div class="empty"><div class="empty-icon">∅</div><h2>Ничего не найдено</h2><p>Попробуй другую нишу или город</p></div>';
      return;
    }
    var html = '';
    if(state.user && state.user.plan === 'free' && state.lastTotal > state.resultLimit){
      html += '<div class="notice">Показано <b>' + state.resultLimit + '</b> из <b>' + state.lastTotal + '</b>. <a id="noticeUpgrade">Оформить подписку</a></div>';
    }
    var canFav = state.user && state.user.plan === 'pro';
    for(var i = 0; i < leads.length; i++){
      var l = leads[i];
      var badge = l.phone ? '<div class="badge">✓ контакт</div>' : '<div class="badge nocontact">только адрес</div>';
      var phoneClean = '';
      if(l.phone){
        phoneClean = String(l.phone).split('').filter(function(c){ return c === '+' || (c >= '0' && c <= '9'); }).join('');
      }
      var waLink = phoneClean ? 'https://wa.me/' + phoneClean.replace(/^[+]?8/, '7') : '';
      var yandexLink = 'https://yandex.ru/maps/?text=' + encodeURIComponent((l.name || '') + ' ' + (state.city || ''));
      var gisLink = 'https://2gis.ru/search/' + encodeURIComponent(l.name + ' ' + state.city);
      var routeLink = (l.lat && l.lon) ? 'https://yandex.ru/maps/?rtext=~' + l.lat + ',' + l.lon : '';

      var fav = canFav ? isFavorite(l) : null;
      var starHtml = canFav ? '<button type="button" class="star' + (fav ? ' on' : '') + '" data-fav-idx="' + i + '">' + (fav ? '★' : '☆') + '</button>' : '';

      html += '<article class="card' + (starHtml ? ' has-star' : '') + '">';
      html += starHtml;
      html += '<div class="card-head"><div style="flex:1;min-width:0">';
      html += '<span class="card-idx">#' + pad2(i+1) + (l.type ? ' · ' + esc(String(l.type).toUpperCase()) : '') + '</span>';
      html += '<h3>' + esc(l.name) + '</h3></div>' + badge + '</div>';
      html += '<div>';
      if(l.phone) html += '<div class="contact-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg><a href="tel:' + esc(l.phone) + '"><b>' + esc(l.phone) + '</b></a></div>';
      if(l.email) html += '<div class="contact-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg><a href="mailto:' + esc(l.email) + '"><b>' + esc(l.email) + '</b></a></div>';
      if(l.addr) html += '<div class="contact-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><span>' + esc(l.addr) + '</span></div>';
      if(l.opening) html += '<div class="contact-line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>' + esc(l.opening) + '</span></div>';
      html += '</div>';
      html += '<div class="contact-actions">';
      if(l.phone) html += '<a class="primary" href="tel:' + esc(l.phone) + '">Позвонить</a>';
      if(waLink) html += '<a href="' + waLink + '" target="_blank" rel="noopener">WhatsApp</a>';
      html += '<a href="' + yandexLink + '" target="_blank" rel="noopener">Я.Карты</a>';
      html += '<a href="' + gisLink + '" target="_blank" rel="noopener">2GIS</a>';
      if(routeLink) html += '<a href="' + routeLink + '" target="_blank" rel="noopener">Маршрут</a>';
      html += '</div></article>';
    }
    g.innerHTML = html;
    var nu = $('noticeUpgrade');
    if(nu) nu.addEventListener('click', openPlans);

    var stars = g.querySelectorAll('.star');
    for(var si = 0; si < stars.length; si++){
      (function(btn){
        btn.addEventListener('click', function(e){
          e.preventDefault();
          e.stopPropagation();
          var idx = parseInt(btn.getAttribute('data-fav-idx'), 10);
          toggleFavorite(idx, btn);
        });
      })(stars[si]);
    }
  }

  function toggleFavorite(idx, btn){
    if(!state.user || state.user.plan !== 'pro'){
      alert('Избранное доступно только в PRO');
      return;
    }
    var lead = state.leads[idx];
    if(!lead) return;
    var existing = isFavorite(lead);
    btn.disabled = true;
    if(existing){
      fetch('/api/favorites/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id })
      }).then(function(){ return loadFavorites(); }).then(function(){
        btn.classList.remove('on');
        btn.textContent = '☆';
        btn.disabled = false;
      }).catch(function(){ btn.disabled = false; });
    } else {
      fetch('/api/favorites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          addr: lead.addr || '',
          type: lead.type || '',
          opening: lead.opening || '',
          lat: lead.lat,
          lon: lead.lon,
          source_city: state.city,
          source_niche: state.niche
        })
      }).then(function(){ return loadFavorites(); }).then(function(){
        btn.classList.add('on');
        btn.textContent = '★';
        btn.disabled = false;
      }).catch(function(){ btn.disabled = false; });
    }
  }

  function loadFavorites(){
    if(!state.user || state.user.plan !== 'pro'){ state.favorites = []; return Promise.resolve([]); }
    return fetch('/api/favorites').then(function(r){ return r.json(); }).then(function(d){
      state.favorites = d.items || [];
      return state.favorites;
    }).catch(function(){ state.favorites = []; return []; });
  }

  function updateNavUI(){
    var planEl = $('navPlan'), loginBtn = $('navLogin');
    if(state.user){
      if(loginBtn) loginBtn.style.display = 'none';
      if(planEl){
        planEl.style.display = 'inline-block';
        planEl.textContent = state.user.plan === 'pro' ? 'PRO' : 'FREE';
        planEl.className = 'nav-plan ' + (state.user.plan === 'pro' ? 'pro' : 'free');
      }
    } else {
      if(loginBtn) loginBtn.style.display = 'inline-block';
      if(planEl) planEl.style.display = 'none';
    }
    renderDrawer();
  }

  function renderDrawer(){
    var auth = $('drawerAuth'), guest = $('drawerGuest'), nav = $('drawerNav');
    if(!auth || !guest || !nav) return;
    if(state.user){
      auth.style.display = 'block';
      guest.style.display = 'none';
      var initial = state.user.email.charAt(0).toUpperCase();
      var planText = state.user.plan === 'pro' ? 'PRO' : 'FREE';
      var subText = '';
      if(state.user.plan === 'free'){
        var used = state.user.searches_today || 0;
        subText = 'Осталось поисков: <b>' + Math.max(0, state.limit - used) + '/' + state.limit + '</b>';
      } else subText = 'Подписка активна';
      auth.innerHTML = '<div class="drawer-user"><div class="drawer-avatar">' + esc(initial) + '</div><div><div class="drawer-email">' + esc(state.user.email) + '</div><div class="drawer-sub">' + subText + '</div></div></div>';
      var aiLabel = state.user.plan === 'pro' ? '<span class="right">NEW</span>' : '<span class="right">PRO</span>';
      nav.innerHTML =
        '<div class="drawer-section">Работа</div>' +
        '<div class="drawer-item ai-item" data-action="ai"><span class="ai-dot"></span>AI Агент' + aiLabel + '</div>' +
        '<div class="drawer-item" data-action="favorites">Избранное</div>' +
        '<div class="drawer-item" data-action="history">История поиска</div>' +
        '<div class="drawer-section">Аккаунт</div>' +
        '<div class="drawer-item" data-action="profile">Профиль<span class="right">→</span></div>' +
        '<div class="drawer-item" data-action="plans">Подписка<span class="right">199₽</span></div>' +
        '<div class="drawer-section">Помощь</div>' +
        '<div class="drawer-item" data-action="settings">Настройки</div>' +
        '<div class="drawer-item" data-action="support">Поддержка</div>' +
        '<div class="drawer-item danger" data-action="logout">Выйти</div>';
    } else {
      auth.style.display = 'none';
      guest.style.display = 'block';
      nav.innerHTML =
        '<div class="drawer-section">Меню</div>' +
        '<div class="drawer-item" data-action="login">Войти<span class="right">→</span></div>' +
        '<div class="drawer-item" data-action="plans">Тарифы<span class="right">199₽</span></div>' +
        '<div class="drawer-item" data-action="about">О сервисе</div>' +
        '<div class="drawer-item" data-action="support">Поддержка</div>';
    }
  }

  function refreshMe(){
    return fetch('/api/auth/me').then(function(r){ return r.json(); }).then(function(d){
      state.user = d.user || null;
      state.limit = d.limit || 3;
      state.resultLimit = d.result_limit || 10;
      updateNavUI();
      if(state.user && state.user.plan === 'pro'){
        return loadFavorites().then(function(){ return d; });
      }
      return d;
    }).catch(function(){ return null; });
  }

  var authMode = 'login';
  function openAuth(mode){
    authMode = mode || 'login';
    var m = $('authModal');
    if(!m) return;
    $('authMsg').textContent = '';
    $('authMsg').className = 'modal-msg';
    if(authMode === 'login'){
      $('authTitle').textContent = 'Вход';
      $('authSub').textContent = 'Войди чтобы искать клиентов';
      $('authSubmit').textContent = 'Войти';
      $('authSwitchText').textContent = 'Нет аккаунта?';
      $('authSwitchLink').textContent = 'Регистрация';
    } else {
      $('authTitle').textContent = 'Регистрация';
      $('authSub').textContent = 'Создай аккаунт - бесплатно';
      $('authSubmit').textContent = 'Создать аккаунт';
      $('authSwitchText').textContent = 'Уже есть аккаунт?';
      $('authSwitchLink').textContent = 'Войти';
    }
    closeDrawer();
    m.classList.add('show');
  }
  function closeAuth(){ var m = $('authModal'); if(m) m.classList.remove('show'); }

  function openDrawer(){
    var d = $('drawer'), b = $('burger');
    if(!d) return;
    renderDrawer();
    d.classList.add('show');
    if(b) b.classList.add('open');
  }
  function closeDrawer(){
    var d = $('drawer'), b = $('burger');
    if(d) d.classList.remove('show');
    if(b) b.classList.remove('open');
  }

  var plansPeriod = 'month';

  function openPlans(){
    closeDrawer();
    setTimeout(function(){
      var pm = $('plansModal');
      if(!pm) return;
      pm.classList.add('show');
      updatePlansToggle();
      updatePlansButtons();
      setTimeout(updatePlansSlider, 120);
    }, 280);
  }

  function closePlans(){
    var pm = $('plansModal');
    if(pm) pm.classList.remove('show');
  }

  function updatePlansToggle(){
    var btns = document.querySelectorAll('.plans-toggle-btn');
    for(var i = 0; i < btns.length; i++){
      if(btns[i].getAttribute('data-period') === plansPeriod) btns[i].classList.add('active');
      else btns[i].classList.remove('active');
    }
    var amount = $('proAmount'), period = $('proPeriod'), old = $('proOld'), save = $('proSave');
    if(!amount) return;
    if(plansPeriod === 'month'){
      amount.innerHTML = '199<span class="ruble">₽</span>';
      if(period) period.textContent = 'в месяц';
      if(old) old.style.display = 'none';
      if(save){ save.textContent = 'Отмена в любой момент'; save.style.color = 'var(--text-dim)'; }
    } else {
      amount.innerHTML = '1199<span class="ruble">₽</span>';
      if(period) period.textContent = 'в год';
      if(old) old.style.display = 'inline';
      if(save){ save.textContent = 'Экономия 1189₽ (65%)'; save.style.color = 'var(--ok)'; }
    }
  }

  function updatePlansButtons(){
    var freeCta = $('freeCta');
    var proCta = $('proCta');
    if(!freeCta || !proCta) return;
    var plan = state.user && state.user.plan ? state.user.plan : 'guest';
    if(plan === 'pro'){
      freeCta.textContent = 'Понижение недоступно';
      freeCta.disabled = true;
      freeCta.style.opacity = '0.5';
      proCta.textContent = '✓ Текущий тариф';
      proCta.disabled = true;
      proCta.style.background = 'transparent';
      proCta.style.color = 'var(--ok)';
      proCta.style.border = '1px solid rgba(34,197,139,.3)';
      proCta.style.boxShadow = 'none';
      proCta.style.cursor = 'default';
      proCta.style.transform = 'none';
    } else if(plan === 'free'){
      freeCta.textContent = '✓ Текущий тариф';
      freeCta.disabled = true;
      freeCta.style.opacity = '1';
      proCta.textContent = 'Оформить PRO';
      proCta.disabled = false;
      proCta.style.background = '';
      proCta.style.color = '';
      proCta.style.border = '';
      proCta.style.boxShadow = '';
      proCta.style.cursor = '';
      proCta.style.transform = '';
    } else {
      freeCta.textContent = 'Начать бесплатно';
      freeCta.disabled = false;
      freeCta.style.opacity = '1';
      proCta.textContent = 'Оформить PRO';
      proCta.disabled = false;
      proCta.style.background = '';
      proCta.style.color = '';
      proCta.style.border = '';
      proCta.style.boxShadow = '';
      proCta.style.cursor = '';
      proCta.style.transform = '';
    }
  }

  function updatePlansSlider(){
    var inner = $('plansToggle'), slider = $('plansSlider');
    if(!inner || !slider) return;
    var activeBtn = inner.querySelector('.plans-toggle-btn.active');
    if(!activeBtn) return;
    var innerRect = inner.getBoundingClientRect();
    var btnRect = activeBtn.getBoundingClientRect();
    slider.style.left = (btnRect.left - innerRect.left) + 'px';
    slider.style.width = btnRect.width + 'px';
  }

  function bindPlans(){
    var plansBg = $('plansBg');
    var plansClose = $('plansClose');
    var plansToggle = $('plansToggle');
    var proCta = $('proCta');
    var freeCta = $('freeCta');
    if(plansBg) plansBg.addEventListener('click', closePlans);
    if(plansClose) plansClose.addEventListener('click', closePlans);
    if(plansToggle) plansToggle.addEventListener('click', function(e){
      var el = e.target;
      var btn = null;
      while(el && el !== plansToggle){
        if(el.classList && el.classList.contains('plans-toggle-btn')){ btn = el; break; }
        el = el.parentNode;
      }
      if(!btn) return;
      plansPeriod = btn.getAttribute('data-period');
      updatePlansToggle();
      updatePlansSlider();
    });
    if(proCta) proCta.addEventListener('click', function(){
      if(proCta.disabled) return;
      alert('Скоро подключим оплату.\nТариф: ' + (plansPeriod === 'year' ? '1199₽/год' : '199₽/мес') + '\n\nПока напиши в поддержку - активируем вручную.');
    });
    if(freeCta) freeCta.addEventListener('click', function(){
      if(freeCta.disabled) return;
      closePlans();
      if(!state.user){ setTimeout(function(){ openAuth('register'); }, 250); }
    });
    window.addEventListener('resize', updatePlansSlider);
  }

  var aiHistory = [];
  var aiSending = false;
  var AI_STORAGE_KEY = 'lh_ai_history_v1';

  function aiSaveHistory(){
    try {
      var trimmed = aiHistory.slice(-30);
      localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(trimmed));
    } catch(e){}
  }

  function aiLoadHistory(){
    try {
      var raw = localStorage.getItem(AI_STORAGE_KEY);
      if(!raw) return [];
      var parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return parsed.slice(-30);
    } catch(e){ return []; }
  }

  function aiClearHistory(){
    if(!aiHistory.length) return;
    if(!confirm('Очистить историю чата?')) return;
    aiHistory = [];
    try { localStorage.removeItem(AI_STORAGE_KEY); } catch(e){}
    renderAIMessages();
  }

  function openAI(){
    var m = $('aiModal');
    if(!m) return;
    if(!state.user){ closeDrawer(); setTimeout(function(){ openAuth('login'); }, 200); return; }
    if(state.user.plan !== 'pro'){
      closeDrawer();
      setTimeout(function(){
        alert('AI Агент доступен только в PRO.\n\nОформи подписку - 199₽/мес или 1199₽/год.\n\nПока напиши в поддержку - активируем вручную.');
      }, 250);
      return;
    }
    if(!aiHistory.length) aiHistory = aiLoadHistory();
    renderAIMessages();
    m.classList.add('show');
    loadAILimit();
    setTimeout(function(){ var i = $('aiInput'); if(i) i.focus(); }, 300);
  }

  function closeAI(){
    var m = $('aiModal');
    if(m) m.classList.remove('show');
  }

  function loadAILimit(){
    fetch('/api/ai/limit').then(function(r){ return r.json(); }).then(function(d){
      var c = $('aiCounter');
      if(!c) return;
      if(!d.user){ c.innerHTML = 'Войди чтобы использовать'; return; }
      if(!d.pro){ c.innerHTML = 'Доступно только в <b>PRO</b>'; return; }
      c.innerHTML = 'Осталось: <b>' + d.remaining + '/' + d.limit + '</b> сообщений';
    }).catch(function(){});
  }

  function renderAIMessages(){
    var chat = $('aiChat');
    if(!chat) return;
    var html = '';
    if(!aiHistory.length){
      html = '<div class="ai-welcome"><div class="ai-welcome-icon">✨</div><h3>Привет! Я помогу продать услугу</h3><p>Спроси что угодно или выбери готовый шаблон ниже</p><div class="ai-quick" id="aiQuick"><button type="button" class="ai-quick-btn" data-prompt="Напиши скрипт холодного звонка для стоматологии в Москве, у которой нет сайта. Мой бюджет за услугу 50000 рублей.">📞 Скрипт звонка</button><button type="button" class="ai-quick-btn" data-prompt="Напиши 5 причин, почему стоматологии нужен сайт, чтобы убедить владельца.">💡 5 причин</button><button type="button" class="ai-quick-btn" data-prompt="Напиши коммерческое предложение на создание сайта для стоматологии. Цена 50000 рублей, срок 2 недели.">📄 КП</button><button type="button" class="ai-quick-btn" data-prompt="Клиент говорит: у нас уже есть группа ВКонтакте, сайт не нужен. Что ответить?">🛡 Ответ на возражение</button><button type="button" class="ai-quick-btn" data-prompt="Напиши короткое сообщение в WhatsApp для владельца стоматологии без сайта.">💬 Сообщение в WA</button></div></div>';
    } else {
      for(var i = 0; i < aiHistory.length; i++){
        var m = aiHistory[i];
        if(m.role === 'user'){
          html += '<div class="ai-msg user">' + esc(m.content) + '</div>';
        } else {
          html += '<div class="ai-msg bot">' + formatAI(m.content) + '</div>';
        }
      }
    }
    chat.innerHTML = html;
    chat.scrollTop = chat.scrollHeight;
  }

  function formatAI(text){
    var s = esc(text);
    s = s.split('\n').join('<br>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    return s;
  }

  function showTyping(){
    var chat = $('aiChat');
    if(!chat) return;
    var t = document.createElement('div');
    t.className = 'ai-msg typing';
    t.id = 'aiTyping';
    t.innerHTML = '<div class="ai-typing-dots"><span></span><span></span><span></span></div>';
    chat.appendChild(t);
    chat.scrollTop = chat.scrollHeight;
  }

  function hideTyping(){
    var t = $('aiTyping');
    if(t) t.remove();
  }

  function sendAI(text){
    if(aiSending) return;
    if(!state.user){ closeAI(); openAuth('login'); return; }
    if(state.user.plan !== 'pro'){
      closeAI();
      setTimeout(function(){ alert('AI доступен только в PRO'); }, 200);
      return;
    }
    text = (text || '').trim();
    if(!text) return;

    aiSending = true;
    var input = $('aiInput');
    var sendBtn = $('aiSend');
    if(input) input.value = '';
    if(sendBtn) sendBtn.disabled = true;

    aiHistory.push({ role: 'user', content: text });
    aiSaveHistory();
    renderAIMessages();
    showTyping();

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: aiHistory })
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, data: d }; }); })
      .then(function(res){
        hideTyping();
        if(!res.ok){
          if(res.data.code === 'AI_LIMIT_REACHED'){
            aiHistory.push({ role: 'assistant', content: 'Дневной лимит исчерпан. Возвращайся завтра.' });
          } else if(res.data.code === 'AUTH_REQUIRED'){
            closeAI(); openAuth('login');
          } else if(res.data.code === 'PRO_REQUIRED'){
            closeAI();
            setTimeout(function(){ alert('AI Агент доступен только в PRO.'); }, 200);
          } else {
            aiHistory.push({ role: 'assistant', content: 'Ошибка: ' + (res.data.error || 'не удалось получить ответ') });
          }
        } else {
          aiHistory.push({ role: 'assistant', content: res.data.reply });
          loadAILimit();
        }
        aiSaveHistory();
        renderAIMessages();
        aiSending = false;
        if(sendBtn) sendBtn.disabled = false;
        if(input) input.focus();
      })
      .catch(function(e){
        hideTyping();
        aiHistory.push({ role: 'assistant', content: 'Ошибка сети. Попробуй ещё раз.' });
        aiSaveHistory();
        renderAIMessages();
        aiSending = false;
        if(sendBtn) sendBtn.disabled = false;
      });
  }

  function bindAI(){
    var bg = $('aiBg'), close = $('aiClose'), clearBtn = $('aiClear');
    var sendBtn = $('aiSend'), input = $('aiInput');
    if(bg) bg.addEventListener('click', closeAI);
    if(close) close.addEventListener('click', closeAI);
    if(clearBtn) clearBtn.addEventListener('click', aiClearHistory);
    if(sendBtn) sendBtn.addEventListener('click', function(){ sendAI(input ? input.value : ''); });
    if(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.shiftKey){
          e.preventDefault();
          sendAI(input.value);
        }
      });
      input.addEventListener('input', function(){
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }
    document.addEventListener('click', function(e){
      var el = e.target;
      while(el && el !== document.body){
        if(el.classList && el.classList.contains('ai-quick-btn')){
          var p = el.getAttribute('data-prompt');
          if(p) sendAI(p);
          return;
        }
        el = el.parentNode;
      }
    });
  }

  function submitAuth(){
    var email = $('authEmail').value.trim();
    var password = $('authPassword').value;
    var msg = $('authMsg'), btn = $('authSubmit');
    if(!email || !password){ msg.textContent = 'Заполни поля'; msg.className = 'modal-msg err'; return; }
    btn.disabled = true;
    msg.textContent = 'Отправка…'; msg.className = 'modal-msg';
    var endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, data: d }; }); })
      .then(function(res){
        btn.disabled = false;
        if(!res.ok){ msg.textContent = res.data.error || 'Ошибка'; msg.className = 'modal-msg err'; return; }
        state.user = res.data.user;
        state.limit = res.data.limit || 3;
        state.resultLimit = res.data.result_limit || 10;
        if(state.user.plan === 'pro'){ loadFavorites(); }
        updateNavUI();
        msg.textContent = 'Готово!'; msg.className = 'modal-msg ok';
        setTimeout(function(){ closeAuth(); doSearch(); }, 400);
      })
      .catch(function(e){
        btn.disabled = false;
        msg.textContent = 'Ошибка сети: ' + e.message;
        msg.className = 'modal-msg err';
      });
  }

  function logout(){
    fetch('/api/auth/logout', { method: 'POST' }).then(function(){
      state.user = null; state.leads = []; state.lastTotal = 0; state.favorites = [];
      aiHistory = [];
      try { localStorage.removeItem(AI_STORAGE_KEY); } catch(e){}
      updateNavUI();
      $('grid').innerHTML = '';
      var infoEl = $('info');
      if(infoEl) infoEl.textContent = 'Введи город и нишу, нажми «Найти клиентов»';
      closeDrawer();
    });
  }

  function showLimitReached(){
    var g = $('grid');
    if(!g) return;
    g.innerHTML = '<div class="empty"><div class="empty-icon">🔒</div><h2>Лимит поисков исчерпан</h2><p>Использовано ' + state.limit + ' поиска на сегодня.</p><p style="margin-top:8px">Подписка открывает безлимитный доступ.</p><button type="button" class="cta" id="openPro">Оформить подписку</button></div>';
    var btn = $('openPro');
    if(btn) btn.addEventListener('click', openPlans);
  }

  function doSearch(){
    var cityEl = $('city'), nicheEl = $('niche');
    if(!cityEl || !nicheEl) return;
    if(!state.user){ open
