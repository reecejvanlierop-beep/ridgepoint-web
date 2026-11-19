/**
 * Ridgepoint provider referral mailer (Google Apps Script web app).
 *
 * Receives the referral form on for-providers.html and emails it to the
 * clinical team. Nothing is written to Drive or Sheets, and patient details are
 * never logged. Runs under Ridgepoint's Google Workspace account (covered by
 * the Workspace BAA).
 *
 * Setup: see README.md in this folder.
 */

// Who receives referrals. Use @ridgepointmed.com Workspace addresses only.
var RECIPIENTS = 'nursing@ridgepointmed.com';

// Each form type: email subject prefix, sections/fields, and required fields.
// The website form sends form_type ("attorney"); anything else is a provider referral.
var FORMS = {
  provider: {
    subject: 'New Referral',
    sections: [
      ['REFERRING PROVIDER', [
        ['provider_name_practice', 'Name / Practice'],
        ['provider_phone', 'Phone'],
        ['provider_fax', 'Fax'],
        ['provider_email', 'Email'],
      ]],
      ['PATIENT', [
        ['patient_name', 'Name'],
        ['patient_dob', 'Date of Birth'],
        ['patient_phone', 'Phone'],
        ['patient_email', 'Email'],
      ]],
      ['PAYMENT', [
        ['payment', 'Insurance or Cash'],
      ]],
      ['REFERRAL', [
        ['referral_type', 'Referral Type'],
        ['reason', 'Reason for Referral'],
      ]],
      ['PRIOR IMAGING', [
        ['prior_imaging', 'Prior Imaging'],
        ['imaging_details', 'Details'],
      ]],
    ],
    required: ['provider_name_practice', 'provider_phone', 'provider_email',
      'patient_first_name', 'patient_last_name', 'patient_dob', 'patient_phone',
      'payment', 'reason', 'prior_imaging'],
    replyTo: 'provider_email',
  },
  attorney: {
    subject: 'New MVA Attorney Referral',
    sections: [
      ['LAW FIRM', [
        ['law_firm', 'Law Firm'],
        ['case_contact', 'Attorney / Case Contact'],
        ['firm_phone', 'Phone'],
        ['firm_fax', 'Fax'],
        ['firm_email', 'Email'],
      ]],
      ['PATIENT', [
        ['patient_name', 'Name'],
        ['patient_dob', 'Date of Birth'],
        ['patient_phone', 'Phone'],
        ['patient_email', 'Email'],
      ]],
      ['INCIDENT & INJURIES', [
        ['accident_date', 'Date of Incident'],
        ['injuries', 'Injuries / Symptoms'],
        ['prior_treatment', 'Treatment Since Incident'],
      ]],
      ['CLAIM & PAYMENT', [
        ['auto_insurance', 'Auto Insurance'],
        ['pip_claim_number', 'PIP Claim #'],
        ['adjuster_name', 'PIP Adjuster'],
        ['adjuster_contact', 'Adjuster Phone / Email'],
        ['pip_status', 'PIP Coverage'],
        ['has_health_insurance', 'Health Insurance?'],
        ['health_insurance', 'Health Insurance Co.'],
        ['member_id', 'Member ID #'],
        ['bill_to', 'Bill Services To'],
      ]],
    ],
    required: ['law_firm', 'case_contact', 'firm_phone', 'firm_email',
      'patient_first_name', 'patient_last_name', 'patient_dob', 'patient_phone',
      'accident_date', 'injuries', 'auto_insurance', 'pip_status',
      'has_health_insurance', 'bill_to'],
    replyTo: 'firm_email',
  },
};

function doPost(e) {
  try {
    var p = cleanParams_((e && e.parameter) || {});

    // Spam honeypot: real users never fill this in. Pretend success.
    if (p.website) return json_({ ok: true });

    var form = FORMS[p.form_type] || FORMS.provider;
    for (var i = 0; i < form.required.length; i++) {
      if (!p[form.required[i]]) return json_({ ok: false, error: 'missing_fields' });
    }

    p.patient_name = p.patient_first_name + ' ' + p.patient_last_name;
    p.patient_dob = formatDob_(p.patient_dob);
    if (p.accident_date) p.accident_date = formatDob_(p.accident_date);

    var text = [], html = [];
    form.sections.forEach(function (section) {
      var rows = section[1].filter(function (f) { return p[f[0]]; });
      if (!rows.length) return;
      text.push(section[0]);
      html.push('<h3 style="font:700 12px Arial,sans-serif;letter-spacing:.12em;color:#3B4A2F;margin:22px 0 6px;">' + escape_(section[0]) + '</h3><table style="font:14px Arial,sans-serif;border-collapse:collapse;">');
      rows.forEach(function (f) {
        text.push(f[1] + ': ' + p[f[0]]);
        html.push('<tr><td style="padding:3px 16px 3px 0;color:#777;vertical-align:top;white-space:nowrap;">' + f[1] +
          '</td><td style="padding:3px 0;color:#222;">' + escape_(p[f[0]]).replace(/\n/g, '<br>') + '</td></tr>');
      });
      text.push('');
      html.push('</table>');
    });

    var mail = {
      to: RECIPIENTS,
      subject: form.subject + ' – ' + p.patient_name,
      body: text.join('\n'),
      htmlBody: '<div style="max-width:600px;">' + html.join('') + '</div>',
      name: 'Ridgepoint Referrals',
    };
    if (p[form.replyTo]) mail.replyTo = p[form.replyTo];
    MailApp.sendEmail(mail);

    return json_({ ok: true });
  } catch (err) {
    // Log only the error type, never the submitted data.
    console.error('Referral mailer failed: ' + (err && err.name));
    return json_({ ok: false, error: 'server_error' });
  }
}

function cleanParams_(raw) {
  var out = {};
  Object.keys(raw).forEach(function (k) {
    out[k] = String(raw[k] || '').trim().slice(0, 3000);
  });
  // Keep header-type fields single-line.
  ['provider_email', 'firm_email', 'patient_first_name', 'patient_last_name'].forEach(function (k) {
    if (out[k]) out[k] = out[k].replace(/[\r\n]+/g, ' ');
  });
  ['provider_email', 'firm_email'].forEach(function (k) {
    if (out[k] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out[k])) out[k] = '';
  });
  return out;
}

// YYYY-MM-DD → MM/DD/YYYY
function formatDob_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? m[2] + '/' + m[3] + '/' + m[1] : iso;
}

function escape_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to send a sample referral (fake data) and grant permissions. */
function sendTestAttorneyReferral() {
  doPost({ parameter: {
    form_type: 'attorney', law_firm: 'TEST ONLY — Test Law Firm', case_contact: 'Test Attorney',
    firm_phone: '(509) 555-0100', firm_fax: '(509) 555-0101', firm_email: 'test@example.com',
    patient_first_name: 'Test', patient_last_name: 'Patient', patient_dob: '1980-01-02',
    patient_phone: '(509) 555-0199', accident_date: '2026-11-01',
    injuries: 'TEST ONLY — neck and low back pain.', prior_treatment: 'ER visit 11/01/2026, X-ray neck',
    auto_insurance: 'Test Auto Insurance', pip_claim_number: 'TEST-123', adjuster_name: 'Test Adjuster',
    adjuster_contact: '(509) 555-0102', pip_status: 'Available', has_health_insurance: 'Yes',
    health_insurance: 'Regence', member_id: 'TEST-456', bill_to: 'PIP',
  } });
}

function sendTestReferral() {
  doPost({ parameter: {
    provider_name_practice: 'Dr. Test Provider — Test Clinic', provider_phone: '(509) 555-0100',
    provider_fax: '(509) 555-0101', provider_email: 'test@example.com',
    patient_first_name: 'Test', patient_last_name: 'Patient', patient_dob: '1980-01-02',
    patient_phone: '(509) 555-0199', payment: 'Insurance', referral_type: 'MSK Pain / Injury Evaluation',
    reason: 'TEST ONLY — please ignore.', prior_imaging: 'Yes', imaging_details: 'MRI right knee, 10/15/2026',
  } });
}
