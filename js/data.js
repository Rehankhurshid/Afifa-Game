'use strict';
/* Game content: characters, stats, story text and level setup — adapted from the "Brute Invasion" script. */

// Sprite metadata: ax = horizontal anchor of the body (fraction of width), face = [x, y, radius] fractions for portraits.
const SPRITES = {
  godwin:    { ax: 0.42, face: [0.44, 0.40, 0.30] },
  falco:     { ax: 0.34, face: [0.31, 0.33, 0.27] },
  mortt:     { ax: 0.33, face: [0.31, 0.31, 0.27] },
  thea:      { ax: 0.46, face: [0.48, 0.36, 0.25] },
  june:      { ax: 0.46, face: [0.47, 0.34, 0.25] },
  destroyer: { ax: 0.40, face: [0.42, 0.30, 0.25] },
  hadog:     { ax: 0.46, face: [0.50, 0.30, 0.24] },
  giant:     { ax: 0.38, face: [0.37, 0.33, 0.25] },
  ilydan:    { ax: 0.45, face: [0.46, 0.33, 0.24] },
  keljeon:   { ax: 0.37, face: [0.35, 0.34, 0.24] },
};

/*
 * Combat stats.
 * range: melee reach beyond body radius (melee) or firing distance (ranged)
 * atk: seconds between attacks, breach: base damage dealt when reaching the enemy gate
 */
const UNITS = {
  // ---------------- Humans ----------------
  falco: {
    side: 'human', name: 'Commando Falco', role: 'Swordsman', cost: 6, cd: 3.2,
    hp: 300, dmg: 22, atk: 0.8, range: 16, speed: 66, r: 24, h: 104, melee: true, weapon: 'sword', breach: 12, armor: 0.15,
    blurb: 'Strongest. Can take the most blows.',
  },
  mortt: {
    side: 'human', name: 'Lancer Mortt', role: 'Spearman', cost: 5, cd: 2.6,
    hp: 120, dmg: 30, atk: 1.7, range: 360, speed: 46, r: 22, h: 104, melee: false, weapon: 'spear', breach: 8, pierce: true,
    blurb: 'Never misses. Spears pierce a second foe.',
  },
  thea: {
    side: 'human', name: 'Queen Thea', role: 'Archer', cost: 3, cd: 1.6,
    hp: 85, dmg: 12, atk: 0.85, range: 280, speed: 56, r: 20, h: 98, melee: false, weapon: 'bow', breach: 6, volleyEvery: 4,
    blurb: 'Swift arrows. Every 4th shot is a triple volley.',
  },
  june: {
    side: 'human', name: 'Warrior June', role: 'Knifewoman', cost: 2, cd: 1.0,
    hp: 72, dmg: 9, atk: 0.42, range: 12, speed: 96, r: 18, h: 94, melee: true, weapon: 'dagger', breach: 5, dodge: 0.35,
    blurb: 'Lightning fast. Dodges attacks from all directions.',
  },
  // ---------------- Beasts ----------------
  keljeon: {
    side: 'beast', name: 'Gryphon Keljeon', role: 'Swordsman', cost: 4,
    hp: 160, dmg: 18, atk: 0.8, range: 16, speed: 60, r: 20, h: 98, melee: true, weapon: 'sword', breach: 8, dodge: 0.15, nightBonus: 1.5,
    blurb: 'Dark Elf. Stronger in darkness. Shadow-steps attacks.',
  },
  ilydan: {
    side: 'beast', name: 'Ruthless Ilydan', role: 'Archer', cost: 3,
    hp: 90, dmg: 12, atk: 1.0, range: 250, speed: 50, r: 20, h: 96, melee: false, weapon: 'bow', breach: 6, revive: true,
    blurb: 'Amphibian archer. Resurrects once after falling.',
  },
  giant: {
    side: 'beast', name: 'Giant Incarnated', role: 'Minotaur', cost: 6,
    hp: 300, dmg: 24, atk: 1.1, range: 18, speed: 52, r: 24, h: 108, melee: true, weapon: 'club', breach: 12, enrage: 0.5,
    blurb: 'Enrages at half health — faster and deadlier.',
  },
  hadog: {
    side: 'beast', name: 'Fatty Hadog', role: 'Hammer Troll', cost: 8,
    hp: 480, dmg: 30, atk: 1.8, range: 22, speed: 32, r: 30, h: 134, melee: true, weapon: 'hammer', breach: 16, armor: 0.4, splash: 70,
    blurb: 'Immune to most blows. Hammer smashes crush groups.',
  },
  destroyer: {
    side: 'beast', name: 'Insinuated Destroyer', role: 'Leader', cost: 0,
    hp: 460, dmg: 55, atk: 1.0, range: 26, speed: 30, r: 36, h: 150, melee: true, weapon: 'axe', breach: 40, splash: 80,
    onlyHurtBy: 'dagger', boss: true,
    blurb: 'Only a magic dagger can wound him.',
  },
};

const HUMAN_ROSTER = ['falco', 'mortt', 'thea', 'june'];
const BEAST_ROSTER = ['keljeon', 'ilydan', 'giant', 'hadog'];

// Profiles for the Characters screen (bios from the script).
const PROFILES = {
  humans: [
    {
      key: 'godwin', name: 'Lord Godwin', role: 'Emperor · Leader of the Humans',
      stats: { Health: 8, Attack: 7, Speed: 5, Range: 6 },
      special: 'Royal Volley — rains flaming arrows on a whole lane.',
      bio: 'Lord Godwin (Emperor Hector) is a skilled warrior, chief architect of winning 3 Great Wars. His endurance is the source of the serenity and calm that he aims to spread. A humble, God-fearing man, he shuns the "other" ideology, and regards superhumans no less than himself. Learned and schooled in arts and sciences by his scientist parents, he made endless efforts to keep peace between the two species. The attack by the Superhumans is the last straw — he is finally ready to retaliate.',
    },
    {
      key: 'falco', name: 'Commando Falco', role: 'Swordsman',
      stats: { Health: 10, Attack: 7, Speed: 6, Range: 1 },
      special: 'Strongest. Can take the most blows.',
      bio: 'The most loyal servant of Lord Godwin, having served him for over 2 decades. His swiftness and lightning speed spares no enemy. Falco is believed to have defeated 10 lions single-handedly with his mighty sword. An orphan, he found shelter, love and care with Godwin. Though a skilled swordsman, Falco shrieks at the sight of blood.',
    },
    {
      key: 'mortt', name: 'Lancer Mortt', role: 'Spearman',
      stats: { Health: 4, Attack: 9, Speed: 4, Range: 10 },
      special: 'Never misses — his spears pierce through a second enemy.',
      bio: 'A cousin to Falco, Mortt came under the king\'s kinship 15 years ago as a weakling. Training under a vigorous warlord, he evolved into the greatest spear knight. Mortt can kill enemies from a great distance without missing a single aim. His insecurity about being "next best" makes him jealous of Falco — he tries to malign Falco instead of working on his skills, making him the subject of mockery behind his back.',
    },
    {
      key: 'thea', name: 'Queen Thea', role: 'Archer',
      stats: { Health: 3, Attack: 5, Speed: 6, Range: 8 },
      special: 'Every 4th shot unleashes a triple-arrow volley.',
      bio: 'Queen Thea is as fearless as a lion, as swift as a cheetah and as daring as a bull. Her elegance and beauty fool people into believing she is a timid lady — and that is when she unleashes her power. She has been Commando Falco\'s companion in many battles where the two of them took down massive armies alone.',
    },
    {
      key: 'june', name: 'Warrior June', role: 'Knifewoman',
      stats: { Health: 2, Attack: 4, Speed: 10, Range: 1 },
      special: 'Dodges 35% of attacks. Her dagger is magic against the Destroyer.',
      bio: 'June is famous for her ability to counter attacks from all directions. She can dart from one place to another in seconds. The ferocity unleashed on her by enemies during her early years transformed her into the rebel she is today. It is said that whoever gets her on the wrong foot is doomed and destroyed.',
    },
  ],
  beasts: [
    {
      key: 'destroyer', name: 'Insinuated Destroyer', role: 'Leader of the Beasts',
      stats: { Health: 10, Attack: 10, Speed: 2, Range: 2 },
      special: 'Cannot be harmed by bows or swords — only by a magic dagger.',
      bio: 'The oldest and strongest superhuman. Over 1200 years old, he is the by-product of excessive hybridism: starting off as a minotaur, continuous experiments and chemical injections turned him into a ruthless savage. His massive body, thorn-like horns, fiery eyes and sharp teeth make children run at his sight. He abhors humans for turning him into a devil, and kills enemies 10 times faster than the rest. He cannot be killed by ordinary bows or swords — only by a magic dagger attached to his own axe.',
    },
    {
      key: 'hadog', name: 'Fatty Hadog', role: 'Hammer Troll',
      stats: { Health: 10, Attack: 8, Speed: 1, Range: 2 },
      special: 'Takes 40% less damage. Hammer smashes hit groups.',
      bio: 'A hybrid of caveman and ape — a gigantic primitive troll who can even scare off elephants. His huge appearance makes everything around him seem tiny and powerless. It is said he can melt anything to dust when furious, and the coarseness of his body makes him immune to most blows. His hammer, passed down by his father, is believed to double his powers. He can see through closed eyes, and his huge elf-like ears hear noises across great distances.',
    },
    {
      key: 'giant', name: 'Giant Incarnated', role: 'Minotaur',
      stats: { Health: 8, Attack: 7, Speed: 5, Range: 1 },
      special: 'Enrages below half health — faster and deadlier.',
      bio: 'A minotaur with the strength of a bull and the IQ of a human. The sight of anything red makes him furious and unleashes his animal strength, yet his ability to think and rationalise gives him an added edge. He is the right hand of the Insinuated Destroyer and supplier of all the evil ideas — secretly planning to kill his leader after defeating the humans, to emerge as the ultimate ruler.',
    },
    {
      key: 'ilydan', name: 'Ruthless Ilydan', role: 'Archer',
      stats: { Health: 3, Attack: 5, Speed: 5, Range: 8 },
      special: 'Resurrects once after being defeated.',
      bio: 'As an amphibian, Ilydan can control immortality and resurrection. He is regarded as a reincarnation of Green Arrow for his excellent archery. Although timid and weak, he never forgives his enemies and goes to extreme lengths to fulfil his leader\'s commands. Humans mock him as a "Giant Bimbo", for he never thinks on his own and blindly follows the instructions of others.',
    },
    {
      key: 'keljeon', name: 'Gryphon Keljeon', role: 'Swordsman',
      stats: { Health: 5, Attack: 6, Speed: 6, Range: 1 },
      special: 'Stronger in darkness. Shadow-steps 15% of attacks.',
      bio: 'Half elf, half gryphon. A Dark Elf, Keljeon can manipulate darkness — his strength peaks after sunset until dawn, and his control of darkness lets him exercise his full power whenever he likes. A master swordsman, he is said to have sliced the giant Marbourne Mountain in two.',
    },
  ],
};

const LEVELS = [
  {
    num: 1,
    title: 'The Commander Generals',
    place: 'Earthling Fort · Mynstral Village',
    text: 'The Insinuated Destroyer sends his chosen Commander Generals to fight the Army Chiefs of Lord Godwin. Defeat the hybrids and scare them away! Don\'t lose hope if you fail — there is a second chance!',
    tip: 'Tip: Fatty Hadog shrugs off blows — Lancer Mortt\'s spears hit hardest.',
    bg: 'field',
    music: 'battle',
    aiRegen: 1.05,
    aiStart: 4,
    surge: 6,
    surgeEvery: 24,
    weights: { keljeon: 4, ilydan: 3, giant: 2, hadog: 1 },
    hpMult: 1,
    roars: [58, 26],
    night: false,
    boss: null,
  },
  {
    num: 2,
    title: 'Into the Brute Lair',
    place: 'Brute Cave · The Hybrid Lair',
    text: 'Congratulations on defeating the hybrids. We must not stop at scaring them. What if they attack us again? Let us go into their lair and defeat them, for once and all.',
    tip: 'Beware: Keljeon grows stronger in the dark… and the Destroyer himself awaits. Only a dagger can wound him!',
    bg: 'lair',
    music: 'battle',
    aiRegen: 1.1,
    aiStart: 6,
    surge: 6,
    surgeEvery: 22,
    weights: { keljeon: 4, ilydan: 3, giant: 3, hadog: 2 },
    hpMult: 1.1,
    roars: [68, 22],
    night: true,
    boss: { at: 56 },
  },
];

const LEVEL3_TEXT = 'Wondering what\'s next? Well, defeating the hybrids was not our main trouble after all. Looks like we have a bigger enemy to handle. Stay tuned for what unfolds in Level 3.';

const DIFFICULTY = {
  easy:   { label: 'Easy',   ai: 0.72, player: 1.15, enemyHp: 0.85 },
  normal: { label: 'Normal', ai: 1.0,  player: 1.0,  enemyHp: 1.0 },
  hard:   { label: 'Hard',   ai: 1.2, player: 0.92, enemyHp: 1.15 },
};

const BATTLE = {
  lanes: [272, 450, 628],
  fortX: 170,      // human gate line
  caveX: 1110,     // brute cave line
  duration: 90,
  baseHP: 100,
  maxEnergy: 10,
  energyRate: 1.0, // courage per second
  abilityCharge: 20,
};
