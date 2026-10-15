/* Original procedural soundtrack. Call init from a user gesture; update from RAF. */
(function (global) {
  'use strict';
  var ctx = null, musicBus = null, sfxBus = null, master = null;
  var settings = { music: 0.35, sfx: 0.65 }, scene = 'menu', chapter = 0;
  var clock = 0, step = 0, live = new Set(), limit = 32;
  var melody = [0, 7, 12, 9, 7, 4, 2, 7, 0, 4, 9, 12, 11, 7, 4, 2];
  var bass = [0, 0, 5, 7];
  function clamp(n, fallback) { return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback; }
  function gain(bus, value) {
    if (!ctx || !bus) return;
    try { bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setTargetAtTime(value, ctx.currentTime, 0.025); } catch (_) {}
  }
  function stopMusic() {
    live.forEach(function (voice) { if (voice.music) voice.stop(); });
    clock = 0; step = 0;
  }
  function init() {
    try {
      if (!ctx) {
        var Audio = global.AudioContext || global.webkitAudioContext;
        if (!Audio) return false;
        ctx = new Audio();
        master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination);
        musicBus = ctx.createGain(); sfxBus = ctx.createGain();
        musicBus.gain.value = settings.music; sfxBus.gain.value = settings.sfx;
        musicBus.connect(master); sfxBus.connect(master);
      }
      if (ctx.state === 'suspended') {
        var pending = ctx.resume(); if (pending && pending.catch) pending.catch(function () {});
      }
      return true;
    } catch (_) { return false; }
  }
  function note(freq, duration, type, volume, isMusic, slide) {
    if (!ctx || ctx.state !== 'running' || live.size >= limit ||
        (isMusic ? settings.music : settings.sfx) <= 0) return;
    var osc = null, env = null, voice = null;
    try {
      var now = ctx.currentTime;
      duration = Math.max(0.025, Math.min(1.5, Number(duration) || 0.1));
      freq = Math.max(35, Math.min(5000, Number(freq) || 440));
      osc = ctx.createOscillator(); env = ctx.createGain();
      osc.type = ['sine', 'triangle', 'square', 'sawtooth'].indexOf(type) >= 0 ? type : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(35, Math.min(5000, slide)), now + duration);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0001, clamp(volume, 0.15)), now + Math.min(0.015, duration / 3));
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(env); env.connect(isMusic ? musicBus : sfxBus);
      var cleaned = false;
      function clean() {
        if (cleaned) return; cleaned = true;
        try { osc.disconnect(); env.disconnect(); } catch (_) {}
        if (voice) live.delete(voice);
      }
      voice = { music: isMusic, stop: function () { try { osc.stop(); } catch (_) {} clean(); } };
      live.add(voice); osc.onended = clean;
      osc.start(now); osc.stop(now + duration + 0.025);
    } catch (_) {
      try { if (osc) { osc.stop(); osc.disconnect(); } if (env) env.disconnect(); } catch (ignore) {}
      if (voice) live.delete(voice);
    }
  }
  function tone(freq, duration, type, volume) { note(freq, duration, type, volume, false); }
  function cue(name) {
    // No timers: every cue is a brief simultaneous chord or pitch gesture.
    switch (name) {
      case 'honk': note(330, 0.19, 'sawtooth', 0.16, false, 220); note(495, 0.13, 'triangle', 0.1, false, 330); break;
      case 'hit': note(150, 0.09, 'triangle', 0.22, false, 45); break;
      case 'warn': note(660, 0.16, 'square', 0.075, false, 520); break;
      case 'upgrade': note(523, 0.3, 'triangle', 0.18, false, 1046); note(659, 0.35, 'sine', 0.12, false); break;
      case 'win': [523, 659, 784, 1046].forEach(function (f) { note(f, 0.8, 'triangle', 0.11, false); }); break;
      case 'lose': note(311, 0.65, 'triangle', 0.18, false, 147); note(233, 0.55, 'sine', 0.14, false, 110); break;
      case 'pickup': note(1046, 0.045, 'sine', 0.06, false, 1396); break;
    }
  }
  function setSettings(next) {
    try {
      next = next || {};
      settings.music = clamp(next.music, settings.music); settings.sfx = clamp(next.sfx, settings.sfx);
      gain(musicBus, settings.music); gain(sfxBus, settings.sfx);
      if (!settings.music) stopMusic();
    } catch (_) {}
  }
  function setScene(next, chapterIndex) {
    if (['menu', 'playing', 'boss', 'paused', 'result', 'win'].indexOf(next) < 0) return;
    var index = Number.isFinite(chapterIndex) ? Math.max(0, Math.floor(chapterIndex)) % 7 : 0;
    if (next !== scene || index !== chapter) { stopMusic(); scene = next; chapter = index; }
    if (scene === 'paused') live.forEach(function (voice) { voice.stop(); });
  }
  function update(dt) {
    if (!ctx || ctx.state !== 'running' || scene === 'paused' || !settings.music) return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Never catch up stale beats after a background tab or a slow frame.
    clock -= Math.min(dt, 0.1);
    if (clock > 0) return;
    var combat = scene === 'playing' || scene === 'boss';
    var interval = scene === 'boss' ? 0.19 : combat ? 0.25 : 0.38;
    clock = interval;
    var root = 130.8128 * Math.pow(2, [0, 2, 5, -2, 7, 3, 0][chapter] / 12);
    var offset = melody[step % melody.length];
    if (scene === 'result') offset = [0, 3, 7, 2][step % 4];
    if (scene === 'win') offset = [0, 4, 7, 12, 7, 9, 12, 16][step % 8];
    if (scene !== 'result' || step % 2 === 0)
      note(root * 2 * Math.pow(2, offset / 12), interval * 0.8, 'triangle', combat ? 0.09 : 0.07, true);
    if (step % 4 === 0) note(root / 2 * Math.pow(2, bass[Math.floor(step / 4) % 4] / 12), interval * 2.4, 'sine', 0.2, true);
    if (combat && step % 2 === 0) note(95, 0.065, 'sine', 0.15, true, 40);
    step = (step + 1) % 64;
  }
  global.GooAudio = { init: init, setSettings: setSettings, setScene: setScene, update: update, tone: tone, cue: cue };
})(window);
