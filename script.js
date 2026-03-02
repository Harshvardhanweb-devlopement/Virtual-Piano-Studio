const keys = Array.from(document.querySelectorAll('.key'));
const trackKey = document.querySelector('#trackKey');
const recordStatus = document.querySelector('#recordStatus');
const showKeysCheckbox = document.querySelector('#showKeys');
const sustainCheckbox = document.querySelector('#sustain');
const volumeSlider = document.querySelector('#volume');
const volumeValue = document.querySelector('#volumeValue');
const speedSlider = document.querySelector('#playbackSpeed');
const speedValue = document.querySelector('#speedValue');
const recordBtn = document.querySelector('#recordBtn');
const playBtn = document.querySelector('#playBtn');
const demoBtn = document.querySelector('#demoBtn');
const clearBtn = document.querySelector('#clearBtn');
const noteHistory = document.querySelector('#noteHistory');
const notesCount = document.querySelector('#notesCount');
const piano = document.querySelector('.piano-keys');

const STORAGE_KEY = 'virtual-piano-recording-v2';
const keyMap = new Map(keys.map((key) => [key.dataset.key, key]));
const pressedKeys = new Set();
const history = [];

let volume = Number(volumeSlider.value) / 100;
let playbackSpeed = Number(speedSlider.value) / 100;
let isRecording = false;
let recordStart = 0;
let recording = [];
let isPlaybackRunning = false;
let noteCount = 0;

const demoSequence = [
  { keyId: 'a', time: 0 },
  { keyId: 'd', time: 240 },
  { keyId: 'f', time: 470 },
  { keyId: 'h', time: 700 },
  { keyId: 'f', time: 940 },
  { keyId: 'd', time: 1180 },
  { keyId: 'c', time: 1410 },
  { keyId: 'g', time: 1650 },
  { keyId: 'k', time: 1880 },
  { keyId: 'g', time: 2110 },
  { keyId: 'd', time: 2340 },
  { keyId: 'a', time: 2580 },
];

const setStatus = (message) => {
  trackKey.textContent = message;
};

const setRecordStatus = (message) => {
  recordStatus.textContent = message;
};

const updateVolumeView = () => {
  volumeValue.textContent = `${volumeSlider.value}%`;
};

const updateSpeedView = () => {
  speedValue.textContent = `${playbackSpeed.toFixed(1)}x`;
};

const updateStats = (keyId, note) => {
  noteCount += 1;
  notesCount.textContent = String(noteCount);

  history.unshift(`${keyId.toUpperCase()}(${note})`);
  if (history.length > 6) {
    history.pop();
  }

  noteHistory.textContent = history.join(' ') || '-';
};

const createAudio = (note) => {
  const audio = new Audio(`Sound/sounds_${note}.mp3`);
  audio.volume = volume;
  return audio;
};

const pressAnimation = (keyEl) => {
  keyEl.classList.add('active');
  if (sustainCheckbox.checked) {
    keyEl.classList.add('hold');
  }

  window.setTimeout(() => keyEl.classList.remove('active'), 130);
};

const releaseHold = (keyEl) => {
  if (!keyEl) {
    return;
  }

  if (!sustainCheckbox.checked) {
    keyEl.classList.remove('hold');
  }
};

const registerRecording = (keyId) => {
  if (!isRecording) {
    return;
  }

  recording.push({ keyId, time: performance.now() - recordStart });
  setRecordStatus(`Recording... ${recording.length} notes`);
};

const playKey = (keyEl, fromPlayback = false) => {
  if (!keyEl) {
    return;
  }

  const note = keyEl.dataset.note;
  const keyId = keyEl.dataset.key;

  createAudio(note).play().catch(() => {
    setStatus('Audio failed to play (file missing or blocked)');
  });

  pressAnimation(keyEl);
  updateStats(keyId, note);
  setStatus(`Playing ${note} from key ${keyId.toUpperCase()}`);

  if (!fromPlayback) {
    registerRecording(keyId);
  }
};

const persistRecording = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recording));
};

const restoreRecording = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    setRecordStatus('Recording: empty');
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      setRecordStatus('Recording: empty');
      return;
    }

    recording = parsed.filter((item) => keyMap.has(item.keyId) && Number.isFinite(item.time));
    setRecordStatus(recording.length ? `Recording restored (${recording.length} notes)` : 'Recording: empty');
  } catch {
    setRecordStatus('Recording: empty');
  }
};

const startRecording = () => {
  isRecording = true;
  recording = [];
  recordStart = performance.now();
  recordBtn.textContent = 'Stop Record';
  recordBtn.classList.add('recording');
  setRecordStatus('Recording started');
};

const stopRecording = () => {
  isRecording = false;
  recordBtn.textContent = 'Start Record';
  recordBtn.classList.remove('recording');

  persistRecording();
  setRecordStatus(recording.length ? `Recording saved (${recording.length} notes)` : 'Recording stopped (empty)');
};

const runTimedSequence = (sequence, label) => {
  if (!sequence.length || isPlaybackRunning) {
    return;
  }

  isPlaybackRunning = true;
  playBtn.disabled = true;
  demoBtn.disabled = true;
  setRecordStatus(`${label} started`);

  sequence.forEach((entry) => {
    const delay = entry.time / playbackSpeed;
    window.setTimeout(() => playKey(keyMap.get(entry.keyId), true), delay);
  });

  const lastTime = sequence[sequence.length - 1].time / playbackSpeed;
  window.setTimeout(() => {
    isPlaybackRunning = false;
    playBtn.disabled = false;
    demoBtn.disabled = false;
    setRecordStatus(`${label} complete`);
  }, lastTime + 220);
};

keys.forEach((keyEl) => {
  keyEl.addEventListener('pointerdown', () => {
    playKey(keyEl);
    keyEl.classList.add('hold');
  });

  keyEl.addEventListener('pointerup', () => releaseHold(keyEl));
  keyEl.addEventListener('pointerleave', () => releaseHold(keyEl));
});

document.addEventListener('keydown', (event) => {
  const keyId = event.key.toLowerCase();

  if (event.repeat || pressedKeys.has(keyId) || !keyMap.has(keyId)) {
    return;
  }

  const keyEl = keyMap.get(keyId);
  pressedKeys.add(keyId);
  playKey(keyEl);
  keyEl.classList.add('hold');
});

document.addEventListener('keyup', (event) => {
  const keyId = event.key.toLowerCase();
  pressedKeys.delete(keyId);
  releaseHold(keyMap.get(keyId));
});

volumeSlider.addEventListener('input', () => {
  volume = Number(volumeSlider.value) / 100;
  updateVolumeView();
});

speedSlider.addEventListener('input', () => {
  playbackSpeed = Number(speedSlider.value) / 100;
  updateSpeedView();
});

showKeysCheckbox.addEventListener('change', () => {
  piano.classList.toggle('keys-hidden', !showKeysCheckbox.checked);
});

sustainCheckbox.addEventListener('change', () => {
  if (!sustainCheckbox.checked) {
    keys.forEach((keyEl) => keyEl.classList.remove('hold'));
  }
});

recordBtn.addEventListener('click', () => {
  if (isPlaybackRunning) {
    return;
  }

  if (isRecording) {
    stopRecording();
    return;
  }

  startRecording();
});

playBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  }

  runTimedSequence(recording, 'Playback');
});

demoBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  }

  runTimedSequence(demoSequence, 'Demo');
});

clearBtn.addEventListener('click', () => {
  recording = [];
  persistRecording();
  setRecordStatus('Recording cleared');
});

updateVolumeView();
updateSpeedView();
restoreRecording();
setStatus('Ready to play');
