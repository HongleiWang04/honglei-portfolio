(() => {
  const video = document.querySelector('#product-video');
  const player = video?.closest('.film-player');
  const controls = player?.querySelector('.film-controls');
  if (!video || !controls) return;
  const seek = controls.querySelector('.film-seek');
  const toggle = controls.querySelector('.film-toggle');
  const time = controls.querySelector('.film-time');
  const mute = controls.querySelector('.film-mute');
  const fullscreen = controls.querySelector('.film-fullscreen');
  const status = player.querySelector('.film-load-status');
  const source = video.querySelector('source')?.src;
  if (!source || !window.fetch || !window.URL?.createObjectURL) return;

  let ready = false;
  let loading = false;
  let scrubbing = false;
  let resumeAfterSeek = false;
  let objectURL;
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4.8a1 1 0 0 1 1.5-.86l10.3 7.2a1 1 0 0 1 0 1.72L9.5 20.06A1 1 0 0 1 8 19.2Z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  const format = value => {
    const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const duration = () => Number.isFinite(video.duration) ? video.duration : 60;
  function update() {
    const d = duration();
    const current = Math.min(d, Math.max(0, video.currentTime || 0));
    seek.max = d;
    seek.value = current;
    seek.style.setProperty('--played', `${d ? current / d * 100 : 0}%`);
    seek.setAttribute('aria-valuetext', `${format(current)}，总时长${format(d)}`);
    time.textContent = `${format(current)} / ${format(d)}`;
    toggle.innerHTML = !ready ? (loading ? '加载中' : '重试') : video.paused ? playIcon : pauseIcon;
    toggle.setAttribute('aria-label', !ready ? '重新加载视频' : video.paused ? '播放视频' : '暂停视频');
    toggle.title = !ready ? (loading ? '正在加载视频' : '重试') : video.paused ? '播放' : '暂停';
    toggle.disabled = loading;
    seek.disabled = !ready;
    mute.textContent = video.muted ? '开声音' : '静音';
    mute.setAttribute('aria-label', video.muted ? '取消静音' : '静音');
    mute.setAttribute('aria-pressed', String(video.muted));
  }
  async function play() {
    if (!ready) return;
    if (video.ended || video.currentTime >= duration() - .05) video.currentTime = 0;
    try { await video.play(); status.hidden = true; }
    catch { status.hidden = false; status.textContent = '点击播放，继续观看。'; }
    update();
  }
  async function load() {
    if (loading) return;
    loading = true;
    status.hidden = false;
    status.textContent = '正在加载视频…';
    update();
    try {
      // A complete same-origin file gives the browser a seekable source even
      // when the host does not honor HTTP byte-range requests consistently.
      const response = await fetch(source, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Video request failed');
      const blob = await response.blob();
      if (!blob.size || /text\/html/i.test(blob.type)) throw new Error('Invalid video');
      objectURL = URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }));
      await new Promise((resolve, reject) => {
        const cleanup = () => { video.removeEventListener('loadeddata', onReady); video.removeEventListener('error', onError); };
        const onReady = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Video decode failed')); };
        video.addEventListener('loadeddata', onReady, { once: true });
        video.addEventListener('error', onError, { once: true });
        video.preload = 'auto';
        video.src = objectURL;
        video.load();
      });
      ready = true;
      status.hidden = true;
    } catch {
      if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = undefined; }
      status.textContent = '视频加载失败，请点击“重试”。';
      status.hidden = false;
    } finally {
      loading = false;
      update();
    }
  }
  video.controls = false;
  controls.hidden = false;
  toggle.addEventListener('click', () => {
    if (!ready) load();
    else if (video.paused) play();
    else video.pause();
  });
  seek.addEventListener('pointerdown', event => {
    if (!ready) return;
    scrubbing = true;
    resumeAfterSeek = !video.paused;
    video.pause();
    seek.setPointerCapture?.(event.pointerId);
  });
  seek.addEventListener('input', () => {
    if (!ready) return;
    video.currentTime = Math.min(duration(), Math.max(0, Number(seek.value)));
    update();
  });
  const finishSeek = () => {
    if (!scrubbing) return;
    scrubbing = false;
    if (resumeAfterSeek) play();
    resumeAfterSeek = false;
  };
  seek.addEventListener('pointerup', finishSeek);
  seek.addEventListener('pointercancel', finishSeek);
  seek.addEventListener('lostpointercapture', finishSeek);
  mute.addEventListener('click', () => { video.muted = !video.muted; });
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (player.requestFullscreen) await player.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } catch { /* The regular player remains available. */ }
  });
  ['timeupdate', 'durationchange', 'loadedmetadata', 'play', 'pause', 'ended', 'volumechange', 'seeked'].forEach(event => video.addEventListener(event, update));
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
  });
  update();
  load();
})();
