# Security Specification for Firestore Database

## 1. Data Invariants
- A profile must belong to a signed-in user and enforce verification rules of the email.
- Users can read and update their own profiles only, except admins who can manage all documents.
- Electricity rates and token purchases can only be written by admin users.
- Meter readings can only be added or managed by admins.
- Water monthly lists and overall log entries can only be written or altered by admins.
- Payments can be registered by a tenant but only verified or approved by an admin.

## 2. The Dirty Dozen Payloads (Vulnerability Scenarios)
1. **Self-Elevated Privilege Hack**: A tenant profile payload trying to set `role: "admin"`.
2. **Identity Spoofing**: Document ID payload with a different tenant ID than the authenticated user.
3. **Ghost Collection Write**: Writing records into unsupported random paths.
4. **Invalid Rate Hijack**: Inserting a negative value for electricity rates.
5. **Malicious Reading Injection**: Faking a meter reading with a massive string.
6. **Token Multi-Reference Stealing**: Forcing duplicates of paystack token references.
7. **Negative Payment Claim**: Claiming a bank transfer receipt of a negative amount.
8. **Bypassing Audits**: Creating a pre-confirmed card payment without an admin's approval.
9. **Spamming ID Characters**: Writing a 1MB string into the subcollection keys or fields.
10. **Bypassing email_verified**: Authenticating with a spoofed unverified email.
11. **Direct Deposit Refunding**: Directly modifying and refunding deposits without admin credentials.
12. **Bypassing Schema Structure**: Creating field mappings with shadow data.

## 3. Test Scenarios Plan
- Verify that standard write operations for profiles block non-admins from changing roles or setting custom values.
- Verify that list actions on `payments` are securely restricted to owners and admins.
- Verify that all updates apply strict validation helpers and key enforcement diff checking rules.
