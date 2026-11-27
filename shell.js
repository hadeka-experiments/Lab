/* Experiments shell: cross-browser shims + shared header for every app. Loaded in <head> before the app's own scripts. */
(function () {
  'use strict';
  // ---------- compatibility shims ----------
  if (!window.AudioContext && window.webkitAudioContext) window.AudioContext = window.webkitAudioContext;
  // requestVideoFrameCallback (Firefox, older browsers): fall back to animation frames
  if (window.HTMLVideoElement && !HTMLVideoElement.prototype.requestVideoFrameCallback) {
    HTMLVideoElement.prototype.requestVideoFrameCallback = function (cb) {
      const v = this; let last = v.currentTime;
      const tick = now => { if (v.currentTime !== last || v.paused) { last = v.currentTime; cb(now, { mediaTime: v.currentTime, presentedFrames: 0 }); } else requestAnimationFrame(tick); };
      return requestAnimationFrame(tick);
    };
    HTMLVideoElement.prototype.cancelVideoFrameCallback = id => cancelAnimationFrame(id);
  }
  // Compass on Android: Chrome reports true north only in 'deviceorientationabsolute'.
  // Re-emit those as 'deviceorientation' with webkitCompassHeading (the iOS field the apps read),
  // and swallow the relative events once absolute ones are flowing.
  let absSeen = false, reemit = false;
  window.addEventListener('deviceorientationabsolute', e => {
    if (e.alpha == null) return; absSeen = true;
    const ev = new Event('deviceorientation');
    ['alpha', 'beta', 'gamma'].forEach(k => Object.defineProperty(ev, k, { value: e[k] }));
    Object.defineProperty(ev, 'absolute', { value: true });
    Object.defineProperty(ev, 'webkitCompassHeading', { value: (360 - e.alpha) % 360 });
    reemit = true; window.dispatchEvent(ev); reemit = false;
  }, true);
  window.addEventListener('deviceorientation', e => { if (absSeen && !reemit && e.webkitCompassHeading == null) e.stopImmediatePropagation(); }, true);
  if (!navigator.vibrate) navigator.vibrate = () => false;
  if (!window.ResizeObserver) window.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe(el) { const f = () => this.cb([{ target: el }]); addEventListener('resize', f); setTimeout(f, 0); } unobserve() {} disconnect() {} };

  // ---------- app registry ----------
  const C = {
    sound: { name: 'Sound & ultrasound', acc: '#e8251a' },
    camera: { name: 'Camera & light', acc: '#2f6fde' },
    motion: { name: 'Motion sensors', acc: '#c77d00' },
    sleep: { name: 'Sleep & mind', acc: '#6d4bd8' },
    nature: { name: 'Nature & sky', acc: '#1d9e75' },
    radio: { name: 'Radio', acc: '#0f8a9e' }
  };
  const S = { mic: 'Microphone', spk: 'Speaker', cam: 'Camera', front: 'Front camera', back: 'Rear camera', mot: 'Motion sensors', cmp: 'Compass', gps: 'Location (optional)', bt: 'Bluetooth', scr: 'Screen light', ai: 'On‑device AI' };
  const A = {
    'sonar.html': { t: 'Room Sonar', c: 'sound', s: ['spk', 'mic', 'cmp'], d: 'Measures distances to walls and objects with echoes, like a bat, and sketches the room.', steps: ['Open over https and turn the volume up (iPhone: silent switch off).', 'Point the bottom edge of the phone at a wall and tap “Measure” to see the echo curve.', 'For a room map, stand in the middle, tap “Start scan” and turn slowly until all 12 segments fill.'] },
    'breath.html': { t: 'Breathing Radar', c: 'sound', s: ['spk', 'mic'], d: 'An inaudible tone bounces off a chest and reveals breathing from up to 1.5 m away, with no contact.', steps: ['Put the phone on a table, bottom speaker facing the person, 0.5–1.5 m away.', 'Turn the volume up and tap “Start”.', 'Ask the person to stay still; the breathing curve and rate appear within 10 seconds.'], warn: 'Children and pets can hear ultrasonic tones.' },
    'whisper.html': { t: 'Silent Messages', c: 'sound', s: ['spk', 'mic'], d: 'Send a text message from one phone to another as ultrasonic whistles. No internet, Wi‑Fi or Bluetooth.', steps: ['Open this page on two phones and pick the same frequency band on both.', 'On the receiving phone tap “Start receiving”.', 'On the other phone type a short message and tap “Send”. Keep phones within a few metres.'], warn: 'Children and pets can hear ultrasonic tones.' },
    'echoface.html': { t: 'Echo Face', c: 'sound', s: ['spk', 'mic'], d: 'Tiny chirps map the layers of your face by echo and learn to recognise who it is, without a camera.', steps: ['Hold the phone like a selfie, 30 cm away, with your head moved aside, and record the room.', 'Bring your face back to the same spot and record again to see the layers.', 'Save measurements under names, then new measurements are matched to a person.'] },
    'birds.html': { t: 'Bird Talk', c: 'nature', s: ['mic', 'spk', 'ai', 'gps'], d: 'Identifies bird species by their calls with Cornell Lab’s BirdNET, logs every call, and lets you reply.', steps: ['Use Wi‑Fi the first time (the model is about 65 MB).', 'Tap “Start listening” near birds; optionally filter species by your location.', 'Tap “Reply” on a call to play it back, sparingly, and watch how the bird responds.'] },
    'nightbirds.html': { t: 'Night Birds', c: 'nature', s: ['mic', 'spk', 'ai'], d: 'Leave it by the window overnight: it identifies birds, answers them with their own calls within safe limits, and writes a morning report.', steps: ['Plug the phone in by a window and keep this page open (screen stays on).', 'Check the reply limits, then tap “Start the night”.', 'In the morning read the report: species, times, and how birds reacted to each reply.'] },
    'sleep.html': { t: 'Sleep Lab', c: 'sleep', s: ['mic', 'spk', 'ai'], d: 'Your night from the nightstand: snoring, sleep‑talk, coughs and noise via AI, plus breathing, movement and inferred sleep stages from an ultrasonic radar.', steps: ['Put the phone on its charger by the bed, bottom edge toward your chest.', 'Optionally turn on the breathing radar (needed for sleep stages and inferred brain waves).', 'Tap “Start the night”, use “Black screen”, and read the report in the morning.'], warn: 'The radar tone can be heard by children and pets in the room.' },
    'dayback.html': { t: 'Day Back', c: 'sleep', s: ['mic', 'spk', 'ai'], d: 'Record the sounds of places you love; at night the phone replays them quietly during dream sleep and measures, blind, whether they enter your dreams.', steps: ['During the day record 20‑second fingerprints of at least two places.', 'Before bed pick places, do the 3‑minute training, and set the volume to barely audible.', 'Tap “Sleep”. In the morning rate your dreams, then reveal which places were played.'] },
    'pulse.html': { t: 'Pulse from Face', c: 'camera', s: ['front', 'back', 'scr', 'ai'], d: 'Measures heart rate from invisible colour changes in the skin of your face, with no contact.', steps: ['Turn screen brightness to maximum.', 'Hold the phone 30 cm from your face, keep still and silent.', 'The first reading appears after about 10 seconds. Use the rear camera to measure someone else.'], light: true },
    'eyes.html': { t: 'Eye Reflections', c: 'camera', s: ['cam', 'ai'], d: 'Recovers the scene reflected in a cornea or sunglasses as a flat picture, with optional AI enhancement shown side by side.', steps: ['Capture with the rear camera at 2× zoom, 20–30 cm from an eye, or upload photos/video.', 'Choose cornea, sunglasses or manual, and tap the reflection.', 'Compare the real stacked image with the clearly labelled AI version.'] },
    'screencam.html': { t: 'Screen Camera', c: 'camera', s: ['front', 'scr'], d: 'A single‑pixel camera: with the lens covered, the screen’s patterns rebuild an image of the paper above it.', steps: ['Darken the room, draw a bold shape on paper, and cover the front camera with tissue.', 'Lay the phone face up with the paper 2–4 cm above the screen, drawing facing down.', 'Run step 1 without the paper, then step 2 with it, and don’t touch the phone.'] },
    'mind.html': { t: 'Number Reader', c: 'sleep', s: ['front', 'scr', 'ai'], d: 'Think of a number; the camera reads your gaze, pulse and micro‑expressions and guesses it, hands‑free.', steps: ['Max brightness, rotation locked, phone propped 30 cm from your face.', 'Secretly choose a number from 1 to 9 and tap start.', 'Follow the dot, look freely, then watch each number; the verdict comes at the end.'], light: true },
    'mind-buttons.html': { t: 'Number Reader · Reaction', c: 'sleep', s: ['front', 'scr', 'ai'], d: 'A concealed‑information test: deny every number, and tiny delays in your responses plus your pulse give yours away.', steps: ['Max brightness and hold the phone 30 cm from your face.', 'Secretly choose one of the shown numbers.', 'Tap “No” for every number (including yours) and “Yes” only for the required number, quickly.'], light: true },
    'focus.html': { t: 'Focus Map', c: 'sleep', s: ['front', 'ai'], d: 'Read a text or flip through slides while the camera tracks blinks and glances, then see where you focused and where you drifted.', steps: ['Paste a text (paragraphs separated by blank lines) or choose slide images.', 'Tap “Start reading” and read normally with your face visible.', 'Tap “Done” to see your focus map.'], light: true },
    'silent.html': { t: 'Silent Speech', c: 'camera', s: ['front', 'ai'], d: 'Mouth words without sound and the camera reads your lips. Teach it your words first.', steps: ['Type a word, tap “Record”, and mouth it silently when prompted. Repeat 3×.', 'Teach at least two distinct words.', 'Tap “Read a word” or continuous reading and mouth a word.'] },
    'vmic.html': { t: 'Camera Microphone', c: 'camera', s: ['back', 'spk'], d: 'Recovers sound from a silent video of a vibrating object, using the camera’s rolling shutter.', steps: ['Aim the rear camera at printed text or a crisp packet.', 'Tap “Calibrate” once with the phone on a table.', 'Play a loud tone near the paper and tap “Listen 4 s”.'] },
    'who.html': { t: 'Who’s Holding It?', c: 'motion', s: ['mot'], d: 'Learns each person’s way of holding and moving the phone, then recognises who has it.', steps: ['Enrol at least two people (3 short stages of 20 s each).', 'Tap “Start recognising”.', 'Hand the phone around and watch the name change.'] },
    'heart.html': { t: 'Heartbeat by Touch', c: 'motion', s: ['mot'], d: 'Lie down with the phone on your chest: its motion sensors feel each heartbeat and breath.', steps: ['Tap “Start” (allow motion access if asked).', 'Lie on your back with the phone on the left side of your chest.', 'Stay completely still and silent; readings start after about 10 s.'] },
    'ble.html': { t: 'Bluetooth Test', c: 'radio', s: ['bt'], d: 'Checks whether your browser can stream Bluetooth signal strength, and whether a body between two devices changes it.', steps: ['Android: open in Chrome. iPhone: open in the Bluefy browser.', 'Scan for devices, or pick one device to watch.', 'Run the body test: stand clear, then stand between the phone and the device.'] },
    'sungps.html': { t: 'Sun GPS', c: 'nature', s: ['back', 'mot', 'cmp'], d: 'Finds where you are on Earth from the sun’s angle and the clock, like a navigator, and maps the likely area.', steps: ['Stand outside with the sun visible; hold the phone upright.', 'Point the back at the sun while looking at the screen, until the sun sits in the circle.', 'Measure again an hour later to shrink the area. Compare with real GPS if you like.'], warn: 'Never look directly at the sun.' },
    'bridge.html': { t: 'Bridge Pulse', c: 'motion', s: ['mot'], d: 'Picks out the slow natural frequency a bridge or tall building sways at.', steps: ['Record a 40‑second reference off the bridge, phone resting on the floor or seat.', 'Record 40 seconds on the bridge (a footbridge works best).', 'Repeat on other days; frequencies that repeat are the bridge’s note.'] },
    'elevator.html': { t: 'Floor Counter', c: 'motion', s: ['mot'], d: 'Counts metres and floors travelled from an elevator’s push and brake, with no barometer.', steps: ['Set your current floor.', 'In the elevator tap “Start” and hold the phone still.', 'After a ride, calibrate with the true number of floors for better accuracy.'] },
    'skyglow.html': { t: 'Sky Darkness', c: 'nature', s: ['back', 'mot'], d: 'Stacks night‑sky frames to count stars and compare light pollution between places.', steps: ['At night go somewhere open, away from lamps.', 'Tap “Start”, cover the lens for 3 seconds, then lay the phone face down.', 'Don’t touch it for 15 seconds; compare counts across places.'] },
    'pupil.html': { t: 'Pupil Reflex', c: 'camera', s: ['front', 'scr', 'ai'], d: 'Flashes the screen and measures how many milliseconds your pupils take to constrict, and by how much.', steps: ['Sit in a dim room with brightness at maximum.', 'Hold the phone 20–25 cm away and look at the front camera.', 'Tap “Start” and try not to blink during the 4 flashes.'] },
    'pipes.html': { t: 'Pipe Listener', c: 'sound', s: ['mic', 'ai'], d: 'Presses against a wall or pipe to hear water flow, learns your home’s fixtures, and watches for leaks overnight.', steps: ['Press the phone’s bottom edge firmly against a pipe or wall.', 'Tap “Start listening”, then record “Quiet” and examples of each fixture.', 'Leave it running; steady flow while the house sleeps is flagged.'] },
    'shadow3d.html': { t: '3D from Shadows', c: 'camera', s: ['front', 'scr'], d: 'The screen lights you from four sides; from the shading, the page builds a 3D shape you can rotate.', steps: ['Darken the room and set brightness to maximum.', 'Hold the phone in front of your face at the set distance.', 'Tap “Capture”, stay still 4 seconds, then drag to rotate the model.'] },
    'timeslit.html': { t: 'Time Slice Camera', c: 'camera', s: ['cam'], d: 'Every line of the image is a different moment, so motion stretches and twists and time becomes space.', steps: ['Tap “Start camera” and choose a mode.', 'Move slowly in front of the camera, or aim at a street for photo‑finish.', 'Save any frame you like.'] },
    'room3d.html': { t: 'Room 360', c: 'camera', s: ['cam', 'mot', 'cmp'], d: 'Stand in place and turn slowly; the page stitches your camera photos onto a bubble around you that you can look inside.', steps: ['Tap “Start capture” and allow camera and motion access.', 'Hold the phone in front of you and turn your whole body slowly: once looking straight, once a little up, once a little down.', 'Each square turns green when its photo is taken. Then tap “Build the bubble” and turn your phone to look around, or drag with a finger.'] },
    'roomwalk.html': { t: 'Room Walk 3D', c: 'camera', s: ['cam', 'mot', 'cmp', 'ai'], d: 'One slow spin, then on‑device AI guesses the depth of every photo and builds a 3D model of your room you can actually walk through.', steps: ['Capture exactly like Room 360: stand in place, one slow spin at three tilts, without moving your feet.', 'Tap “Build the 3D”. The first time, the depth model downloads once (about 50 MB; Wi‑Fi helps) and each photo takes a few seconds.', 'In the scene: drag on the left half of the screen to walk, on the right half to look around.'], warn: 'Depth is an AI guess, not a measurement: sizes are approximate, and there is no collision, so you can walk through walls.' }
  };
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const app = A[file];
  window.__EXPERIMENTS = { apps: A, cats: C, sensors: S };
  if (!app) return;
  const cat = C[app.c];
  document.documentElement.style.setProperty('--acc', cat.acc);
  if (app.light) document.documentElement.classList.add('force-light');
  const seen = () => { try { return localStorage.getItem('xp.seen.' + file); } catch (e) { return null; } };
  function header() {
    const wrap = document.querySelector('.wrap'); if (!wrap || document.querySelector('.xp-hero')) return;
    const h1 = wrap.querySelector('h1'); if (h1) { h1.classList.add('xp-hidden'); const n = h1.nextElementSibling; if (n && n.matches('p.sub')) n.classList.add('xp-orig-sub'); }
    const el = document.createElement('header'); el.className = 'xp-hero';
    el.innerHTML = `<nav class="xp-top"><a href="index.html" class="xp-back">← All experiments</a><span class="xp-chip">${cat.name}</span></nav>
      <h1 class="xp-title">${app.t}</h1><p class="xp-tag">${app.d}</p>
      <div class="xp-sensors">${app.s.map(k => `<span>${S[k]}</span>`).join('')}</div>
      <details class="xp-how" ${seen() ? '' : 'open'}><summary>Quick start</summary><ol>${app.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      ${app.warn ? `<p class="xp-warn">⚠ ${app.warn}</p>` : ''}
      <p class="xp-fine">Works in current Chrome, Safari, Edge and Samsung Internet on iPhone and Android. Open it from an https link and allow the permissions it asks for. Everything runs on your phone; nothing is uploaded.</p></details>`;
    wrap.insertBefore(el, wrap.firstChild);
    try { localStorage.setItem('xp.seen.' + file, '1'); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', header); else header();
})();
