export const bodies = Object.freeze(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const);
export type CelestialBody = typeof bodies[number];
