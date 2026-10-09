import * as THREE from 'three';
import { NPCS } from './dialogue.js';

const canvas = document.getElementById('game-canvas');
const promptEl = document.getElementById('prompt-near');
const dialogueEl = document.getElementById('dialogue-panel');
const dialogueName = document.getElementById('dialogue-name');
const dialogueRole = document.getElementById('dialogue-role');
const dialogueText = document.getElementById('dialogue-text');
const tipEl = document.getElementById('hud-tip');
const zoneLabelsEl = document.getElementById('zone-labels');

const INTERACT_DIST = 3.2;
const PLAYER_SPEED = 6;
const WORLD = { w: 28, d: 18, wallH: 3.2 };

const keys = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false };
let stick = { x: 0, y: 0 };

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0a0c0e);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0c0e, 18, 42);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);

const hemi = new THREE.HemisphereLight(0xb8c4d8, 0x1a1e24, 0.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff5e8, 0.85);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
scene.add(sun);

const fill = new THREE.PointLight(0x4ce0c0, 0.35, 22);
fill.position.set(-6, 2.5, 0);
scene.add(fill);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.92, metalness: 0.05 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.w, WORLD.d), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(WORLD.w, 28, 0x2a3540, 0x222830);
grid.position.y = 0.02;
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.08 })
  );
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.88 });
function wall(w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

const hw = WORLD.w / 2;
const hd = WORLD.d / 2;
const wh = WORLD.wallH;
wall(WORLD.w, wh, 0.35, 0, 0, -hd);
wall(WORLD.w, wh, 0.35, 0, 0, hd);
wall(0.35, wh, WORLD.d, -hw, 0, 0);
wall(0.35, wh, WORLD.d, hw, 0, 0);

const divider = wall(0.2, wh * 0.85, WORLD.d - 2, 0, 0, 0);
divider.material = new THREE.MeshStandardMaterial({ color: 0x353c48, roughness: 0.9 });

const itAccent = 0x3d7ee8;
const designAccent = 0xe8a84c;

function deskCluster(cx, cz, accent) {
  box(2.2, 0.75, 1, 0x3a4048, cx, 0, cz);
  box(1.4, 0.05, 0.9, 0x252a30, cx, 0.76, cz);
  const mon = box(0.9, 0.55, 0.06, accent, cx, 1.1, cz - 0.35);
  mon.material.emissive = new THREE.Color(accent);
  mon.material.emissiveIntensity = 0.25;
}

deskCluster(-7, -4, itAccent);
deskCluster(-7, 3, itAccent);
box(1.8, 0.4, 1.8, 0x2e3540, -9, 0, 0);

deskCluster(7, -3, designAccent);
deskCluster(7, 4, designAccent);
box(2.4, 0.35, 1.2, 0x3d3548, 9, 0, 0.5);

box(3.5, 0.9, 2, 0x2a3238, -5, 0, 6);
box(3.5, 0.9, 2, 0x2a3238, 5, 0, -6);

const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.35, 0.7, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0x4ce0c0, roughness: 0.6 })
);
body.castShadow = true;
body.position.y = 0.85;
player.add(body);
const visor = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.2, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x0a0c0e })
);
visor.position.set(0, 1.25, 0.15);
player.add(visor);
player.position.set(0, 0, 7);
scene.add(player);

function makeNpc(key, accent, x, z) {
  const g = new THREE.Group();
  g.userData.npcKey = key;
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.65, 6, 12),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.65 })
  );
  torso.castShadow = true;
  torso.position.y = 0.82;
  g.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8c4a8, roughness: 0.8 })
  );
  head.castShadow = true;
  head.position.y = 1.45;
  g.add(head);
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

const npcJordan = makeNpc('jordan', itAccent, -7, -1);
const npcAvery = makeNpc('avery', designAccent, 7, 1);

const zoneMarkers = [
  { label: 'IT', x: -7, z: -2, el: null },
  { label: 'Design', x: 7, z: 2, el: null },
];

zoneMarkers.forEach((z) => {
  const el = document.createElement('div');
  el.className = 'zone-label';
  el.textContent = z.label;
  zoneLabelsEl.appendChild(el);
  z.el = el;
});

let dialogueNpc = null;
let beatIndex = 0;

function openDialogue(npcKey) {
  const data = NPCS[npcKey];
  if (!data) return;
  if (dialogueNpc !== npcKey) {
    dialogueNpc = npcKey;
    beatIndex = 0;
  }
  dialogueName.textContent = data.name;
  dialogueRole.textContent = data.role;
  dialogueText.textContent = data.beats[beatIndex];
  dialogueEl.classList.add('is-open');
  beatIndex = Math.min(beatIndex + 1, data.beats.length);
}

function advanceDialogue() {
  if (!dialogueNpc) return;
  const data = NPCS[dialogueNpc];
  if (beatIndex >= data.beats.length) {
    closeDialogue();
    return;
  }
  dialogueText.textContent = data.beats[beatIndex];
  beatIndex += 1;
}

function closeDialogue() {
  dialogueEl.classList.remove('is-open');
  dialogueNpc = null;
  beatIndex = 0;
}

function nearestNpc() {
  const npcs = [npcJordan, npcAvery];
  let best = null;
  let bestD = INTERACT_DIST;
  for (const n of npcs) {
    const d = player.position.distanceTo(n.position);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function tryInteractFromPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([npcJordan, npcAvery], true);
  if (hits.length) {
    let root = hits[0].object;
    while (root && !root.userData.npcKey) root = root.parent;
    const key = root?.userData?.npcKey;
    const npc = key === 'jordan' ? npcJordan : key === 'avery' ? npcAvery : null;
    if (npc && player.position.distanceTo(npc.position) < INTERACT_DIST + 1.5) {
      if (dialogueEl.classList.contains('is-open') && dialogueNpc === key) advanceDialogue();
      else openDialogue(key);
      return true;
    }
  }
  return false;
}

function interact() {
  const near = nearestNpc();
  if (!near) return;
  const key = near.userData.npcKey;
  if (dialogueEl.classList.contains('is-open') && dialogueNpc === key) advanceDialogue();
  else openDialogue(key);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.w = keys.up = true;
  if (k === 's' || e.key === 'ArrowDown') keys.s = keys.down = true;
  if (k === 'a' || e.key === 'ArrowLeft') keys.a = keys.left = true;
  if (k === 'd' || e.key === 'ArrowRight') keys.d = keys.right = true;
  if (k === 'e' || k === ' ') {
    e.preventDefault();
    if (dialogueEl.classList.contains('is-open')) advanceDialogue();
    else interact();
  }
  if (k === 'escape') closeDialogue();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.w = keys.up = false;
  if (k === 's' || e.key === 'ArrowDown') keys.s = keys.down = false;
  if (k === 'a' || e.key === 'ArrowLeft') keys.a = keys.left = false;
  if (k === 'd' || e.key === 'ArrowRight') keys.d = keys.right = false;
});

canvas.addEventListener('click', (e) => {
  if (!tryInteractFromPointer(e.clientX, e.clientY) && dialogueEl.classList.contains('is-open')) {
    advanceDialogue();
  }
});

dialogueEl.addEventListener('click', () => advanceDialogue());

const stickZone = document.getElementById('stick-zone');
const stickKnob = document.getElementById('stick-knob');
let stickTouchId = null;
let stickOrigin = { x: 0, y: 0 };

function stickFromTouch(clientX, clientY) {
  const max = 36;
  let dx = clientX - stickOrigin.x;
  let dy = clientY - stickOrigin.y;
  const len = Math.hypot(dx, dy);
  if (len > max) {
    dx = (dx / len) * max;
    dy = (dy / len) * max;
  }
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  stick.x = dx / max;
  stick.y = -dy / max;
}

stickZone.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    stickTouchId = t.identifier;
    const r = stickZone.getBoundingClientRect();
    stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    stickFromTouch(t.clientX, t.clientY);
  },
  { passive: false }
);

stickZone.addEventListener(
  'touchmove',
  (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickTouchId) {
        e.preventDefault();
        stickFromTouch(t.clientX, t.clientY);
      }
    }
  },
  { passive: false }
);

function endStick() {
  stickTouchId = null;
  stick.x = stick.y = 0;
  stickKnob.style.transform = '';
}

stickZone.addEventListener('touchend', endStick);
stickZone.addEventListener('touchcancel', endStick);

let tipHidden = false;
setTimeout(() => {
  if (!tipHidden) {
    tipEl.classList.add('is-hidden');
    tipHidden = true;
  }
}, 12000);

const clock = new THREE.Clock();
const camOffset = new THREE.Vector3(0, 4.2, -7.5);
const camLook = new THREE.Vector3();

function clampPlayer() {
  const margin = 0.5;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -hw + margin, hw - margin);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -hd + margin, hd - margin);
}

function resize() {
  const parent = canvas.parentElement;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

function updateZoneLabels() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  zoneMarkers.forEach((z) => {
    const v = new THREE.Vector3(z.x, 2.8, z.z);
    v.project(camera);
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    z.el.style.left = `${x}px`;
    z.el.style.top = `${y}px`;
    z.el.style.opacity = v.z < 1 ? '1' : '0';
  });
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  let mx = 0;
  let mz = 0;
  if (keys.w || keys.up) mz -= 1;
  if (keys.s || keys.down) mz += 1;
  if (keys.a || keys.left) mx -= 1;
  if (keys.d || keys.right) mx += 1;
  mx += stick.x;
  mz += stick.y;

  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    const yaw = Math.atan2(mx, mz);
    player.rotation.y = yaw;
    player.position.x += mx * PLAYER_SPEED * dt;
    player.position.z += mz * PLAYER_SPEED * dt;
    if (!tipHidden && len > 0.2) {
      tipEl.classList.add('is-hidden');
      tipHidden = true;
    }
  }

  clampPlayer();

  const near = nearestNpc();
  if (near && !dialogueEl.classList.contains('is-open')) {
    promptEl.classList.add('is-visible');
    promptEl.textContent = `Talk to ${NPCS[near.userData.npcKey].name} — E or click`;
  } else if (dialogueEl.classList.contains('is-open')) {
    promptEl.classList.add('is-visible');
    promptEl.textContent = 'E or click for next line · Esc to close';
  } else {
    promptEl.classList.remove('is-visible');
  }

  const bob = Math.sin(clock.elapsedTime * 2) * 0.02;
  npcJordan.position.y = bob;
  npcAvery.position.y = bob * 0.8;

  const camPos = camOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
  camPos.add(player.position);
  camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
  camLook.copy(player.position);
  camLook.y += 1.1;
  camera.lookAt(camLook);

  updateZoneLabels();
  renderer.render(scene, camera);
}

tick();
