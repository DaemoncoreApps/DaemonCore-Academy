from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "DaemonCore-FieldOps-Retail-Brochure-v6.0.0-beta.1.pdf"
HERO = ROOT / "docs" / "marketing" / "fieldops-brochure-hero.png"
SCREEN = ROOT / "docs" / "screenshots" / "fieldops-pro-gate.png"
CHECKOUT = "https://daemoncore.lemonsqueezy.com/checkout/buy/17b86570-b95c-49fa-a987-e8fa904d3f34"

PAGE_W, PAGE_H = letter
BLACK = HexColor("#07080A")
PANEL = HexColor("#101216")
PANEL_2 = HexColor("#15171C")
RED = HexColor("#F23845")
RED_DARK = HexColor("#7D111A")
IVORY = HexColor("#F4F1EA")
MUTED = HexColor("#A6A9B0")
DIM = HexColor("#6E727B")
LINE = HexColor("#292D34")
GREEN = HexColor("#64D98B")


def register_fonts():
    font_dir = Path("C:/Windows/Fonts")
    fonts = {
        "DC-Regular": font_dir / "segoeui.ttf",
        "DC-Semibold": font_dir / "seguisb.ttf",
        "DC-Bold": font_dir / "segoeuib.ttf",
        "DC-Mono": font_dir / "consola.ttf",
        "DC-MonoBold": font_dir / "consolab.ttf",
    }
    for name, path in fonts.items():
        pdfmetrics.registerFont(TTFont(name, str(path)))


def fit_image(c, path, x, y, w, h, crop=True):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    scale = max(w / iw, h / ih) if crop else min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, y, w, h)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def text(c, value, x, y, font="DC-Regular", size=10, color=IVORY):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, value)


def right_text(c, value, x, y, font="DC-Regular", size=10, color=IVORY):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawRightString(x, y, value)


def wrap(c, value, x, y, width, font="DC-Regular", size=10, leading=14, color=MUTED, max_lines=None):
    words = value.split()
    lines, current = [], ""
    for word in words:
        proposed = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(proposed, font, size) <= width:
            current = proposed
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if max_lines:
        lines = lines[:max_lines]
    for index, line in enumerate(lines):
        text(c, line, x, y - index * leading, font, size, color)
    return y - len(lines) * leading


def hex_mark(c, x, y, radius=13):
    p = c.beginPath()
    import math
    for index in range(6):
        angle = math.radians(60 * index + 30)
        px = x + radius * math.cos(angle)
        py = y + radius * math.sin(angle)
        if index == 0:
            p.moveTo(px, py)
        else:
            p.lineTo(px, py)
    p.close()
    c.setStrokeColor(IVORY)
    c.setLineWidth(1.3)
    c.drawPath(p, stroke=1, fill=0)
    c.setFillColor(RED)
    c.rect(x - 4, y - 4, 8, 8, fill=1, stroke=0)


def brand(c, x=42, y=PAGE_H - 40, dark=False):
    hex_mark(c, x + 12, y, 11)
    text(c, "DAEMON", x + 32, y - 4, "DC-Bold", 10.5, BLACK if dark else IVORY)
    text(c, "CORE", x + 76, y - 4, "DC-Bold", 10.5, RED)


def footer(c, page):
    c.setStrokeColor(LINE)
    c.line(42, 30, PAGE_W - 42, 30)
    text(c, "DC := DAEMONCORE  //  FIELDOPS", 42, 16, "DC-MonoBold", 6.8, DIM)
    right_text(c, f"6.0.0 BETA  //  0{page}", PAGE_W - 42, 16, "DC-Mono", 6.8, DIM)


def label(c, value, x, y, color=RED):
    c.setFillColor(color)
    c.roundRect(x, y - 12, pdfmetrics.stringWidth(value, "DC-MonoBold", 7.2) + 16, 19, 4, fill=1, stroke=0)
    text(c, value, x + 8, y - 6, "DC-MonoBold", 7.2, white)


def qr_code(c, value, x, y, size):
    widget = qr.QrCodeWidget(value)
    bounds = widget.getBounds()
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    drawing = Drawing(width, height)
    drawing.add(widget)
    c.saveState()
    c.translate(x, y)
    c.scale(size / width, size / height)
    renderPDF.draw(drawing, c, 0, 0)
    c.restoreState()


def cover(c):
    fit_image(c, HERO, 0, 0, PAGE_W, PAGE_H, crop=True)
    # Preserve the photograph while creating a quiet, readable title field.
    c.setFillColor(Color(0, 0, 0, alpha=0.76))
    c.rect(0, PAGE_H - 340, PAGE_W, 340, fill=1, stroke=0)
    c.setFillColor(Color(0, 0, 0, alpha=0.28))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    brand(c, 44, PAGE_H - 45)
    label(c, "AUTHORIZED ASSESSMENT CONTROL PLANE", 44, PAGE_H - 100)
    text(c, "External power.", 44, PAGE_H - 163, "DC-Bold", 31, IVORY)
    text(c, "Hard authorization.", 44, PAGE_H - 202, "DC-Bold", 31, RED)
    wrap(c, "Run scoped diagnostics, repeatable campaigns, evidence-backed findings and bounded resilience experiments from one local-first professional workspace.", 46, PAGE_H - 237, 410, "DC-Regular", 11.3, 16, HexColor("#D2D3D6"))

    c.setFillColor(Color(0.03, 0.035, 0.045, alpha=0.93))
    c.roundRect(38, 48, PAGE_W - 76, 94, 12, fill=1, stroke=0)
    features = [("SIGNED", "operation permits"), ("SEALED", "evidence captures"), ("READY", "client exports")]
    for i, (head, sub) in enumerate(features):
        x = 58 + i * 169
        if i:
            c.setStrokeColor(LINE)
            c.line(x - 18, 66, x - 18, 124)
        text(c, head, x, 102, "DC-MonoBold", 11.5, RED)
        text(c, sub, x, 83, "DC-Regular", 8.6, MUTED)
    text(c, "FIELDOPS PRO", 44, 27, "DC-MonoBold", 7.5, IVORY)
    right_text(c, "WINDOWS + LINUX  //  PUBLIC BETA", PAGE_W - 44, 27, "DC-Mono", 7.5, MUTED)
    c.showPage()


def feature_card(c, x, y, w, title, body, code):
    c.setFillColor(PANEL_2)
    c.roundRect(x, y, w, 91, 8, fill=1, stroke=0)
    c.setFillColor(RED)
    c.roundRect(x, y, 4, 91, 2, fill=1, stroke=0)
    text(c, code, x + 16, y + 69, "DC-MonoBold", 6.7, RED)
    text(c, title, x + 16, y + 49, "DC-Semibold", 11, IVORY)
    wrap(c, body, x + 16, y + 31, w - 30, "DC-Regular", 7.7, 10.5, MUTED, 3)


def capabilities(c):
    c.setFillColor(BLACK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    brand(c)
    label(c, "WHAT FIELDOPS DOES", 42, PAGE_H - 84)
    text(c, "One workspace.", 42, PAGE_H - 127, "DC-Bold", 26, IVORY)
    text(c, "A defensible chain of work.", 42, PAGE_H - 159, "DC-Bold", 26, RED)
    wrap(c, "FieldOps turns approved scope into controlled execution, durable evidence and review-ready deliverables without sending engagement records to a required cloud account.", 43, PAGE_H - 186, 510, "DC-Regular", 9.4, 13, MUTED)

    cards = [
        ("SIGNED SCOPE", "Exact hosts, ports, policy and testing window bound to a device-held Ed25519 operator identity.", "01 // PERMITS"),
        ("FOCUSED DIAGNOSTICS", "DNS, TCP, HTTP posture, TLS identity, service profiles, surface baselines and bounded web maps.", "02 // OBSERVE"),
        ("ASSESSMENT CAMPAIGNS", "Repeatable multi-target service inventory, change verification and complete assessment profiles.", "03 // VALIDATE"),
        ("EVIDENCE VAULT", "SHA-256 sealed captures retain target, timing, raw result, resolved addresses and execution context.", "04 // PROVE"),
        ("FINDINGS + RETESTS", "Promote evidence into reviewed findings, track disposition and attach a later capture as formal retest proof.", "05 // REMEDIATE"),
        ("CHAOS ENGINE", "Short, bounded HTTP resilience profiles with live telemetry, SLO aborts, emergency stop and recovery validation.", "06 // STRESS"),
    ]
    for index, item in enumerate(cards):
        col, row = index % 2, index // 2
        feature_card(c, 42 + col * 264, 373 - row * 104, 248, item[0], item[1], item[2])

    c.setFillColor(PANEL)
    c.roundRect(42, 91, PAGE_W - 84, 67, 9, fill=1, stroke=0)
    text(c, "PROFESSIONAL OUTPUTS", 58, 135, "DC-MonoBold", 7, GREEN)
    text(c, "Machine-readable JSON case file", 58, 113, "DC-Semibold", 9.6, IVORY)
    text(c, "Printable client report", 270, 113, "DC-Semibold", 9.6, IVORY)
    text(c, "Integrity + attribution verdicts", 430, 113, "DC-Semibold", 9.6, IVORY)
    footer(c, 2)
    c.showPage()


def workflow(c):
    c.setFillColor(BLACK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    brand(c)
    label(c, "FROM AUTHORIZATION TO REPORT", 42, PAGE_H - 84)
    text(c, "Built for work that", 42, PAGE_H - 128, "DC-Bold", 25, IVORY)
    text(c, "has to survive review.", 42, PAGE_H - 160, "DC-Bold", 25, RED)

    # Product screenshot frame.
    c.setFillColor(PANEL)
    c.roundRect(42, 390, PAGE_W - 84, 192, 10, fill=1, stroke=0)
    fit_image(c, SCREEN, 49, 397, PAGE_W - 98, 178, crop=True)
    c.setStrokeColor(RED_DARK)
    c.roundRect(42, 390, PAGE_W - 84, 192, 10, fill=0, stroke=1)

    steps = [
        ("1", "DEFINE", "Translate written authorization into exact targets, ports, policy and dates."),
        ("2", "SIGN", "Bind the permit to the named operator, approver and device-held key."),
        ("3", "OPERATE", "Run diagnostics or campaigns only inside the active signed boundary."),
        ("4", "PROVE", "Seal captures, review findings, retest and export the complete record."),
    ]
    start_y = 345
    for idx, (num, head, body) in enumerate(steps):
        y = start_y - idx * 57
        c.setFillColor(RED if idx == 0 else PANEL_2)
        c.circle(56, y + 7, 13, fill=1, stroke=0)
        text(c, num, 52.4, y + 3, "DC-MonoBold", 8, white if idx == 0 else RED)
        text(c, head, 83, y + 13, "DC-MonoBold", 7.2, RED)
        wrap(c, body, 83, y - 2, 438, "DC-Regular", 8.4, 11, MUTED, 2)

    c.setFillColor(PANEL)
    c.roundRect(42, 63, PAGE_W - 84, 77, 10, fill=1, stroke=0)
    text(c, "FIELDOPS PRO", 58, 116, "DC-MonoBold", 7.3, RED)
    text(c, "$29.99", 58, 82, "DC-Bold", 24, IVORY)
    text(c, "ONE-TIME LICENSE", 151, 91, "DC-MonoBold", 7, MUTED)
    text(c, "Academy stays free. FieldOps is the paid workspace.", 287, 108, "DC-Semibold", 8.2, IVORY)
    text(c, "SCAN TO UNLOCK", 287, 86, "DC-MonoBold", 7, RED)
    text(c, "academy.daemoncore.app", 287, 71, "DC-Mono", 7.2, MUTED)
    c.setFillColor(white)
    c.roundRect(501, 71, 60, 60, 4, fill=1, stroke=0)
    qr_code(c, CHECKOUT, 505, 75, 52)
    c.linkURL(CHECKOUT, (42, 63, PAGE_W - 42, 140), relative=0, thickness=0)
    text(c, "License unlocks the software. Written authorization is still required for every target.", 58, 48, "DC-Regular", 7.1, DIM)
    footer(c, 3)
    c.showPage()


def build():
    register_fonts()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=letter, pageCompression=1)
    c.setTitle("DaemonCore FieldOps - Retail Brochure")
    c.setAuthor("DaemonCore Apps")
    c.setSubject("FieldOps Pro capabilities and commercial overview")
    cover(c)
    capabilities(c)
    workflow(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
