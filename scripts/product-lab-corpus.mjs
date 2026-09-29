import { buildProductLabCorpus } from "./helpers/product-lab-corpus.mjs";

// Reproducible stdout export, no provider credentials or calls. Redirect only to a local artifact.
const args = process.argv.slice(2);
const product =
  args[0] === "--experimental-synastry"
    ? "synastry"
    : args[0] === "--experimental-couple-dossier"
      ? "couple-dossier"
      : args[0] === "--experimental-horoscope"
        ? "horoscope"
        : undefined;
if (args.length > 1 || (args.length === 1 && !product)) {
  process.stderr.write(
    "usage: product-lab-corpus.mjs [--experimental-synastry | --experimental-couple-dossier | --experimental-horoscope]\n",
  );
  process.exitCode = 2;
} else {
  process.stdout.write(
    JSON.stringify(
      await buildProductLabCorpus(
        product ? { experimentalProduct: product } : {},
      ),
      null,
      2,
    ) + "\n",
  );
}
