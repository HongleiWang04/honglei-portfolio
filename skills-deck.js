(() => {
  const deck = document.querySelector('.skill-deck');
  if (!deck) return;
  const skills = [
    { title: 'SQL', src: 'assets/skill-sql.webp' },
    { title: '游泳', src: 'assets/skill-swimming.webp' },
    { title: 'Python编程', src: 'assets/skill-python.webp' },
    { title: '网球', src: 'assets/skill-tennis.webp' },
    { title: 'SPSS数据分析', src: 'assets/skill-spss.webp' }
  ];
  const card = deck.querySelector('#skill-card');
  const stage = deck.querySelector('.skill-stage');
  const turn = deck.querySelector('.skill-turn');
  const content = deck.querySelector('.skill-content');
  const cover = deck.querySelector('.skill-cover');
  const art = deck.querySelector('#skill-art');
  const status = deck.querySelector('#skill-status');
  const draw = deck.querySelector('#draw-skill');
  const drawLabel = deck.querySelector('#draw-skill-label');
  const controls = [card, draw];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const images = new Map();
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  let index = 0;
  let revealed = false;
  let phase = 'idle';
  let pointerStart;
  let swipeHandled = false;

  function readyImage(i) {
    const src = skills[i].src;
    if (images.has(src)) return images.get(src);
    const image = new Image();
    image.decoding = 'async';
    const promise = new Promise(resolve => {
      let finished = false;
      const finish = success => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        if (!success) images.delete(src);
        resolve(success);
      };
      const timeout = setTimeout(() => finish(false), 12000);
      image.onload = () => image.decode().then(() => finish(true), () => finish(false));
      image.onerror = () => finish(false);
      image.src = src;
    });
    images.set(src, promise);
    return promise;
  }

  function paint() {
    const busy = phase !== 'idle';
    deck.dataset.phase = phase;
    deck.dataset.state = revealed ? 'revealed' : 'covered';
    deck.setAttribute('aria-busy', String(busy));
    controls.forEach(control => control.setAttribute('aria-disabled', String(busy)));
    card.classList.toggle('flipped', revealed);
    card.setAttribute('aria-label', revealed
      ? `${skills[index].title}档案卡，点击切换到下一张`
      : '档案卡，点击向左滑动查看下一张');
    content.setAttribute('aria-hidden', String(!revealed));
    cover.setAttribute('aria-hidden', String(revealed));
    drawLabel.textContent = phase === 'drawing' ? '洗牌中…' : '随机抽一张';
  }

  async function displayImage(i) {
    if (!await readyImage(i)) return false;
    art.src = skills[i].src;
    try { await art.decode(); return true; } catch { return false; }
  }

  function select(i) {
    index = (i + skills.length) % skills.length;
    revealed = false;
    art.src = skills[index].src;
    art.alt = `${skills[index].title}介绍卡`;
    paint();
  }

  async function switchCard(direction) {
    if (phase !== 'idle') return;
    phase = 'switching';
    paint();
    const target = (index + direction + skills.length) % skills.length;
    const targetReady = readyImage(target);
    const distance = Math.min(110, stage.clientWidth * .45);
    let outgoing;
    let incoming;
    try {
      if (!reducedMotion.matches) {
        outgoing = card.animate([
          { transform: 'translateX(0)', opacity: 1 },
          { transform: `translateX(${-direction * distance}px)`, opacity: 0 }
        ], { duration: 210, easing: 'ease-in', fill: 'forwards' });
        await outgoing.finished;
      }
      card.classList.add('instant-turn');
      select(target);
      revealed = await targetReady && await displayImage(target);
      paint();
      await nextPaint();
      if (!reducedMotion.matches) {
        incoming = card.animate([
          { transform: `translateX(${direction * distance}px)`, opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 }
        ], { duration: 230, easing: 'ease-out', fill: 'forwards' });
        outgoing?.cancel();
        await incoming.finished;
      }
      status.textContent = revealed
        ? `${skills[index].title} · 点击查看下一张`
        : '这张卡片暂未加载，稍后切换回来再试';
    } finally {
      outgoing?.cancel();
      incoming?.cancel();
      card.classList.remove('instant-turn');
      phase = 'idle';
      paint();
    }
  }

  async function drawCard() {
    if (phase !== 'idle') return;
    const winner = (index + 1 + Math.floor(Math.random() * (skills.length - 1))) % skills.length;
    const winnerReady = readyImage(winner);
    phase = 'drawing';
    card.classList.add('instant-turn');
    revealed = false;
    paint();
    status.textContent = '洗牌中，马上揭晓…';
    let ticker;
    try {
      if (!reducedMotion.matches) {
        stage.classList.add('is-shuffling');
        ticker = setInterval(() => select(index + 1), 160);
      }
      await delay(2000);
      clearInterval(ticker);
      stage.classList.remove('is-shuffling');
      select(winner);
      if (!await winnerReady || !await displayImage(winner)) {
        status.textContent = '这张卡片暂未加载，稍后切换回来再试';
        return;
      }
      await nextPaint();
      card.classList.remove('instant-turn');
      void turn.offsetWidth;
      revealed = true;
      status.textContent = `抽到了「${skills[index].title}」· 点击查看下一张`;
    } finally {
      clearInterval(ticker);
      stage.classList.remove('is-shuffling');
      card.classList.remove('instant-turn');
      phase = 'idle';
      paint();
    }
  }

  card.addEventListener('click', () => {
    if (swipeHandled) { swipeHandled = false; return; }
    void switchCard(1);
  });
  draw.addEventListener('click', () => { void drawCard(); });
  card.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    void switchCard(event.key === 'ArrowRight' ? 1 : -1);
  });
  card.addEventListener('pointerdown', event => {
    if (phase !== 'idle') return;
    pointerStart = { x: event.clientX, y: event.clientY };
    swipeHandled = false;
    card.setPointerCapture(event.pointerId);
  });
  card.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      swipeHandled = true;
      void switchCard(dx < 0 ? 1 : -1);
      setTimeout(() => { swipeHandled = false; }, 0);
    }
  });
  card.addEventListener('pointercancel', () => { pointerStart = null; });

  const preload = () => skills.forEach((_, i) => { void readyImage(i); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      preload();
      observer.disconnect();
    }, { rootMargin: '700px' });
    observer.observe(deck);
  } else {
    preload();
  }
  select(0);
})();
