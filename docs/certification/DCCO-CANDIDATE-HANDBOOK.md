# DCCO-1 Candidate Handbook

## Credential

The DaemonCore Certified Cyber Operator credential records that its holder satisfied the published DCCO-1 evidence standard and passed DaemonCore Apps' independent review. It is a vendor professional credential. It is not government accreditation, a degree, a professional license, or a guarantee of employment.

## Admission standard

A candidate record must contain all of the following:

1. Twenty distinct lessons completed with a practical score of at least 80%.
2. Five distinct sealed range missions completed in Assisted, Blind, or Professional mode. Each attempt must retain its launch-pack, completion-receipt, and accepted-evidence digests.
3. Eight distinct Web Forge cases.
4. Eight distinct Enterprise Forge cases.
5. Four distinct judgment drills completed with at least 80% accuracy.
6. Two distinct principal capstones passed with at least 80%.

These are admission requirements, not an automatic credential. The desktop application can export a signed candidate dossier only after every requirement is met.

## Candidate identity

Before export, the candidate binds their professional name, organization, email, and role to an Ed25519 key protected by the operating system's credential storage. The candidate dossier includes the public identity, evidence references, a SHA-256 dossier digest, and a device-key signature. The private key is never exported.

Device-key attribution proves which key signed the dossier. It does not independently prove that the candidate's typed legal name, employer, or authorization claims are truthful. DaemonCore Apps must perform identity and evidence review before issuance.

## Review and issuance

DaemonCore Apps verifies the dossier structure and signature, reviews the evidence record, completes the published identity check, and records an approval or rejection. Only the issuer-controlled backend may create a credential ID or publish an active verification record.

An exported candidate dossier is not a certificate. Screenshots, locally modified UI, Academy completion percentages, XP, and unsigned JSON exports are not credentials.

## Validity and renewal

DCCO-1 credentials are intended to be valid for two years from issuance. Renewal requires the then-current renewal standard. Renewals must not silently remove value from an unexpired credential.

## Retakes and integrity

Candidates may repeat Academy learning and practice without penalty. Exam-specific attempt limits and waiting periods must be published before paid examinations open. Tampered records, forged identities, copied evidence, or attempts to bypass independent review may result in rejection or revocation.

## Ethics and authorized use

Candidates must use DaemonCore and the knowledge assessed by DCCO only on systems they own or are explicitly authorized to assess. A credential does not grant authorization. Material misconduct, fraudulent claims, or credential misuse may be reviewed under the revocation policy.

## Appeals

Candidates must receive a documented channel to challenge identity, evidence, scoring, or conduct decisions. Appeals must be reviewed by someone other than the original decision-maker whenever practical.
