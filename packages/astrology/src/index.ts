import { Engine } from 'caelus';
import { embeddedData } from 'caelus/data-embedded';

export type CelestialBody = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';

export interface CalculationInput {
  localDateTime: string;
  timezone: string;
  utcInstant: string;
  latitude: number;
  longitude: number;
  locationSource: string;
}

export interface Position { body: CelestialBody; longitude: number; latitude: number; distanceAu: number; retrograde: boolean; }
export interface HouseResult { system: 'placidus'; ascendant: number; midheaven: number; cusps: readonly number[]; status: 'ok' | 'not-applicable'; warning?: string; }
export interface CalculationProvenance { provider: string; providerVersion: string; algorithmVersion: string; zodiac: 'tropical'; houseSystem: 'placidus'; calculatedAt: string; }
export interface NatalChart { input: CalculationInput; positions: readonly Position[]; houses: HouseResult; provenance: CalculationProvenance; }

export interface EphemerisProvider { readonly name: string; readonly version: string; calculate(input: CalculationInput): Promise<NatalChart>; }

export class AstrologyEngineNotReadyError extends Error {
  constructor() { super('O motor astrológico ainda não passou pelo gauntlet independente de precisão.'); this.name = 'AstrologyEngineNotReadyError'; }
}

const bodies: readonly CelestialBody[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
];

export class CaelusEphemerisProvider implements EphemerisProvider {
  readonly name = 'caelus';
  readonly version = '0.24.1';
  private readonly engine = new Engine(embeddedData);

  async calculate(input: CalculationInput): Promise<NatalChart> {
    const instant = new Date(input.utcInstant);
    if (Number.isNaN(instant.valueOf())) throw new TypeError('utcInstant inválido.');
    if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) throw new RangeError('Latitude inválida.');
    if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new RangeError('Longitude inválida.');

    const chart = this.engine.chart(
      instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
      instant.getUTCHours(), instant.getUTCMinutes(), instant.getUTCSeconds(),
      input.latitude, input.longitude, { houseSystem: 'placidus', zodiac: 'tropical' }
    );
    const polarFallback = chart.houseSystem !== 'placidus';
    return {
      input,
      positions: bodies.flatMap((body) => {
        const value = chart.bodies[body];
        return value ? [{ body, longitude: value.lon, latitude: value.lat, distanceAu: value.dist ?? 0, retrograde: value.retrograde }] : [];
      }),
      houses: {
        system: 'placidus', ascendant: chart.angles.asc, midheaven: chart.angles.mc,
        cusps: chart.cusps, status: polarFallback ? 'not-applicable' : 'ok',
        ...(polarFallback ? { warning: `Placidus não aplicável nesta latitude; cálculo interno usou ${chart.houseSystem}.` } : {})
      },
      provenance: {
        provider: this.name, providerVersion: this.version, algorithmVersion: 'atv-caelus-adapter-v1',
        zodiac: 'tropical', houseSystem: 'placidus', calculatedAt: new Date().toISOString()
      }
    };
  }
}
