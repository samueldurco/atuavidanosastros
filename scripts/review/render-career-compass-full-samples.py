"""Render private PDF facsimiles from the approved, unmodified full web reading JSON.

Input is supplied by career-compass-full-sample-pdfs.mjs. All interpretive
paragraphs, chapter titles, questions, source and limits are printed verbatim.
The public Career Compass product is web only; these files are owner previews.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    CondPageBreak,
    Flowable,
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / 'apps/web/src/lib/server/pdf-fonts'
ART = ROOT / 'apps/web/static/brand/mvp/assets/revisao/bussola-gravada.webp'
INK = colors.HexColor('#183746')
NIGHT = colors.HexColor('#102c3d')
PAPER = colors.HexColor('#f6efdf')
LIGHT = colors.HexColor('#fff8e9')
# Product-specific colors from the approved career-compass design manifest.
# Use the darker ink for text; the lighter accent only marks decorative rules.
PRODUCT_TINT = colors.HexColor('#e7ebcf')
PRODUCT_INK = colors.HexColor('#385240')
PRODUCT_ACCENT = colors.HexColor('#95a244')
RULE = colors.HexColor('#c7bfac')
MUTED = colors.HexColor('#596365')
W, H = A4
LEFT = RIGHT = 50
TOP = 65
BOTTOM = 60
WIDTH = W - LEFT - RIGHT


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont('Newsreader', str(FONTS / 'newsreader-regular.ttf')))
    pdfmetrics.registerFont(TTFont('Onest', str(FONTS / 'onest-regular.ttf')))
    # The brand fonts do not contain Greek Delta, which appears in a limit note.
    pdfmetrics.registerFont(TTFont('GeorgiaGreek', 'C:/Windows/Fonts/georgia.ttf'))


def make_style(name: str, face: str, size: float, leading: float, color=INK):
    return ParagraphStyle(name, fontName=face, fontSize=size, leading=leading,
                          textColor=color, alignment=TA_LEFT, spaceAfter=0,
                          allowWidows=0, allowOrphans=0)


STYLES = {
    'eyebrow': make_style('eyebrow', 'Onest', 8, 12, PRODUCT_INK),
    'title': make_style('title', 'Newsreader', 37, 41),
    'name': make_style('name', 'Newsreader', 25, 29, PRODUCT_INK),
    'chapter': make_style('chapter', 'Newsreader', 28, 33),
    'subhead': make_style('subhead', 'Newsreader', 22, 27),
    'body': make_style('body', 'Newsreader', 12, 18),
    'small': make_style('small', 'Newsreader', 10.8, 16),
    'ui': make_style('ui', 'Onest', 8.4, 13),
    'meta': make_style('meta', 'Onest', 7.5, 11, MUTED),
}


def para(value: str, style='body') -> Paragraph:
    encoded = html.escape(value).replace('Δ', '<font name="GeorgiaGreek">Δ</font>')
    return Paragraph(encoded.replace('\n', '<br/>'), STYLES[style])


def prose(value: str, style='body') -> list:
    out = []
    for item in value.split('\n\n'):
        if item.strip():
            if out:
                out.append(Spacer(1, 10))
            out.append(para(item, style))
    return out


def symbol(canvas, x: float, y: float, size: float) -> None:
    """Exact circle, star and book paths from approved marca-escura.svg."""
    canvas.saveState()
    canvas.translate(x, y + size)
    canvas.scale(size / 100, -size / 100)
    canvas.setStrokeColor(colors.HexColor('#BF9153'))
    canvas.setLineWidth(1.4)
    canvas.circle(50, 50, 47, stroke=1, fill=0)
    star = canvas.beginPath()
    star.moveTo(50, 15)
    star.curveTo(51.9, 28, 53.2, 30.9, 65, 33)
    star.curveTo(53.2, 35.1, 51.9, 38, 50, 51)
    star.curveTo(48.1, 38, 46.8, 35.1, 35, 33)
    star.curveTo(46.8, 30.9, 48.1, 28, 50, 15)
    star.close()
    canvas.setFillColor(colors.HexColor('#BF9153'))
    canvas.drawPath(star, fill=1, stroke=0)
    book = canvas.beginPath()
    book.moveTo(17, 58)
    book.curveTo(28, 53, 40, 58, 50, 70)
    book.curveTo(60, 58, 72, 53, 83, 58)
    book.moveTo(21, 70)
    book.curveTo(32, 67, 41, 73, 50, 82)
    book.curveTo(59, 73, 68, 67, 79, 70)
    canvas.setLineWidth(3.8)
    canvas.setLineCap(1)
    canvas.drawPath(book, fill=0, stroke=1)
    canvas.restoreState()


class CompassArt(Flowable):
    """Product artwork in the approved cartographic plate composition."""

    def __init__(self):
        super().__init__()
        self.width = 180
        self.height = 218

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(PRODUCT_TINT)
        frame = c.beginPath()
        frame.moveTo(15, 44)
        frame.lineTo(57, 45)
        frame.lineTo(130, 44)
        frame.lineTo(166, 45)
        frame.lineTo(165, 179)
        frame.lineTo(166, 204)
        frame.lineTo(89, 203)
        frame.lineTo(15, 204)
        frame.close()
        c.drawPath(frame, fill=1, stroke=0)
        c.drawImage(ImageReader(str(ART)), 25, 64, 130, 130, mask='auto')
        c.setFillColor(PRODUCT_INK)
        c.setFont('Onest', 6.4)
        c.drawCentredString(90, 52, 'ORIENTAÇÃO')
        c.setFont('Newsreader', 8.1)
        c.drawCentredString(90, 29, 'Um primeiro ponto de orientação')
        c.setFont('Onest', 6.8)
        c.drawRightString(164, 11, '21 / ATVNA')
        c.restoreState()


def chrome(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(NIGHT)
    canvas.rect(0, H - 38, W, 38, fill=1, stroke=0)
    symbol(canvas, LEFT, H - 32, 26)
    canvas.setFont('Onest', 8)
    canvas.setFillColor(colors.white)
    canvas.drawString(LEFT + 36, H - 24, 'A TUA VIDA NOS ASTROS')
    canvas.setStrokeColor(RULE)
    canvas.line(LEFT, 48, W - RIGHT, 48)
    canvas.setFillColor(INK)
    canvas.setFont('Onest', 7.3)
    canvas.drawString(LEFT, 34, 'AMOSTRA FICTÍCIA  ·  PRÉVIA PRIVADA  ·  FORMATO DE CATÁLOGO: WEB')
    canvas.drawRightString(W - RIGHT, 34, f'{doc.page:02d}')
    canvas.restoreState()


def card(items: list, *, fill=LIGHT, accent=PRODUCT_INK, padding=17) -> Table:
    table = Table([[items]], colWidths=[WIDTH], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), fill),
        ('LINEBEFORE', (0, 0), (0, -1), 3, accent),
        ('LEFTPADDING', (0, 0), (-1, -1), padding),
        ('RIGHTPADDING', (0, 0), (-1, -1), padding),
        ('TOPPADDING', (0, 0), (-1, -1), padding),
        ('BOTTOMPADDING', (0, 0), (-1, -1), padding),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return table


def birth_label(birth: dict) -> str:
    local = birth.get('localDateTime', '')
    match = re.fullmatch(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})', local)
    if match:
        year, month, day, hour, minute, second = match.groups()
        shown = f'{day}/{month}/{year} às {hour}h{minute}'
        if second != '00':
            shown += f'm{second}s'
    else:
        shown = local.replace('T', ' ')
    timezone = birth.get('timezone', '')
    zone_label = {
        'America/Sao_Paulo': 'horário de São Paulo',
        'UTC': 'UTC',
    }.get(timezone, f'fuso {timezone}' if timezone else '')
    return f'Nascimento: {shown}' + (f' · {zone_label}' if zone_label else '')


def cover(sample: dict) -> list:
    value = sample['input']
    reading = sample['reading']
    presentation = value.get('presentation') or {}
    birth = value.get('birth') or {}
    name = presentation.get('name') or 'Pessoa fictícia'
    left = [para('BÚSSOLA DE CARREIRA  /  LEITURA FICTÍCIA', 'eyebrow'),
            Spacer(1, 16), para(reading['title'], 'title'), Spacer(1, 15),
            HRFlowable(width=72, thickness=2.5, color=PRODUCT_ACCENT, hAlign='LEFT'),
            Spacer(1, 15), para(name, 'name')]
    art = CompassArt()
    hero = Table([[left, art]], colWidths=[WIDTH - 180, 180], hAlign='LEFT')
    hero.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    facts = [para('DADOS INFORMADOS NESTE CENÁRIO', 'eyebrow'), Spacer(1, 10),
             para(birth_label(birth), 'ui'),
             Spacer(1, 6), para(f"Cidade informada: {presentation.get('city', 'não informada')}", 'ui'),
             Spacer(1, 6), para(f"Contexto: {value.get('context') or 'não informado'}", 'ui')]
    note = [para('PARA ANÁLISE DO PROPRIETÁRIO', 'eyebrow'), Spacer(1, 10),
            para('Esta prévia reproduz o texto gerado pelo motor integral atual para análise editorial do proprietário.', 'small'),
            Spacer(1, 8),
            para('O formato previsto no catálogo para a Bússola é uma leitura interativa na web. Este PDF é somente um fac-símile privado para avaliar texto e apresentação; o mapa interativo não é reproduzido aqui.', 'small')]
    return [Spacer(1, 30), hero, Spacer(1, 33), card(facts, fill=PRODUCT_TINT, accent=PRODUCT_ACCENT),
            Spacer(1, 25), card(note, fill=LIGHT, accent=RULE), PageBreak()]


def opening(sample: dict) -> list:
    reading = sample['reading']
    return [para('SUA LEITURA  /  ABERTURA', 'eyebrow'), Spacer(1, 11),
            para('Um primeiro ponto de orientação', 'subhead'), Spacer(1, 16),
            *prose(reading['opening']), Spacer(1, 26),
            HRFlowable(width='100%', thickness=0.7, color=RULE), Spacer(1, 14),
            para('A leitura segue capítulo por capítulo, como na experiência web.', 'ui'),
            Spacer(1, 30)]


def chapters(sample: dict) -> list:
    result = []
    for number, section in enumerate(sample['reading']['sections'], start=1):
        heading = [para(f'CAPÍTULO {number:02d}  /  11', 'eyebrow'), Spacer(1, 13),
                   para(section['title'], 'chapter'), Spacer(1, 12),
                   HRFlowable(width=70, thickness=2.2, color=PRODUCT_ACCENT, hAlign='LEFT'),
                   Spacer(1, 20)]
        # Give each chapter room for its heading and opening text, then let
        # the prose flow across pages. One forced page per chapter left most
        # A4 sheets nearly empty and obscured the reading's natural rhythm.
        result.extend([CondPageBreak(180), *heading, *prose(section['text']),
                       Spacer(1, 26),
                       HRFlowable(width='100%', thickness=0.7, color=RULE),
                       Spacer(1, 24)])
    return result


def endmatter(sample: dict) -> list:
    reading = sample['reading']
    result = [CondPageBreak(180), para('PARA CONTINUAR', 'eyebrow'), Spacer(1, 12),
              para('Perguntas para levar com você', 'subhead'), Spacer(1, 15)]
    for i, question in enumerate(reading['questions'], start=1):
        result.extend([para(f'{i:02d}  {question}', 'body'), Spacer(1, 12)])
    result.extend([Spacer(1, 13), para('Experimente', 'subhead'), Spacer(1, 11),
                   *prose(reading['practice']), Spacer(1, 29), CondPageBreak(165),
                   para('PARA CONTINUAR  /  MÉTODO', 'eyebrow'), Spacer(1, 12),
                   para('Alcance e limites desta leitura', 'subhead'), Spacer(1, 13)])
    for limit in reading['limits']:
        result.extend([para(limit, 'small'), Spacer(1, 10)])
    result.extend([Spacer(1, 12), HRFlowable(width='100%', thickness=0.7, color=RULE),
                   Spacer(1, 11), para('Método e origem', 'eyebrow'), Spacer(1, 8),
                   para(reading['source'], 'small')])
    return result


def render(sample: dict, output_dir: Path) -> Path:
    slug = sample['slug']
    if re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) is None:
        raise ValueError('Invalid synthetic profile slug')
    if len(sample['reading']['sections']) != 11:
        raise ValueError('Full reading requires eleven chapters')
    path = output_dir / f'atvna-bussola-integral-v6-previa-{slug}.pdf'
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=RIGHT,
                            leftMargin=LEFT, topMargin=TOP, bottomMargin=BOTTOM,
                            title=sample['reading']['title'] + ' · prévia fictícia privada',
                            author='ATVNA · revisão privada')
    doc.build([*cover(sample), *opening(sample), *chapters(sample), *endmatter(sample)],
              onFirstPage=chrome, onLaterPages=chrome)
    reader = PdfReader(str(path))
    page_text = (page.extract_text() or '' for page in reader.pages)
    text = '\n'.join(
        line for page in page_text for line in page.splitlines()
        if line.strip() not in {
            'A TUA VIDA NOS ASTROS',
            'AMOSTRA FICTÍCIA  ·  PRÉVIA PRIVADA  ·  FORMATO DE CATÁLOGO: WEB',
        } and not re.fullmatch(r'\d{2}', line.strip())
    )
    expected = [sample['reading']['title'], sample['reading']['opening'],
                *(s['title'] for s in sample['reading']['sections']),
                *sample['reading']['questions'], sample['reading']['practice'],
                *sample['reading']['limits'], sample['reading']['source']]
    for section in sample['reading']['sections']:
        expected.extend(part for part in section['text'].split('\n\n') if part.strip())
    compact = lambda value: re.sub(r'\s+', ' ', value).strip()
    visible = compact(text)
    for value in expected:
        if compact(value) not in visible:
            raise ValueError(f'Missing text from {slug}: {value[:70]}')
    return path


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('Usage: render-career-compass-full-samples.py OUTPUT_DIR < samples.json')
    samples = json.loads(sys.stdin.buffer.read().decode('utf-8'))
    if not isinstance(samples, list) or len(samples) != 6:
        raise ValueError('Expected six current engine samples')
    if len({item['slug'] for item in samples}) != len(samples):
        raise ValueError('Duplicate fictional profiles')
    register_fonts()
    output_dir = Path(sys.argv[1])
    output_dir.mkdir(parents=True, exist_ok=True)
    for sample in samples:
        print(render(sample, output_dir))


if __name__ == '__main__':
    main()
