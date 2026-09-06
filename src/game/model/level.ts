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
  { x: 940, y: 400, width: 180, height: 28 },
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
  { x: 1480, y: 345 },
  { x: 2200, y: 430 },
  { x: 2800, y: 390 },
  { x: 3650, y: 345 },
  { x: 4700, y: 315 },
  { x: 5680, y: 425 },
];
export const TOTAL_PEARLS = 48 + pearlBlocks.length;
export const region = (x: number) => (x < 2350 ? 0 : x < 4500 ? 1 : 2);
export const regionNames = ['Sunlit Reef', 'Inky Gardens', 'The Blue Below'];
