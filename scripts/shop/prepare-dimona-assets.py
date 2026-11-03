"""Rebuild the encrypted static assets from the approved F68 catalog. No network calls."""
import argparse
from hashlib import sha256
import hmac
from io import BytesIO
import json
import os
from pathlib import Path
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from PIL import Image, ImageDraw, ImageFont


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def digest(data):
    return sha256(data).hexdigest()


def verified(path, expected):
    data = path.read_bytes()
    if digest(data) != expected:
        raise ValueError(f'Asset fingerprint changed: {path.name}')
    return data


def cap_guide(art, item, color, sku, font):
    # A production diagram assembled from the actual DTF pixels; the old
    # embroidered promotional photographs do not describe this product.
    guide = Image.new('RGB', (900, 710), 'white')
    draw = ImageDraw.Draw(guide)
    body = (25, 26, 28) if color == 'Preto' else (28, 40, 69)
    draw.text((40, 27), item['title'] + ' | ' + color, font=ImageFont.truetype(font, 34), fill='#182330')
    draw.text((40, 85), 'Guia de posicionamento frontal | Dimona ' + sku,
              font=ImageFont.truetype(font, 23), fill='#182330')
    draw.rounded_rectangle((144, 178, 756, 480), radius=132, fill=body)
    draw.ellipse((125, 430, 775, 529), fill=body, outline='#616871', width=3)
    width = 395  # the 10 cm print canvas relative to the front panel
    with Image.open(BytesIO(art)) as matrix:
        front = matrix.convert('RGBA')
        height = round(width * front.height / front.width)
        front = front.resize((width, height), Image.Resampling.LANCZOS)
        guide.paste(front, ((900 - width) // 2, 333 - height // 2), front)
    x, y = item['glyph_size_cm']
    draw.text((40, 567), 'DTF plano | Centralizar na frente',
              font=ImageFont.truetype(font, 29), fill='#182330')
    dimensions = f'{x:.2f} × {y:.2f}'.replace('.', ',')
    draw.text((40, 621), 'Glifo: ' + dimensions + ' cm | Usar a matriz PNG do pedido',
              font=ImageFont.truetype(font, 24), fill='#182330')
    return guide


def build(args):
    root, evidence, dest, manifest = args.workspace, args.evidence, args.output, args.manifest
    if dest.exists() and any(dest.iterdir()):
        raise ValueError('Use an empty output directory')
    objects = dest / 'v1'
    objects.mkdir(parents=True)
    secret = bytes.fromhex(sys.stdin.readline().strip())
    if len(secret) != 32:
        raise ValueError('Expected a 32-byte key on stdin')
    key = hmac.digest(secret, b'dimona:assets:aes-gcm:v1', 'sha256')
    cipher = AESGCM(key)
    sizes = {}

    def seal(data):
        sha = digest(data)
        if sha not in sizes:
            nonce = os.urandom(12)
            encrypted = nonce + cipher.encrypt(nonce, data, ('dimona-art-v1:' + sha).encode())
            if cipher.decrypt(nonce, encrypted[12:], ('dimona-art-v1:' + sha).encode()) != data:
                raise ValueError('Encryption round-trip failed')
            (objects / (sha + '.bin')).write_bytes(encrypted)
            sizes[sha] = len(data)
        return sha

    index = read(evidence / 'F68_DIMONA_INDICE_INDUSTRIAL_VARIANTES_20261103.json')
    catalog = {p['handle']: p for p in read(evidence / 'SHOPIFY_PLANO_ANEXACAO_MOCKUPS_319.json')['products']}
    caps = {p['slug']: p for p in read(evidence / 'F65_CROPPEDS_BONES_MANIFESTO_24_20261102.json')['products']}
    skus = read(args.sku_map)
    products, variants, guides = {}, {}, {}
    for gid, row in sorted(index['industrial_by_variant'].items()):
        slug, color, sku = row['product_ref'], row['color'], row['dimona_sku_reference']
        source = index['products'][slug]
        ident = gid.removeprefix('gid://shopify/ProductVariant/')
        if not ident.isdigit() or source['route'] != 'dropsimples' or skus.get(ident) != sku:
            raise ValueError('Variant/SKU mapping differs from active checkout ' + ident)
        if sku != str(sku) or catalog[slug]['shopify_product_id'] != source['shopify_product_id']:
            raise ValueError('Product ID mismatch')
        art = source['production_art']
        if slug not in products or (slug, color) not in guides:
            data = verified(root / art['path_from_workspace'], art['sha256'])
            products[slug] = seal(data)
        if (slug, color) not in guides:
            if source['family'] == 'Boné':
                if caps[slug]['technique'] != 'DTF plano' or caps[slug]['sha256'] != art['sha256'] or color not in ('Preto', 'Azul Marinho'):
                    raise ValueError('Cap guide mismatch')
                preview = cap_guide(data, caps[slug], color, sku, args.font)
            else:
                mock_color = 'Natural' if color == 'Cru' else color
                [front] = [im for im in catalog[slug]['images'] if im['label'] == 'Frente da peça' and im['colors'] == [mock_color]]
                original = verified(args.static / front['public_path'].lstrip('/'), front['sha256'])
                with Image.open(BytesIO(original)) as im:
                    preview = Image.new('RGB', im.size, 'white')
                    rgba = im.convert('RGBA')
                    preview.paste(rgba, mask=rgba.getchannel('A'))
            output = BytesIO()
            preview.save(output, format='JPEG', quality=92, optimize=True, subsampling=0)
            guides[(slug, color)] = seal(output.getvalue())
        variants[ident] = [slug, guides[(slug, color)]]
    if len(products) != 129 or len(variants) != 585:
        raise ValueError('Industrial catalog coverage differs from F68')
    manifest.write_text(json.dumps({'products': products, 'variants': variants, 'sizes': sizes},
                                   ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf-8')
    (dest / '_headers').write_text('/v1/*\n  Content-Type: application/octet-stream\n  X-Robots-Tag: noindex\n  X-Content-Type-Options: nosniff\n', encoding='utf-8')
    (dest / '404.html').write_text('Not found', encoding='utf-8')
    print(f'{len(products)} designs, {len(guides)} front guides, {len(variants)} variants, {sum(sizes.values())} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ('workspace', 'evidence', 'output', 'manifest', 'static', 'sku-map'):
        parser.add_argument('--' + name, required=True, type=Path)
    parser.add_argument('--font', required=True)
    build(parser.parse_args())
