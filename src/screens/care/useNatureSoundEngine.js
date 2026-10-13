import { useEffect, useRef, useState } from 'react';

const FADE_SECONDS = 0.5;
const END_FADE_SECONDS = 4; // タイマー終了時は通常の停止よりゆっくりフェードアウトする
export const MAX_ACTIVE_SOUNDS = 2; // 音が重なりすぎて不自然にならないよう上限を設ける
const MULTI_HEADROOM = 0.72; // 2音同時再生時に濁らないよう、全体の音量を少し下げる
export const TIMER_MINUTES = [1, 5, 10, 30, 60];

export const SOUND_IDS = ['rain', 'wave', 'forest', 'river', 'wind', 'campfire'];
export const SOUND_EMOJI = {
  rain: '🌧️',
  wave: '🌊',
  forest: '🌲',
  river: '🏞️',
  wind: '🍃',
  campfire: '🔥',
};

function makeNoise(ctx, color) {
  return new AudioWorkletNode(ctx, 'noise-processor', { processorOptions: { color } });
}

// ランダムな間隔で音の粒（雨粒・小鳥・焚き火のパチパチ音など）を鳴らし続ける。
// setTimeoutのIDを毎回timersListに積んでおくことで、停止時に確実に全て打ち切れるようにする。
function scheduleEvents(timersList, minMs, maxMs, fn) {
  const tick = () => {
    fn();
    const id = setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
    timersList.push(id);
  };
  const id = setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
  timersList.push(id);
}

// 短いノイズバースト（雨粒・水しぶき・焚き火の爆ぜ音の材料）
function burstNoiseBuffer(ctx, durationSec) {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length); // 減衰エンベロープ
  }
  return buffer;
}

function playBurst(ctx, gain, { duration, freq, q, gain: peak }) {
  const src = ctx.createBufferSource();
  src.buffer = burstNoiseBuffer(ctx, duration);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = freq;
  bandpass.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = peak;
  src.connect(bandpass).connect(g).connect(gain);
  src.start();
}

// 種類ごとの音の設計。全てその音専用のgainノードに直接つながる
// （gainノードはさらに共有のコンプレッサー経由でdestinationへ）。
// 戻り値の stoppables は、常時鳴り続けるLFO/オシレーターなど明示的に stop() が必要なノード。
const SOUND_BUILDERS = {
  rain(ctx, gain) {
    const noise = makeNoise(ctx, 'white');
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 500;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 6500;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.32;
    noise.connect(highpass).connect(lowpass).connect(bedGain).connect(gain);
    return { stoppables: [] };
  },

  wave(ctx, gain) {
    const noise = makeNoise(ctx, 'brown');
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 700;
    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08; // ゆっくりとした波のうねり
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.2;
    lfo.connect(lfoGain).connect(waveGain.gain);
    lfo.start();
    noise.connect(lowpass).connect(waveGain).connect(gain);
    return { stoppables: [lfo] };
  },

  forest(ctx, gain) {
    const noise = makeNoise(ctx, 'pink');
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 500;
    bandpass.Q.value = 0.6;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.16;
    noise.connect(bandpass).connect(bedGain).connect(gain);
    return { stoppables: [] };
  },

  river(ctx, gain) {
    const noise = makeNoise(ctx, 'white');
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 900;
    // Qが高いまま速いLFOでフィルター中心周波数を揺らすと、ノイズの質感ではなく
    // 「ヒュルヒュルという音程のある別の音」に聞こえてしまう（濁りの正体候補）。
    // Qを下げてより広帯域に、揺れも緩やかにして、音色ではなく質感の変化に留める。
    bandpass.Q.value = 0.7;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.28;

    const lfo1 = ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.value = 0.3;
    const lfo1Gain = ctx.createGain();
    lfo1Gain.gain.value = 350;
    lfo1.connect(lfo1Gain).connect(bandpass.frequency);
    lfo1.start();

    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 1.1;
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = 70;
    lfo2.connect(lfo2Gain).connect(bandpass.frequency);
    lfo2.start();

    noise.connect(bandpass).connect(bedGain).connect(gain);
    return { stoppables: [lfo1, lfo2] };
  },

  wind(ctx, gain) {
    const noise = makeNoise(ctx, 'pink');
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 500;
    bandpass.Q.value = 0.6; // 同上の理由でriverよりさらに控えめに
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.4;

    const lfo1 = ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.value = 0.05;
    const lfo1Gain = ctx.createGain();
    lfo1Gain.gain.value = 280;
    lfo1.connect(lfo1Gain).connect(bandpass.frequency);
    lfo1.start();

    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.017;
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = 180;
    lfo2.connect(lfo2Gain).connect(bandpass.frequency);
    lfo2.start();

    const gustLfo = ctx.createOscillator();
    gustLfo.type = 'sine';
    gustLfo.frequency.value = 0.04;
    const gustGain = ctx.createGain();
    gustGain.gain.value = 0.15;
    gustLfo.connect(gustGain).connect(bedGain.gain);
    gustLfo.start();

    noise.connect(bandpass).connect(bedGain).connect(gain);
    return { stoppables: [lfo1, lfo2, gustLfo] };
  },

  campfire(ctx, gain) {
    const noise = makeNoise(ctx, 'brown');
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 220;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.22;
    noise.connect(lowpass).connect(bedGain).connect(gain);
    return { stoppables: [] };
  },
};

// 「粒」のあるタイプ（雨粒・水しぶき・焚き火の爆ぜ音）はここでスケジュールする。
const EVENT_SCHEDULERS = {
  rain(ctx, gain, timersList) {
    scheduleEvents(timersList, 90, 260, () => {
      playBurst(ctx, gain, {
        duration: 0.05 + Math.random() * 0.05,
        freq: 1200 + Math.random() * 2500,
        q: 4,
        gain: 0.12 + Math.random() * 0.08,
      });
    });
  },

  forest(ctx, gain, timersList) {
    scheduleEvents(timersList, 3500, 9000, () => {
      const now = ctx.currentTime;
      const dur = 0.15 + Math.random() * 0.12;
      const startFreq = 1800 + Math.random() * 900;
      const endFreq = startFreq + (Math.random() > 0.5 ? 400 : -400);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(300, endFreq), now + dur);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.09, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(g).connect(gain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });
  },

  river(ctx, gain, timersList) {
    scheduleEvents(timersList, 900, 2200, () => {
      playBurst(ctx, gain, {
        duration: 0.06,
        freq: 1800 + Math.random() * 1200,
        q: 3,
        gain: 0.06 + Math.random() * 0.04,
      });
    });
  },

  campfire(ctx, gain, timersList) {
    scheduleEvents(timersList, 250, 1100, () => {
      playBurst(ctx, gain, {
        duration: 0.02 + Math.random() * 0.03,
        freq: 1500 + Math.random() * 3000,
        q: 2.5,
        gain: 0.15 + Math.random() * 0.12,
      });
      if (Math.random() < 0.25) {
        const id = setTimeout(() => {
          playBurst(ctx, gain, {
            duration: 0.02 + Math.random() * 0.03,
            freq: 1500 + Math.random() * 3000,
            q: 2.5,
            gain: 0.1 + Math.random() * 0.08,
          });
        }, 40 + Math.random() * 60);
        timersList.push(id);
      }
    });
  },
};

// 自然音の再生を管理するフック（最大2種類までの同時ミックスに対応）。
// NatureSoundCareと、呼吸+自然音の統合ケアの両方から使う（音の作り方はここに一本化する）。
export function useNatureSoundEngine() {
  const [activeTypes, setActiveTypes] = useState([]);
  const [volumes, setVolumes] = useState({});
  const [unsupported, setUnsupported] = useState(false);
  // audioRef.current = { ctx, compressor, sounds: { [type]: { gain, stoppables } } }
  const audioRef = useRef({ ctx: null, compressor: null, sounds: {} });
  const timersRef = useRef({}); // { [type]: [timeoutId, ...] }
  const initLockRef = useRef(null);
  const addLockRef = useRef(new Set());

  function clearTimersFor(type) {
    (timersRef.current[type] ?? []).forEach(clearTimeout);
    delete timersRef.current[type];
  }

  function teardownSoundNodes(type) {
    const sound = audioRef.current.sounds[type];
    if (!sound) return;
    sound.stoppables.forEach((node) => {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    });
    delete audioRef.current.sounds[type];
  }

  function teardownAll() {
    Object.keys(timersRef.current).forEach(clearTimersFor);
    Object.keys(audioRef.current.sounds ?? {}).forEach(teardownSoundNodes);
    audioRef.current.ctx?.close();
    audioRef.current = { ctx: null, compressor: null, sounds: {} };
  }

  // 全ての音が共有するAudioContext。コンプレッサーを1つ挟むことで、
  // 2音を同時に鳴らしても振幅が単純に足し合わさって歪む/濁ることを防ぐ。
  async function ensureContext() {
    if (audioRef.current.ctx) return audioRef.current;
    if (!initLockRef.current) {
      initLockRef.current = (async () => {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        await ctx.audioWorklet.addModule('/noise-processor.js');
        await ctx.resume().catch(() => {});

        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 10;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.02;
        compressor.release.value = 0.25;
        compressor.connect(ctx.destination);

        audioRef.current = { ctx, compressor, sounds: {} };
        return audioRef.current;
      })();
    }
    const result = await initLockRef.current;
    initLockRef.current = null;
    return result;
  }

  async function addSound(type) {
    if (activeTypes.includes(type)) return;
    if (activeTypes.length >= MAX_ACTIVE_SOUNDS) return;
    if (addLockRef.current.has(type)) return; // 連打・連続タップでの二重生成を防ぐ
    addLockRef.current.add(type);

    try {
      const { ctx, compressor } = await ensureContext();
      if (audioRef.current.sounds[type]) return; // 既にこの間に追加済みなら何もしない

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime); // フェードインはvolumes用useEffectに任せる
      gain.connect(compressor);

      timersRef.current[type] = [];
      const { stoppables } = SOUND_BUILDERS[type](ctx, gain);
      EVENT_SCHEDULERS[type]?.(ctx, gain, timersRef.current[type]);

      audioRef.current.sounds[type] = { gain, stoppables };
      setVolumes((v) => (type in v ? v : { ...v, [type]: 0.5 }));
      setActiveTypes((prev) => (prev.includes(type) ? prev : [...prev, type]));
    } catch {
      setUnsupported(true);
    } finally {
      addLockRef.current.delete(type);
    }
  }

  function removeSound(type, fadeSeconds = FADE_SECONDS) {
    setActiveTypes((prev) => prev.filter((t) => t !== type));

    const sound = audioRef.current.sounds[type];
    const ctx = audioRef.current.ctx;
    if (!sound || !ctx) return;

    // フェードアウトしてから止めることで、切断/切替時の「プツッ」というノイズを防ぐ
    const now = ctx.currentTime;
    sound.gain.gain.cancelScheduledValues(now);
    sound.gain.gain.setValueAtTime(sound.gain.gain.value, now);
    sound.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    clearTimersFor(type); // フェードアウト中に新しい粒（雨粒等）が鳴り始めないようにする

    setTimeout(() => {
      teardownSoundNodes(type);
      if (Object.keys(audioRef.current.sounds).length === 0) {
        audioRef.current.ctx?.close();
        audioRef.current = { ctx: null, compressor: null, sounds: {} };
      }
    }, fadeSeconds * 1000 + 50);
  }

  function toggleSound(type) {
    if (activeTypes.includes(type)) removeSound(type);
    else addSound(type);
  }

  // audioRef（常に最新）から止めるべき音を読むことで、タイマー等の
  // 古いクロージャから呼ばれても取りこぼしなく全て止められるようにする。
  function stopAll(fadeSeconds = FADE_SECONDS) {
    clearTimer();
    Object.keys(audioRef.current.sounds).forEach((type) => removeSound(type, fadeSeconds));
  }

  function setVolume(type, value) {
    setVolumes((v) => ({ ...v, [type]: value }));
  }

  // --- タイマー（1/5/10/30/60分。終了時はゆっくりフェードアウトして自動停止） ---
  const [timerMinutes, setTimerMinutesState] = useState(null);
  const [timerRemainingMs, setTimerRemainingMs] = useState(null);
  const timerHandleRef = useRef(null);

  function clearTimer() {
    if (timerHandleRef.current) {
      clearTimeout(timerHandleRef.current.timeoutId);
      clearInterval(timerHandleRef.current.intervalId);
      timerHandleRef.current = null;
    }
    setTimerMinutesState(null);
    setTimerRemainingMs(null);
  }

  // stopAll自体はaudioRef（常に最新）だけを見て動くため、setSleepTimer実行時点の
  // クロージャのままタイムアウトに渡しても、発火時点で鳴っている音を正しく止められる。
  function setSleepTimer(minutes) {
    clearTimer();
    if (!minutes) return;
    const endAt = Date.now() + minutes * 60 * 1000;
    const timeoutId = setTimeout(() => stopAll(END_FADE_SECONDS), minutes * 60 * 1000);
    const intervalId = setInterval(() => {
      setTimerRemainingMs(Math.max(0, endAt - Date.now()));
    }, 15000);
    timerHandleRef.current = { endAt, timeoutId, intervalId };
    setTimerMinutesState(minutes);
    setTimerRemainingMs(minutes * 60 * 1000);
  }

  // 音量・同時再生数が変わるたびに、全ての鳴っている音のゲインを再計算する。
  // 2音同時のときはヘッドルームを自動的に下げ、濁った/歪んだ音にならないようにする。
  useEffect(() => {
    const { ctx, sounds } = audioRef.current;
    if (!ctx) return;
    const factor = Object.keys(sounds).length >= 2 ? MULTI_HEADROOM : 1;
    Object.entries(sounds).forEach(([t, { gain }]) => {
      const target = (volumes[t] ?? 0.5) * factor;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.setTargetAtTime(target, now, 0.15);
    });
  }, [volumes, activeTypes]);

  // 再生中の音が（個別に止められて）無くなったら、タイマー表示も片付ける
  useEffect(() => {
    if (activeTypes.length === 0 && timerHandleRef.current) clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypes]);

  useEffect(
    () => () => {
      clearTimer();
      teardownAll();
    },
    []
  );

  return {
    activeTypes,
    volumes,
    unsupported,
    toggleSound,
    setVolume,
    stopAll,
    timerMinutes,
    timerRemainingMs,
    setSleepTimer,
  };
}
