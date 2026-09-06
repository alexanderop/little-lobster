# Game art

All three assets were generated with the built-in imagegen tool on 2026-09-06. The supplied hamster in a red lobster costume was the character reference. Generated assets are saved in this project:

- `public/assets/lobster.png`: 1254 × 1254, transparent character.
- `public/assets/creatures.png`: 1254 × 1254, transparent creature atlas.
- `public/assets/reef.png`: 1536 × 1024, underwater background.

The scene renders atlas regions directly. The narwhal's horn crosses the intended cell boundary, so its texture uses a clipping path to exclude the adjacent squid. Character motion uses rotation, floating, and squash-free translation of the single sprite.

## Character prompt

Use case: identity-preserve. Asset type: transparent PNG browser game character sprite. Reference image: preserve the exact identity of this cute cream and tan hamster wearing its red lobster costume, round glossy black eyes, pink cheeks, antennae, little claws and cream belly. Create one full-body three-quarter view facing RIGHT, centered tightly with a small transparent margin. Preserve handdrawn dark ink outlines and gouache paint style. Genuine transparent alpha background, no backdrop, no shadow outside character, no text, no additional characters. Square 1024x1024.

## Creature atlas prompt

Use case: illustration-story. Asset type: transparent PNG browser game sprite atlas, square 1024x1024. Four separate cute sea creatures arranged in equal 2x2 cells: top-left purple cuttlefish/sepia; top-right blue catfish with whiskers; bottom-left mint narwhal facing right with horn clearly visible; bottom-right plum bigfin squid with long thin tentacles. Cozy handdrawn dark ink outlines and gouache paint illustration style. Each creature fully confined and centered within its own equal quadrant with generous clear transparent margins, no overlap between cells. Genuine transparent alpha background throughout. No labels, no grid, no text, no scenery.

## Background prompt

Use case: illustration-story. Asset type: wide underwater side scrolling browser game environment background, 1536x1024. Handpainted teal ocean fading into dark navy depths. Layered coral reefs only along the BOTTOM edge, coral pink and orange plants, sun rays from upper left, tiny distant fish. Huge open central water area for gameplay. Cozy handdrawn ink and gouache illustration style, textured painted water and soft light, restrained detail in central water. No foreground characters, no platforms, no UI, no text.
