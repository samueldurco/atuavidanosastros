/** Domain limits are not a certification of accuracy throughout this interval. */
export const engineContract = Object.freeze({
  version: 'atv-deterministic-contract/1',
  minUtcInstant: '1900-01-01T00:00:00.000Z',
  maxUtcInstant: '2099-12-31T23:59:59.999Z',
  calendar: 'proleptic-gregorian',
  inputResolutionMilliseconds: 1,
  leapSecondInput: 'rejected',
  placidusAbsoluteLatitudeExclusive: 66,
  accuracy: 'experimental-sampled',
  guaranteedLongitudeErrorDegrees: null,
  retrogradeStationTiming: 'not-certified',
  productionPromotion: false
} as const);
