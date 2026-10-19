"""Render private PDF facsimiles of the MC-only Career Compass web reading.

The only interpretive text comes verbatim from readerContent in the JSON
produced by the local candidate engine. This review artifact is not a product
export, a public issuance, or a statement that the release gate has passed.
"""

from __future__ import annotations

import hashlib
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    CondPageBreak,
    Flowable,
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = ROOT / 'output/pdf/bussola-gratis-facsimiles-1.8.7.json'
DEFAULT_OUTPUT = ROOT / 'output/pdf'
EXPECTED_CANDIDATE_VERSION = 'atv-career-compass-candidate/1.8.7'
EXPECTED_READER_VERSION = 'atv-product-delivery-career-compass/1.0.0'
FONTS = ROOT / 'apps/web/src/lib/server/pdf-fonts'
COMPASS_ART = ROOT / 'apps/web/static/brand/mvp/assets/revisao/bussola-gravada.webp'

# Approved 14/10/2026 visual direction: paper, mother blue, Career olive/ochre.
PAPER = colors.HexColor('#F6EFDF')
SURFACE = colors.HexColor('#FFF8E9')
NIGHT = colors.HexColor('#102C3D')
INK = colors.HexColor('#183746')
CAREER = colors.HexColor('#4D6231')
OCHRE = colors.HexColor('#CE9B45')
SOFT_OLIVE = colors.HexColor('#E7EBCF')
RULE = colors.HexColor('#C9C2B3')
MUTED = colors.HexColor('#596365')
W, H = A4
LEFT = RIGHT = 53
TOP = 68
BOTTOM = 59
WIDTH = W - LEFT - RIGHT


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont('Newsreader', str(FONTS / 'newsreader-regular.ttf')))
    pdfmetrics.registerFont(TTFont('Onest', str(FONTS / 'onest-regular.ttf')))


def style(name: str, face: str, size: float, leading: float, color=INK) -> ParagraphStyle:
    return ParagraphStyle(name, fontName=face, fontSize=size, leading=leading,
                          textColor=color, alignment=TA_LEFT, spaceAfter=0,
                          allowWidows=0, allowOrphans=0)


STYLES = {
    'label': style('label', 'Onest', 8.2, 12, CAREER),
    'title': style('title', 'Newsreader', 24, 28.5, INK),
    'profile': style('profile', 'Newsreader', 18, 22, CAREER),
    'section': style('section', 'Newsreader', 17.8, 21.5, INK),
    'body': style('body', 'Newsreader', 11.6, 16.7, INK),
    'limit': style('limit', 'Newsreader', 10.2, 14.3, INK),
    'ui': style('ui', 'Onest', 8.6, 13.2, INK),
    'small': style('small', 'Onest', 7.6, 11.5, MUTED),
}


def para(value: str, kind='body') -> Paragraph:
    return Paragraph(html.escape(value).replace('\n', '<br/>'), STYLES[kind])


def source_paragraphs(value: str, kind='body') -> list:
    result = []
    for block in value.split('\n\n'):
        if block.strip():
            if result:
                result.append(Spacer(1, 7))
            result.append(para(block, kind))
    return result


def draw_brand_symbol(canvas, x: float, y: float, size: float) -> None:
    """The existing brand geometry: circle, star, open pages/horizon."""
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
    pages = canvas.beginPath()
    pages.moveTo(17, 58)
    pages.curveTo(28, 53, 40, 58, 50, 70)
    pages.curveTo(60, 58, 72, 53, 83, 58)
    pages.moveTo(21, 70)
    pages.curveTo(32, 67, 41, 73, 50, 82)
    pages.curveTo(59, 73, 68, 67, 79, 70)
    canvas.setLineWidth(3.8)
    canvas.setLineCap(1)
    canvas.drawPath(pages, fill=0, stroke=1)
    canvas.restoreState()


class CompassArtwork(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 128
        self.height = 135

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(SOFT_OLIVE)
        canvas.roundRect(2, 4, 124, 127, 3, fill=1, stroke=0)
        canvas.drawImage(ImageReader(str(COMPASS_ART)), 8, 9, 113, 113, mask='auto')
        canvas.restoreState()


def chrome(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(NIGHT)
    canvas.rect(0, H - 39, W, 39, fill=1, stroke=0)
    draw_brand_symbol(canvas, LEFT, H - 33, 26)
    canvas.setFont('Onest', 8)
    canvas.setFillColor(colors.white)
    canvas.drawString(LEFT + 36, H - 24, 'A TUA VIDA NOS ASTROS')
    canvas.setStrokeColor(RULE)
    canvas.line(LEFT, 48, W - RIGHT, 48)
    canvas.setFillColor(INK)
    canvas.setFont('Onest', 7)
    canvas.drawString(LEFT, 33, 'CENÁRIO FICTÍCIO  ·  SIMULAÇÃO PRIVADA  ·  PUBLICAÇÃO BLOQUEADA')
    canvas.drawRightString(W - RIGHT, 33, f'{doc.page:02d}')
    canvas.restoreState()


def intro(profile: dict) -> list:
    reading = profile['readerContent']
    left = [para('BÚSSOLA GRATUITA  /  FAC-SÍMILE DA LEITURA WEB', 'label'),
            Spacer(1, 12), para(reading['title'], 'title'), Spacer(1, 14),
            HRFlowable(width=63, thickness=2.2, color=OCHRE, hAlign='LEFT'),
            Spacer(1, 12), para(profile['fictionalName'], 'profile'),
            Spacer(1, 5), para(profile['situation'], 'ui')]
    hero = Table([[left, CompassArtwork()]], colWidths=[WIDTH - 137, 137], hAlign='LEFT')
    hero.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    note = Table([[para('SIMULAÇÃO PRIVADA  ·  PUBLICAÇÃO BLOQUEADA', 'label'),
                   para('Este PDF reproduz o conteúdo da leitura web para revisão interna. Não é um formato de entrega comercial.', 'small')]],
                 colWidths=[190, WIDTH - 190], hAlign='LEFT')
    note.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SURFACE),
        ('LINEBEFORE', (0, 0), (0, -1), 3, CAREER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 13),
        ('RIGHTPADDING', (0, 0), (-1, -1), 13),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    return [hero, Spacer(1, 16), note, Spacer(1, 21)]


def sections(profile: dict) -> list:
    result = []
    for index, section in enumerate(profile['readerContent']['sections'], start=1):
        block = [para(f'{index:02d}  /  06', 'label'), Spacer(1, 4),
                 para(section['title'], 'section'), Spacer(1, 8),
                 *source_paragraphs(section['text']), Spacer(1, 15)]
        result.extend([CondPageBreak(100), KeepTogether(block)])
        if index != 6:
            result.extend([HRFlowable(width='100%', thickness=0.6, color=RULE), Spacer(1, 14)])
    return result


def limits(profile: dict) -> list:
    result = [CondPageBreak(150),
              HRFlowable(width='100%', thickness=1, color=CAREER),
              Spacer(1, 13), para('Alcance e limites', 'section'), Spacer(1, 13)]
    for item in profile['readerContent']['limits']:
        text = para(item, 'limit')
        row = Table([['•', text]], colWidths=[19, WIDTH - 19], hAlign='LEFT')
        row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TEXTCOLOR', (0, 0), (0, 0), CAREER),
            ('FONTNAME', (0, 0), (0, 0), 'Onest'),
            ('FONTSIZE', (0, 0), (0, 0), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        result.extend([row, Spacer(1, 8)])
    return result


def verify_pdf(path: Path, profile: dict) -> dict:
    pdf = PdfReader(str(path))
    page_text = [(page.extract_text() or '') for page in pdf.pages]
    if not page_text or any(len(compact(value)) < 100 for value in page_text):
        raise ValueError(f'Blank or nearly blank page in {path.name}')
    visible = compact('\n'.join(page_text))
    reading = profile['readerContent']
    expected = [reading['title'],
                *(section['title'] for section in reading['sections']),
                *(part for section in reading['sections'] for part in section['text'].split('\n\n') if part.strip()),
                *reading['limits']]
    missing = [value[:85] for value in expected if compact(value) not in visible]
    if missing:
        raise ValueError(f'Missing readerContent in {path.name}: {missing}')
    for label in ['SIMULAÇÃO PRIVADA', 'PUBLICAÇÃO BLOQUEADA']:
        if label not in visible:
            raise ValueError(f'Missing review label {label} in {path.name}')
    questions = re.findall(r'(?m)^\s*[123]\.\s+.+', reading['sections'][-1]['text'])
    if len(questions) != 3:
        raise ValueError(f'Expected three source questions for {profile["id"]}')
    for question in questions:
        if compact(question) not in visible:
            raise ValueError(f'Missing source question in {path.name}: {question}')
    return {'pages': len(pdf.pages), 'verifiedSourceBlocks': len(expected),
            'verifiedQuestions': len(questions),
            'pageTextCharacters': [len(compact(value)) for value in page_text]}


def render(profile: dict, output: Path) -> dict:
    slug = profile['id']
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
        raise ValueError('Invalid synthetic profile id')
    if profile['publication'] != 'blocked' or len(profile['readerContent']['sections']) != 6:
        raise ValueError('Expected blocked six-section MC-only candidate')
    path = output / f'atvna-bussola-gratis-simulacao-{slug}.pdf'
    document = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=RIGHT,
                                 leftMargin=LEFT, topMargin=TOP, bottomMargin=BOTTOM,
                                 title='Bússola de Carreira · simulação privada da leitura web',
                                 author='ATVNA · revisão privada')
    document.build([*intro(profile), *sections(profile), *limits(profile)],
                   onFirstPage=chrome, onLaterPages=chrome)
    return {'profileId': slug, 'fictionalName': profile['fictionalName'],
            'candidateDigest': profile['candidateDigest'],
            'path': str(path.resolve()), 'sha256': sha256(path),
            **verify_pdf(path, profile)}


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT
    payload = json.loads(source.read_text(encoding='utf-8'))
    profiles = payload['profiles']
    if payload.get('publication') != 'blocked' or len(profiles) != 3:
        raise ValueError('Expected three unpublished candidate profiles')
    if (payload.get('candidateVersion') != EXPECTED_CANDIDATE_VERSION or
            payload.get('readerVersion') != EXPECTED_READER_VERSION or
            any(profile.get('candidateVersion') != EXPECTED_CANDIDATE_VERSION or
                profile.get('readerVersion') != EXPECTED_READER_VERSION or
                profile.get('readerContent', {}).get('version') != EXPECTED_READER_VERSION
                for profile in profiles)):
        raise ValueError('Free facsimile source is stale or has the wrong reader edition')
    if len({profile['id'] for profile in profiles}) != 3:
        raise ValueError('Duplicate fictional profile id')
    register_fonts()
    output.mkdir(parents=True, exist_ok=True)
    source_hash = sha256(source)
    results = [render(profile, output) for profile in profiles]
    if source_hash != sha256(source):
        raise ValueError('Source JSON changed during rendering')
    manifest = {'artifactKind': 'private-web-reading-facsimiles',
                'publication': 'blocked', 'sourcePath': str(source.resolve()),
                'sourceSha256': source_hash,
                'candidateVersion': payload['candidateVersion'],
                'readerVersion': payload['readerVersion'],
                'reviewClock': payload.get('reviewClock'),
                'generatedAtUtc': datetime.now(timezone.utc).isoformat(),
                'pdfs': results}
    manifest_path = output / 'atvna-bussola-gratis-simulacoes-manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'manifest': str(manifest_path.resolve()), 'pdfs': results},
                     ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
