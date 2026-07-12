export function validateDerivedIndexes(data: any): boolean {
  if (!data || !Array.isArray(data.participants)) {
    return true; // nothing to validate if not a fact or no participants
  }

  // We only care if this is a fact with derived indexes.
  if (data.participantKeys === undefined) {
    return true; 
  }

  const expectedParticipantKeys = new Set<string>();
  const expectedObjectIds = new Set<string>();
  const expectedMarkerKeys = new Set<string>();
  const expectedPlaceIds = new Set<string>();
  const expectedReaderIds = new Set<string>();
  const expectedDeviceIds = new Set<string>();
  const expectedUserIds = new Set<string>();

  for (const p of data.participants) {
    if (!p.ref || !p.ref.entityType || !p.ref.id) return false;
    const type = p.ref.entityType;
    const id = p.ref.id;
    expectedParticipantKeys.add(`${type}:${id}`);
    if (type === 'object') expectedObjectIds.add(id);
    else if (type === 'marker') expectedMarkerKeys.add(id);
    else if (type === 'place') expectedPlaceIds.add(id);
    else if (type === 'reader') expectedReaderIds.add(id);
    else if (type === 'device') expectedDeviceIds.add(id);
    else if (type === 'user') expectedUserIds.add(id);
  }

  const checkArray = (actual: any, expectedSet: Set<string>): boolean => {
    if (expectedSet.size === 0 && actual === undefined) return true;
    if (!Array.isArray(actual)) return false;
    if (actual.length !== expectedSet.size) return false;
    
    // Check for duplicates
    const actualSet = new Set(actual);
    if (actualSet.size !== actual.length) return false;

    // Check for sorting
    const sorted = [...actual].sort();
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== sorted[i]) return false;
      if (!expectedSet.has(actual[i])) return false;
    }
    return true;
  };

  if (!checkArray(data.participantKeys, expectedParticipantKeys)) return false;
  if (!checkArray(data.objectIds, expectedObjectIds)) return false;
  if (!checkArray(data.markerKeys, expectedMarkerKeys)) return false;
  if (!checkArray(data.placeIds, expectedPlaceIds)) return false;
  if (!checkArray(data.readerIds, expectedReaderIds)) return false;
  if (!checkArray(data.deviceIds, expectedDeviceIds)) return false;
  if (!checkArray(data.userIds, expectedUserIds)) return false;

  return true;
}

export function validateAssociationSemantics(data: any): boolean {
  if (!data || !data.operation || !Array.isArray(data.participants)) {
    return false;
  }
  
  if (!validateDerivedIndexes(data)) {
    return false;
  }

  const objectsCount = data.participants.filter((p: any) => p.ref && p.ref.entityType === 'object').length;
  const markersCount = data.participants.filter((p: any) => p.ref && p.ref.entityType === 'marker').length;

  if (data.operation === 'attach') {
    if (objectsCount !== 1 || markersCount !== 1) {
      return false;
    }
    if (data.subjectAssociationId !== undefined && data.subjectAssociationId !== null) {
      return false;
    }
    return true;
  }
  if (data.operation === 'detach') {
    if (!data.subjectAssociationId) {
      return false;
    }
    return true;
  }
  if (data.operation === 'replace') {
    if (!data.subjectAssociationId) {
      return false;
    }
    if (objectsCount !== 1 || markersCount !== 1) {
      return false;
    }
    return true;
  }

  return false;
}
