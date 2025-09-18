  window.addEventListener('load', () => {
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
    const spinMeImg = document.getElementById("bb-spin-me-img"); // Added
    const ctx = canvas.getContext("2d");
    let W, H, cx, cy;
    let baseRadius, minBar, amp, lineWidth;
    const colorBase = "#d8d8d8", colorProg = "#28a745", colorHover = "rgba(40,167,69,0.35)";
    const waveform = (window.BB_WAVEFORMS && window.BB_WAVEFORMS[baseName]) ? window.BB_WAVEFORMS[baseName] : Array.from({ length: 160 }, () => Math.random() * 0.85 + 0.05);
    const bars = waveform.length;
    let hoverProgress = null, isDragging = false, raf = null;
    let hasPlayedOnce = false; // Added
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
        if (spinMeImg) { gsap.to(spinMeImg, { opacity: 0, duration: 0.2 }); } // Added
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
      if (!hasPlayedOnce) { // Added
        gsap.to(timeEl, { opacity: 1, duration: 0.2 });
        hasPlayedOnce = true;
      }
      if (spinMeImg) { gsap.to(spinMeImg, { opacity: 0, duration: 0.5 }); } // Added
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
