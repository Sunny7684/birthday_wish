const canvas = document.querySelector("#partyCanvas");
const ctx = canvas.getContext("2d");
const pages = [...document.querySelectorAll(".page")];
const musicSource = document.querySelector("#musicSource");
const fireworkAudio = document.querySelector("#fireworkAudio");
const countBeepAudio = document.querySelector("#countBeepAudio");
const soundToggle = document.querySelector("#soundToggle");
const countdownPage = document.querySelector(".page-countdown");
const countdownStart = document.querySelector("#countdownStart");
const countdownNumber = document.querySelector("#countdownNumber");
const yesButton = document.querySelector("#yesButton");
const noButton = document.querySelector("#noButton");
const balloonBoard = document.querySelector("#balloonBoard");
const balloonProgress = document.querySelector("#balloonProgress");
const micButton = document.querySelector("#micButton");
const flame = document.querySelector("#flame");
const blowMeter = document.querySelector("#blowMeter");
const candleStatus = document.querySelector("#candleStatus");
const envelope = document.querySelector("#envelope");
const letterTitle = document.querySelector("#letterTitle");
const typeTargets = [...document.querySelectorAll("[data-type-text]")];

const colors = ["#ff4f86", "#ffd166", "#91f1d4", "#73c7ff", "#cfa7ff", "#ffffff"];
const balloonWishes = [
  "Always keep smiling",
  "Stay happy and blessed",
  "Dreams come true",
  "Lots of love for you",
  "Health, joy, success",
  "Best year ahead"
];

let width = 0;
let height = 0;
let particles = [];
let currentPage = 0;
let musicStarted = false;
let poppedCount = 0;
let audioContext;
let sfxContext;
let micStream;
let analyser;
let candleDone = false;
let letterStarted = false;
let countdownStarted = false;
let finalFireworksTimer;
let countdownTimers = [];
let countdownAudioBlocked = false;
let countdownRetryReady = false;

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function showPage(index) {
  currentPage = index;
  pages.forEach((page, pageIndex) => {
    page.classList.toggle("is-active", pageIndex === index);
  });
  cinematicBurst(index);

  if (index === 6) {
    window.setTimeout(typeLetter, 550);
  }

  if (index !== 9) {
    stopFinalFireworks();
  }
}

async function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  document.body.classList.add("is-cinematic");
  soundToggle.classList.add("is-visible");
  musicSource.volume = 1;
  musicSource.muted = false;
  try {
    await musicSource.play();
  } catch {
    soundToggle.textContent = "Play";
  }
}

async function startCountdown({ replay = false } = {}) {
  if (countdownStarted && !replay) return;
  clearCountdownTimers();
  countdownStarted = true;
  countdownAudioBlocked = false;
  document.body.classList.add("is-cinematic");
  countdownNumber.textContent = "4";
  await unlockAudio();

  const steps = ["4", "3", "2", "1"];
  steps.forEach((step, index) => {
    const timer = window.setTimeout(() => {
      countdownNumber.textContent = step;
      countdownNumber.classList.remove("is-ticking");
      void countdownNumber.offsetWidth;
      countdownNumber.classList.add("is-ticking");
      void playTickSound();
      burst(width * 0.5, height * 0.42, 34);
    }, index * 1000);
    countdownTimers.push(timer);
  });

  const finishTimer = window.setTimeout(() => {
    countdownNumber.textContent = "";
    playCountdownFireworksThenNext();
  }, steps.length * 1000);
  countdownTimers.push(finishTimer);
}

function clearCountdownTimers() {
  countdownTimers.forEach((timer) => window.clearTimeout(timer));
  countdownTimers = [];
}

async function unlockAudio() {
  const unlocks = [];

  if (countBeepAudio) {
    countBeepAudio.volume = 0.01;
    unlocks.push(countBeepAudio.play().then(() => {
      countBeepAudio.pause();
      countBeepAudio.currentTime = 0;
      countBeepAudio.volume = 1;
    }).catch(() => {
      countdownAudioBlocked = true;
      setupCountdownSoundRetry();
    }));
  }

  if (fireworkAudio) {
    fireworkAudio.volume = 0.01;
    unlocks.push(fireworkAudio.play().then(() => {
      fireworkAudio.pause();
      fireworkAudio.currentTime = 0;
      fireworkAudio.volume = 1;
    }).catch(() => {}));
  }

  if (sfxContext && sfxContext.state === "suspended") {
    unlocks.push(sfxContext.resume().catch(() => {}));
  }

  await Promise.all(unlocks);
}

function setupCountdownSoundRetry() {
  if (countdownRetryReady) return;
  countdownRetryReady = true;

  const replayWithSound = () => {
    countdownRetryReady = false;
    if (currentPage !== 0) return;
    countdownStarted = false;
    countdownNumber.textContent = "4";
    void startCountdown({ replay: true });
  };

  window.addEventListener("pointerdown", replayWithSound, { once: true });
  window.addEventListener("keydown", replayWithSound, { once: true });
}

function moveNoButton() {
  const buttonWidth = noButton.offsetWidth || 112;
  const buttonHeight = noButton.offsetHeight || 48;
  const safeZones = [
    { left: 18, top: height * 0.62, right: width - buttonWidth - 18, bottom: height - buttonHeight - 22 },
    { left: 18, top: height * 0.18, right: Math.max(18, width * 0.24), bottom: height * 0.56 },
    { left: Math.min(width - buttonWidth - 18, width * 0.76), top: height * 0.18, right: width - buttonWidth - 18, bottom: height * 0.56 }
  ].filter((zone) => zone.right > zone.left && zone.bottom > zone.top);
  const zone = safeZones[Math.floor(Math.random() * safeZones.length)] || {
    left: 18,
    top: height * 0.66,
    right: width - buttonWidth - 18,
    bottom: height - buttonHeight - 22
  };

  noButton.style.left = `${zone.left + Math.random() * (zone.right - zone.left)}px`;
  noButton.style.top = `${zone.top + Math.random() * (zone.bottom - zone.top)}px`;
}

function makeBalloons() {
  balloonBoard.innerHTML = "";
  balloonWishes.forEach((wish, index) => {
    const balloon = document.createElement("button");
    balloon.type = "button";
    balloon.className = "wish-balloon";
    balloon.style.setProperty("--balloon-color", colors[index % colors.length]);
    balloon.innerHTML = `<span>${wish}</span>`;
    balloon.addEventListener("click", () => popBalloon(balloon));
    balloonBoard.appendChild(balloon);
  });
}

function popBalloon(balloon) {
  if (balloon.classList.contains("is-popped")) return;
  balloon.classList.add("is-popped");
  poppedCount += 1;
  balloonProgress.textContent = `${poppedCount} / ${balloonWishes.length} wishes opened`;
  burst(balloon.getBoundingClientRect().left + balloon.offsetWidth / 2, balloon.getBoundingClientRect().top + 52, 42);
  playPopSound();

  if (poppedCount === balloonWishes.length) {
    balloonProgress.textContent = "All wishes opened!";
    window.setTimeout(() => showPage(3), 900);
  }
}

async function startMic() {
  if (candleDone) return;
  candleStatus.textContent = "Listening... blow into the mic.";
  micButton.textContent = "Listening";

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    listenForBlow();
  } catch {
    candleStatus.textContent = "Mic permission was blocked. Tap here after blowing.";
    micButton.textContent = "I Blew";
    micButton.removeEventListener("click", startMic);
    micButton.addEventListener("click", passCandle);
  }
}

function listenForBlow() {
  const data = new Uint8Array(analyser.fftSize);
  let strongFrames = 0;

  function sample() {
    if (candleDone) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    data.forEach((value) => {
      const centered = value - 128;
      sum += centered * centered;
    });
    const volume = Math.sqrt(sum / data.length);
    const percent = Math.min(100, Math.round(volume * 7));
    blowMeter.style.width = `${percent}%`;

    if (volume > 12) {
      strongFrames += 1;
      candleStatus.textContent = "Good blow... keep going!";
    } else {
      strongFrames = Math.max(0, strongFrames - 1);
    }

    if (strongFrames > 8) {
      passCandle();
      return;
    }

    requestAnimationFrame(sample);
  }

  sample();
}

function passCandle() {
  candleDone = true;
  flame.classList.add("is-out");
  blowMeter.style.width = "100%";
  candleStatus.textContent = "Close your eyes & make a wish.";
  micButton.style.display = "none";
  if (micStream) micStream.getTracks().forEach((track) => track.stop());
  playFireworkSound();
  fireworkShow(7);
  window.setTimeout(() => showPage(4), 2800);
}

function openEnvelope() {
  envelope.classList.add("is-open");
  playEnvelopeSound();
  burst(width * 0.5, height * 0.4, 100);
  window.setTimeout(() => showPage(6), 950);
}

function resetExperience() {
  poppedCount = 0;
  candleDone = false;
  stopFinalFireworks();
  flame.classList.remove("is-out");
  blowMeter.style.width = "0%";
  candleStatus.textContent = "Tap start, then blow softly near the mic.";
  micButton.style.display = "";
  micButton.textContent = "Start Mic";
  envelope.classList.remove("is-open");
  countdownStarted = false;
  countdownNumber.textContent = "4";
  letterStarted = false;
  letterTitle.textContent = "";
  typeTargets.forEach((target) => {
    target.dataset.fullText = target.dataset.fullText || target.dataset.text || target.textContent.trim();
    target.textContent = "";
    target.classList.remove("is-typing");
  });
  balloonProgress.textContent = `0 / ${balloonWishes.length} wishes opened`;
  makeBalloons();
  showPage(0);
}

function cinematicBurst(index) {
  const amount = index === 9 ? 170 : 74;
  burst(width * 0.5, height * 0.22, amount);
  if (index === 9) fireworkShow(5);
}

function burst(x, y, amount = 70) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.8 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 70 + Math.random() * 36,
      size: 2 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      spin: Math.random() * 0.28 - 0.14
    });
  }
}

function fireworkShow(count = 5, soundGain = 0.45, withGeneratedSound = true) {
  for (let i = 0; i < count; i += 1) {
    window.setTimeout(() => {
      burst(80 + Math.random() * (width - 160), 70 + Math.random() * height * 0.45, 95);
      if (withGeneratedSound) playFireworkSound(soundGain, false);
    }, i * 230);
  }
}

function getSfxContext() {
  if (!sfxContext) {
    sfxContext = new AudioContext();
  }
  if (sfxContext.state === "suspended") {
    void sfxContext.resume();
  }
  return sfxContext;
}

function playTone({ frequency = 440, duration = 0.2, type = "sine", gain = 0.08, slideTo = frequency }) {
  const context = getSfxContext();
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const now = context.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playPopSound() {
  playTone({ frequency: 680, slideTo: 210, duration: 0.12, type: "triangle", gain: 0.05 });
}

async function playTickSound() {
  if (countBeepAudio) {
    countBeepAudio.pause();
    countBeepAudio.volume = 1;
    countBeepAudio.currentTime = 0;
    await countBeepAudio.play().catch(() => {
      countdownAudioBlocked = true;
      setupCountdownSoundRetry();
    });
  }

  playTone({ frequency: 1040, slideTo: 1040, duration: 0.16, type: "square", gain: 0.24 });
  window.setTimeout(() => playTone({ frequency: 740, slideTo: 740, duration: 0.12, type: "square", gain: 0.16 }), 120);
}

function playEnvelopeSound() {
  playTone({ frequency: 320, slideTo: 620, duration: 0.18, type: "sine", gain: 0.04 });
  window.setTimeout(() => playTone({ frequency: 520, slideTo: 390, duration: 0.12, type: "triangle", gain: 0.035 }), 110);
}

function playFireworkSound(gain = 0.08, useOriginal = true) {
  if (useOriginal) playOriginalFirework(Math.min(1, gain * 2.1));
  playTone({ frequency: 110, slideTo: 55, duration: 0.32, type: "sawtooth", gain });
  window.setTimeout(() => playTone({ frequency: 880, slideTo: 140, duration: 0.24, type: "square", gain: gain * 0.48 }), 90);
}

function playOriginalFirework(volume = 1) {
  if (!fireworkAudio) return;
  fireworkAudio.pause();
  fireworkAudio.onended = null;
  fireworkAudio.loop = false;
  fireworkAudio.volume = volume;
  fireworkAudio.currentTime = 0;
  fireworkAudio.play().catch(() => {});
}

function playCountdownFireworksThenNext() {
  let movedNext = false;
  const moveNext = async () => {
    if (movedNext) return;
    movedNext = true;
    showPage(1);
    await startMusic();
  };

  fireworkShow(14, 0.72, false);

  if (!fireworkAudio) {
    window.setTimeout(moveNext, 2800);
    return;
  }

  fireworkAudio.pause();
  fireworkAudio.loop = false;
  fireworkAudio.volume = 1;
  fireworkAudio.currentTime = 0;
  fireworkAudio.onended = moveNext;
  fireworkAudio.play().catch(() => {
    playFireworkSound(0.3, false);
    window.setTimeout(moveNext, 2800);
  });
  window.setTimeout(moveNext, 5200);
}

function endMusicWithFireworks() {
  musicSource.pause();
  musicStarted = false;
  soundToggle.classList.remove("is-visible");
  startFinalFireworks();
}

function startFinalFireworks() {
  if (fireworkAudio) {
    fireworkAudio.onended = null;
    fireworkAudio.pause();
    fireworkAudio.loop = true;
    fireworkAudio.volume = 1;
    fireworkAudio.currentTime = 0;
    fireworkAudio.play().catch(() => {});
  }

  fireworkShow(8, 0.7);
  window.clearInterval(finalFireworksTimer);
  finalFireworksTimer = window.setInterval(() => fireworkShow(4, 0.45), 2600);
}

function stopFinalFireworks() {
  window.clearInterval(finalFireworksTimer);
  finalFireworksTimer = undefined;
  if (fireworkAudio && fireworkAudio.loop) {
    fireworkAudio.onended = null;
    fireworkAudio.loop = false;
    fireworkAudio.pause();
    fireworkAudio.currentTime = 0;
  }
}

async function typeLetter() {
  if (letterStarted) return;
  letterStarted = true;
  letterTitle.textContent = "";

  for (const target of typeTargets) {
    target.dataset.fullText = target.dataset.fullText || target.dataset.text || target.textContent.trim();
    target.textContent = "";
  }

  await typeInto(letterTitle, letterTitle.dataset.text, 48);
  for (const target of typeTargets) {
    await typeInto(target, target.dataset.fullText, 24);
  }
}

function typeInto(element, text, speed) {
  return new Promise((resolve) => {
    let index = 0;
    element.classList.add("is-typing");

    function tick() {
      index += 1;
      element.textContent = text.slice(0, index);

      if (index < text.length) {
        window.setTimeout(tick, speed);
      } else {
        element.classList.remove("is-typing");
        window.setTimeout(resolve, 180);
      }
    }

    tick();
  });
}

function confettiRain() {
  if (!musicStarted || particles.length > 420) return;
  particles.push({
    x: Math.random() * width,
    y: -18,
    vx: Math.random() * 2 - 1,
    vy: 1.5 + Math.random() * 2.5,
    life: 170 + Math.random() * 80,
    size: 4 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    spin: Math.random() * 0.32 - 0.16
  });
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  particles = particles.filter((particle) => particle.life > 0);

  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.035;
    particle.life -= 1;
    ctx.save();
    ctx.globalAlpha = Math.max(particle.life / 120, 0);
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.life * particle.spin);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 1.5);
    ctx.restore();
  });

  requestAnimationFrame(draw);
}

yesButton.addEventListener("click", async () => {
  await startMusic();
  showPage(2);
});

countdownPage.addEventListener("click", startCountdown);
countdownStart.addEventListener("click", startCountdown);

["mouseenter", "pointerdown", "click", "touchstart"].forEach((eventName) => {
  noButton.addEventListener(eventName, (event) => {
    event.preventDefault();
    moveNoButton();
  });
});

document.querySelectorAll(".next-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (currentPage === 8) {
      musicSource.pause();
      musicStarted = false;
      soundToggle.classList.remove("is-visible");
      window.setTimeout(() => {
        showPage(9);
        startFinalFireworks();
      }, 850);
      return;
    }

    showPage(Math.min(currentPage + 1, pages.length - 1));
  });
});

micButton.addEventListener("click", startMic);
envelope.addEventListener("click", openEnvelope);
envelope.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") openEnvelope();
});

soundToggle.addEventListener("click", async () => {
  if (musicSource.paused) {
    await startMusic();
    soundToggle.classList.remove("is-muted");
    soundToggle.textContent = "Music";
    return;
  }

  musicSource.muted = !musicSource.muted;
  soundToggle.classList.toggle("is-muted", musicSource.muted);
  soundToggle.textContent = musicSource.muted ? "Muted" : "Music";
});

window.addEventListener("resize", resizeCanvas);
window.setInterval(confettiRain, 90);

resizeCanvas();
makeBalloons();
typeTargets.forEach((target) => {
  target.dataset.fullText = target.dataset.text || target.textContent.trim();
  target.textContent = "";
});
draw();
