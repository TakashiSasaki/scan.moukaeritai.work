---
id: project.current-vertical-slice
severity: mandatory
overridable: true
order: 1100
---
# Follow the current EFP vertical-slice priority

This module records the current product priority rather than a permanent architectural invariant. Update or replace it when the authorized product priority changes.

Complete the first usable EFP-native Object/Marker/Association slice in this order:

1. create an Object;
2. create a Marker;
3. attach the Marker to the Object;
4. read the Marker;
5. display its associated Object;
6. detach the Association;
7. treat the detached Marker as unassigned.

The critical path consists of Object and Marker Entities, Association attach and detach Facts, current Markers for an Object, and the current Object for a Marker. Do not expand Place, Observation, Measurement, Event, projection backfill, generic watermarks, processing receipts, migration phases, or future abstractions unless directly required by this slice.
