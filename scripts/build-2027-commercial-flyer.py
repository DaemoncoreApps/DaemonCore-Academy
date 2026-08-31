from pathlib import Path
import math

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "DaemonCore-2027-Commercial-Vision.pdf"
HERO = ROOT / "docs" / "marketing" / "daemoncore-2027-vision.png"

W, H = letter
BLACK = HexColor("#06070A")
PANEL = HexColor("#101216")
PANEL_2 = HexColor("#15181D")
RED = HexColor("#F23845")
IVORY = HexColor("#F4F1EA")
MUTED = HexColor("#A8ABB2")
DIM = HexColor("#70747D")
LINE = HexColor("#2A2D34")
GREEN = HexColor("#64D98B")


def fonts():
    folder = Path("C:/Windows/Fonts")
    for name, filename in {
        "DC-Regular": "segoeui.ttf",
        "DC-Semibold": "seguisb.ttf",
        "DC-Bold": "segoeuib.ttf",
        "DC-Mono": "consola.ttf",
        "DC-MonoBold": "consolab.ttf",
    }.items():
        pdfmetrics.registerFont(TTFont(name, str(folder / filename)))


def draw_text(c, value, x, y, font="DC-Regular", size=10, color=IVORY):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, value)


def draw_right(c, value, x, y, font="DC-Regular", size=10, color=IVORY):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawRightString(x, y, value)


def wrap(c, value, x, y, width, font="DC-Regular", size=8, leading=11, color=MUTED, max_lines=None):
    lines, current = [], ""
    for word in value.split():
        candidate = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if max_lines:
        lines = lines[:max_lines]
    for i, line in enumerate(lines):
        draw_text(c, line, x, y - i * leading, font, size, color)


def fit_crop(c, path, x, y, width, height):
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = max(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, y, width, height)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def hex_mark(c, x, y, radius=11):
    path = c.beginPath()
    for i in range(6):
        angle = math.radians(i * 60 + 30)
        px, py = x + radius * math.cos(angle), y + radius * math.sin(angle)
        if i == 0:
            path.moveTo(px, py)
        else:
            path.lineTo(px, py)
    path.close()
    c.setStrokeColor(IVORY)
    c.setLineWidth(1.2)
    c.drawPath(path, stroke=1, fill=0)
    c.setFillColor(RED)
    c.rect(x - 3.6, y - 3.6, 7.2, 7.2, fill=1, stroke=0)


def roadmap_card(c, x, y, quarter, title, body):
    c.setFillColor(Color(0.055, 0.065, 0.08, alpha=0.94))
    c.roundRect(x, y, 252, 62, 7, fill=1, stroke=0)
    c.setFillColor(RED)
    c.roundRect(x, y, 4, 62, 2, fill=1, stroke=0)
    draw_text(c, quarter, x + 15, y + 43, "DC-MonoBold", 7, RED)
    draw_text(c, title, x + 57, y + 41, "DC-Semibold", 10.2, IVORY)
    wrap(c, body, x + 15, y + 23, 222, "DC-Regular", 7.2, 9.2, MUTED, 2)


def price_row(c, x, y, name, price, note):
    draw_text(c, name, x, y, "DC-Semibold", 8.2, IVORY)
    draw_right(c, price, x + 219, y, "DC-MonoBold", 8.2, RED)
    draw_text(c, note, x, y - 12, "DC-Regular", 6.5, DIM)
    c.setStrokeColor(LINE)
    c.line(x, y - 20, x + 219, y - 20)


def build():
    fonts()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=letter, pageCompression=1)
    c.setTitle("DaemonCore - What's Coming in 2027")
    c.setAuthor("DaemonCore Apps")
    c.setSubject("Proposed 2027 product and commercial roadmap")

    fit_crop(c, HERO, 0, 0, W, H)
    c.setFillColor(Color(0.01, 0.012, 0.018, alpha=0.72))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(Color(0.01, 0.012, 0.018, alpha=0.88))
    c.rect(0, 0, 334, H, fill=1, stroke=0)

    hex_mark(c, 53, H - 41)
    draw_text(c, "DAEMON", 73, H - 45, "DC-Bold", 10.5, IVORY)
    draw_text(c, "CORE", 117, H - 45, "DC-Bold", 10.5, RED)
    draw_right(c, "VISION ROADMAP  //  SUBJECT TO CHANGE", W - 38, H - 45, "DC-MonoBold", 6.3, MUTED)

    c.setFillColor(RED)
    c.roundRect(40, H - 105, 159, 20, 4, fill=1, stroke=0)
    draw_text(c, "WHAT'S COMING // 2027", 50, H - 99, "DC-MonoBold", 7, white)
    draw_text(c, "One connected system.", 40, H - 145, "DC-Bold", 23, IVORY)
    draw_text(c, "Learn. Prove. Operate.", 40, H - 174, "DC-Bold", 23, RED)
    draw_text(c, "Report.", 40, H - 203, "DC-Bold", 23, RED)
    wrap(c, "DaemonCore's 2027 direction connects expert training, evidence-led ranges, authorized assessment operations, professional teams and purpose-built field hardware.", 42, H - 228, 260, "DC-Regular", 8.4, 11.3, HexColor("#D0D1D4"), 5)

    roadmap_card(c, 40, 433, "Q1", "SHIP THE FOUNDATION", "Stable 7.0, signed releases, automatic updates, rollback, accessibility and production support.")
    roadmap_card(c, 40, 361, "Q2", "ACADEMY PROFESSIONAL", "Adaptive pathways, deeper blind practicals, instructor workflows and role-based certification tracks.")
    roadmap_card(c, 40, 289, "Q3", "FIELDOPS TEAMS", "Shared review, approval workflows, enterprise integrations and a governed assessment adapter SDK.")
    roadmap_card(c, 40, 217, "Q4", "DC FIELD SYSTEMS", "Pilot Field Node, Bridge and Vault hardware with deployment kits and an operator certification path.")

    # Commercial direction panel
    c.setFillColor(Color(0.045, 0.05, 0.062, alpha=0.96))
    c.roundRect(320, 76, 254, 289, 10, fill=1, stroke=0)
    draw_text(c, "PROPOSED COMMERCIAL STRUCTURE", 338, 342, "DC-MonoBold", 7, GREEN)
    draw_text(c, "Built to grow with the operator.", 338, 318, "DC-Bold", 14, IVORY)
    wrap(c, "Pricing is directional and may change before launch.", 338, 299, 220, "DC-Regular", 7.2, 9, MUTED, 2)
    price_row(c, 338, 266, "ACADEMY CORE", "FREE", "Core curriculum, drills and selected ranges")
    price_row(c, 338, 224, "ACADEMY PRO", "$149 / YEAR", "Advanced tracks, certification and new ranges")
    price_row(c, 338, 182, "FIELDOPS INDIVIDUAL", "$199 / YEAR", "Professional authorization and evidence workspace")
    price_row(c, 338, 140, "FIELDOPS CONSULTANT", "$499 / YEAR", "Expanded reporting, integrations and client workflows")
    price_row(c, 338, 98, "FIELDOPS TEAMS", "FROM $1,500", "Shared operations, administration and support")

    c.setFillColor(Color(0.045, 0.05, 0.062, alpha=0.96))
    c.roundRect(40, 76, 252, 115, 10, fill=1, stroke=0)
    draw_text(c, "FOUNDING OPERATORS", 57, 165, "DC-MonoBold", 7, RED)
    draw_text(c, "Early support should matter.", 57, 141, "DC-Bold", 13, IVORY)
    wrap(c, "The intended direction is to honor existing one-time FieldOps licenses while future subscriptions fund continuous ranges, integrations, support and team infrastructure.", 57, 119, 215, "DC-Regular", 7.2, 9.5, MUTED, 5)

    c.setStrokeColor(LINE)
    c.line(40, 52, W - 40, 52)
    draw_text(c, "DC := DAEMONCORE", 40, 36, "DC-MonoBold", 7, IVORY)
    draw_text(c, "ACADEMY  //  FIELDOPS  //  MISSION OS  //  FIELD SYSTEMS", 159, 36, "DC-Mono", 6.2, MUTED)
    draw_right(c, "academy.daemoncore.app", W - 40, 36, "DC-MonoBold", 6.8, RED)
    draw_text(c, "Forward-looking concept. Features, timing, hardware and pricing are not guarantees and remain subject to development, validation and certification.", 40, 18, "DC-Regular", 5.5, DIM)

    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
