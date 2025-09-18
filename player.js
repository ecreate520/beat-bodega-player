// This is the complete and final script for your GitHub file.

function runPageSetupLogic() {
  let isMetaMoved = false;
  let isDescriptionGenerated = false;
  let isTierLinksGenerated = false;

  function runAllSetups() {
    const productMeta = document.querySelector('.product-meta');
    const customInfoContainer = document.getElementById('product-info-container');
    const descContainer = document.getElementById('product-description-container');
    const extrasContainer = document.getElementById('product-extras-container');
    
    if (!isMetaMoved && productMeta && customInfoContainer) {
      const productGallery = document.querySelector('.product-gallery');
      if (productGallery) productGallery.style.display = 'none';
      productMeta.style.display = 'block';
      const productTitle = productMeta.querySelector('.product-title');
      if (productTitle) { productTitle.innerText = productTitle.innerText.split('-')[0].trim(); }
      customInfoContainer.appendChild(productMeta);
      isMetaMoved = true;
    }
    
    if (!isDescriptionGenerated && descContainer) {
      const descriptions = {
        basic: { title: 'The Basic Package includes:', points: [ 'An untagged, lossless WAV file.', 'An untagged MP3 file.', { title: 'A contract allowing for:', subPoints: [ 'Up to 10,000 audio streams.', 'Up to 7,500 distributions.', 'Broadcasting rights.' ] } ] },
        pro: { title: 'The Pro Package includes:', points: [ 'An untagged, lossless WAV file.', 'An untagged MP3 file.', 'WAV Trackouts (separate files for each individual instrument).', { title: 'A contract allowing for:', subPoints: [ 'Up to 50,000 audio streams.', 'Up to 15,000 physical distributions.', 'Broadcasting rights.' ] } ] },
        ultimate: { title: 'The Ultimate Package includes:', points: [ 'An untagged, lossless WAV file.', 'An untagged MP3 file.', 'WAV Trackouts (separate files for each individual instrument).', { title: 'A contract allowing for:', subPoints: [ 'Unlimited audio streams.', 'Unlimited physical distributions.', 'Broadcasting rights.' ] } ] }
      };
      const path = window.location.pathname.toLowerCase();
      let tier = null;
      if (path.endsWith('-basic')) tier = 'basic'; else if (path.endsWith('-pro')) tier = 'pro'; else if (path.endsWith('-ultimate')) tier = 'ultimate';
      if (tier) {
        const data = descriptions[tier];
        let html = `<h3 class="animated-underline">${data.title}</h3><ul>`;
        data.points.forEach(point => {
          if (typeof point === 'string') { html += `<li>${point}</li>`; }
          else { html += `<li>${point.title}<ul>`; point.subPoints.forEach(sub => { html += `<li>${sub}</li>`; }); html += '</ul></li>'; }
        });
        html += '</ul>';
        descContainer.innerHTML = html;
        isDescriptionGenerated = true;
      }
    }

    if (!isTierLinksGenerated && extrasContainer) {
      const tiers = [ { id: 'basic', name: 'Basic Package', slug: '-basic', price: '$30' }, { id: 'pro', name: 'Pro Package', slug: '-pro', price: '$50' }, { id: 'ultimate', name: 'Ultimate Package', slug: '-ultimate', price: '$130' } ];
      const path = window.location.pathname.toLowerCase();
      const currentTier = tiers.find(tier => path.endsWith(tier.slug));
      if (currentTier) {
        const baseProductUrl = path.substring(0, path.length - currentTier.slug.length);
        const otherTiers = tiers.filter(tier => tier.id !== currentTier.id);
        let html = '<h3>Other Packages:</h3>';
        otherTiers.forEach(tier => { html += `<a href="${baseProductUrl}${tier.slug}" class="tier-link"><span class="tier-name">${tier.name}</span><span class="tier-price">${tier.price}</span></a>`; });
        extrasContainer.innerHTML = html;
        isTierLinksGenerated = true;
      }
    }
    return isMetaMoved && isDescriptionGenerated && isTierLinksGenerated;
  }

  const observer = new MutationObserver((mutations, obs) => {
    if (runAllSetups()) {
      obs.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  runAllSetups();
}


window.addEventListener('load', () => {
  // First, run the page setup logic to build the layout.
  runPageSetupLogic();

  // Then, initialize the interactive player.
  const slug = window.location.pathname.split("/").filter(Boolean).pop()?.toLowerCase() || "";
  const baseName = slug.replace(/-(basic|pro|ultimate)$/, "");
  const audioUrl = `https://www.beatbodeganyc.com/s/${baseName}.mp3`;
  const dragAudioUrl = "https://www.beatbodeganyc.com/s/record-drag.mp3";
  const forwardScrubUrl = "https://www.beatbodeganyc.com/s/song-spin.mp3";
  const backwardScrubUrl = "https://www.beatbodeganyc.com/s/song-spin-reverse.mp3";
  const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const audioEl = document.getElementById("bb-audio");
  const dragAudioEl = document.getElementById("bb-drag-audio");
  const forwardAudioEl = document.getElementById("bb-forward-audio");
  const backwardAudioEl = document.getElementById("bb-backward-audio");
  const recordImg = document.getElementById("bb-record-img");
  const playBtn = document.getElementById("bb-play");
  const dragHandle = document.getElementById("bb-drag-handle");
  const timeEl = document.getElementById("bb-time");
  const iconPlay = document.getElementById("bb-icon-play");
  const iconPause = document.getElementById("bb-icon-pause");
  const canvas = document.getElementById("bb-wave-canvas");
  const spinMeImg = document.getElementById("bb-spin-me-img");
  const ctx = canvas.getContext("2d");
  let W, H, cx, cy;
  let baseRadius, minBar, amp, lineWidth;
  const colorBase = "#d8d8d8", colorProg = "#28a745", colorHover = "rgba(40,167,69,0.35)";
  const waveform = (window.BB_WAVEFORMS && window.BB_WAVEFORMS[baseName]) ? window.BB_WAVEFORMS[baseName] : Array.from({ length: 160 }, () => Math.random() * 0.85 + 0.05);
  const bars = waveform.length;
  let hoverProgress = null, isDragging = false, raf = null;
  let hasPlayedOnce = false;
  let lastRotation = 0, currentScrubDirection = null, isOnCooldown = false;
  audioEl.src = audioUrl;
  dragAudioEl.src = dragAudioUrl;
  forwardAudioEl.src = forwardScrubUrl;
  backwardAudioEl.src = backwardScrubUrl;
  dragAudioEl.volume = 0.5;
  forwardAudioEl.volume = 0.8;
  backwardAudioEl.volume = 0.8;
  function angleToProgress(x, y) { let angle = Math.atan2(y, x) + Math.PI / 2; let p = angle / (Math.PI * 2); if (p < 0) p += 1; return p; }
  function resizePlayer() { const size = canvas.getBoundingClientRect().width; if (size === 0) return; canvas.width = size; canvas.height = size; W = canvas.width; H = canvas.height; cx = W / 2; cy = H / 2; baseRadius = size * 0.137; minBar = size * 0.035; amp = size * 0.095; lineWidth = size * 0.0088; drawAll(); }
  gsap.registerPlugin(Draggable);
  const draggableInstance = Draggable.create(dragHandle, {
    type: "rotation", inertia: false,
    onPress: function(e) {
      if (spinMeImg) { gsap.to(spinMeImg, { opacity: 0, duration: 0.5 }); }
      if (isMobile && isOnCooldown) return;
      const buttonRect = playBtn.getBoundingClientRect();
      if (e.clientX >= buttonRect.left && e.clientX <= buttonRect.right && e.clientY >= buttonRect.top && e.clientY <= buttonRect.bottom) {
        this.endDrag(e); if (audioEl.paused) { audioEl.play(); } else { audioEl.pause(); } return;
      }
      isDragging = true; audioEl.pause();
      if (isMobile) {
        if (backwardAudioEl.paused) { backwardAudioEl.play(); backwardAudioEl.pause(); }
        backwardAudioEl.currentTime = 0; backwardAudioEl.play();
      } else {
        if (forwardAudioEl.paused) { forwardAudioEl.play(); forwardAudioEl.pause(); }
        if (backwardAudioEl.paused) { backwardAudioEl.play(); backwardAudioEl.pause(); }
        dragAudioEl.currentTime = 0; dragAudioEl.play();
      }
      cancelAnimationFrame(raf); dragHandle.style.cursor = "grabbing"; lastRotation = this.rotation;
    },
    onDrag: function() {
      if (!isDragging) return;
      gsap.set(recordImg, { rotation: this.rotation });
      const progress = (this.rotation % 360) / 360;
      hoverProgress = progress < 0 ? progress + 1 : progress;
      if (!isMobile) {
        const delta = this.rotation - lastRotation;
        if (delta > 0.1 && currentScrubDirection !== 'forward') {
          currentScrubDirection = 'forward'; backwardAudioEl.pause(); forwardAudioEl.play();
        } else if (delta < -0.1 && currentScrubDirection !== 'backward') {
          currentScrubDirection = 'backward'; forwardAudioEl.pause(); backwardAudioEl.play();
        }
      }
      lastRotation = this.rotation; drawAll();
    },
    onRelease: function() {
      if (!isDragging) return; isDragging = false; dragHandle.style.cursor = "grab";
      if (isMobile) {
        isOnCooldown = true; setTimeout(() => { isOnCooldown = false; }, 500);
        backwardAudioEl.pause();
      } else {
        dragAudioEl.pause(); forwardAudioEl.pause(); backwardAudioEl.pause(); currentScrubDirection = null;
      }
      let finalProgress = (this.rotation % 360) / 360; if (finalProgress < 0) finalProgress += 1;
      if (isFinite(audioEl.duration)) { audioEl.currentTime = finalProgress * audioEl.duration; }
      audioEl.play();
    },
    onClick: function(e) { if (!isFinite(audioEl.duration)) return; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left - cx; const y = e.clientY - rect.top - cy; const distanceFromCenter = Math.sqrt(x * x + y * y); const waveformOuterRadius = baseRadius + amp + minBar; const clickPadding = 15; if (distanceFromCenter >= (baseRadius - clickPadding) && distanceFromCenter <= (waveformOuterRadius + clickPadding)) { const progress = angleToProgress(x, y); const newTime = progress * audioEl.duration; const newRotation = progress * 360; audioEl.currentTime = newTime; gsap.set(draggableInstance, { rotation: newRotation }); gsap.set(recordImg, { rotation: newRotation }); drawAll(); } }
  })[0];
  function drawAll() {
    if (!ctx || !W) return;
    ctx.clearRect(0, 0, W, H); ctx.save(); ctx.translate(cx, cy);
    const audioProgress = audioEl.duration ? audioEl.currentTime / audioEl.duration : 0;
    const currentAudioCutoff = Math.floor(audioProgress * bars);
    const hoverCutoff = isDragging && hoverProgress !== null ? Math.floor(hoverProgress * bars) : -1;
    const hoverStart = Math.min(currentAudioCutoff, hoverCutoff);
    const hoverEnd = Math.max(currentAudioCutoff, hoverCutoff);
    for (let i = 0; i < bars; i++) {
      let strokeColor;
      if (isDragging && i >= hoverStart && i < hoverEnd) { strokeColor = colorHover; } else if (i < currentAudioCutoff) { strokeColor = colorProg; } else { strokeColor = colorBase; }
      const angle = i / bars * Math.PI * 2 - Math.PI / 2;
      const len = minBar + waveform[i] * amp;
      const x1 = Math.cos(angle) * baseRadius; const y1 = Math.sin(angle) * baseRadius;
      const x2 = Math.cos(angle) * (baseRadius + len); const y2 = Math.sin(angle) * (baseRadius + len);
      ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore();
    timeEl.textContent = formatTime(audioEl.currentTime) + " / " + formatTime(audioEl.duration);
  }
  function tick() { if (!isDragging && !audioEl.paused && audioEl.duration) { const progress = audioEl.currentTime / audioEl.duration; const rotation = progress * 360; gsap.set(draggableInstance, { rotation: rotation }); gsap.set(recordImg, { rotation: rotation }); } drawAll(); if (!audioEl.paused && !audioEl.ended) raf = requestAnimationFrame(tick); }
  audioEl.addEventListener('play', () => {
    if (!hasPlayedOnce) {
      gsap.to(timeEl, { opacity: 1, duration: 0.5 });
      hasPlayedOnce = true;
    }
    if (spinMeImg) { gsap.to(spinMeImg, { opacity: 0, duration: 0.5 }); }
    iconPlay.style.display = "none";
    iconPause.style.display = "block";
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  });
  audioEl.addEventListener('pause', () => {
    iconPause.style.display = "none";
    iconPlay.style.display = "block";
    cancelAnimationFrame(raf);
    drawAll();
  });
  audioEl.addEventListener("timeupdate", drawAll);
  audioEl.addEventListener("loadedmetadata", drawAll);
  audioEl.addEventListener("ended", () => { audioEl.currentTime = 0; });
  function formatTime(t) { if (!isFinite(t)) return "0:00"; const m = Math.floor(t / 60); const s = Math.floor(t % 60); return `${m}:${s<10?"0"+s:s}`; }
  resizePlayer();
  window.addEventListener('resize', resizePlayer);
});
