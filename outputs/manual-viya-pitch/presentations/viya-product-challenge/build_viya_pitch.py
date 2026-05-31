from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pptx import Presentation
from pptx.util import Inches


ROOT = Path("/Users/vanajvanguardia/Documents/viya/viya-app")
WORKSPACE = ROOT / "outputs/manual-viya-pitch/presentations/viya-product-challenge"
PREVIEW = WORKSPACE / "preview"
OUTPUT = WORKSPACE / "output"
SCREENSHOTS = ROOT / "docs/demo/screenshots"
FONT_REGULAR = "/System/Library/Fonts/SFNS.ttf"
FONT_BOLD = "/System/Library/Fonts/SFNS.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"

W, H = 1920, 1080
INK = "#111116"
MUTED = "#6E6E78"
BLUE = "#0A84FF"
GREEN = "#30D158"
TEAL = "#19B8C7"
ORANGE = "#FF9F0A"
PURPLE = "#BF5AF2"
SURFACE = "#F5F5F7"
CARD = "#FFFFFF"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO if mono else (FONT_BOLD if bold else FONT_REGULAR)
    return ImageFont.truetype(path, size)


def rounded(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int, fill: str, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def shadow_box(base: Image.Image, xy: tuple[int, int, int, int], radius: int, fill: str = CARD, shadow: int = 18) -> None:
    x1, y1, x2, y2 = xy
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((x1, y1, x2, y2), radius=radius, fill=(0, 0, 0, 34))
    layer = layer.filter(ImageFilter.GaussianBlur(shadow))
    base.alpha_composite(layer)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline="#E7E7EC", width=2)


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, fill: str = INK, bold: bool = False, mono: bool = False, anchor: str | None = None, spacing: int = 8) -> None:
    draw.multiline_text(xy, value, font=font(size, bold=bold, mono=mono), fill=fill, spacing=spacing, anchor=anchor)


def wrap(draw: ImageDraw.ImageDraw, value: str, max_width: int, size: int, bold: bool = False) -> str:
    words = value.split()
    lines: list[str] = []
    line = ""
    f = font(size, bold=bold)
    for word in words:
        candidate = word if not line else f"{line} {word}"
        if draw.textbbox((0, 0), candidate, font=f)[2] <= max_width:
            line = candidate
            continue
        if line:
            lines.append(line)
        line = word
    if line:
        lines.append(line)
    return "\n".join(lines)


def slide_bg() -> Image.Image:
    img = Image.new("RGBA", (W, H), SURFACE)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, H), fill="#FBFBFD")
    return img


def pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], label: str, color: str = BLUE, fill: str = "#F2F7FF") -> None:
    rounded(draw, xy, 28, fill, outline="#DDEBFF", width=2)
    text(draw, (xy[0] + 30, xy[1] + 17), label, 26, fill=color, bold=True)


def title_block(draw: ImageDraw.ImageDraw, kicker: str, title: str, subtitle: str | None = None, x: int = 120, y: int = 112, w: int = 760, title_size: int = 58) -> None:
    text(draw, (x, y), kicker.upper(), 21, fill=BLUE, bold=True, spacing=4)
    text(draw, (x, y + 46), wrap(draw, title, w, title_size, bold=True), title_size, fill=INK, bold=True, spacing=6)
    if subtitle:
        title_lines = wrap(draw, title, w, title_size, bold=True).count("\n") + 1
        text(draw, (x, y + 66 + (title_lines * (title_size + 10))), wrap(draw, subtitle, w, 28), 28, fill=MUTED, spacing=10)


def iphone(base: Image.Image, image_path: Path, xy: tuple[int, int], height: int, tilt: float = 0) -> None:
    src = Image.open(image_path).convert("RGBA")
    crop = src.crop((0, 0, src.width, src.height))
    width = int(height * crop.width / crop.height)
    shot = crop.resize((width, height), Image.LANCZOS)
    frame_pad = max(16, height // 38)
    frame = Image.new("RGBA", (width + frame_pad * 2, height + frame_pad * 2), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle((0, 0, frame.width - 1, frame.height - 1), radius=height // 16, fill="#0A0A0C")
    fd.rounded_rectangle((frame_pad, frame_pad, frame.width - frame_pad, frame.height - frame_pad), radius=height // 20, fill="#FFFFFF")
    mask = Image.new("L", shot.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, shot.width, shot.height), radius=height // 24, fill=255)
    frame.paste(shot, (frame_pad, frame_pad), mask)
    if tilt:
        frame = frame.rotate(tilt, expand=True, resample=Image.BICUBIC)
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    x, y = xy
    sd.rounded_rectangle((x + 20, y + 24, x + frame.width + 20, y + frame.height + 24), radius=height // 15, fill=(0, 0, 0, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    base.alpha_composite(shadow)
    base.alpha_composite(frame, xy)


def image_panel(base: Image.Image, image_path: Path, xy: tuple[int, int, int, int], crop: tuple[int, int, int, int] | None = None) -> None:
    x1, y1, x2, y2 = xy
    src = Image.open(image_path).convert("RGBA")
    if crop:
        src = src.crop(crop)
    panel_w = x2 - x1
    panel_h = y2 - y1
    src_ratio = src.width / src.height
    panel_ratio = panel_w / panel_h
    if src_ratio > panel_ratio:
        h = panel_h
        w = int(h * src_ratio)
    else:
        w = panel_w
        h = int(w / src_ratio)
    resized = src.resize((w, h), Image.LANCZOS)
    left = max(0, (w - panel_w) // 2)
    top = max(0, (h - panel_h) // 2)
    resized = resized.crop((left, top, left + panel_w, top + panel_h))

    shadow_box(base, xy, 28, fill=CARD, shadow=14)
    mask = Image.new("L", (panel_w, panel_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, panel_w, panel_h), radius=28, fill=255)
    base.paste(resized, (x1, y1), mask)


def image_panel_contain(base: Image.Image, image_path: Path, xy: tuple[int, int, int, int], crop: tuple[int, int, int, int] | None = None) -> None:
    x1, y1, x2, y2 = xy
    src = Image.open(image_path).convert("RGBA")
    if crop:
        src = src.crop(crop)
    panel_w = x2 - x1
    panel_h = y2 - y1
    scale = min(panel_w / src.width, panel_h / src.height)
    resized = src.resize((int(src.width * scale), int(src.height * scale)), Image.LANCZOS)

    shadow_box(base, xy, 28, fill=CARD, shadow=14)
    pasted = Image.new("RGBA", (panel_w, panel_h), CARD)
    paste_x = (panel_w - resized.width) // 2
    paste_y = (panel_h - resized.height) // 2
    pasted.alpha_composite(resized, (paste_x, paste_y))
    mask = Image.new("L", (panel_w, panel_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, panel_w, panel_h), radius=28, fill=255)
    base.paste(pasted, (x1, y1), mask)


def metric_card(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], value: str, label: str, color: str = BLUE) -> None:
    rounded(draw, xy, 34, CARD, outline="#E7E7EC", width=2)
    text(draw, (xy[0] + 28, xy[1] + 26), value, 46, fill=color, bold=True)
    text(draw, (xy[0] + 28, xy[1] + 86), label, 24, fill=MUTED)


def stat_tile(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], value: str, label: str, color: str) -> None:
    x1, y1, x2, y2 = xy
    rounded(draw, xy, 24, CARD, outline="#E7E7EC", width=2)
    draw.rounded_rectangle((x1 + 22, y1 + 20, x1 + 30, y2 - 20), radius=4, fill=color)
    text(draw, (x1 + 52, y1 + 18), value, 30, fill=INK, bold=True)
    text(draw, (x1 + 52, y1 + 62), wrap(draw, label, x2 - x1 - 82, 17), 17, fill=MUTED, spacing=4)


def bento_card(base: Image.Image, draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], label: str, status: str, color: str, kind: str) -> None:
    x1, y1, x2, _ = xy
    shadow_box(base, xy, 34)
    draw.rounded_rectangle((x1 + 26, y1 + 26, x1 + 34, y1 + 82), radius=4, fill=color)
    text(draw, (x1 + 54, y1 + 30), label, 34, fill=INK, bold=True)


def icon_badge(draw: ImageDraw.ImageDraw, xy: tuple[int, int], color: str, kind: str, size: int = 58) -> None:
    x, y = xy
    rounded(draw, (x, y, x + size, y + size), 18, color, outline=None)
    cx = x + size // 2
    cy = y + size // 2
    white = "#FFFFFF"
    line_width = max(3, size // 18)

    if kind == "document":
        draw.rounded_rectangle((x + 18, y + 13, x + 39, y + 45), radius=4, outline=white, width=line_width)
        draw.line((x + 23, y + 24, x + 34, y + 24), fill=white, width=line_width)
        draw.line((x + 23, y + 33, x + 34, y + 33), fill=white, width=line_width)
        return
    if kind == "route":
        draw.line((x + 16, y + 39, x + 29, y + 23, x + 43, y + 34), fill=white, width=line_width)
        draw.ellipse((x + 11, y + 34, x + 21, y + 44), outline=white, width=line_width)
        draw.ellipse((x + 24, y + 18, x + 34, y + 28), outline=white, width=line_width)
        draw.ellipse((x + 38, y + 29, x + 48, y + 39), outline=white, width=line_width)
        return
    if kind == "alert":
        draw.polygon([(cx, y + 13), (x + 44, y + 43), (x + 14, y + 43)], outline=white)
        draw.line((cx, y + 24, cx, y + 33), fill=white, width=line_width)
        draw.ellipse((cx - 2, y + 38, cx + 2, y + 42), fill=white)
        return
    if kind == "chat":
        draw.rounded_rectangle((x + 12, y + 14, x + 45, y + 37), radius=10, outline=white, width=line_width)
        draw.line((x + 24, y + 37, x + 18, y + 45), fill=white, width=line_width)
        draw.line((x + 21, y + 26, x + 36, y + 26), fill=white, width=line_width)
        return
    if kind == "spark":
        draw.line((cx, y + 12, cx, y + 24), fill=white, width=line_width)
        draw.line((cx, y + 34, cx, y + 46), fill=white, width=line_width)
        draw.line((x + 12, cy, x + 24, cy), fill=white, width=line_width)
        draw.line((x + 34, cy, x + 46, cy), fill=white, width=line_width)
        draw.line((x + 20, y + 20, x + 27, y + 27), fill=white, width=line_width)
        draw.line((x + 31, y + 31, x + 38, y + 38), fill=white, width=line_width)
        draw.line((x + 38, y + 20, x + 31, y + 27), fill=white, width=line_width)
        draw.line((x + 27, y + 31, x + 20, y + 38), fill=white, width=line_width)
        return
    if kind == "shield":
        draw.line((cx, y + 12, x + 42, y + 19, x + 38, y + 38, cx, y + 47, x + 20, y + 38, x + 16, y + 19, cx, y + 12), fill=white, width=line_width)
        draw.line((x + 24, y + 30, x + 29, y + 36, x + 38, y + 24), fill=white, width=line_width)
        return
    if kind == "code":
        draw.line((x + 26, y + 19, x + 17, cy, x + 26, y + 39), fill=white, width=line_width)
        draw.line((x + 32, y + 19, x + 41, cy, x + 32, y + 39), fill=white, width=line_width)
        draw.line((x + 31, y + 17, x + 27, y + 41), fill=white, width=line_width)
        return
    if kind == "review":
        draw.rounded_rectangle((x + 14, y + 15, x + 44, y + 43), radius=7, outline=white, width=line_width)
        draw.line((x + 22, y + 30, x + 28, y + 36, x + 38, y + 24), fill=white, width=line_width)
        return
    text(draw, (cx, cy), "AI", 19, fill=white, bold=True, anchor="mm")


def save_slide(index: int, img: Image.Image) -> Path:
    path = PREVIEW / f"slide-{index:02d}.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(path, quality=96)
    return path


def bullet_column(draw: ImageDraw.ImageDraw, x: int, y: int, items: Iterable[tuple[str, str, str, str]], max_width: int = 610) -> None:
    yy = y
    for label, body, color, kind in items:
        icon_badge(draw, (x, yy), color, kind)
        text(draw, (x + 82, yy - 2), label, 30, fill=INK, bold=True)
        text(draw, (x + 82, yy + 43), wrap(draw, body, max_width, 24), 24, fill=MUTED, spacing=8)
        yy += 160


def build_slides() -> list[Path]:
    slides: list[Path] = []

    img = slide_bg()
    d = ImageDraw.Draw(img)
    title_block(d, "Product Name & Tagline", "Viya turns trip chaos into 100% travel readiness.", "Most travel apps help you plan. Viya helps you finish: itinerary, budget, Vault, and readiness in one workspace.", w=900)
    text(d, (120, 555), wrap(d, "A travel workspace people can trust, recommend, and pay for because it answers the real question: am I actually ready to go?", 820, 31), 31, fill=INK, bold=True, spacing=8)
    pill(d, (120, 760, 420, 828), "AI asks")
    pill(d, (450, 760, 760, 828), "Workspace acts", GREEN, "#F0FFF5")
    pill(d, (790, 760, 1080, 828), "Readiness proves", TEAL, "#EEFEFF")
    iphone(img, SCREENSHOTS / "home-dashboard.png", (1180, 70), 900)
    slides.append(save_slide(1, img))

    img = slide_bg()
    d = ImageDraw.Draw(img)
    title_block(d, "The Problem", "Travel apps help you book. They do not prove you are ready.", "The painful moment is after booking: can the traveler trust the documents, budget, schedule, and requirements before departure?", w=820)
    bullet_column(d, 120, 520, [
        ("Proof is scattered", "Flights, hotels, passes, receipts, notes, reminders, and screenshots live in different places.", BLUE, "document"),
        ("Plans do not act", "A static itinerary cannot tell which booking, receipt, budget item, or prep task supports it.", ORANGE, "route"),
        ("Mistakes are expensive", "A missed document, budget surprise, or bad timing decision can ruin a trip at the worst moment.", PURPLE, "alert"),
    ])
    text(d, (1035, 130), "Unlinked Stuff", 26, fill=MUTED, bold=True)
    proof_cards = [
        ("Email", "unlinked", BLUE, "chat", (1035, 178, 1328, 338)),
        ("PDF", "unlinked", ORANGE, "document", (1360, 178, 1653, 338)),
        ("Receipt", "unlinked", TEAL, "review", (1035, 380, 1328, 540)),
        ("Calendar", "unlinked", GREEN, "route", (1360, 380, 1653, 540)),
        ("Notes", "unlinked", PURPLE, "alert", (1035, 582, 1653, 750)),
    ]
    for label, status, color, kind, xy in proof_cards:
        bento_card(img, d, xy, label, status, color, kind)
    slides.append(save_slide(2, img))

    img = slide_bg()
    d = ImageDraw.Draw(img)
    title_block(d, "The Solution", "Readiness becomes the product, not a side checklist.", "Viya is a focused travel agent that asks, generates, adjusts, audits, and stages actions across the workspace.", w=770)
    iphone(img, SCREENSHOTS / "singapore-workspace-switcher.png", (1140, 90), 850)
    bullet_column(d, 120, 500, [
        ("Ask Mode", "Collaborate freely: ask what is missing, refine the plan, or check if the trip is ready.", BLUE, "chat"),
        ("Agent Mode", "Generate, adjust, audit, and stage changes the user can apply or dismiss.", GREEN, "spark"),
        ("Proof-linked readiness", "Itinerary, budget, Vault, and readiness move together instead of living as separate lists.", ORANGE, "shield"),
    ])
    slides.append(save_slide(3, img))

    img = slide_bg()
    d = ImageDraw.Draw(img)
    title_block(d, "Product Proof", "A Singapore group trip becomes travel-ready.", "The workspace connects a business-conference trip for a small team, Sep 28-Oct 1, 2026, with itinerary, budget, Vault, and readiness.", w=850)
    iphone(img, SCREENSHOTS / "trip-overview-current.png", (1080, 80), 860)
    metric_card(d, (120, 560, 410, 700), "100%", "readiness", GREEN)
    metric_card(d, (440, 560, 730, 700), "5", "core stages", BLUE)
    metric_card(d, (120, 735, 410, 875), "8", "itinerary stops", PURPLE)
    metric_card(d, (440, 735, 730, 875), "₱35.8k", "budget left", TEAL)
    text(d, (120, 930), "This is live product state captured from the iOS Simulator.", 30, fill=INK, bold=True)
    slides.append(save_slide(4, img))

    img = slide_bg()
    d = ImageDraw.Draw(img)
    title_block(d, "AI Tools Used", "AI acceleration is visible in the artifacts.", "AI was used for implementation, critique, verification, product reasoning, screenshots, docs, and this deck. The evidence is in the submitted files.", w=1120, title_size=54)
    tools = [
        ("code", BLUE, "Codex + Agent Skills", "Built app fixes, docs, simulator captures, validation checks, and the final PPTX pipeline."),
        ("review", PURPLE, "Claude Code + OpenCode", "Used coding-agent loops to critique implementation choices and catch bugs before polish."),
        ("chat", GREEN, "ChatGPT", "Refined the product story, trip-agent behavior, user flow, and written pitch language."),
        ("spark", ORANGE, "Claude", "Used as a critique partner for sharper positioning, UX review, and specificity checks."),
    ]
    stats = [
        ("Planning", "criteria, flow, and story", BLUE),
        ("Execution", "app fixes and QA", TEAL),
        ("Docs", "audit, guide, README", PURPLE),
        ("Submission", "deck and evidence pack", ORANGE),
    ]
    for i, (value, label, color) in enumerate(stats):
        x = 120 + i * 420
        stat_tile(d, (x, 360, x + 380, 460), value, label, color)
    for i, (kind, color, name, body) in enumerate(tools):
        x = 120 + (i % 2) * 835
        y = 520 + (i // 2) * 205
        shadow_box(img, (x, y, x + 750, y + 155), 32)
        icon_badge(d, (x + 34, y + 52), color, kind, size=64)
        text(d, (x + 124, y + 34), name, 29, fill=BLUE if i in (0, 2) else INK, bold=True)
        text(d, (x + 124, y + 86), wrap(d, body, 560, 21), 21, fill=MUTED, spacing=6)
    slides.append(save_slide(5, img))

    img = slide_bg()
    d = ImageDraw.Draw(img)
    title_block(d, "How To Use The Product", "From Home to readiness in one flow.", "Viya uses Home for dashboard suggestions, AI chat for questions, and trip modules for itinerary, budget, Vault, and readiness.", w=820, title_size=56)
    iphone(img, SCREENSHOTS / "current-simulator-slide6.png", (1170, 84), 850)
    steps = [
        ("01", "Start on Home", "Dashboard context, suggestions, and trip entry points."),
        ("02", "Create the trip", "Destination, dates, travelers, budget comfort, and pace."),
        ("03", "Ask Viya", "AI asks only what blocks itinerary, budget, Vault, or readiness."),
        ("04", "Generate the workspace", "Apply itinerary, budget, Vault, and document-linked drafts."),
        ("05", "Finish readiness", "Run final checks until the trip is prepared and complete."),
    ]
    yy = 430
    for num, label, body in steps:
        text(d, (120, yy), num, 22, fill=BLUE, bold=True, mono=True)
        text(d, (182, yy - 4), label, 28, fill=INK, bold=True)
        text(d, (182, yy + 38), body, 23, fill=MUTED)
        yy += 112
    slides.append(save_slide(7, img))

    img = slide_bg()
    d = ImageDraw.Draw(img)
    title_block(d, "Target User / Market", "A beachhead with clear reasons to adopt and pay.", "Start with travelers already doing manual work to avoid mistakes: budgets, documents, companions, requirements, receipts, and day-of decisions.", w=1050, title_size=56)
    segments = [
        ("Budget-conscious travelers", "Users who want a clear spend cap, safe daily budget, receipt tracking, and fewer surprise costs."),
        ("First-time travelers", "Users who need help with passports, visas, airport requirements, documents, packing, and what to bring."),
        ("Young professionals, couples & barkadas", "Users who want trips to feel easy, social, coordinated, and organized without spreadsheet work."),
        ("Frequent local travelers", "Users who want reusable trip templates, real-world guides, and faster setup for repeat destinations."),
    ]
    for i, (label, body) in enumerate(segments):
        x = 120 + (i % 2) * 640
        y = 430 + (i // 2) * 225
        shadow_box(img, (x, y, x + 590, y + 190), 34)
        text(d, (x + 34, y + 28), wrap(d, label, 520, 29, bold=True), 29, fill=INK, bold=True)
        text(d, (x + 34, y + 96), wrap(d, body, 510, 21), 21, fill=MUTED, spacing=5)
    shadow_box(img, (1430, 408, 1780, 825), 42)
    text(d, (1468, 452), "Adoption path", 34, fill=BLUE, bold=True)
    text(d, (1468, 520), wrap(d, "Adopt: one free trip readiness workspace. Pay: unlimited trips, reusable templates, Vault history, and groups. Spread: shared workspace before travel day.", 275, 24), 24, fill=INK, spacing=9)
    text(d, (120, 990), "Adoption thesis: start with personal trip readiness, then expand through shared group workspaces and reusable trip templates.", 18, fill="#8A8A93")
    slides.append(save_slide(6, img))
    slides[5], slides[6] = slides[6], slides[5]

    img = slide_bg()
    d = ImageDraw.Draw(img)
    text(d, (120, 112), "HOW TO USE THE PRODUCT", 21, fill=BLUE, bold=True)
    text(d, (120, 160), wrap(d, "The workspace path is visible.", 650, 52, bold=True), 52, fill=INK, bold=True, spacing=6)
    text(d, (120, 300), wrap(d, "Home starts the trip. AI chat asks and adjusts. The workspace shows itinerary, budget, Vault, and readiness moving together.", 560, 25), 25, fill=MUTED, spacing=9)
    flow = [
        ("01", "Home", BLUE),
        ("02", "Create trip", ORANGE),
        ("03", "AI chat", GREEN),
        ("04", "Workspace", PURPLE),
        ("05", "Itinerary", BLUE),
        ("06", "Budget", TEAL),
        ("07", "Vault", ORANGE),
        ("08", "Readiness", GREEN),
    ]
    for i, (num, label, color) in enumerate(flow):
        x = 120 + (i % 2) * 290
        y = 500 + (i // 2) * 88
        rounded(d, (x, y, x + 245, y + 62), 22, CARD, outline="#E7E7EC", width=2)
        text(d, (x + 24, y + 22), num, 22, fill=color, bold=True, mono=True)
        text(d, (x + 78, y + 17), label, 22, fill=INK, bold=True)

    phone_top = 210
    phone_height = 560
    phone_slots = [830, 1170, 1510]
    iphone(img, SCREENSHOTS / "create-trip-question-destination.png", (phone_slots[0], phone_top), phone_height)
    iphone(img, SCREENSHOTS / "singapore-ask-viya.png", (phone_slots[1], phone_top), phone_height)
    iphone(img, SCREENSHOTS / "current-simulator-slide8-last.png", (phone_slots[2], phone_top), phone_height)
    labels = [
        ("Create trip question", phone_slots[0], 815),
        ("AI chat", phone_slots[1], 815),
        ("Workspace readiness", phone_slots[2], 815),
    ]
    for label, x, y in labels:
        text(d, (x, y), label, 23, fill=INK, bold=True)
    text(d, (120, 998), "Screens use actual iOS Simulator captures from the working Singapore workspace.", 19, fill="#8A8A93")
    slides.append(save_slide(8, img))
    return slides


def build_pptx(slide_paths: list[Path]) -> Path:
    prs = Presentation()
    prs.slide_width = Inches(16)
    prs.slide_height = Inches(9)
    blank = prs.slide_layouts[6]
    for path in slide_paths:
        slide = prs.slides.add_slide(blank)
        slide.shapes.add_picture(str(path), 0, 0, width=prs.slide_width, height=prs.slide_height)
    out = OUTPUT / "viya-product-challenge-pitch.pptx"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prs.save(out)
    return out


def main() -> None:
    for directory in (PREVIEW, OUTPUT):
        directory.mkdir(parents=True, exist_ok=True)
    slide_paths = build_slides()
    pptx = build_pptx(slide_paths)
    print(pptx)


if __name__ == "__main__":
    main()
