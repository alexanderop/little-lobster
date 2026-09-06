# Game ownership and lifecycle

Vue owns the interface, Phaser owns rendering, and the simulation owns gameplay state. This lets tests advance the game without a browser while browser tests exercise the same simulation inside real scenes.

```text
Vue controls → GameInput → OceanScene → simulation
                                ↓          ↓
                            OceanView ← state and events
                                ↓
                            LobsterView

OceanScene → snapshots → Vue HUD
           → events → notices and audio
```

## Scene and object classes

`src/game/createGame.ts` constructs the Phaser game, observes the host size, and exposes a small controller. Its readiness promise resolves from `OceanScene.create()` after assets and objects exist. Destroy disconnects the observer, cancels pending readiness, and requests Phaser destruction. Phaser finishes destruction on its next game step.

`Preloader` loads assets and prepares texture frames. A failed asset rejects readiness and prevents gameplay startup. Loader listeners are removed on scene shutdown.

`OceanScene` owns the current simulation state, input snapshot, fixed-step accumulator, and HUD publication interval. It advances the simulation at 60 steps per second, consumes each step's events, and asks the view to render. Paused and completed games stop advancing. Restart clears input, timing, effects, camera position, and animation reactions together. Retry uses the simulation's checkpoint rules before resetting presentation.

`OceanView` owns the level's Phaser objects and particle effects. `LobsterView` owns the lobster sprite and temporary visual reactions. These classes read gameplay state; they do not keep separate health, position, or collection state. Phaser owns destruction of scene game objects.

The scene composes these objects instead of building an inheritance hierarchy. A new class is useful when it owns an identifiable set of objects or a lifecycle. Small calculations and configuration remain functions and data.

## Simulation and level data

`model/simulation.ts` owns movement, collisions, damage, collection, checkpoints, and outcomes. It does not import Vue or Phaser. `model/level.ts` contains world dimensions, platforms, block locations, and region names. `hero-animation.ts` selects a sprite frame from simulation state and a visual reaction.

A new gameplay rule belongs in the simulation with an observable regression test. A visual reaction belongs in a view class. Changing physics ownership would require a separate design and gameplay comparison; the Vue migration preserves the existing custom simulation.

## Vue bridge and input

`PhaserGame.vue` owns mounting, readiness, keyboard/window listeners, WebMCP registration, and teardown. Phaser instances remain ordinary JavaScript objects outside Vue reactivity. The component sends typed commands and emits immutable HUD snapshots and game events.

`GameInput` stores keyboard codes and pointer IDs separately. Reading it combines both sources, so releasing one source cannot cancel another source of the same action. Pause, blur, restart, retry, and unmount clear held input.

`App.vue` coordinates the start screen, notices, best score, and audio. `GameHud`, `GameMenu`, and `TouchControls` render the interface. The pause menu manages keyboard focus and returns focus to the game when play resumes.

## Verification boundaries

Node tests prove rules and input composition. Browser Mode boots actual Phaser objects with real assets and tests the Vue bridge. Production Playwright tests exercise the built application. Screenshot baselines protect the welcome layout, while gameplay screenshots are retained for inspection. Manual playtesting remains necessary for difficulty, feel, sound quality, and physical mobile devices.

This structure adapts Phaser's [official Vue template](https://github.com/phaserjs/template-vue-ts) and [scene lifecycle](https://docs.phaser.io/phaser/concepts/scenes). Browser Mode is our integration-test choice; Phaser's own engine tests use a different environment.
