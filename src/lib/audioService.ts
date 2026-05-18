export const playSound = (type: 'sent' | 'received' | 'alert' | 'gps_ping') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'sent') {
      const osc = audioCtx.createOscillator();
      osc.connect(gainNode);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'received') {
      [659, 784].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.connect(gainNode);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gainNode.gain.setValueAtTime(0.1, now + i * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.15);
      });
    } else if (type === 'alert') {
      for (let i = 0; i < 5; i++) {
        const osc = audioCtx.createOscillator();
        osc.connect(gainNode);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now + i * 0.4);
        osc.frequency.setValueAtTime(880, now + i * 0.4 + 0.1);
        gainNode.gain.setValueAtTime(0.05, now + i * 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.4 + 0.3);
        osc.start(now + i * 0.4);
        osc.stop(now + i * 0.4 + 0.3);
      }
    } else if (type === 'gps_ping') {
      // Long pulsing alert for GPS pings
      for (let i = 0; i < 10; i++) {
        const osc = audioCtx.createOscillator();
        osc.connect(gainNode);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1000, now + i * 0.8);
        osc.frequency.exponentialRampToValueAtTime(500, now + i * 0.8 + 0.4);
        gainNode.gain.setValueAtTime(0.08, now + i * 0.8);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.8 + 0.6);
        osc.start(now + i * 0.8);
        osc.stop(now + i * 0.8 + 0.6);
      }
    }
  } catch (e) {
    console.warn("Audio Context failed", e);
  }
};
