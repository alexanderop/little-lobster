"""Rebuild the game sprite sheet from the imagegen source. Requires Pillow."""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'art/lobster-poses-source.png').convert('RGBA')
width, height = source.size
pixels = source.load()
background = bytearray(width * height)
queue = deque()

def visit(x, y):
    index = y * width + x
    if background[index]:
        return
    r, g, b, _ = pixels[x, y]
    if min(r, g, b) >= 185 and max(r, g, b) - min(r, g, b) <= 28:
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

# Hand-registered face centers keep the head steady while the limbs change pose.
# The wide swim-pull pose crosses the generator's nominal first-column boundary.
poses = [
    ((0, 0, 384, 512), (225, 220)),
    ((384, 0, 768, 512), (600, 220)),
    ((768, 0, 1152, 512), (970, 220)),
    ((1152, 0, 1536, 512), (1322, 225)),
    ((0, 512, 420, 1024), (250, 724)),
    ((420, 512, 764, 1024), (603, 724)),
    ((764, 512, 1152, 1024), (993, 724)),
    ((1152, 512, 1536, 1024), (1330, 740)),
]
sheet = Image.new('RGBA', (1024, 576))
frames = []
for index, (box, face) in enumerate(poses):
    cropped = source.crop(box)
    cropped = cropped.resize((cropped.width // 2, cropped.height // 2), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (256, 288))
    offset = (round(128 - (face[0] - box[0]) / 2), round(110 - (face[1] - box[1]) / 2))
    frame.alpha_composite(cropped, offset)
    bbox = frame.getbbox()
    assert bbox and bbox[0] > 0 and bbox[1] > 0 and bbox[2] < 256 and bbox[3] < 288, (index, bbox)
    sheet.alpha_composite(frame, ((index % 4) * 256, (index // 4) * 288))
    frames.append(frame)
output = ROOT / 'public/assets/lobster-poses.png'
sheet.save(output, optimize=True)
preview = Image.new('RGBA', sheet.size, '#124b65')
preview.alpha_composite(sheet)
preview.convert('RGB').save(ROOT / 'art/lobster-poses-preview.jpg')
frames[3].save(ROOT / 'art/lobster-swim-preview.gif', save_all=True,
    append_images=[frames[4], frames[5], frames[4]], duration=125, loop=0, disposal=2)
print(f'Saved {output.relative_to(ROOT)}: {sheet.size}, RGBA, 8 aligned frames')
