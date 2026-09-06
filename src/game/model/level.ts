export const WORLD = {
  width: 6300,
  height: 720,
  floor: 634,
  exitX: 6100,
  exitY: 540,
  requiredPearls: 18,
};
export type Platform = { x: number; y: number; width: number; height: number };
export const platforms: Platform[] = [
  { x: 480, y: 530, width: 240, height: 30 },
  { x: 880, y: 430, width: 170, height: 28 },
  { x: 1370, y: 520, width: 240, height: 30 },
  { x: 1880, y: 340, width: 210, height: 28 },
  { x: 2460, y: 545, width: 310, height: 34 },
  { x: 3010, y: 415, width: 220, height: 28 },
  { x: 3580, y: 520, width: 270, height: 32 },
  { x: 4100, y: 330, width: 220, height: 28 },
  { x: 4640, y: 490, width: 180, height: 30 },
  { x: 5380, y: 535, width: 220, height: 28 },
  { x: 5910, y: 615, width: 330, height: 35 },
];
export const pearlBlocks = [
  { x: 400, y: 430 },
  { x: 780, y: 390 },
  { x: 1430, y: 190 },
  { x: 2200, y: 430 },
  { x: 2800, y: 390 },
  { x: 3650, y: 345 },
  { x: 4700, y: 315 },
  { x: 5680, y: 425 },
];
export const reefTrial = {
  seconds: 4,
  rings: [
    { x: 1710, y: 270 },
    { x: 1950, y: 220 },
    { x: 2200, y: 270 },
  ],
};
export const bounceFishIds: readonly number[] = [0, 7, 8];
export const reefTreasures = [
  { x: 1540, y: 285, name: 'Bounce pearl' },
  { x: 2280, y: 270, name: 'Current pearl' },
];
export const TREASURE_VALUE = 3;
export const pearlTrail = [
  { x: 330, y: 490 },
  { x: 500, y: 475 },
  { x: 620, y: 475 },
  { x: 740, y: 550 },
  { x: 890, y: 375 },
  { x: 1020, y: 325 },
  { x: 1150, y: 320 },
  { x: 1290, y: 300 },
  { x: 1430, y: 320 },
  { x: 1150, y: 575 },
  { x: 1350, y: 575 },
  { x: 1550, y: 575 },
  { x: 1710, y: 465 },
  { x: 1710, y: 355 },
  { x: 1880, y: 555 },
  { x: 2080, y: 550 },
  { x: 2270, y: 550 },
  ...Array.from({ length: 31 }, (_, i) => ({
    x: 2450 + i * 110,
    y: 490 - Math.abs(Math.sin((i * Math.PI) / 6)) * 165,
  })),
].sort((a, b) => a.x - b.x || a.y - b.y);
export const TOTAL_PEARLS =
  pearlTrail.length +
  pearlBlocks.length +
  reefTreasures.length * TREASURE_VALUE;
export const region = (x: number) => (x < 2350 ? 0 : x < 4500 ? 1 : 2);
export const regionNames = ['Sunlit Reef', 'Inky Gardens', 'The Blue Below'];

export type Biome = 'reef' | 'kelp' | 'crystal';
export type CreatureKind = 'catfish' | 'sepia' | 'bigfin' | 'costume-cat';
export const biomeNames = {
  reef: 'Sunlit Reef',
  kelp: 'Kelp Forest',
  crystal: 'Crystal Caves',
};
export type Level = {
  number: number;
  seed: number;
  biome: Biome;
  world: typeof WORLD;
  platforms: Platform[];
  pearls: { x: number; y: number }[];
  blocks: { x: number; y: number }[];
  trial: { seconds: number; rings: { x: number; y: number }[] };
  treasures: { x: number; y: number; name: string }[];
  currents: { x: number; width: number; top: number; speed: number }[];
  checkpointX: number;
  friendX: number;
  sections: string[];
  encounters: { x: number; y: number; kind: CreatureKind }[];
};

const sections = [
  { name: 'Coral steps', heights: [530, 440, 350], kind: 'catfish' },
  { name: 'High shelves', heights: [420, 310, 420], kind: 'sepia' },
  { name: 'Pearl garden', heights: [510, 490, 510], kind: 'costume-cat' },
  { name: 'Twin towers', heights: [330, 480, 330], kind: 'catfish' },
  { name: 'Gentle descent', heights: [330, 420, 510], kind: 'sepia' },
  { name: 'Open water', heights: [480, 350, 480], kind: 'bigfin' },
  { name: 'Hidden shelf', heights: [460, 300, 460], kind: 'costume-cat' },
  { name: 'Stepping stones', heights: [520, 400, 520], kind: 'catfish' },
] satisfies { name: string; heights: number[]; kind: CreatureKind }[];

export function generateLevel(number = 1, seed = 1): Level {
  if (number === 1)
    return {
      number,
      seed,
      biome: 'reef',
      world: { ...WORLD },
      platforms: platforms.map((p) => ({ ...p })),
      pearls: pearlTrail.map((p) => ({ ...p })),
      blocks: pearlBlocks.map((p) => ({ ...p })),
      trial: reefTrial,
      treasures: reefTreasures,
      currents: [
        { x: 1710, width: 140, top: 240, speed: 340 },
        { x: 4050, width: 120, top: 90, speed: 190 },
      ],
      checkpointX: 2570,
      friendX: 3370,
      sections: ['The pearl trail'],
      encounters: [],
    };
  let value = (seed ^ Math.imul(number, 0x9e3779b9)) >>> 0;
  const random = () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const biome: Biome =
    number % 3 === 2 ? 'kelp' : number % 3 === 0 ? 'crystal' : 'reef';
  const calm = number % 4 === 0;
  const pool = [...sections];
  const level: Level = {
    number,
    seed,
    biome,
    world: { ...WORLD, width: 3900, exitX: 3700 },
    platforms: [],
    pearls: [],
    blocks: [],
    trial: { seconds: 4, rings: [] },
    treasures: [],
    currents: [],
    checkpointX: 1900,
    friendX: 3000,
    sections: [],
    encounters: [],
  };
  for (let index = 0; index < 5; index++) {
    const choice = pool.splice(Math.floor(random() * pool.length), 1)[0];
    if (!choice) continue;
    const start = 350 + index * 650;
    level.sections.push(choice.name);
    // A continuous seabed route always supplies more than the required pearls.
    for (let pearl = 0; pearl < 5; pearl++)
      level.pearls.push({ x: start + pearl * 110, y: 575 });
    choice.heights.forEach((height, step) => {
      const x = start + step * 170;
      const y = height + Math.floor(random() * 3) * 10;
      level.platforms.push({
        x,
        y,
        width: 100 + Math.floor(random() * 60),
        height: 28,
      });
      level.pearls.push({ x: x + 55, y: y - 55 });
    });
    level.blocks.push({ x: start + 520, y: 390 });
    if (!calm || index % 2 === 0)
      level.encounters.push({
        x: start + 250,
        y: choice.kind === 'bigfin' ? 230 : 340,
        kind: choice.kind,
      });
    if (index % (biome === 'kelp' ? 2 : 3) === 0)
      level.currents.push({
        x: start + 510,
        width: biome === 'kelp' ? 150 : 110,
        top: 240,
        speed: calm ? 190 : biome === 'kelp' ? 300 : 230,
      });
  }
  level.pearls.sort((a, b) => a.x - b.x || a.y - b.y);
  return level;
}
