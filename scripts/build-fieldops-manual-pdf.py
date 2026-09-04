from __future__ import annotations

import html
import os
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
GUIDE = "academy" if "--academy" in sys.argv else os.environ.get("DAEMONCORE_GUIDE", "fieldops").lower()
if GUIDE == "academy":
    SOURCE = ROOT / "docs" / "ACADEMY-MISSION-OS-GUIDE.md"
    OUTPUT = ROOT / "output" / "pdf" / "DaemonCore-Academy-Mission-OS-Guide.pdf"
    GUIDE_NAME = "ACADEMY MISSION OS GUIDE"
    COVER_TITLE = "ACADEMY"
    COVER_SUBTITLE = "MISSION OS OPERATOR GUIDE"
    COVER_KICKER = "DAEMONCORE  //  EVIDENCE-LED OPERATOR DEVELOPMENT"
    COVER_LEAD = "Diagnose the signal. Build the route. Prove the work.<br/>A local-first operating guide for practical cyber training."
    COVER_NOTE = "PROGRESS IS RECORDED. CAPABILITY IS PROVEN BY THE WORK."
    DOCUMENT_TITLE = "DaemonCore Academy Mission OS Operator Guide"
    DOCUMENT_SUBJECT = "Operator guidance for DaemonCore Academy Mission OS 6.3.1"
    SCREENSHOT = ROOT / "docs" / "screenshots" / "command-center.png"
    SCREENSHOT_ANCHOR = "__no_academy_screenshot__"
    SCREENSHOT_CAPTION = "DaemonCore Academy command center and recorded operator progress"
else:
    SOURCE = ROOT / "docs" / "FIELDOPS-OPERATOR-MANUAL.md"
    OUTPUT = ROOT / "output" / "pdf" / "DaemonCore-FieldOps-Operator-Manual.pdf"
    GUIDE_NAME = "FIELDOPS OPERATOR MANUAL"
    COVER_TITLE = "FIELDOPS"
    COVER_SUBTITLE = "OPERATOR MANUAL"
    COVER_KICKER = "DAEMONCORE  //  AUTHORIZED ASSESSMENT CONTROL PLANE"
    COVER_LEAD = "Signed scope. Pinned targets. Sealed evidence.<br/>Professional assessment operations from one local-first desktop workspace."
    COVER_NOTE = "A LICENSE UNLOCKS THE TOOL. THE ENGAGEMENT AUTHORIZES THE TARGET."
    DOCUMENT_TITLE = "DaemonCore FieldOps Operator Manual"
    DOCUMENT_SUBJECT = "Operator guidance for DaemonCore FieldOps 6.3.1"
    SCREENSHOT = ROOT / "docs" / "screenshots" / "fieldops-pro-gate.png"
    SCREENSHOT_ANCHOR = "Move a license to another device"
    SCREENSHOT_CAPTION = "FieldOps Pro gate before commercial activation"
ICON = ROOT / "build" / "icon-sizes" / "256.png"

RED = colors.HexColor("#E33E48")
DARK = colors.HexColor("#111317")
INK = colors.HexColor("#20242A")
MID = colors.HexColor("#5E6570")
LIGHT = colors.HexColor("#F1F3F5")
PALE_RED = colors.HexColor("#FCEDEF")
BORDER = colors.HexColor("#D8DCE2")
WHITE = colors.white
PAGE_WIDTH, PAGE_HEIGHT = letter
CONTENT_WIDTH = 6.5 * inch


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Segoe", r"C:\Windows\Fonts\segoeui.ttf"))
    pdfmetrics.registerFont(TTFont("Segoe-Bold", r"C:\Windows\Fonts\segoeuib.ttf"))
    pdfmetrics.registerFont(TTFont("Consolas", r"C:\Windows\Fonts\consola.ttf"))
    pdfmetrics.registerFontFamily("Segoe", normal="Segoe", bold="Segoe-Bold")


def styles():
    sheet = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "Body",
            parent=sheet["BodyText"],
            fontName="Segoe",
            fontSize=9.2,
            leading=12.1,
            textColor=INK,
            spaceAfter=6,
            allowWidows=0,
            allowOrphans=0,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=sheet["Heading1"],
            fontName="Segoe-Bold",
            fontSize=17,
            leading=21,
            textColor=RED,
            spaceBefore=4,
            spaceAfter=12,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=sheet["Heading2"],
            fontName="Segoe-Bold",
            fontSize=12.3,
            leading=15,
            textColor=RED,
            spaceBefore=10,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=sheet["Heading3"],
            fontName="Segoe-Bold",
            fontSize=10.2,
            leading=13,
            textColor=DARK,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=sheet["BodyText"],
            fontName="Segoe",
            fontSize=9.1,
            leading=11.8,
            textColor=INK,
            leftIndent=18,
            firstLineIndent=0,
            bulletIndent=4,
            spaceAfter=4,
        ),
        "number": ParagraphStyle(
            "Number",
            parent=sheet["BodyText"],
            fontName="Segoe",
            fontSize=9.1,
            leading=11.8,
            textColor=INK,
            leftIndent=20,
            firstLineIndent=0,
            bulletIndent=0,
            spaceAfter=4,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=sheet["BodyText"],
            fontName="Segoe",
            fontSize=9,
            leading=12,
            textColor=INK,
            spaceAfter=0,
        ),
        "caption": ParagraphStyle(
            "Caption",
            parent=sheet["BodyText"],
            fontName="Segoe",
            fontSize=7.5,
            leading=9,
            textColor=MID,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
    }


def inline_markup(text: str) -> str:
    parts = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text)
    output = []
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            output.append(f"<b>{html.escape(part[2:-2])}</b>")
        elif part.startswith("`") and part.endswith("`"):
            output.append(f'<font name="Consolas" color="#B72B35">{html.escape(part[1:-1])}</font>')
        else:
            output.append(html.escape(part))
    return "".join(output)


def parse_table(lines: list[str]) -> list[list[str]]:
    rows = []
    for line in lines:
        cells = [value.strip() for value in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", value) for value in cells):
            continue
        rows.append(cells)
    return rows


def build_table(rows: list[list[str]], style_map) -> Table:
    columns = len(rows[0])
    if columns == 2:
        widths = [1.82 * inch, 4.68 * inch]
    elif columns == 3:
        widths = [1.5 * inch, 2.75 * inch, 2.25 * inch]
    else:
        widths = [CONTENT_WIDTH / columns] * columns
    cell_style = ParagraphStyle(
        "TableCell",
        parent=style_map["body"],
        fontSize=7.8 if columns >= 3 else 8.2,
        leading=10.2,
        spaceAfter=0,
    )
    header_style = ParagraphStyle(
        "TableHeader",
        parent=cell_style,
        fontName="Segoe-Bold",
        textColor=WHITE,
    )
    data = []
    for row_index, row in enumerate(rows):
        data.append([Paragraph(inline_markup(value), header_style if row_index == 0 else cell_style) for value in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for row_index in range(2, len(rows), 2):
        commands.append(("BACKGROUND", (0, row_index), (-1, row_index), LIGHT))
    table.setStyle(TableStyle(commands))
    return table


def cover_story(style_map):
    kicker = ParagraphStyle("CoverKicker", fontName="Segoe-Bold", fontSize=8.5, leading=11, textColor=RED, alignment=TA_CENTER)
    title = ParagraphStyle("CoverTitle", fontName="Segoe-Bold", fontSize=34, leading=38, textColor=DARK, alignment=TA_CENTER)
    subtitle = ParagraphStyle("CoverSubtitle", fontName="Segoe-Bold", fontSize=15, leading=18, textColor=RED, alignment=TA_CENTER)
    lead = ParagraphStyle("CoverLead", fontName="Segoe", fontSize=11.3, leading=16, textColor=MID, alignment=TA_CENTER, leftIndent=35, rightIndent=35)
    meta_label = ParagraphStyle("MetaLabel", fontName="Segoe-Bold", fontSize=7.2, leading=9, textColor=WHITE, alignment=TA_CENTER)
    meta_value = ParagraphStyle("MetaValue", fontName="Segoe-Bold", fontSize=8.3, leading=10, textColor=INK, alignment=TA_CENTER)
    note = ParagraphStyle("CoverNote", fontName="Segoe-Bold", fontSize=8, leading=10, textColor=RED, alignment=TA_CENTER)
    date = ParagraphStyle("CoverDate", fontName="Segoe", fontSize=7.5, leading=9, textColor=MID, alignment=TA_CENTER)

    icon = Image(str(ICON), width=1.35 * inch, height=1.35 * inch)
    icon.hAlign = "CENTER"
    meta = Table(
        [
            [Paragraph("PRODUCT", meta_label), Paragraph("RELEASE", meta_label), Paragraph("EDITION", meta_label)],
            [Paragraph("DaemonCore Academy", meta_value), Paragraph("6.3.1", meta_value), Paragraph("Production release", meta_value)],
        ],
        colWidths=[CONTENT_WIDTH / 3] * 3,
    )
    meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("BACKGROUND", (0, 1), (-1, 1), LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return [
        Spacer(1, 0.28 * inch), icon, Spacer(1, 0.28 * inch),
        Paragraph(COVER_KICKER, kicker),
        Spacer(1, 0.16 * inch), Paragraph(COVER_TITLE, title),
        Paragraph(COVER_SUBTITLE, subtitle), Spacer(1, 0.22 * inch),
        Paragraph(COVER_LEAD, lead),
        Spacer(1, 0.45 * inch), meta, Spacer(1, 0.5 * inch),
        Paragraph(COVER_NOTE, note),
        Spacer(1, 0.12 * inch), Paragraph("4 SEPTEMBER 2026  //  DAEMONCORE APPS", date),
        PageBreak(),
    ]


def content_story(lines: list[str], style_map):
    start = next(index for index, value in enumerate(lines) if value.strip() == "# Document control")
    lines = lines[start:]
    story = []
    index = 0
    first_h1 = True
    number_counter = 0
    while index < len(lines):
        raw = lines[index].strip()
        if not raw or raw == "---":
            number_counter = 0
            index += 1
            continue
        if raw.startswith("# "):
            if not first_h1:
                story.append(PageBreak())
            first_h1 = False
            story.append(Paragraph(inline_markup(raw[2:]), style_map["h1"]))
            index += 1
            continue
        if raw.startswith("## "):
            heading = raw[3:]
            if heading == SCREENSHOT_ANCHOR and SCREENSHOT.exists():
                shot = Image(
                    str(SCREENSHOT),
                    width=(4.8 if GUIDE == "academy" else 6.15) * inch,
                    height=(2.7 if GUIDE == "academy" else 4.06) * inch,
                )
                shot.hAlign = "CENTER"
                story.extend([shot, Paragraph(SCREENSHOT_CAPTION, style_map["caption"])])
            story.append(Paragraph(inline_markup(heading), style_map["h2"]))
            index += 1
            continue
        if raw.startswith("### "):
            story.append(Paragraph(inline_markup(raw[4:]), style_map["h3"]))
            index += 1
            continue
        if raw.startswith("> "):
            callout = Table([[Paragraph(f'<b><font color="#B72B35">OPERATOR NOTE  //</font></b> {inline_markup(raw[2:])}', style_map["callout"])]], colWidths=[CONTENT_WIDTH])
            callout.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), PALE_RED),
                ("BOX", (0, 0), (-1, -1), 0.6, RED),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.extend([callout, Spacer(1, 6)])
            index += 1
            continue
        if raw.startswith("|"):
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            story.extend([build_table(parse_table(table_lines), style_map), Spacer(1, 7)])
            continue
        if raw.startswith("- "):
            story.append(Paragraph(inline_markup(raw[2:]), style_map["bullet"], bulletText="•"))
            index += 1
            continue
        numbered = re.match(r"^(\d+)\.\s+(.*)$", raw)
        if numbered:
            number_counter += 1
            story.append(Paragraph(inline_markup(numbered.group(2)), style_map["number"], bulletText=f"{number_counter}."))
            index += 1
            continue
        paragraph_lines = [raw]
        index += 1
        while index < len(lines):
            next_line = lines[index].strip()
            if not next_line or next_line.startswith(("#", ">", "|", "- ")) or re.match(r"^\d+\.\s+", next_line) or next_line == "---":
                break
            paragraph_lines.append(next_line)
            index += 1
        story.append(Paragraph(inline_markup(" ".join(paragraph_lines)), style_map["body"]))
    return story


def draw_first_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, PAGE_HEIGHT - 11, PAGE_WIDTH, 11, fill=1, stroke=0)
    canvas.setFillColor(RED)
    canvas.rect(0, 0, PAGE_WIDTH, 7, fill=1, stroke=0)
    canvas.restoreState()


def draw_later_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(RED)
    canvas.setLineWidth(1.2)
    canvas.line(inch, PAGE_HEIGHT - 39, PAGE_WIDTH - inch, PAGE_HEIGHT - 39)
    canvas.setFont("Segoe-Bold", 7.2)
    canvas.setFillColor(MID)
    canvas.drawString(inch, PAGE_HEIGHT - 31, f"DAEMONCORE  //  {GUIDE_NAME}  //  6.3.1")
    canvas.setFont("Segoe", 7.2)
    canvas.drawString(inch, 28, "LATEST RELEASE  |  Copyright 2026 DaemonCore Apps")
    canvas.drawRightString(PAGE_WIDTH - inch, 28, str(doc.page))
    canvas.restoreState()


def main() -> None:
    register_fonts()
    style_map = styles()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=0.72 * inch,
        bottomMargin=0.65 * inch,
        title=DOCUMENT_TITLE,
        author="DaemonCore Apps",
        subject=DOCUMENT_SUBJECT,
    )
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    story = cover_story(style_map) + content_story(lines, style_map)
    document.build(story, onFirstPage=draw_first_page, onLaterPages=draw_later_page)
    print(OUTPUT)


if __name__ == "__main__":
    main()
