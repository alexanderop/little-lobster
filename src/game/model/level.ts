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
