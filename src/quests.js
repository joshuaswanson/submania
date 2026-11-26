import { t } from './i18n.js';

// A few things to do at once while the waves keep coming. Each finished quest pays out and makes way for a new one.
const ACTIVE = 3;
// A finished quest stays on show this long before the next one takes its place.
const LINGER = 1800;

// Each dive opens with these, one quick step at a time, before the regular quests come in.
const STARTERS = [
  { id: 'first_upgrade', on: 'upgrade', icon: 'hull', text: 'Buy your first upgrade', goal: () => 1, reward: 10 },
  { id: 'first_sink', on: 'sink', icon: 'cannon', text: 'Sink an enemy sub', goal: () => 1, reward: 10 },
  { id: 'jump', icon: 'propulsion', text: 'Launch out of the water', goal: () => 1, reward: 10 },
  { id: 'dolphins', icon: 'propulsion', text: 'Leap out of the water alongside the dolphins', goal: () => 1, reward: 15 },
  { id: 'gulls', icon: 'propulsion', text: 'Send the seagulls flying', goal: () => 1, reward: 10 },
];

const QUESTS = [
  { id: 'sink', icon: 'cannon', text: 'Sink {n} enemy subs', goal: (w) => 4 + w, reward: 15 },
  { id: 'gunner', icon: 'torpedo', text: 'Sink {n} gunner subs', goal: (w) => 2 + Math.floor(w / 3), reward: 20, from: 2 },
  { id: 'streak', icon: 'shield', text: 'Sink {n} subs in a row without getting hit', goal: (w) => 3 + Math.floor(w / 3), reward: 25 },
  { id: 'mines', icon: 'missile', text: 'Shoot {n} sea mines', goal: (w) => 3 + Math.floor(w / 2), reward: 10 },
  { id: 'mine_bump', icon: 'hull', text: 'Bump an enemy sub into a sea mine', goal: () => 1, reward: 20, from: 2 },
  { id: 'grapple', icon: 'grapple', text: 'Sink {n} subs with the grapple claw', goal: (w) => 2 + Math.floor(w / 4), reward: 20, needs: 'grapple' },
  { id: 'dazzle', icon: 'spotlight', text: 'Dazzle {n} enemies with your spotlight', goal: (w) => 3 + Math.floor(w / 3), reward: 15, needs: 'spotlight' },
  { id: 'coins', icon: 'coin', text: 'Collect {n} coins', goal: (w) => 50 + 10 * Math.round(1.5 * w), reward: 10 },
  { id: 'upgrade', icon: 'hull', text: 'Buy {n} upgrades', goal: () => 2, reward: 10 },
  { id: 'trench', icon: 'sonar', text: 'Touch the floor of a deep trench', goal: () => 1, reward: 20, from: 2 },
  { id: 'ice', icon: 'hull', text: 'Smash {n} plates of pack ice', goal: () => 12, reward: 20, from: 3 },
];

let game = null;
let active = false;
let quests = [];
let starters = [];
// Everything done so far this dive, so a starter already done never shows up.
const happened = new Set();
let serial = 0;
let changed = null;
let completed = null;

export function onQuestsChanged(fn) {
  changed = fn;
}

export function onQuestComplete(fn) {
  completed = fn;
}

export function setQuestsActive(on) {
  active = on;
}

export function startQuests(g) {
  game = g;
  quests = [];
  starters = [...STARTERS];
  happened.clear();
  for (let i = 0; i < ACTIVE; i++) quests.push(deal());
  changed?.(quests);
}

function deal(skip) {
  const wave = Math.max(1, game.wave);
  const levels = game.player.levels;
  const taken = new Set([skip, ...quests.map((q) => q?.def.id)]);
  const open = QUESTS.filter((d) => !taken.has(d.id) && wave >= (d.from ?? 0) && (!d.needs || levels[d.needs] > 0));
  starters = starters.filter((d) => !happened.has(d.on ?? d.id));
  const def = starters.length ? starters.splice(Math.floor(Math.random() * starters.length), 1)[0]
    : open[Math.floor(Math.random() * open.length)];
  return {
    uid: ++serial, def, count: 0, goal: def.goal(wave), done: false,
    reward: 5 * Math.round((def.reward * (1 + 0.15 * (wave - 1))) / 5),
    get text() {
      return t(`quest.${def.id}.text`, { n: this.goal }, def.text);
    },
  };
}

export function progress(event, amount = 1) {
  if (!active) return;
  happened.add(event);
  const hits = quests.filter((q) => (q.def.on ?? q.def.id) === event && !q.done);
  if (!hits.length) return;
  for (const q of hits) {
    q.count = Math.min(q.goal, q.count + amount);
    if (q.count >= q.goal) finish(q);
  }
  changed?.(quests);
}

// Progress that only counts unbroken, such as a streak of sinkings, starts over.
export function setback(id) {
  const q = quests.find((x) => x.def.id === id && !x.done);
  if (!q || q.count === 0) return;
  q.count = 0;
  changed?.(quests);
}

function finish(q) {
  q.done = true;
  completed?.(q);
  setTimeout(() => {
    if (!quests.includes(q)) return;
    quests[quests.indexOf(q)] = deal(q.def.id);
    changed?.(quests);
  }, LINGER);
}
