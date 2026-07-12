export function validateAssociationSemantics(data: any): boolean {
  if (!data || !data.operation || !Array.isArray(data.participants)) {
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
    // participant structures are checked by JSON schema, but we can return true
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
