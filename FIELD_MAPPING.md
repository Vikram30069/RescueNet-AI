# Field Mapping Report

Maps raw fields to final unified schema fields.

| Raw Field | Final Field | Transformation |
|---|---|---|
| category/asset_type | asset_type | Normalized to 9 standard types |
| district | district | Title cased, spelling fixes |
| phone | phone | Stripped non-numeric chars |
| latitude | latitude | Float casting, invalid to NULL |
