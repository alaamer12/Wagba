"""Regional parity: app capture vs mockup phone screen.

Usage: python tools/parity.py <app.png> <mockup.png> <out_prefix> [--phone 0|1|2]

Prints a global SSIM, a 4x4 regional grid, and writes a side-by-side + heatmap.
Status bar / dynamic island live only in the mockup, so the top band is expected
to score lower; the grid is what makes that obvious instead of hiding it.
"""
import sys
import numpy as np
from PIL import Image


def screen_crop(mockup_path: str, phone: int) -> Image.Image:
    from scipy import ndimage

    im = Image.open(mockup_path).convert("RGB")
    a = np.asarray(im).astype(int)
    # Screens are large cream areas; the bezel and the page are different tones.
    cream = (a[:, :, 0] > 235) & (a[:, :, 1] > 225) & (a[:, :, 2] > 200)
    cream = ndimage.binary_closing(cream, np.ones((9, 9)))
    labels, count = ndimage.label(cream)
    boxes = []
    for i in range(1, count + 1):
        ys, xs = np.where(labels == i)
        if len(xs) < a.size * 0.03:
            continue
        w, h = xs.max() - xs.min(), ys.max() - ys.min()
        if h < 400 or not (0.35 < w / h < 0.65):
            continue
        boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    boxes.sort(key=lambda b: b[0])
    if not boxes:
        raise SystemExit("no phone screen found in the mockup")
    x0, y0, x1, y1 = boxes[min(phone, len(boxes) - 1)]
    return im.crop((x0, y0, x1, y1))


def ssim(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float64)
    b = b.astype(np.float64)
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    mu_a, mu_b = a.mean(), b.mean()
    va, vb = a.var(), b.var()
    cov = ((a - mu_a) * (b - mu_b)).mean()
    return ((2 * mu_a * mu_b + c1) * (2 * cov + c2)) / ((mu_a**2 + mu_b**2 + c1) * (va + vb + c2))


def main() -> int:
    app_path, mock_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
    phone = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--phone=")), 1))

    app = Image.open(app_path).convert("RGB")
    screen = screen_crop(mock_path, phone)
    # The mockup screen starts with the OS status bar and dynamic island; the app
    # capture does not, so the band is trimmed before anything is compared.
    trim_top = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--trim-top=")), 0))
    if trim_top:
        screen = screen.crop((0, trim_top, screen.width, screen.height))
    # Scale uniformly by width (a device screenshot is not stretched), then crop or
    # pad to the app height from the top.
    scale = app.width / screen.width
    scaled = screen.resize((app.width, round(screen.height * scale)), Image.LANCZOS)
    if scaled.height >= app.height:
        mock = scaled.crop((0, 0, app.width, app.height))
    else:
        mock = Image.new("RGB", app.size, (250, 241, 223))
        mock.paste(scaled, (0, 0))

    a = np.asarray(app).astype(int)
    m = np.asarray(mock).astype(int)

    print(f"size {app.size[0]}x{app.size[1]}  global SSIM {ssim(np.asarray(app.convert('L')), np.asarray(mock.convert('L'))):.3f}")
    rows, cols = 4, 4
    gh, gw = app.size[1] // rows, app.size[0] // cols
    print("grid (SSIM per cell, top-left first):")
    for r in range(rows):
        cells = []
        for c in range(cols):
            box = (c * gw, r * gh, (c + 1) * gw, (r + 1) * gh)
            ga = np.asarray(app.crop(box).convert("L"))
            gm = np.asarray(mock.crop(box).convert("L"))
            cells.append(f"{ssim(ga, gm):.2f}")
        print("  " + " ".join(cells))

    side = Image.new("RGB", (app.size[0] * 2 + 12, app.size[1]), (255, 255, 255))
    side.paste(mock, (0, 0))
    side.paste(app, (app.size[0] + 12, 0))
    side.save(f"{out}-side.png")

    diff = np.abs(a - m).sum(axis=2).clip(0, 255).astype(np.uint8)
    Image.fromarray(diff).save(f"{out}-diff.png")
    print(f"wrote {out}-side.png and {out}-diff.png  (left mockup, right app)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
