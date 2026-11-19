# Referral mailer

Emails each referral from the website straight to the nurses. One script handles both forms:
the provider form (`for-providers.html`) and the MVA attorney form (`attorney-referral.html`,
which sends `form_type=attorney`). Nothing is
saved to Drive, Sheets or the website. It runs inside Ridgepoint's Google Workspace.

## Compliance notes
- Google Workspace **BAA is accepted** (confirmed Nov 2026).
- **Apps Script is a BAA-covered service** on Google's HIPAA page. The script only uses Gmail (MailApp) and calls no outside services, so the referral stays inside Google Workspace. Keep it that way: don't add add-ons or external API calls.
- Send only to **@ridgepointmed.com** Workspace addresses (currently `nursing@ridgepointmed.com`).

## Setup (about 10 minutes)
1. Sign in to a **@ridgepointmed.com** Google account (ideally a shared admin account, not someone's personal one) and go to <https://script.google.com> → **New project**. Name it "Ridgepoint Referral Mailer".
2. Delete the starter code and paste in everything from `Code.gs`.
3. `RECIPIENTS` is already set to `nursing@ridgepointmed.com` (add more, comma-separated, if needed).
4. Choose `sendTestReferral` (or `sendTestAttorneyReferral`) from the function menu → **Run** → approve the permissions. A test email ("New Referral – Test Patient") should arrive.
5. **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone** (providers aren't signed in; this only allows submitting the form)
6. Copy the **Web app URL** (ends in `/exec`).
7. In `for-providers.html`, paste it into `var REFERRAL_ENDPOINT = '';` and publish the site.

## Changing it later
- New recipients: edit `RECIPIENTS`, then **Deploy → Manage deployments → Edit → Version: New version**. The URL stays the same.
- Until `REFERRAL_ENDPOINT` is filled in, the form tells providers to call or fax instead.
- After pasting an updated `Code.gs`, always deploy a **new version** of the existing deployment (not a new deployment), or the website will keep calling the old code.
