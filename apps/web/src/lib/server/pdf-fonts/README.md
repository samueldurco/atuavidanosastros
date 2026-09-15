# PDF font instances

PDF-only static TrueType instances of the existing brand WOFF2 fonts. The website originals are unchanged. Default axes: Bodoni Moda 400/opsz 11, Newsreader 400/opsz 18, Onest 400. These files are bundled server-side, not requested from external font services.

Regenerate from the repository root with `python scripts/build-pdf-fonts.py` using fonttools 4.65.0 and brotli 1.2.0. Timestamps and copyright metadata are preserved. The conversion script has no network access.

The variable WOFF2 subset path in @pdf-lib/fontkit 1.1.1 failed during serialization with an out-of-range glyph error; static TTF instances are covered by the PDF serialization and visual tests.

Font binaries and derivatives are SIL OFL 1.1, not the application's license. Adjacent files contain full copyright/license notices from the upstream Google Fonts directories: [Newsreader](https://github.com/google/fonts/blob/main/ofl/newsreader/OFL.txt), [Bodoni Moda](https://github.com/google/fonts/blob/main/ofl/bodonimoda/OFL.txt), [Onest](https://github.com/google/fonts/blob/main/ofl/onest/OFL.txt). No reserved font names are listed in those notices. Original font metadata is retained.
