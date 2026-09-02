# DCCO credential operations

## Trust boundary

The desktop application calculates admission readiness and exports a device-signed candidate dossier. It never creates credential IDs, issuer signatures, PDF certificates, badges, or public verification records.

Issuance belongs to a separately administered service using a non-exportable issuer key. Supabase stores private submissions and the public status registry, but Supabase's service-role secret and issuer private key must never ship in Electron, the website bundle, a repository, or a downloadable artifact.

## Supabase deployment

Apply `supabase/migrations/202609020001_dcco_credentials.sql` to the production project. The migration:

- creates a private candidate-submission queue;
- creates an issuer-controlled credential registry;
- enables row-level security on both tables;
- removes direct anonymous and authenticated table access; and
- exposes only the minimum public fields through `verify_certification(text)`.

The public verification page should call the RPC with an exact credential ID and render one of four explicit states: active, expired, suspended, revoked. A missing result must render “credential not found,” not “invalid person.” Do not expose dossier contents, email addresses, device fingerprints, reviewer notes, or revocation details publicly.

## Issuance workflow

1. Receive the signed candidate bundle through an authenticated portal or controlled support channel.
2. Verify its JSON schema, dossier digest, Ed25519 attestation, supported application version, evidence references, and uniqueness.
3. Complete identity verification and independent evidence review.
4. Record the review decision in `certification_submissions` using a service-role backend.
5. For an approval, create a random credential ID and canonical public credential payload.
6. Sign that payload with the issuer key outside the database.
7. Insert the credential, payload digest, issuer key ID, and signature through the service-role backend.
8. Generate the PDF and badge from the same signed payload and QR-link them to `https://academy.daemoncore.app/verify/{credential_id}`.
9. Confirm the public page before delivery.

## Revocation and audit

Never delete an issued credential to represent revocation. Change its status, retain the decision privately, publish the minimum status, and preserve an administrative audit trail. Rotate issuer keys by adding a new key ID; retain old public keys for historical verification.

## Launch limitation

The migration is registry infrastructure, not a deployed certification service. Do not sell examinations or claim public verification is live until the migration, review portal, issuer-key service, candidate identity procedure, support channel, privacy notice, and verification page are deployed and tested together.
