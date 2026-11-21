/* ==========================================================================
   Graduation Letter — UI, scroll choreography, countdown, calendar, sharing
   ========================================================================== */
(() => {
  'use strict';

  const CFG = window.INVITE || {};
  const VENUE = CFG.venue || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const body = document.body;
  const reduced = html.classList.contains('reduced');
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const enc = encodeURIComponent;

  /* Shared state read by background.js / map3d.js */
  const STATE = (window.INVITE_STATE = { velocity: 0, shape: 'stars', opened: false });
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  if (finePointer) html.classList.add('has-pointer');

  /* ------------------------------------------------------------------
     1. Personalisation
     ------------------------------------------------------------------ */
  const params = new URLSearchParams(location.search);
  const guestParam = (params.get('to') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const guest = guestParam || CFG.defaultGuest || 'Bạn thân mến';
  $$('[data-guest]').forEach((el) => (el.textContent = guest));
  if (guest.length > 16) $$('.hero__guest, .intro__to').forEach((el) => el.classList.add('is-long'));
  if (guestParam) document.title = `Gửi ${guestParam} · Thư mời Lễ Tốt Nghiệp`;

  const grad = CFG.graduate || {};
  const shortName = grad.shortName || (grad.name ? grad.name.trim().split(/\s+/).pop() : 'mình');
  if (grad.name) {
    $$('[data-grad-name]').forEach((el) => (el.textContent = grad.name));
    $$('[data-grad-title]').forEach((el) => (el.textContent = grad.title || ''));
    $$('[data-grad-line]').forEach((el) => (el.hidden = false));
    $$('[data-grad-sign]').forEach((el) => (el.textContent = grad.name));
  } else {
    $$('[data-grad-sign]').forEach((el) => (el.textContent = 'Tân khoa Bách Khoa 2026'));
  }
  $$('[data-grad-short]').forEach((el) => (el.textContent = shortName));
  if (!guestParam && grad.name) document.title = `Thư mời Lễ Tốt Nghiệp · ${grad.name} · 29.11.2026`;

  const arrival = new Date(CFG.arrival || '2026-11-29T09:45:00+07:00');
  const endTime = new Date(CFG.end || '2026-11-29T13:30:00+07:00');
  const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
  const arrivalHM = timeFmt.format(arrival);
  $$('[data-bind="time"]').forEach((el) => (el.textContent = arrivalHM));

  /* ------------------------------------------------------------------
     2. Program data (from the official invitation)
     ------------------------------------------------------------------ */
  const OISP = 'Giám đốc Văn phòng Đào tạo Quốc tế phát biểu chúc mừng';
  const PROGRAM = [
    {
      label: 'Nhóm 1', range: '07:00 – 10:00',
      items: [
        { t: '07:00 – 07:30', title: 'Đón tiếp khách mời, phụ huynh và tân khoa', sub: ['Ổn định chỗ ngồi tại Hội trường A5'] },
        { t: '07:30 – 08:15', title: 'Văn nghệ chào mừng', sub: ['Tuyên bố lý do; giới thiệu đại biểu', OISP, 'Trình chiếu video tri ân', 'Phát biểu của đại diện sinh viên'] },
        { t: '08:15 – 08:25', title: 'Vinh danh sinh viên tốt nghiệp loại xuất sắc' },
        { t: '08:25 – 09:40', title: 'Trao bằng tốt nghiệp cho Tân Thạc sĩ và Tân Cử nhân', key: true, fac: ['Kỹ thuật Địa chất và Dầu khí', 'Công nghệ Vật liệu', 'Môi trường và Tài nguyên', 'Khoa học và Kỹ thuật Máy tính'] },
        { t: '09:40 – 10:00', title: 'Chụp ảnh lưu niệm' },
        { t: '10:00', title: 'Bế mạc buổi lễ' },
        { t: '10:00 – 10:45', title: 'Chuyển giao Hội trường A5 giữa 2 nhóm', brk: true },
      ],
    },
    {
      label: 'Nhóm 2', range: '10:45 – 13:30',
      items: [
        { t: '10:45 – 11:30', title: 'Văn nghệ chào mừng', sub: ['Tuyên bố lý do; giới thiệu đại biểu', OISP, 'Video chúc mừng tốt nghiệp', 'Phát biểu của đại diện sinh viên'] },
        { t: '11:30 – 11:35', title: 'Vinh danh sinh viên tốt nghiệp loại xuất sắc' },
        { t: '11:35 – 13:05', title: 'Trao bằng tốt nghiệp cho Tân Thạc sĩ và Tân Cử nhân', key: true, fac: ['Khoa học Ứng dụng', 'Kỹ thuật Xây dựng', 'Quản lý Công nghiệp', 'Cơ khí'] },
        { t: '13:05 – 13:30', title: 'Chụp ảnh lưu niệm' },
        { t: '13:30', title: 'Bế mạc buổi lễ' },
        { t: '13:30 – 14:30', title: 'Chuyển giao Hội trường A5 giữa 2 nhóm', brk: true },
      ],
    },
    {
      label: 'Nhóm 3', range: '14:30 – 17:00',
      items: [
        { t: '14:30 – 15:15', title: 'Văn nghệ – Giới thiệu đại biểu', sub: ['Tuyên bố lý do; giới thiệu đại biểu', OISP, 'Trình chiếu video tri ân', 'Phát biểu của đại diện sinh viên'] },
        { t: '15:15 – 15:25', title: 'Vinh danh sinh viên tốt nghiệp loại xuất sắc' },
        { t: '15:25 – 16:35', title: 'Trao bằng tốt nghiệp cho Tân Cử nhân', key: true, fac: ['Kỹ thuật Giao thông', 'Điện – Điện tử', 'Kỹ thuật Hóa học'] },
        { t: '16:35 – 17:00', title: 'Chụp ảnh lưu niệm' },
        { t: '17:00', title: 'Bế mạc buổi lễ' },
      ],
    },
  ];
  const mySession = Math.min(Math.max(parseInt(CFG.session, 10) || 0, 0), PROGRAM.length);
  const sessionLine = $('[data-session-line]');
  const meetNote = (CFG.meetNote || '').trim();
  const meetLead = meetNote ? `Giờ hẹn ${meetNote}` : 'Giờ hẹn có mặt';
  if (sessionLine) {
    sessionLine.textContent = mySession
      ? `${meetLead} — lễ của mình (${PROGRAM[mySession - 1].label}) diễn ra ${PROGRAM[mySession - 1].range}`
      : `${meetLead} — lễ tốt nghiệp diễn ra trong ngày tại Hội trường A5`;
  }
  /* timeline item that contains the meeting time (e.g. 09:45 → "09:40 – 10:00 Chụp ảnh lưu niệm") */
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const meetMin = toMin(arrivalHM);
  const isMeetItem = (sessionIdx, it) => {
    if (sessionIdx !== mySession - 1) return false;
    const m = it.t.match(/(\d\d:\d\d)\s*–\s*(\d\d:\d\d)/);
    return !!m && meetMin >= toMin(m[1]) && meetMin < toMin(m[2]);
  };

  /* ------------------------------------------------------------------
     3. Links: Google Calendar, .ics, Google Maps
     ------------------------------------------------------------------ */
  const ll = (a) => (a || []).join(',');
  const pageUrl = location.href.split('#')[0];
  const cleanUrl = location.origin && location.origin !== 'null' ? location.origin + location.pathname : pageUrl.split('?')[0];
  const gmapsDir = (dest) => `https://www.google.com/maps/dir/?api=1&destination=${enc(ll(dest))}`;
  const gmapsPlace = `https://www.google.com/maps/search/?api=1&query=${enc(ll(VENUE.a5 || [10.773348, 106.659644]))}`;
  const gateCoords = { main: VENUE.mainGate || [10.772157, 106.658016], tht: VENUE.thtGate || [10.772808, 106.660596] };

  const evTitle = grad.name ? `Lễ tốt nghiệp của ${grad.name} 🎓` : 'Lễ Tốt Nghiệp · Bách Khoa 🎓';
  const evLoc = [VENUE.hall || 'Hội trường A5', VENUE.school || 'Trường Đại học Bách khoa – ĐHQG-HCM', VENUE.address || '268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh'].join(', ');
  const evDetails = [
    `Hẹn gặp lúc ${arrivalHM} tại ${VENUE.hall || 'Hội trường A5'}${meetNote ? ` — ${meetNote}` : ''}.`,
    mySession ? `Lễ của ${grad.name || 'mình'}: ${PROGRAM[mySession - 1].label} (${PROGRAM[mySession - 1].range}).` : '',
    '',
    `Thiệp mời: ${cleanUrl}`,
    `Chỉ đường (cổng chính 268 Lý Thường Kiệt): ${gmapsDir(gateCoords.main)}`,
  ].filter((l, i) => l || i === 2).join('\n');
  const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${enc(evTitle)}&dates=${utc(arrival)}/${utc(endTime)}&details=${enc(evDetails)}&location=${enc(evLoc)}&ctz=Asia/Ho_Chi_Minh`;
  $$('[data-gcal]').forEach((a) => (a.href = gcalUrl));
  $$('[data-gmaps-a5]').forEach((a) => (a.href = gmapsPlace));
  $$('[data-gmaps-dir]').forEach((a) => (a.href = gmapsDir(gateCoords[a.dataset.gmapsDir] || gateCoords.main)));

  function buildICS() {
    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const te = new TextEncoder();
    const fold = (line) => {
      let out = '', cur = '', bytes = 0;
      for (const ch of line) {
        const b = te.encode(ch).length;
        if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; }
        cur += ch; bytes += b;
      }
      return out + cur;
    };
    const a5 = VENUE.a5 || [10.773348, 106.659644];
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Graduation Letter//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:graduation-${utc(arrival)}@invite`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(arrival)}`,
      `DTEND:${utc(endTime)}`,
      `SUMMARY:${esc(evTitle)}`,
      `LOCATION:${esc(evLoc)}`,
      `DESCRIPTION:${esc(evDetails)}`,
      `GEO:${a5[0]};${a5[1]}`,
      `URL:${cleanUrl}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Ngày mai là lễ tốt nghiệp — hẹn bạn ở Hội trường A5!')}`, 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`2 tiếng nữa là đến giờ hẹn (${arrivalHM}) ở Hội trường A5`)}`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    return lines.map(fold).join('\r\n');
  }
  $$('[data-ics]').forEach((btn) => btn.addEventListener('click', () => {
    const ics = buildICS();
    if (isIOS) { location.href = 'data:text/calendar;charset=utf-8,' + enc(ics); return; }
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'le-tot-nghiep-29-11-2026.ics' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Đã tải file lịch — mở file để thêm vào ứng dụng Lịch');
  }));

  /* Google Maps embed (dark-gold styled / satellite) */
  const gmapFrame = $('[data-gmap]');
  const setGmap = (type) => {
    if (!gmapFrame) return;
    const a5 = VENUE.a5 || [10.773348, 106.659644];
    gmapFrame.src = `https://maps.google.com/maps?q=${a5[0]},${a5[1]}&hl=vi&z=${type === 'k' ? 18 : 17}&t=${type}&output=embed`;
    gmapFrame.classList.toggle('is-dark', type === 'm');
    gmapFrame.classList.toggle('is-sat', type === 'k');
    $$('[data-gmap-type]').forEach((b) => b.classList.toggle('is-active', b.dataset.gmapType === type));
  };
  setGmap('m');
  $$('[data-gmap-type]').forEach((b) => b.addEventListener('click', () => setGmap(b.dataset.gmapType)));

  /* ------------------------------------------------------------------
     4. Toast, share, clipboard
     ------------------------------------------------------------------ */
  const toastEl = $('.toast');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove(); return ok;
    }
  }
  async function share(url = cleanUrl, text = `Thư mời Lễ Tốt Nghiệp${grad.name ? ' của ' + grad.name : ''} · 29.11.2026 · hẹn gặp lúc ${arrivalHM} tại Hội trường A5`) {
    if (navigator.share) {
      try { await navigator.share({ title: 'Thư mời Lễ Tốt Nghiệp', text, url }); } catch (e) { /* cancelled */ }
      return;
    }
    if (await copy(url)) toast('Đã sao chép đường dẫn thiệp mời ✦');
  }
  $$('[data-share]').forEach((b) => b.addEventListener('click', () => share()));

  /* Contacts */
  const contact = CFG.contact || {};
  let anyContact = false;
  if (contact.phone) { const a = $('[data-contact-phone]'); a.href = 'tel:' + contact.phone.replace(/\s/g, ''); a.hidden = false; anyContact = true; }
  if (contact.messenger) { const a = $('[data-contact-messenger]'); a.href = contact.messenger; a.hidden = false; anyContact = true; }
  if (contact.zalo) { const a = $('[data-contact-zalo]'); a.href = contact.zalo; a.hidden = false; anyContact = true; }
  if (anyContact) $('[data-contact]').hidden = false;

  /* Personalised link generator */
  const dlg = $('#personalize');
  const pName = $('[data-p-name]');
  const pLink = $('[data-p-link]');
  const personalLink = () => {
    const n = (pName.value || '').trim();
    return n ? `${cleanUrl}?to=${enc(n)}` : cleanUrl;
  };
  const refreshLink = () => { const l = personalLink(); pLink.textContent = l; $('[data-p-open]').href = l; };
  $$('[data-personalize]').forEach((b) => b.addEventListener('click', () => {
    if (!dlg) return;
    refreshLink();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    if (lenis) lenis.stop();
    setTimeout(() => pName.focus(), 50);
  }));
  dlg && dlg.addEventListener('close', () => { if (lenis && STATE.opened) lenis.start(); });
  pName && pName.addEventListener('input', refreshLink);
  const pCopy = $('[data-p-copy]');
  pCopy && pCopy.addEventListener('click', async () => { if (await copy(personalLink())) toast('Đã sao chép link thiệp riêng ✦'); });
  const pShare = $('[data-p-share]');
  pShare && pShare.addEventListener('click', () => {
    const n = (pName.value || '').trim();
    share(personalLink(), n ? `Gửi ${n}: thư mời Lễ Tốt Nghiệp · 29.11.2026` : undefined);
  });
  dlg && dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  /* ------------------------------------------------------------------
     5. Smooth scroll (Lenis) + ScrollTrigger sync
     ------------------------------------------------------------------ */
  let lenis = null;
  if (window.Lenis && !reduced) {
    // lerp-based smoothing feels lighter/more responsive than a fixed duration
    lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.2 });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop();
  }
  const scrollToEl = (target) => {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  $$('[data-scroll]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (!id || id[0] !== '#') return;
    e.preventDefault();
    scrollToEl($(id));
  }));

  /* scroll velocity, progress bar, top bar */
  const progressEl = $('.progress');
  const topbar = $('.topbar');
  let lastY = -1, vel = 0, maxScroll = 1, scrolled = null;
  const measureMax = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); lastY = -1; };
  measureMax();
  addEventListener('resize', measureMax);
  addEventListener('load', measureMax);
  if (hasGSAP) ScrollTrigger.addEventListener('refresh', measureMax);
  function onFrameScroll() {
    const y = window.scrollY;
    const raw = lenis ? lenis.velocity : (lastY < 0 ? 0 : y - lastY);
    vel += (raw - vel) * 0.18;
    if (Math.abs(vel) < 0.01) vel = 0;
    STATE.velocity = vel;
    if (y !== lastY) { // only touch the DOM when the scroll position actually changed
      lastY = y;
      if (progressEl) progressEl.style.setProperty('--p', (y / maxScroll).toFixed(4));
      const s = y > 40;
      if (topbar && s !== scrolled) { scrolled = s; topbar.classList.toggle('is-scrolled', s); }
    }
    requestAnimationFrame(onFrameScroll);
  }
  requestAnimationFrame(onFrameScroll);

  /* ------------------------------------------------------------------
     6. Text splitting helpers
     ------------------------------------------------------------------ */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w"><span class="wi">${escapeHTML(w)}</span></span>`).join(' ');
    return $$('.wi', el);
  }
  function splitSpans(el, cls) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="${cls}">${escapeHTML(w)}</span>`).join(' ');
    return $$('.' + cls, el);
  }
  function escapeHTML(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const heroTitle = $('[data-hero-title]');
  let titleChars = [];
  if (heroTitle && hasGSAP && !reduced) {
    const words = heroTitle.textContent.trim().split(/\s+/);
    heroTitle.innerHTML = words.map((w) => `<span style="display:inline-block;white-space:nowrap">${Array.from(w).map((c) => `<span class="ch">${escapeHTML(c)}</span>`).join('')}</span>`).join(' ');
    heroTitle.classList.remove('foil');
    heroTitle.classList.add('is-split');
    titleChars = $$('.ch', heroTitle);
  }

  /* ------------------------------------------------------------------
     7. Intro (envelope)
     ------------------------------------------------------------------ */
  const intro = $('#intro');
  const envelope = $('#envelope');
  const heroEls = $$('[data-hero]');
  if (hasGSAP && !reduced) {
    gsap.set(heroEls, { opacity: 0, y: 26 });
    gsap.set(titleChars, { opacity: 0, yPercent: 60, rotateX: -70, filter: 'blur(10px)' });
    gsap.set('.halo', { opacity: 0, scale: .82 });
    gsap.set('.hero__year', { opacity: 0, y: 80 });
    gsap.set('.scroll-cue', { opacity: 0 });
    gsap.set(intro.querySelectorAll('.intro__inner > *'), { opacity: 0, y: 18 });
    gsap.to(intro.querySelectorAll('.intro__inner > *'), { opacity: 1, y: 0, duration: 1.1, stagger: .12, ease: 'expo.out', delay: .25 });
  }

  function heroIn() {
    if (!hasGSAP || reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.halo', { opacity: .36, scale: 1, duration: 2.4 }, 0)
      .to('.hero__year', { opacity: 1, y: 0, duration: 2.2 }, .1)
      .to(heroEls.slice(0, 4), { opacity: 1, y: 0, duration: 1.3, stagger: .1 }, .15)
      .to(titleChars, { opacity: 1, yPercent: 0, rotateX: 0, filter: 'blur(0px)', duration: 1.5, stagger: .045 }, .45)
      .to(heroEls.slice(4), { opacity: 1, y: 0, duration: 1.3, stagger: .12 }, .9)
      .to('.scroll-cue', { opacity: 1, duration: 1 }, 1.6)
      .add(() => gsap.set(titleChars, { clearProps: 'filter' }));
  }

  function finishIntro() {
    intro.classList.add('is-gone');
    body.classList.remove('is-locked');
    html.classList.add('is-ready');
    STATE.opened = true;
    try { sessionStorage.setItem('invite-opened', '1'); } catch (e) { /* private mode */ }
    if (lenis) lenis.start();
    if (hasGSAP) ScrollTrigger.refresh();
    emit('invite:open');
  }

  function sparks(x, y) {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const size = 2 + Math.random() * 4;
      s.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;z-index:130;pointer-events:none;background:${Math.random() > .5 ? '#f6e7b8' : '#d4af37'};box-shadow:0 0 10px #e8c872`;
      document.body.appendChild(s);
      const a = (i / n) * Math.PI * 2 + Math.random() * .3;
      const d = 70 + Math.random() * 120;
      gsap.to(s, { x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: .2, duration: .9 + Math.random() * .5, ease: 'expo.out', onComplete: () => s.remove() });
    }
  }

  function openEnvelope() {
    envelope.disabled = true;
    emit('invite:opening');
    if (!hasGSAP || reduced) {
      intro.classList.add('is-open-css');
      setTimeout(() => { finishIntro(); }, reduced ? 300 : 1900);
      return;
    }
    const seal = $('.seal', envelope);
    const r = seal.getBoundingClientRect();
    envelope.style.animation = 'none';
    const tl = gsap.timeline({ onComplete: finishIntro });
    tl.to(seal, { scale: 1.2, duration: .16, ease: 'power2.out' })
      .add(() => sparks(r.left + r.width / 2, r.top + r.height / 2))
      .to(seal, { scale: 0, rotate: 60, opacity: 0, duration: .38, ease: 'back.in(2.2)' })
      .to('.envelope__flap', { rotateX: 180, duration: .85, ease: 'power3.inOut' }, '-=.12')
      .set('.envelope__flap', { zIndex: 1 }, '-=.42')
      .to('.envelope__letter', { yPercent: -62, duration: 1, ease: 'expo.out' }, '-=.2')
      .to('.intro__inner > p', { opacity: 0, y: -12, duration: .5, stagger: .05 }, '<')
      .to('.envelope__letter', { scale: 1.12, duration: .7, ease: 'power2.inOut' }, '-=.35')
      .to(intro, { opacity: 0, scale: 1.12, filter: 'blur(10px)', duration: 1, ease: 'power2.inOut' }, '-=.15')
      .add(heroIn, '-=.75');
  }

  let alreadyOpened = false;
  try { alreadyOpened = sessionStorage.getItem('invite-opened') === '1'; } catch (e) { /* ignore */ }
  if (alreadyOpened) {
    finishIntro();
    heroIn();
  } else {
    envelope.addEventListener('click', openEnvelope, { once: true });
    if (!reduced) setTimeout(() => envelope.focus({ preventScroll: true }), 600);
  }

  /* ------------------------------------------------------------------
     8. Scroll choreography (GSAP) — with IntersectionObserver fallback
     ------------------------------------------------------------------ */
  const sections = $$('[data-shape]');
  const dotLinks = $$('.dots a');

  function setSection(sec) {
    const shape = sec.dataset.shape;
    if (STATE.shape !== shape) { STATE.shape = shape; emit('invite:shape', { shape, id: sec.id }); }
    if (sec.id) dotLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + sec.id));
  }

  if (hasGSAP && !reduced) {
    /* split titles */
    $$('[data-split]').forEach((el) => {
      const words = splitWords(el);
      gsap.set(words, { yPercent: 115 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.3, stagger: .07, ease: 'expo.out' }),
      });
    });

    /* generic reveals */
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, stagger: .1, ease: 'expo.out', overwrite: true }),
    });

    /* letter: words light up while scrolling */
    $$('[data-words]').forEach((p) => {
      const words = splitSpans(p, 'wd');
      gsap.to(words, {
        opacity: 1, stagger: .06, ease: 'none',
        scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 52%', scrub: .6 },
      });
    });

    /* hero parallax out */
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none' }, 0)
      .to('.halo', { scale: 1.35, rotate: 40, ease: 'none' }, 0)
      .to('.hero__year', { yPercent: -30, ease: 'none' }, 0)
      .to('.scroll-cue', { opacity: 0, ease: 'none', duration: .2 }, 0);

    /* countdown ring breathes in */
    gsap.fromTo('.cd__ring', { rotate: -150, scale: .85 }, {
      rotate: -90, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.cd', start: 'top bottom', end: 'center center', scrub: true },
    });

    /* marquee band tilt */
    gsap.fromTo('.marquee', { rotate: -1 }, { rotate: -5, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* timeline fill */
    ScrollTrigger.create({
      trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true,
      onUpdate: (st) => $('.timeline').style.setProperty('--fill', st.progress.toFixed(3)),
    });

    /* thanks: script grows */
    gsap.fromTo('.thanks__script', { scale: .8, letterSpacing: '.08em' }, { scale: 1, letterSpacing: '0em', ease: 'none', scrollTrigger: { trigger: '.thanks', start: 'top bottom', end: 'top 30%', scrub: true } });

    /* active section → background shape + dots */
    sections.forEach((sec) => ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (st) => st.isActive && setSection(sec),
    }));
  } else {
    html.classList.add('no-motion');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) setSection(e.target);
      }), { rootMargin: '-45% 0px -45% 0px' });
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ------------------------------------------------------------------
     9. Countdown
     ------------------------------------------------------------------ */
  const cdEl = $('.cd');
  const cdNums = {};
  function buildNum(el, n) {
    el.innerHTML = '';
    const strips = [];
    for (let i = 0; i < n; i++) {
      const dg = document.createElement('span'); dg.className = 'dg';
      const st = document.createElement('span'); st.className = 'dg__strip';
      st.innerHTML = '0123456789'.split('').map((d) => `<span>${d}</span>`).join('');
      dg.appendChild(st); el.appendChild(dg); strips.push(st);
    }
    return strips;
  }
  function setNum(key, value) {
    const el = $(`[data-cd="${key}"]`);
    if (!el) return;
    const digits = Math.max(2, String(value).length);
    if (!cdNums[key] || cdNums[key].length !== digits) cdNums[key] = buildNum(el, digits);
    const s = String(value).padStart(digits, '0');
    cdNums[key].forEach((st, i) => { st.style.transform = `translateY(${-Number(s[i]) * 1.12}em)`; });
  }
  const ringBar = $('.cd__ring-bar');
  let celebrated = false;
  function tick() {
    const now = Date.now();
    let diff = Math.max(0, arrival.getTime() - now);
    if (diff <= 0) {
      if (!cdEl.classList.contains('is-done')) {
        cdEl.classList.add('is-done');
        const done = document.createElement('div');
        done.className = 'cd__done';
        const after = now > endTime.getTime();
        done.textContent = after ? 'Cảm ơn bạn đã đến!' : 'Hôm nay là ngày ấy!';
        cdEl.appendChild(done);
        const t = $('[data-cd-title]'); if (t) t.textContent = after ? 'Khoảnh khắc ấy đã đến' : 'Đã đến giờ hẹn rồi';
        const c = $('[data-cd-caption]'); if (c) c.innerHTML = after ? 'Cảm ơn bạn đã cùng mình đi đến <strong>khoảnh khắc đáng nhớ nhất</strong> ✦' : `Hẹn gặp bạn tại <strong>Hội trường A5</strong> — mình đang đợi ✦`;
        if (ringBar) ringBar.style.strokeDashoffset = 0;
        if (!after && STATE.opened && !celebrated) { celebrated = true; celebrate(); }
      }
      return;
    }
    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    setNum('d', d); setNum('h', h); setNum('m', m); setNum('s', sec);
    if (ringBar) ringBar.style.strokeDashoffset = String(1000 - (sec / 60) * 1000);
    setTimeout(tick, 1000 - (now % 1000) + 5);
  }
  if (cdEl) tick();

  /* ------------------------------------------------------------------
     10. Program tabs + timeline
     ------------------------------------------------------------------ */
  const tabsEl = $('.tabs');
  const listEl = $('.timeline__list');
  function renderSession(i, animate) {
    const s = PROGRAM[i];
    listEl.innerHTML = s.items.map((it) => { const meet = isMeetItem(i, it); return `
      <li class="tl${it.key ? ' tl--key' : ''}${it.brk ? ' tl--break' : ''}${meet ? ' tl--meet' : ''}">
        <span class="tl__time">${it.t}</span>
        <div>
          <p class="tl__title">${it.title}${meet ? ` <span class="badge">Hẹn gặp bạn · ${arrivalHM}</span>` : ''}</p>
          ${it.sub ? `<ul class="tl__items">${it.sub.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
          ${it.fac ? `<div class="tl__faculties"><span style="border:0;background:none;padding-left:0;color:var(--ink-dim)">Khoa:</span>${it.fac.map((f) => `<span>${f}</span>`).join('')}</div>` : ''}
        </div>
      </li>`; }).join('');
    $$('.tab', tabsEl).forEach((t, k) => { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
    if (animate && hasGSAP && !reduced) {
      gsap.fromTo($$('.tl', listEl), { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .7, stagger: .05, ease: 'expo.out' });
    }
    if (hasGSAP) ScrollTrigger.refresh();
  }
  if (tabsEl && listEl) {
    tabsEl.innerHTML = PROGRAM.map((s, i) => `
      <button class="tab" role="tab" type="button" aria-selected="false" data-tab="${i}">
        ${mySession === i + 1 ? '<span class="badge">Buổi lễ của mình</span>' : ''}
        <b>${s.label}</b><small>${s.range}</small>
      </button>`).join('');
    $$('.tab', tabsEl).forEach((t) => t.addEventListener('click', () => renderSession(+t.dataset.tab, true)));
    tabsEl.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = $$('.tab', tabsEl);
      const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      renderSession(next, true); tabs[next].focus();
    });
    renderSession(mySession ? mySession - 1 : 0, false);
  }

  /* ------------------------------------------------------------------
     11. Route directions (UI side; map3d.js listens to invite:route)
     ------------------------------------------------------------------ */
  const ROUTES = {
    main: {
      meta: '~230 m · 3 phút đi bộ',
      steps: [
        { b: 'Vào cổng chính — 268 Lý Thường Kiệt', s: 'Xe máy: gửi ở nhà xe ngay bên trái cổng (lối vào trên đường Lý Thường Kiệt). Grab/taxi: xuống ngay trước cổng.' },
        { b: 'Đi thẳng theo trục đường chính khoảng 180 m', s: 'Hồ nước rồi sân bóng ở bên tay phải; các toà B3, B4 ở bên tay trái.' },
        { b: 'Hội trường A5 ở bên tay trái', s: 'Ngay đối diện sân bóng, sát trục đường chính. Mình đợi bạn ở đây ✦' },
      ],
    },
    tht: {
      meta: '~140 m · 2 phút đi bộ',
      steps: [
        { b: 'Vào cổng phụ trên đường Tô Hiến Thành', s: 'Phía sau trường, gần trạm xe buýt “Đại học Bách Khoa (cổng sau)”.' },
        { b: 'Đi thẳng theo đường nội bộ khoảng 70 m', s: 'Các toà A1, A2 ở bên tay trái.' },
        { b: 'Rẽ trái vào trục đường chính', s: 'Hội trường A5 ở ngay bên tay phải, chỉ vài bước chân ✦' },
      ],
    },
  };
  const stepsEl = $('[data-route-steps]');
  const metaEl = $('[data-route-meta]');
  let currentRoute = 'main';
  function setRoute(key, fromUser) {
    const r = ROUTES[key]; if (!r) return;
    currentRoute = key;
    $$('[data-route]').forEach((b) => { const on = b.dataset.route === key; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
    if (metaEl) metaEl.textContent = r.meta;
    if (stepsEl) {
      stepsEl.innerHTML = r.steps.map((s) => `<li><b>${s.b}</b><span>${s.s}</span></li>`).join('');
      if (fromUser && hasGSAP && !reduced) gsap.fromTo(stepsEl.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, stagger: .08, ease: 'expo.out' });
    }
    const dirBtn = $('.steps [data-gmaps-dir]');
    if (dirBtn) { dirBtn.dataset.gmapsDir = key; dirBtn.href = gmapsDir(gateCoords[key]); }
    emit('invite:route', { route: key });
  }
  $$('[data-route]').forEach((b) => b.addEventListener('click', () => setRoute(b.dataset.route, true)));
  setRoute('main', false);
  window.INVITE_ROUTE = () => currentRoute;

  /* ------------------------------------------------------------------
     12. Virtual tour (in-place iframe)
     ------------------------------------------------------------------ */
  const tourStage = $('.tour__stage');
  const tourFrameWrap = $('.tour__frame');
  const tourFrame = $('[data-tour-frame]');
  const tourUrl = CFG.virtualTour || 'https://hcmut.edu.vn/virtual-tour/';
  $$('[data-tour-link]').forEach((a) => (a.href = tourUrl));
  const tourOpen = $('[data-tour-open]');
  tourOpen && tourOpen.addEventListener('click', () => {
    tourFrameWrap.hidden = false;
    tourStage.classList.add('is-playing');
    if (!tourFrame.src || tourFrame.src === 'about:blank') tourFrame.src = tourUrl;
    if (innerWidth < 1025) scrollToEl(tourStage);
    if (hasGSAP) gsap.fromTo(tourFrameWrap, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .8, ease: 'expo.out' });
  });
  const tourClose = $('[data-tour-close]');
  tourClose && tourClose.addEventListener('click', () => {
    tourFrame.src = 'about:blank';
    tourFrameWrap.hidden = true;
    tourStage.classList.remove('is-playing');
  });
  const tourFull = $('[data-tour-full]');
  tourFull && tourFull.addEventListener('click', () => {
    const el = tourFrameWrap;
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => window.open(tourUrl, '_blank'))).call(el);
  });

  /* ------------------------------------------------------------------
     13. Celebrate / RSVP
     ------------------------------------------------------------------ */
  const GOLDS = ['#fff4cc', '#f6e7b8', '#e8c872', '#d4af37', '#b8892d'];
  function celebrate() {
    const c = window.confetti;
    if (!c || reduced) return;
    const base = { colors: GOLDS, ticks: 280, gravity: .9, scalar: 1.05, disableForReducedMotion: true, zIndex: 140 };
    c({ ...base, particleCount: 140, spread: 110, startVelocity: 48, origin: { y: .62 } });
    let caps = null;
    try { caps = c.shapeFromText ? c.shapeFromText({ text: '🎓', scalar: 2.2 }) : null; } catch (e) { caps = null; }
    if (caps) c({ ...base, shapes: [caps], scalar: 2.2, particleCount: 18, spread: 120, startVelocity: 40, origin: { y: .6 }, flat: true });
    const end = Date.now() + 1100;
    (function side() {
      c({ ...base, particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: .75 } });
      c({ ...base, particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: .75 } });
      if (Date.now() < end) requestAnimationFrame(side);
    })();
  }
  const rsvp = $('[data-rsvp]');
  const markRsvp = () => { if (!rsvp) return; rsvp.querySelector('span').textContent = 'Đã hẹn rồi nhé!'; rsvp.querySelector('use').setAttribute('href', '#i-check'); };
  try { if (localStorage.getItem('invite-rsvp') === '1') markRsvp(); } catch (e) { /* ignore */ }
  const confirmed = (msg) => {
    celebrate();
    emit('invite:celebrate');
    markRsvp();
    try { localStorage.setItem('invite-rsvp', '1'); } catch (e) { /* ignore */ }
    toast(msg || `Tuyệt quá! Hẹn gặp bạn lúc ${arrivalHM} · 29.11 tại Hội trường A5 ✦`);
  };

  /* RSVP → email via FormSubmit (https://formsubmit.co), mailto as a fallback */
  const RSVP = CFG.rsvp || {};
  const rsvpTarget = (RSVP.endpoint || RSVP.email || '').trim();
  const rDlg = $('#rsvp');
  const rForm = $('[data-rsvp-form]');
  const rName = $('[data-r-name]');
  const rMsg = $('[data-r-msg]');
  const rStatus = $('[data-r-status]');
  const rSend = $('[data-r-send]');
  const rMail = $('[data-r-mail]');
  const nowVN = () => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const rsvpFields = () => ({
    name: (rName.value || '').trim(),
    guests: (rForm.querySelector('input[name="guests"]:checked') || {}).value || '1 người',
    message: (rMsg.value || '').trim(),
  });
  const setStatus = (text, isError) => { rStatus.textContent = text || ''; rStatus.classList.toggle('is-error', !!isError); };
  const mailtoLink = (f) => {
    if (!RSVP.email) return '';
    const subject = `🎓 ${f.name || 'Mình'} sẽ đến lễ tốt nghiệp 29/11`;
    const body = [`Tên: ${f.name}`, `Số người: ${f.guests}`, f.message ? `Lời nhắn: ${f.message}` : '', '', `(Gửi từ thiệp mời: ${location.href})`].filter((l, i) => l || i === 3).join('\n');
    return `mailto:${RSVP.email}?subject=${enc(subject)}&body=${enc(body)}`;
  };
  function openRsvp() {
    if (!rDlg || !rsvpTarget) { confirmed(); return; }
    if (!rName.value && guestParam) rName.value = guestParam;
    setStatus('');
    rMail.hidden = true;
    if (rDlg.showModal) rDlg.showModal(); else rDlg.setAttribute('open', '');
    if (lenis) lenis.stop();
    setTimeout(() => (rName.value ? rMsg : rName).focus(), 60);
  }
  rsvp && rsvp.addEventListener('click', openRsvp);
  $('[data-rsvp-close]') && $('[data-rsvp-close]').addEventListener('click', () => rDlg.close());
  rDlg && rDlg.addEventListener('click', (e) => { if (e.target === rDlg) rDlg.close(); });
  rDlg && rDlg.addEventListener('close', () => { if (lenis && STATE.opened) lenis.start(); });

  rForm && rForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = rsvpFields();
    if (!f.name) { setStatus('Bạn cho mình xin tên nhé ✦', true); rName.focus(); return; }
    if ($('[data-r-honey]').value) { rDlg.close(); confirmed(); return; } // bot
    rMail.href = mailtoLink(f);
    if (location.protocol === 'file:') {
      setStatus('Trang đang được mở từ file trên máy nên chưa gửi tự động được — hãy đưa web lên mạng, hoặc bấm “Gửi bằng ứng dụng email”.', true);
      rMail.hidden = !rMail.href;
      return;
    }
    rSend.classList.add('is-loading'); rSend.disabled = true;
    setStatus('Đang gửi…');
    try {
      const body = new URLSearchParams({
        'Tên': f.name,
        'Số người': f.guests,
        'Lời nhắn': f.message || '—',
        'Gửi lúc': nowVN(),
        'Link thiệp': location.href,
        _subject: `🎓 ${f.name} sẽ đến lễ tốt nghiệp (29/11 · ${arrivalHM})`,
        _template: 'table',
        _captcha: 'false',
        _url: location.href,
      });
      const res = await fetch(`https://formsubmit.co/ajax/${rsvpTarget}`, { method: 'POST', headers: { Accept: 'application/json' }, body });
      const json = await res.json().catch(() => ({}));
      const ok = json.success === true || json.success === 'true';
      const pendingActivation = /activat/i.test(json.message || ''); // submission is kept until the form is activated
      if (!res.ok || (!ok && !pendingActivation)) throw new Error(json.message || `HTTP ${res.status}`);
      setStatus('');
      rDlg.close();
      rForm.reset();
      confirmed(`Đã báo cho ${shortName} rồi! Hẹn gặp bạn lúc ${arrivalHM} · 29.11 tại Hội trường A5 ✦`);
    } catch (err) {
      console.warn('[rsvp]', err);
      setStatus('Chưa gửi được tự động. Bạn bấm “Gửi bằng ứng dụng email” bên cạnh nhé.', true);
      rMail.hidden = !rMail.href;
    } finally {
      rSend.classList.remove('is-loading'); rSend.disabled = false;
    }
  });

  /* ------------------------------------------------------------------
     14. Marquee driven by time + scroll velocity
     ------------------------------------------------------------------ */
  const rows = $$('.marquee__row').map((row) => ({ track: $('.marquee__track', row), dir: +row.dataset.dir || -1, x: 0, half: 0 }));
  let marqueeOn = false;
  if ('IntersectionObserver' in window && rows.length) {
    new IntersectionObserver(([e]) => { marqueeOn = e.isIntersecting; }, { rootMargin: '100px' }).observe($('.marquee'));
  }
  const measure = () => rows.forEach((r) => (r.half = r.track.scrollWidth / 2));
  measure();
  addEventListener('resize', measure);
  document.fonts && document.fonts.ready.then(measure);
  let mPrev = performance.now();
  (function marquee(now) {
    const dt = Math.min(64, now - mPrev) / 16.67; mPrev = now;
    if (marqueeOn && !reduced) {
      const boost = Math.min(Math.abs(STATE.velocity) * 0.9, 40);
      const skew = Math.max(-10, Math.min(10, STATE.velocity * 0.35));
      rows.forEach((r) => {
        r.x += (1.1 + boost) * r.dir * dt * (STATE.velocity < 0 ? -1 : 1);
        if (r.half) { r.x %= r.half; if (r.x > 0) r.x -= r.half; }
        r.track.style.transform = `translate3d(${r.x}px,0,0) skewX(${-skew}deg)`;
      });
    }
    requestAnimationFrame(marquee);
  })(mPrev);

  /* ------------------------------------------------------------------
     15. Pointer goodies: cursor glow, spotlight, tilt, magnetic
     ------------------------------------------------------------------ */
  if (finePointer && !reduced) {
    const glow = $('.cursor-glow');
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; STATE.pointer = [e.clientX / innerWidth, e.clientY / innerHeight]; }, { passive: true });
    (function follow() {
      gx += (tx - gx) * .12; gy += (ty - gy) * .12;
      glow.style.transform = `translate3d(${gx}px,${gy}px,0)`;
      requestAnimationFrame(follow);
    })();

    $$('[data-spot]').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));

    if (hasGSAP) {
      $$('[data-tilt]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
          gsap.to(el, { rotateY: px * 10, rotateX: -py * 10, duration: .6, ease: 'power3.out', transformPerspective: 900 });
        });
        el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: .9, ease: 'elastic.out(1,.5)' }));
      });
      $$('[data-magnetic]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .22, y: (e.clientY - r.top - r.height / 2) * .3, duration: .5, ease: 'power3.out' });
        });
        el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.45)' }));
      });
    }
  } else {
    addEventListener('pointermove', (e) => { STATE.pointer = [e.clientX / innerWidth, e.clientY / innerHeight]; }, { passive: true });
  }

  /* refresh trigger positions once fonts settle */
  if (hasGSAP && document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => hasGSAP && ScrollTrigger.refresh());
})();
