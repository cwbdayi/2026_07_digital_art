// Original classroom cues. Not the civil-alert tone.

export function createCues() {
  let ctx = null;
  let master = null;
  let noise = null;
  let enabled = true;
  let volume = 0.8;

  function ensure() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error("這個瀏覽器沒有 Web Audio。");
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i += 1) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = brown * 3.5;
    }
  }

  function envTone(freq, when, dur, gain) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(value) {
      enabled = value;
      if (master) master.gain.setTargetAtTime(value ? volume : 0, ctx.currentTime, 0.03);
    },
    setVolume(value) {
      volume = value;
      if (master) master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.03);
    },
    async unlock() {
      ensure();
      master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.03);
      await ctx.resume();
    },
    p() {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      envTone(880, now, 0.07, 0.05);
    },
    alert() {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      envTone(494, now, 0.16, 0.11);
      envTone(659, now + 0.15, 0.26, 0.09);
    },
    shake(amount) {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 160 + amount * 80;
      const amp = ctx.createGain();
      const gain = 0.04 + amount * 0.16;
      amp.gain.setValueAtTime(0.0001, now);
      amp.gain.exponentialRampToValueAtTime(gain, now + 0.05);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
      src.connect(filter);
      filter.connect(amp);
      amp.connect(master);
      src.start(now);
      src.stop(now + 1.4);
      envTone(55, now, 0.7, 0.08 + amount * 0.08);
    },
  };
}
