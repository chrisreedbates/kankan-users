/* Decodes #report=<base64url JSON> per the app contract (v1). Nothing is sent by this script. */
(function (root) {
  'use strict';
  var MAX_PAYLOAD = 65536, MAX_DIAG = 32768, SHORT = /^[A-Za-z0-9 ._+()\-]{1,32}$/;
  var KEYS = ['v', 'kind', 'appVersion', 'build', 'platform', 'osVersion', 'diagnostics'];

  function b64urlToBytes(s) {
    if (!/^[A-Za-z0-9_-]*={0,2}$/.test(s)) return null;
    s = s.replace(/=+$/, '');
    var b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var bin;
    try { bin = atob(b); } catch (e) { return null; }
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // Returns the report object, or null if anything is invalid.
  function decodeReport(hash) {
    try {
      if (typeof hash !== 'string' || hash.indexOf('#report=') !== 0) return null;
      var payload = hash.slice(8);
      if (payload.length === 0 || payload.length > MAX_PAYLOAD) return null;
      var bytes = b64urlToBytes(payload);
      if (!bytes) return null;
      var text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      var o = JSON.parse(text);
      if (o === null || typeof o !== 'object' || Array.isArray(o)) return null;
      var ks = Object.keys(o);
      if (ks.length !== KEYS.length) return null;
      for (var i = 0; i < ks.length; i++) if (KEYS.indexOf(ks[i]) < 0) return null;
      if (o.v !== 1 || o.kind !== 'bug') return null;
      var f = ['appVersion', 'build', 'platform', 'osVersion'];
      for (var j = 0; j < f.length; j++) {
        if (typeof o[f[j]] !== 'string' || !SHORT.test(o[f[j]])) return null;
      }
      if (typeof o.diagnostics !== 'string') return null;
      if (new TextEncoder().encode(o.diagnostics).length > MAX_DIAG) return null;
      return { v: 1, kind: 'bug', appVersion: o.appVersion, build: o.build, platform: o.platform, osVersion: o.osVersion, diagnostics: o.diagnostics };
    } catch (e) { return null; }
  }

  function summaryText(r) {
    return 'KanKan ' + r.appVersion + ' (' + r.build + ')\nPlatform: ' + r.platform + ' ' + r.osVersion;
  }
  function fullText(r) { return summaryText(r) + '\n\nDiagnostics:\n' + r.diagnostics; }

  function mailtoUrl(r, message) {
    var subject = 'KanKan problem report (' + r.appVersion + ' ' + r.build + ')';
    var msg = (message || '').trim();
    var body = (msg ? msg + '\n\n' : '') + '--- Report ---\n' + fullText(r);
    var url = 'mailto:support@getkankan.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    var tooLong = url.length > 1800, shortened = false;
    if (tooLong) {
      body = (msg ? msg + '\n\n' : '') + '--- Report summary ---\n' + summaryText(r) +
        '\n\n(Full report: please paste it here. Use the Copy report button on the page.)\n';
      url = 'mailto:support@getkankan.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (url.length > 1800) { // message itself too long: shorten it by code points until it fits
        shortened = true;
        var cps = Array.from(msg).slice(0, 500);
        do {
          body = cps.join('') + '\n\n--- Report summary ---\n' + summaryText(r) + '\n\n(Paste the full report here.)\n';
          url = 'mailto:support@getkankan.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          if (url.length > 1800) cps = cps.slice(0, Math.floor(cps.length * 0.8));
        } while (url.length > 1800 && cps.length > 0);
      }
    }
    return { url: url, tooLong: tooLong, shortened: shortened };
  }

  var api = { decodeReport: decodeReport, summaryText: summaryText, fullText: fullText, mailtoUrl: mailtoUrl };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  var d = root.document;
  if (!d || !d.getElementById('reportbox')) return;
  var $ = function (id) { return d.getElementById(id); };
  if (root.top !== root.self) { return; } // framed: never show the report
  var hash = root.location.hash;
  if (hash.indexOf('#report=') !== 0) return;
  var r = decodeReport(hash);
  $('noreport').hidden = true;
  if (!r) { $('bad').hidden = false; return; }
  try { root.history.replaceState(null, '', root.location.pathname); } catch (e) {}
  $('summary').textContent = summaryText(r);
  $('diag').textContent = r.diagnostics === '' ? '(empty)' : r.diagnostics;
  $('reportbox').hidden = false;
  var status = function (t) { $('status').textContent = t; };
  $('copy').addEventListener('click', function () {
    var t = fullText(r);
    var done = function () { status('Report copied.'); };
    var fail = function () { status('Could not copy. Select the text above and copy it by hand.'); };
    try {
      if (root.navigator.clipboard && root.navigator.clipboard.writeText) root.navigator.clipboard.writeText(t).then(done, fail); else fail();
    } catch (e) { fail(); }
  });
  $('email').addEventListener('click', function () {
    try {
      var m = mailtoUrl(r, $('msg').value);
      status((m.tooLong ? 'The report is long. Your email has a summary only. Paste the copied full report into the email.' : 'Opening your email app. Nothing is sent until you send the email.') +
        (m.shortened ? ' Your message was shortened to fit. Please paste the rest into the email.' : ''));
      root.location.href = m.url;
    } catch (e) { status('Could not open your email app. Copy the report and email support@getkankan.com.'); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
