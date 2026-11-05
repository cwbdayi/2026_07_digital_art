// Breath is a slow amplitude. An event is a separate transient:
// a falling thump, a short bright crack, and a soft ring.

export function createBreathAudio() {
  let ctx = null;
  let master = null;
  let audible = false;
  let volume = 0.7;
  let osc1;
  let osc2;
  let bodyGain;
  let airFilter;
  let airGain;
  let noiseBuffer;
  const recent = [];

  function ensure() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error("這個瀏覽器沒有 Web Audio。");
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    master.connect(comp);
    comp.connect(ctx.destination);

    osc1 = ctx.createOscillator();
    osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = 50;
    osc2.frequency.value = 50.4;
    bodyGain = ctx.createGain();
    bodyGain.gain.value = 0;
    osc1.connect(bodyGain);
    osc2.connect(bodyGain);
    bodyGain.connect(master);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * 3.2;
    }
    const air = ctx.createBufferSource();
    air.buffer = noiseBuffer;
    air.loop = true;
    airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 220;
    airFilter.Q.value = 0.7;
    airGain = ctx.createGain();
    airGain.gain.value = 0;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(master);

    osc1.start();
    osc2.start();
    air.start();
  }

  function tone(freq, when, dur, gain, type = "sine") {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), when + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    return osc;
  }

  function pulse(amplitude) {
    const now = ctx.currentTime;
    recent.push(now);
    while (recent.length && now - recent[0] > 2.5) recent.shift();
    if (recent.length > 4) return;
    const amp = Math.max(0.2, Math.min(1.4, amplitude));

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(92, now);
    thump.frequency.exponentialRampToValueAtTime(34, now + 0.55);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.32 * amp, now + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(now);
    thump.stop(now + 1.2);

    const crack = ctx.createBufferSource();
    crack.buffer = noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1600;
    band.Q.value = 1.4;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.0001, now);
    crackGain.gain.exponentialRampToValueAtTime(0.18 * amp, now + 0.008);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    crack.connect(band);
    band.connect(crackGain);
    crackGain.connect(master);
    crack.start(now);
    crack.stop(now + 0.2);

    tone(311, now + 0.02, 1.5, 0.07 * amp);
    tone(466, now + 0.04, 1.1, 0.035 * amp);
  }

  return {
    setVolume(value) {
      volume = value;
      if (audible && master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.03);
    },
    async start() {
      ensure();
      await ctx.resume();
      audible = true;
      master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    },
    stop() {
      audible = false;
      if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    },
    get audible() {
      return audible;
    },
    sync(snap) {
      if (!ctx || !audible) return;
      const now = ctx.currentTime;
      const preset = snap.preset;
      osc1.frequency.setTargetAtTime(Math.max(30, preset.bodyHz - snap.eventEnergy * 16), now, 0.08);
      osc2.frequency.setTargetAtTime(preset.bodyHz + 0.45, now, 0.08);
      airFilter.frequency.setTargetAtTime(preset.airHz + snap.eventEnergy * 900, now, 0.08);
      bodyGain.gain.setTargetAtTime(0.11 * snap.breath, now, 0.06);
      airGain.gain.setTargetAtTime(0.028 * snap.breath + snap.eventEnergy * 0.04, now, 0.08);
      for (const event of snap.pending) pulse(event.amplitude);
    },
  };
}
