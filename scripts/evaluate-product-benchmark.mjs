import { open, stat } from 'node:fs/promises';
import { buildProductLabCorpus } from './helpers/product-lab-corpus.mjs';
import { evaluateProductBenchmark, MAX_CAPTURE_BYTES, parseProductCapture, productBenchmarkManifest } from './helpers/product-benchmark.mjs';

// Read-only local CLI: bounded regular file, no provider/environment secrets/network.
try {
  const args = process.argv.slice(2);
  if (args.length !== 1) throw new Error('usage');
  const corpus = await buildProductLabCorpus();
  if (args[0] === '--manifest') {
    process.stdout.write(JSON.stringify(productBenchmarkManifest(corpus), null, 2) + '\n');
  } else {
    const info = await stat(args[0]);
    if (!info.isFile() || info.size > MAX_CAPTURE_BYTES) throw new Error('capture_size_invalid');
    const file = await open(args[0], 'r');
    let text;
    try {
      const buffer = Buffer.alloc(MAX_CAPTURE_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > MAX_CAPTURE_BYTES) throw new Error('capture_size_invalid');
      text = buffer.subarray(0, length).toString('utf8');
    } finally { await file.close(); }
    const report = evaluateProductBenchmark(parseProductCapture(text), corpus);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    process.exitCode = report.summary.preparedChecksComplete ? 0 : 1;
  }
} catch (error) {
  // File paths, payloads and raw parser/provider exceptions must not leak into reports.
  const code = error instanceof Error && /^(?:capture_[a-z_]+|corpus_not_synthetic|usage)$/.test(error.message)
    ? error.message : 'capture_read_or_evaluation_failed';
  process.stderr.write(JSON.stringify({ status: 'rejected', code, promotionEligible: false }) + '\n');
  process.exitCode = 2;
}
