(function(){
  'use strict';
  var state = { leads: [], city: '', niche: '', user: null, limit: 3, resultLimit: 10, lastTotal: 0 };
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

      html += '<article class="card">';
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
      alert('Скоро подключим оплату.\nТариф: ' + (plansPeriod === 'year' ? '1199₽/год' : '199₽/мес') + '\n\nПока напиши в поддержку - активируем вручную.');
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
      state.user = null; state.leads = []; state.lastTotal = 0;
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
    if(!state.user){ openAuth('login'); return; }
    var city = cityEl.value.trim(), niche = nicheEl.value.trim();
    if(!city || !niche){ alert('Заполни город и нишу'); return; }
    state.city = city; state.niche = niche;

    var goBtn = $('go');
    if(goBtn) goBtn.disabled = true;
    renderSkeleton();
    var infoEl = $('info');
    if(infoEl) infoEl.innerHTML = 'Ищу «' + esc(niche) + '» в ' + esc(city) + '…';

    var locData = null;
    fetch('/api/locate?city=' + encodeURIComponent(city) + '&niche=' + encodeURIComponent(niche))
      .then(function(r){ return r.json().then(function(d){ return { status: r.status, data: d }; }); })
      .then(function(res){
        if(res.data.code === 'AUTH_REQUIRED'){ openAuth('login'); throw new Error('__AUTH__'); }
        if(res.data.code === 'LIMIT_REACHED'){ showLimitReached(); throw new Error('__LIMIT__'); }
        if(res.data.error) throw new Error(res.data.error);
        locData = res.data;
        if(state.user && state.user.plan === 'free'){
          state.user.searches_today = res.data.used || 0;
          state.resultLimit = res.data.result_limit || 10;
          updateNavUI();
        }
        if(infoEl) infoEl.innerHTML = 'Опрашиваю OpenStreetMap…';
        var eps = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.openstreetmap.fr/api/interpreter','https://overpass.osm.ch/api/interpreter'];
        function tryEp(idx, lastErr){
          if(idx >= eps.length) throw new Error('Overpass недоступен: ' + lastErr);
          return fetch(eps[idx], {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(locData.query)
          }).then(function(r){
            if(!r.ok) return tryEp(idx + 1, 'HTTP ' + r.status);
            return r.json().then(function(d){
              if(d.remark) return tryEp(idx + 1, 'remark');
              if(!d.elements || !d.elements.length) return tryEp(idx + 1, 'empty');
              return d;
            }).catch(function(e){ return tryEp(idx + 1, e.message); });
          }).catch(function(e){ return tryEp(idx + 1, e.message); });
        }
        return tryEp(0, '');
      })
      .then(function(overpassData){
        var loc = locData;
        var elements = overpassData.elements || [];
        var leads = [], seen = {};
        for(var i = 0; i < elements.length; i++){
          var el = elements[i], t = el.tags || {};
          var name = t.name || t['name:ru'] || '';
          if(!name) continue;
          if(t.website || t['contact:website']) continue;
          var lat = (el.lat != null) ? el.lat : (el.center && el.center.lat);
          var lon = (el.lon != null) ? el.lon : (el.center && el.center.lon);
          var addr = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
          var key = name.toLowerCase() + '|' + (lat ? lat.toFixed(3) : '');
          if(seen[key]) continue;
          seen[key] = 1;
          leads.push({ id: el.id, name: name, phone: t.phone || t['contact:phone'] || '', email: t.email || t['contact:email'] || '', addr: addr, lat: lat, lon: lon, opening: t.opening_hours || '', type: t.amenity || t.shop || t.office || t.healthcare || t.leisure || t.tourism || '' });
        }
        var totalFound = leads.length;
        var rLimit = loc.result_limit || 999;
        var shown = leads.length > rLimit ? leads.slice(0, rLimit) : leads;
        state.lastTotal = totalFound;
        state.leads = shown;
        var withPhone = 0, withAddr = 0;
        for(var j = 0; j < shown.length; j++){
          if(shown[j].phone) withPhone++;
          if(shown[j].addr) withAddr++;
        }
        animateNumber($('s-total'), totalFound);
        animateNumber($('s-phone'), withPhone);
        animateNumber($('s-addr'), withAddr);
        var sc = $('s-city');
        if(sc) sc.textContent = loc.country ? (loc.city + ', ' + loc.country) : loc.city;
        if(infoEl){
          var txt = 'Найдено <b>' + totalFound + '</b>';
          if(shown.length < totalFound) txt += ' · показано <b>' + shown.length + '</b>';
          txt += ' · с телефоном: <b>' + withPhone + '</b>';
          infoEl.innerHTML = txt;
        }
        render();
      })
      .catch(function(e){
        if(e.message === '__AUTH__' || e.message === '__LIMIT__') return;
        if(infoEl) infoEl.innerHTML = '<span class="err">Ошибка: ' + esc(e.message) + '</span>';
        var g = $('grid');
        if(g) g.innerHTML = '<div class="empty"><h2>Не вышло</h2><p>' + esc(e.message) + '</p></div>';
      })
      .then(function(){ if(goBtn) goBtn.disabled = false; });
  }

  function exportCSV(){
    if(!state.leads.length){ alert('Нечего экспортировать'); return; }
    if(state.user && state.user.plan === 'free'){ alert('CSV доступен только в подписке'); return; }
    function q(v){ return '"' + String(v == null ? '' : v).split('"').join('""') + '"'; }
    var rows = [['Название','Телефон','Email','Адрес','Тип','Часы','Координаты','Карта']];
    for(var i = 0; i < state.leads.length; i++){
      var l = state.leads[i];
      rows.push([l.name, l.phone, l.email, l.addr, l.type, l.opening, (l.lat && l.lon) ? (l.lat + ',' + l.lon) : '', (l.lat && l.lon) ? ('https://yandex.ru/maps/?pt=' + l.lon + ',' + l.lat + '&z=17') : '']);
    }
    var csv = '\uFEFF';
    for(var r = 0; r < rows.length; r++){
      var row = [];
      for(var c = 0; c < rows[r].length; c++) row.push(q(rows[r][c]));
      csv += row.join(',') + '\n';
    }
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leadhunter_' + state.niche + '_' + state.city + '_' + Date.now() + '.csv';
    a.click();
  }

  function handleAction(action){
    if(action === 'login'){ closeDrawer(); setTimeout(function(){ openAuth('login'); }, 250); return; }
    if(action === 'logout'){ logout(); return; }
    if(action === 'plans'){ openPlans(); return; }
    if(action === 'ai'){ openAI(); return; }
    if(action === 'profile'){ closeDrawer(); setTimeout(function(){ alert('Профиль в разработке'); }, 250); return; }
    if(action === 'history'){ closeDrawer(); setTimeout(function(){ alert('История в разработке'); }, 250); return; }
    if(action === 'settings'){ closeDrawer(); setTimeout(function(){ alert('Настройки в разработке'); }, 250); return; }
    if(action === 'support'){ closeDrawer(); setTimeout(function(){ alert('Поддержка: напиши в Telegram-канал сервиса'); }, 250); return; }
    if(action === 'about'){ closeDrawer(); setTimeout(function(){ alert('Lead Hunter - поиск бизнесов без сайта.\nДанные OpenStreetMap.\nВерсия 1.0'); }, 250); return; }
  }

  function bind(){
    var goBtn = $('go'), csvBtn = $('csv');
    var cityEl = $('city'), nicheEl = $('niche'), presetsEl = $('presets');
    if(goBtn) goBtn.addEventListener('click', doSearch);
    if(csvBtn) csvBtn.addEventListener('click', exportCSV);
    if(cityEl) cityEl.addEventListener('keydown', function(e){ if(e.key === 'Enter') doSearch(); });
    if(nicheEl) nicheEl.addEventListener('keydown', function(e){ if(e.key === 'Enter') doSearch(); });
    if(presetsEl) presetsEl.addEventListener('click', function(e){
      var el = e.target;
      while(el && el !== presetsEl){
        if(el.classList && el.classList.contains('preset')){ if(nicheEl) nicheEl.value = el.getAttribute('data-v'); return; }
        el = el.parentNode;
      }
    });
    var navLogin = $('navLogin');
    var burger = $('burger'), drawerBg = $('drawerBg'), drawerClose = $('drawerClose');
    var authClose = $('authModalClose'), authBg = $('authModalBg');
    var authForm = $('authForm'), authSwitch = $('authSwitchLink');
    var drawerNav = $('drawerNav');
    if(navLogin) navLogin.addEventListener('click', function(){ openAuth('login'); });
    if(burger) burger.addEventListener('click', function(){
      var d = $('drawer');
      if(d.classList.contains('show')) closeDrawer(); else openDrawer();
    });
    if(drawerBg) drawerBg.addEventListener('click', closeDrawer);
    if(drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if(drawerNav) drawerNav.addEventListener('click', function(e){
      var el = e.target;
      while(el && el !== drawerNav){
        if(el.classList && el.classList.contains('drawer-item')){ var a = el.getAttribute('data-action'); if(a) handleAction(a); return; }
        el = el.parentNode;
      }
    });
    if(authClose) authClose.addEventListener('click', closeAuth);
    if(authBg) authBg.addEventListener('click', closeAuth);
    if(authForm) authForm.addEventListener('submit', submitAuth);
    if(authSwitch) authSwitch.addEventListener('click', function(){ openAuth(authMode === 'login' ? 'register' : 'login'); });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){ closeAuth(); closePlans(); closeAI(); closeDrawer(); }
    });
  }

  bind();
  bindPlans();
  bindAI();
  renderPresets();
  preload().then(refreshMe);
})();
