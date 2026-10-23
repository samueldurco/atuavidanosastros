import { Engine } from 'caelus';

/** Exact memoization only; the lifetime belongs to one bounded request. */
export class RequestCachedCaelusEngine extends Engine {
  private readonly eclipticResults = new Map<string, ReturnType<Engine['ecliptic']>>();
  static readonly maxEntries = 8192;

  override ecliptic(...args: Parameters<Engine['ecliptic']>): ReturnType<Engine['ecliptic']> {
    const [body, jde] = args;
    const key = `${body}:${jde}`;
    let value = this.eclipticResults.get(key);
    if (!value) {
      value = super.ecliptic(body, jde);
      if (this.eclipticResults.size >= RequestCachedCaelusEngine.maxEntries) {
        this.eclipticResults.delete(this.eclipticResults.keys().next().value!);
      }
      this.eclipticResults.set(key, value);
    }
    // A consumer can never mutate an entry reused by another calculation.
    return [...value];
  }
}
