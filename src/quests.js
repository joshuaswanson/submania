import { t } from './i18n.js';

// A few things to do at once while the waves keep coming. Each finished quest pays out and makes way for a new one.
const ACTIVE = 3;
// A finished quest stays on show this long before the next one takes its place.
const LINGER = 1800;

const QUESTS = [
  { id: 'sink', text: 'Sink {n} enemy subs', goal: (w) => 4 + w, reward: 25 },
  { id: 'gunner', text: 'Sink {n} gunner subs', goal: (w) => 2 + Math.floor(w / 3), reward: 35, from: 2 },
  { id: 'streak', text: 'Sink {n} subs in a row without getting hit', goal: (w) => 3 + Math.floor(w / 3), reward: 45 },
  { id: 'mines', text: 'Shoot {n} sea mines', goal: (w) => 3 + Math.floor(w / 2), reward: 20 },
  { id: 'mine_bump', text: 'Bump an enemy sub into a sea mine', goal: () => 1, reward: 40, from: 2 },
  { id: 'grapple', text: 'Sink {n} subs with the grapple claw', goal: (w) => 2 + Math.floor(w / 4), reward: 40, needs: 'grapple' },
  { id: 'dazzle', text: 'Dazzle {n} enemies with your spotlight', goal: (w) => 3 + Math.floor(w / 3), reward: 30, needs: 'spotlight' },
  { id: 'coins', text: 'Collect {n} coins', goal: (w) => 50 + 10 * Math.round(1.5 * w), reward: 20 },
  { id: 'upgrade', text: 'Buy {n} upgrades', goal: () => 2, reward: 15 },
  { id: 'jump', text: 'Launch out of the water {n} times', goal: () => 3, reward: 20 },
  { id: 'gulls', text: 'Send the seagulls flying', goal: () => 1, reward: 15 },
  { id: 'trench', text: 'Touch the floor of a deep trench', goal: () => 1, reward: 35, from: 2 },
  { id: 'ice', text: 'Smash {n} plates of pack ice', goal: () => 12, reward: 35, from: 3 },
];

let game = null;
let active = false;
let quests = [];
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
  for (let i = 0; i < ACTIVE; i++) quests.push(deal());
  changed?.(quests);
}

function deal(skip) {
  const wave = Math.max(1, game.wave);
  const levels = game.player.levels;
  const taken = new Set([skip, ...quests.map((q) => q?.def.id)]);
  const open = QUESTS.filter((d) => !taken.has(d.id) && wave >= (d.from ?? 0) && (!d.needs || levels[d.needs] > 0));
  const def = open[Math.floor(Math.random() * open.length)];
  return {
    uid: ++serial, def, count: 0, goal: def.goal(wave), done: false,
    reward: 5 * Math.round((def.reward * (1 + 0.2 * (wave - 1))) / 5),
    get text() {
      return t(`quest.${def.id}.text`, { n: this.goal }, def.text);
    },
  };
}

export function progress(id, amount = 1) {
  if (!active) return;
  const q = quests.find((x) => x.def.id === id && !x.done);
  if (!q) return;
  q.count = Math.min(q.goal, q.count + amount);
  if (q.count >= q.goal) finish(q);
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
