import { t } from './i18n.js';

// A few things to do at once while the waves keep coming. Each finished quest pays out and makes way for a new one.
const ACTIVE = 3;
// A finished quest stays on show this long before the next one takes its place.
const LINGER = 1800;

// Each dive opens with these, one quick step at a time, before the regular quests come in.
const STARTERS = [
  { id: 'first_upgrade', on: 'upgrade', icon: 'wrench', text: 'Buy your first upgrade', goal: () => 1, reward: 10 },
  { id: 'first_sink', on: 'sink', icon: 'target', text: 'Sink an enemy sub', goal: () => 1, reward: 10 },
  { id: 'jump', icon: 'jump', text: 'Launch out of the water', goal: () => 1, reward: 10 },
  { id: 'dolphins', icon: 'fin', text: 'Leap out of the water alongside the dolphins', goal: () => 1, reward: 15 },
  { id: 'gulls', icon: 'bird', text: 'Send the seagulls flying', goal: () => 1, reward: 10 },
];

const QUESTS = [
  { id: 'sink', icon: 'target', text: 'Sink {n} enemy subs', goal: (w) => 4 + w, reward: 15 },
  { id: 'gunner', icon: 'target', text: 'Sink {n} gunner subs', goal: (w) => 2 + Math.floor(w / 3), reward: 20, from: 2 },
  { id: 'streak', icon: 'bolt', text: 'Sink {n} subs in a row without getting hit', goal: (w) => 3 + Math.floor(w / 3), reward: 25 },
  { id: 'mines', icon: 'mine', text: 'Shoot {n} sea mines', goal: (w) => 3 + Math.floor(w / 2), reward: 10 },
  { id: 'mine_bump', icon: 'mine', text: 'Bump an enemy sub into a sea mine', goal: () => 1, reward: 20, from: 2 },
  { id: 'grapple', icon: 'hook', text: 'Sink {n} subs with the grapple claw', goal: (w) => 2 + Math.floor(w / 4), reward: 20, needs: 'grapple' },
  { id: 'dazzle', icon: 'flash', text: 'Dazzle {n} enemies with your spotlight', goal: (w) => 3 + Math.floor(w / 3), reward: 15, needs: 'spotlight' },
  { id: 'coins', icon: 'coins', text: 'Collect {n} coins', goal: (w) => 50 + 10 * Math.round(1.5 * w), reward: 10 },
  { id: 'upgrade', icon: 'wrench', text: 'Buy {n} upgrades', goal: () => 2, reward: 10 },
  { id: 'trench', icon: 'trench', text: 'Touch the floor of a deep trench', goal: () => 1, reward: 20, from: 2 },
  { id: 'ice', icon: 'snowflake', text: 'Smash {n} plates of pack ice', goal: () => 12, reward: 20, from: 3 },
  { id: 'boss', icon: 'skull', text: 'Sink Big Bad Barnacle', goal: () => 1, reward: 30, from: 4 },
  { id: 'angler', icon: 'eye', text: 'Swim up to an anglerfish as its lure flashes', goal: () => 1, reward: 20, from: 2 },
  { id: 'whale_song', icon: 'note', text: 'Hear the humpback sing', goal: () => 1, reward: 15 },
  { id: 'whale_shark', icon: 'eye', text: 'Spot the whale shark cruising the open ocean', goal: () => 1, reward: 15 },
  { id: 'sperm_whale', icon: 'flash', text: 'Shine your spotlight on the sperm whale down in a trench', goal: () => 1, reward: 25, needs: 'spotlight' },
  { id: 'shipwreck', icon: 'anchor', text: 'Shine your spotlight on the rusted fishing boat on a trench floor', goal: () => 1, reward: 20, needs: 'spotlight' },
  { id: 'north_pole', icon: 'flag', text: 'Reach the North Pole', goal: () => 1, reward: 30, from: 3 },
  { id: 'south_pole', icon: 'flag', text: 'Reach the South Pole', goal: () => 1, reward: 30, from: 3 },
  { id: 'polar_bear', icon: 'eye', text: 'Spot a polar bear on the ice', goal: () => 1, reward: 20, from: 3 },
  { id: 'penguin_swim', icon: 'waves', text: 'Swim alongside a diving penguin', goal: () => 1, reward: 20, from: 3 },
  { id: 'penguin_bowl', icon: 'splash', text: 'Ram a floe and knock {n} penguins into the sea', goal: () => 3, reward: 25, from: 3 },
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
