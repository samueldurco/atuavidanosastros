import { Engine, angles, deltaT, housesPlacidus } from 'caelus';
import { embeddedData } from 'caelus/data-embedded';
import dataManifest from './data-manifest.json' with { type: 'json' };
import { validateCalculationInput, type CalculationInput } from './input.ts';
export { validateCalculationInput, type CalculationInput } from './input.ts';

export type CelestialBody = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';
export const bodies: readonly CelestialBody[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
export interface Position { body: CelestialBody; longitude: number; latitude: number; distanceAu: number; retrograde: boolean; }
interface HouseAngles { system: 'placidus'; ascendant: number; midheaven: number; }
export type HouseResult = HouseAngles & (
  { status: 'ok'; cusps: readonly number[]; warning?: never; code?: never } |
  { status: 'not-applicable'; cusps: readonly []; warning: string; code: 'PLACIDUS_UNAVAILABLE' }
);
export interface CalculationProvenance {
  provider: string; providerVersion: string; algorithmVersion: string;
  zodiac: 'tropical'; houseSystem: 'placidus'; calculatedAt: string;
  referenceFrame: 'geocentric-apparent-ecliptic-of-date';
  dataManifest: typeof dataManifest;
  temporal: { timezoneMode: 'fixed-offset' | 'iana'; timezoneRules: string; offsetSeconds: number; inputScale: 'UTC'; engineScale: 'UT1-approximated-by-UTC'; deltaTSeconds: number };
  accuracyStatus: 'experimental'; warnings: readonly string[];
}
export interface NatalChart { input: CalculationInput; positions: readonly Position[]; houses: HouseResult; provenance: CalculationProvenance; }
export interface EphemerisProvider { readonly name: string; readonly version: string; calculate(input: CalculationInput): Promise<NatalChart>; }
export interface HouseCalculator { calculate(input: CalculationInput): HouseResult; }

export class AstrologyEngineNotReadyError extends Error {
  constructor() { super('O motor astrológico ainda não passou pelo gauntlet independente de precisão.'); this.name = 'AstrologyEngineNotReadyError'; }
}

const degrees = (radians: number) => ((radians * 180 / Math.PI) % 360 + 360) % 360;
const julianInstant = (instant: Date) => instant.valueOf() / 86400000 + 2440587.5;

/** Low-level solver: no provider fallback can enter the domain result. */
export class CaelusHouseCalculator implements HouseCalculator {
  calculate(input: CalculationInput): HouseResult {
    const { instant } = validateCalculationInput(input);
    const [asc, mc, armc, eps] = angles(embeddedData, julianInstant(instant), input.latitude, input.longitude);
    const base = { system: 'placidus' as const, ascendant: degrees(asc), midheaven: degrees(mc) };
    if (!Number.isFinite(base.ascendant) || !Number.isFinite(base.midheaven)) throw new RangeError('Ângulos indisponíveis.');
    const unavailable = (): HouseResult => ({ ...base, cusps: [], status: 'not-applicable', code: 'PLACIDUS_UNAVAILABLE', warning: 'Placidus indisponível nesta condição; nenhuma cúspide substituta foi produzida. O Meio do Céu é calculado separadamente.' });
    // Conservative candidate boundary; not a universal mathematical cutoff.
    if (Math.abs(input.latitude) >= 66) return unavailable();
    try {
      const cusps = housesPlacidus(armc, input.latitude * Math.PI / 180, eps).map(degrees);
      if (cusps.length !== 12 || cusps.some((value) => !Number.isFinite(value))) return unavailable();
      return { ...base, cusps, status: 'ok' };
    } catch (error) {
      if (error instanceof RangeError) return unavailable();
      throw error;
    }
  }
}

export class CaelusEphemerisProvider implements EphemerisProvider {
  readonly name = 'caelus';
  readonly version = '0.24.1';
  private readonly engine = new Engine(embeddedData);
  private readonly houseCalculator = new CaelusHouseCalculator();

  async calculate(input: CalculationInput): Promise<NatalChart> {
    const time = validateCalculationInput(input);
    const jd = julianInstant(time.instant);
    const positions = bodies.map((body): Position => {
      const value = this.engine.position(body, jd, { zodiac: 'tropical' });
      if (!Number.isFinite(value.lon) || value.lon < 0 || value.lon >= 360 || !Number.isFinite(value.lat) || Math.abs(value.lat) > 90 || typeof value.dist !== 'number' || !Number.isFinite(value.dist) || value.dist <= 0 || typeof value.retrograde !== 'boolean') throw new RangeError(`Posição indisponível: ${body}.`);
      return { body, longitude: value.lon, latitude: value.lat, distanceAu: value.dist, retrograde: value.retrograde };
    });
    return {
      input: { ...input }, positions, houses: this.houseCalculator.calculate(input),
      provenance: {
        provider: this.name, providerVersion: this.version, algorithmVersion: 'atv-caelus-adapter-v2',
        zodiac: 'tropical', houseSystem: 'placidus', calculatedAt: new Date().toISOString(),
        referenceFrame: 'geocentric-apparent-ecliptic-of-date', dataManifest,
        temporal: { timezoneMode: time.timezoneMode, timezoneRules: time.timezoneRules, offsetSeconds: time.offsetSeconds, inputScale: 'UTC', engineScale: 'UT1-approximated-by-UTC', deltaTSeconds: deltaT(jd) },
        accuracyStatus: 'experimental', warnings: [
          'Gauntlet integral pendente; amostras independentes não homologam todo o intervalo 1900–2099.',
          'UTC aproxima UT1; ΔT usa o modelo da candidata, sem correção IERS de DUT1.',
          ...(time.timezoneMode === 'iana' ? ['Regras IANA do runtime não estão fixadas; o offset resolvido é registrado.'] : ['Offset histórico fornecido pelo usuário; DST não é inferido.'])
        ]
      }
    };
  }
}
