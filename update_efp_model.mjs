import fs from 'fs';

let content = fs.readFileSync('packages/efp-model/src/entityFactProjection.ts', 'utf8');
content = content.replace(/export type FactIndexFields = {[\s\S]*?};/,
`export type FactIndexFields = {
  participantKeys: string[];
  objectIds: string[];
  markerKeys: string[];
  placeIds: string[];
  readerIds: string[];
  deviceIds: string[];
  userIds: string[];
};`);
fs.writeFileSync('packages/efp-model/src/entityFactProjection.ts', content);

let factPart = fs.readFileSync('packages/efp-model/src/factParticipants.ts', 'utf8');
factPart = factPart.replace(/const result: FactIndexFields = {[\s\S]*?return result;/, 
`const result: FactIndexFields = {
    participantKeys,
    objectIds: Array.from(objectIds).sort(),
    markerKeys: Array.from(markerKeys).sort(),
    placeIds: Array.from(placeIds).sort(),
    readerIds: Array.from(readerIds).sort(),
    deviceIds: Array.from(deviceIds).sort(),
    userIds: Array.from(userIds).sort(),
  };
  return result;`);
fs.writeFileSync('packages/efp-model/src/factParticipants.ts', factPart);
