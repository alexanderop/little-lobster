# Little Lobster

A browser adventure built with TypeScript and Phaser. Collect 18 of 48 pearls, meet a narwhal, and reach the home shell. The level crosses Sunlit Reef, Inky Gardens, and The Blue Below.

## Run locally

Use Node 22.13 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. Arrow keys or A/D move, Space or W swims, Down or S sinks, Shift or X dashes, and Escape pauses. Touch controls appear on touch devices. Sound starts muted.

## Verify changes

```sh
npm run check
```

This runs the simulation tests, TypeScript, lint on application code, and the production build. The simulation tests cover movement, collection, pause, dash, damage, checkpoints, the exit condition, descending through currents, and a complete route using player inputs. The generated component catalog is outside application lint scope.

Browser playtesting and mobile visual checks were unavailable during initial implementation. The optional WebMCP tools `read_game_state` and `set_game_paused` register only in browsers that support `document.modelContext`; a supported validation context was unavailable.

Only the best completed pearl count is saved locally. A page reload starts a new run. Checkpoints and collected pearls survive retries within that run.

## Code and art

`lib/game-model.ts` owns movement, collisions, and game rules. `lib/game-scene.ts` renders the world and advances the model at 60 simulation steps per second. `app/page.tsx` owns keyboard and touch input, menus, and the HUD.

[Asset sources and generation prompts](./ART.md)
