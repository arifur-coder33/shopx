export function playErrorBeep() {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(400, ctx.currentTime); // Hz
  oscillator.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.3); // 0.3 second beep
}

function playSmoothErrorSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine"; // smoother than 'square' or 'sawtooth'
  oscillator.frequency.setValueAtTime(300, ctx.currentTime); // low-pitched error tone

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // smooth fade in and fade out
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.4); // play for 0.4s
}

function vibrateDevice(duration = 200) {
  if (navigator.vibrate) {
    navigator.vibrate(duration);
  }
}

export function errorSoundWithVibrate() {
  playSmoothErrorSound();
  vibrateDevice(50); // 200ms vibration
}
