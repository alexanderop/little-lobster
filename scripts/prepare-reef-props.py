"""Remove the edge-connected checkerboard from the generated props. Requires Pillow."""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'art/reef-props-source.png').convert('RGBA')
width, height = source.size
pixels = source.load()
background = bytearray(width * height)
queue = deque()


def visit(x, y):
    index = y * width + x
    if background[index]:
        return
    r, g, b, _ = pixels[x, y]
    if min(r, g, b) >= 185 and max(r, g, b) - min(r, g, b) <= 24:
        background[index] = 1
        queue.append((x, y))


for x in range(width):
    visit(x, 0)
    visit(x, height - 1)
for y in range(height):
    visit(0, y)
    visit(width - 1, y)
while queue:
    x, y = queue.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < width and 0 <= ny < height:
            visit(nx, ny)
for y in range(height):
    for x in range(width):
        if background[y * width + x]:
            pixels[x, y] = (0, 0, 0, 0)

output = ROOT / 'public/assets/reef-props.png'
source.save(output, optimize=True)
preview = Image.new('RGBA', source.size, '#124b65')
preview.alpha_composite(source)
preview.convert('RGB').save(ROOT / 'art/reef-props-preview.jpg')
assert source.getpixel((0, 0))[3] == 0
assert source.getpixel((1180, 200))[3] == 255, 'Pearl highlight must stay opaque'
print(f'Saved {output.relative_to(ROOT)}: {source.size}, RGBA')
