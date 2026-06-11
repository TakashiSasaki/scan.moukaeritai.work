import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  stripUndefinedDeep,
  safeIdPart,
  buildObjectHasMarkerAssociationId,
  buildMarkerWrite,
  buildMarkerWriteFromIdentifierInput,
  buildAssociationWrite,
  buildObjectHasMarkerAssociationWrite,
  buildObservationWrite,
  buildMarkerObservedWrite,
  buildMeasurementWrite,
  buildObjectLocationMeasurementWrite,
  buildEventWrite,
  buildObjectSummaryWrite,
  buildMarkerSummaryWrite,
  buildPlaceSummaryWrite,
} from '../../src/lib/entityFactProjectionWrites';
import { MarkerDoc } from '../../src/types/entityFactProjection';

describe('entityFactProjectionWrites', () => {

  describe('stripUndefinedDeep', () => {
    it('removes undefined fields without mutating input', () => {
      const input = { a: 1, b: undefined, c: { d: 2, e: undefined } };
      const result = stripUndefinedDeep(input);
      expect(result).toEqual({ a: 1, c: { d: 2 } });
      expect(input).toEqual({ a: 1, b: undefined, c: { d: 2, e: undefined } });
    });

    it('preserves null', () => {
      expect(stripUndefinedDeep({ a: null })).toEqual({ a: null });
    });

    it('preserves arrays but cleans object elements and drops undefined elements', () => {
      expect(stripUndefinedDeep([1, undefined, 2])).toEqual([1, 2]);
      // eslint-disable-next-line no-sparse-arrays
      expect(stripUndefinedDeep([1, , 2])).toEqual([1, 2]);
      expect(stripUndefinedDeep([1, null, 2])).toEqual([1, null, 2]);
      const input = [1, undefined, { a: 2, b: undefined }];
      const result = stripUndefinedDeep(input);
      expect(result).toEqual([1, { a: 2 }]);
    });

    it('preserves Timestamp-like objects', () => {
      const ts = Timestamp.fromDate(new Date('2023-01-01T00:00:00Z'));
      const input = { time: ts, other: undefined };
      const result = stripUndefinedDeep(input) as any;
      expect(result.time).toBe(ts);
      expect(result.time.toDate).toBeDefined();
      expect(result.time.toMillis).toBeDefined();
      expect(result.other).toBeUndefined();
    });
  });

  describe('safeIdPart & buildObjectHasMarkerAssociationId', () => {
    it('converts to safe deterministic id', () => {
      expect(safeIdPart('object/ABC')).toBe('object_ABC');
      expect(safeIdPart('QR:URL:https://example.com/a?b=c')).toBe('QR_URL_https_example_com_a_b_c');
      expect(safeIdPart('  a..b  ')).toBe('a_b');
      expect(safeIdPart('***')).toBe('unknown');
    });

    it('buildObjectHasMarkerAssociationId is deterministic', () => {
      expect(buildObjectHasMarkerAssociationId('obj/1', 'mk*2')).toBe('object_has_marker__obj_1__mk_2');
    });
  });

  describe('buildMarkerWrite', () => {
    it('returns markers/{markerKey}', () => {
      const marker: MarkerDoc = {
        markerKey: 'MK-1',
        medium: 'visual_code',
        payloadLayer: 'encoded_payload',
        payloadKind: 'qr-url-token',
        stability: 'unknown'
      };
      const result = buildMarkerWrite(marker);
      expect(result.collection).toBe('markers');
      expect(result.id).toBe('MK-1');
      expect(result.path).toBe('markers/MK-1');
      expect(result.data).toEqual(marker);
    });
  });

  describe('buildMarkerWriteFromIdentifierInput', () => {
    it('maps QR to visual_code / qr / encoded_payload', () => {
      const result = buildMarkerWriteFromIdentifierInput({
        markerKey: 'QR-1',
        kind: 'qr',
        scheme: 'qr-url-token',
        canonicalValue: 'http://test',
        ownerId: 'owner-1'
      });
      expect(result.data.medium).toBe('visual_code');
      expect(result.data.mediumSubtype).toBe('qr');
      expect(result.data.payloadLayer).toBe('encoded_payload');
      expect(result.data.payloadKind).toBe('qr-url-token');
      expect(result.data.canonicalPayload).toBe('http://test');
      expect(result.data.ownerId).toBe('owner-1');
    });

    it('maps bluetooth to bluetooth / radio_signal', () => {
      const result = buildMarkerWriteFromIdentifierInput({
        markerKey: 'BLE-1',
        kind: 'bluetooth',
        scheme: 'ble-mac',
        canonicalValue: 'AA:BB:CC'
      });
      expect(result.data.medium).toBe('bluetooth');
      expect(result.data.payloadLayer).toBe('radio_signal');
    });

    it('maps felica-idm to nativeId.kind = felica_idm', () => {
      const result = buildMarkerWriteFromIdentifierInput({
        markerKey: 'NFC-1',
        kind: 'nfc',
        scheme: 'felica-idm',
        canonicalValue: '0101'
      });
      expect(result.data.medium).toBe('nfc');
      expect(result.data.payloadLayer).toBe('native_carrier_id');
      expect(result.data.nativeId).toEqual({ kind: 'felica_idm', normalizedValue: '0101' });
    });

    it('maps nfc-uid to nativeId.kind = unknown', () => {
      const result = buildMarkerWriteFromIdentifierInput({
        markerKey: 'NFC-2',
        kind: 'nfc',
        scheme: 'nfc-uid',
        canonicalValue: '0404'
      });
      expect(result.data.medium).toBe('nfc');
      expect(result.data.payloadLayer).toBe('native_carrier_id');
      expect(result.data.nativeId).toEqual({ kind: 'unknown', normalizedValue: '0404' });
    });
  });

  describe('buildObjectHasMarkerAssociationWrite', () => {
    it('creates object + marker participants and derived index fields, defaulting status to active', () => {
      const result = buildObjectHasMarkerAssociationWrite({
        associationId: 'assoc-1',
        objectId: 'obj-1',
        markerKey: 'mk-1',
        actorUid: 'user-1'
      });
      expect(result.data.associationType).toBe('object_has_marker');
      expect(result.data.status).toBe('active');
      expect(result.data.participants).toHaveLength(2);
      expect(result.data.participantKeys).toEqual(['marker:mk-1', 'object:obj-1']);
      expect(result.data.objectIds).toEqual(['obj-1']);
      expect(result.data.markerKeys).toEqual(['mk-1']);
      expect(result.data.provenance).toEqual({ source: 'user_confirmed', confidence: 'confirmed', actorUid: 'user-1' });
    });

    it('maps replaced status to superseded and sets ownerId under legacy', () => {
      const result = buildObjectHasMarkerAssociationWrite({
        associationId: 'assoc-1',
        objectId: 'obj-1',
        markerKey: 'mk-1',
        status: 'replaced',
        ownerId: 'owner-1',
        legacy: { other: true }
      });
      expect(result.data.status).toBe('superseded');
      expect(result.data.legacy).toEqual({ other: true, ownerId: 'owner-1' });
    });
  });

  describe('buildMarkerObservedWrite', () => {
    it('creates marker/object/user/device participants when provided', () => {
      const ts = Timestamp.now();
      const result = buildMarkerObservedWrite({
        observationId: 'obs-1',
        markerKey: 'mk-1',
        objectId: 'obj-1',
        actorUid: 'user-1',
        deviceId: 'dev-1',
        observedAt: ts,
        source: 'qr'
      });
      expect(result.data.observationType).toBe('marker_observed');
      expect(result.data.participants).toHaveLength(4);
      expect(result.data.participantKeys).toEqual(['device:dev-1', 'marker:mk-1', 'object:obj-1', 'user:user-1']);
      expect(result.data.provenance).toEqual({ source: 'marker_observation', confidence: 'high' });
    });
  });

  describe('buildObjectLocationMeasurementWrite', () => {
    it('creates a gps_position measurement with position and index fields', () => {
      const ts = Timestamp.now();
      const result = buildObjectLocationMeasurementWrite({
        measurementId: 'meas-1',
        objectId: 'obj-1',
        actorUid: 'user-1',
        measuredAt: ts,
        latitude: 35.0,
        longitude: 135.0,
        address: 'Tokyo'
      });
      expect(result.data.measurementType).toBe('gps_position');
      expect(result.data.position).toEqual({ latitude: 35.0, longitude: 135.0 });
      expect(result.data.legacy).toEqual({ address: 'Tokyo' });
      expect(result.data.participants).toHaveLength(2);
      expect(result.data.participantKeys).toEqual(['object:obj-1', 'user:user-1']);
    });
  });

  describe('buildEventWrite', () => {
    it('derives participant indexes', () => {
      const ts = Timestamp.now();
      const result = buildEventWrite({
        eventId: 'ev-1',
        eventType: 'object_created',
        participants: [
          { role: 'object', ref: { entityType: 'object', id: 'obj-1' } }
        ],
        occurredAt: ts
      });
      expect(result.data.eventId).toBe('ev-1');
      expect(result.data.participantKeys).toEqual(['object:obj-1']);
    });
  });

  describe('Summary write builders', () => {
    it('return correct collection/path/id for summaries', () => {
      const ts = Timestamp.now();

      const objSum = buildObjectSummaryWrite({ objectId: 'obj-1', asOf: ts });
      expect(objSum.collection).toBe('objectSummaries');
      expect(objSum.id).toBe('obj-1');
      expect(objSum.path).toBe('objectSummaries/obj-1');

      const mkSum = buildMarkerSummaryWrite({ markerKey: 'mk-1', asOf: ts });
      expect(mkSum.collection).toBe('markerSummaries');
      expect(mkSum.id).toBe('mk-1');
      expect(mkSum.path).toBe('markerSummaries/mk-1');

      const plSum = buildPlaceSummaryWrite({ placeId: 'pl-1', asOf: ts });
      expect(plSum.collection).toBe('placeSummaries');
      expect(plSum.id).toBe('pl-1');
      expect(plSum.path).toBe('placeSummaries/pl-1');
    });
  });
});
