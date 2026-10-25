/**
 * RSVP endpoint for the Kiran & Rutuja invitation  (Google Apps Script web app)
 * -------------------------------------------------------------------------------
 * SETUP (once, ~3 minutes)
 *  1. Open the Google Sheet  → Extensions → Apps Script.
 *  2. Delete the sample code, paste this whole file, click Save.
 *  3. Click  Deploy → New deployment → type "Web app".
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Click Deploy, authorise when asked, and copy the "Web app URL".
 *  4. Paste that URL into  CONFIG.rsvp.endpoint  in site/js/main.js and redeploy the site.
 *  After EVERY edit of this file: Deploy → Manage deployments → ✏️ → Version: "New version" → Deploy.
 *
 * WHAT IT GUARANTEES
 *  - ONE sheet ("RSVPs"), one row per guest.  Names are matched on a normalised key (case, accents, spaces
 *    and punctuation are ignored: "  RUTUJA  s." == "rutuja s").  A repeat submission UPDATES that row (and
 *    bumps "Times updated"); it never adds a second row.
 *  - Columns for filtering:  Side (Groom / Bride) and one column per event (Haldi, Sangeet, Wedding,
 *    Reception) holding Yes / No.  A guest who declines gets "No" everywhere.
 *  - A "Summary" tab (created once, all formulas) counts replies and heads per event and per side.
 *  - Server-side validation of every field, honeypot, minimum fill-time, per-guest rate limit,
 *    spreadsheet-formula injection protection and a script lock so two simultaneous submissions can never
 *    create duplicates.
 */

const SPREADSHEET_ID = "1079KRVlaJ-EIv9SyFm_Lkr_4vyIXPzrG6Tg5EWFykj8"; // used if the script is not bound to the sheet

const RSVP_TAB = "RSVPs";
const SUMMARY_TAB = "Summary";
const HEADERS = ["Name", "Match key", "Side", "Attending", "Guests", "Haldi", "Sangeet", "Wedding", "Reception", "Message", "First submitted", "Last updated", "Times updated"];
const SIDES = { groom: "Groom", bride: "Bride" };
const ALL_EVENTS = ["haldi", "sangeet", "wedding", "reception"];
const MAX_GUESTS = 8;
const MAX_PER_HOUR = 12;       // submissions per guest per hour (blocks scripts hammering one name)
const MIN_FILL_MS = 1200;      // faster than this = bot
const MAX_ROWS = 3000;         // hard stop against sheet flooding

function doGet() {
  return json_({ ok: true, service: "rsvp" });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 6000) return json_({ ok: false, error: "bad_request" });
    let d;
    try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad_json" }); }
    if (!d || typeof d !== "object") return json_({ ok: false, error: "bad_json" });

    // bots: honeypot filled, or form submitted impossibly fast -> pretend success, store nothing
    if (d.website || (typeof d.t === "number" && d.t < MIN_FILL_MS)) return json_({ ok: true, ignored: true });

    // ---- validate + normalise ------------------------------------------------------------
    const name = cleanText_(d.name, 80);
    if (name.length < 2 || !/[\p{L}]/u.test(name) || /https?:|www\.|<|>|\.com\b/i.test(name)) return json_({ ok: false, error: "invalid_name" });
    const key = nameKey_(name);
    if (key.length < 2) return json_({ ok: false, error: "invalid_name" });

    const attending = d.attending === "no" ? false : d.attending === "yes" ? true : null;
    if (attending === null) return json_({ ok: false, error: "invalid_attending" });

    const side = SIDES[String(d.side)];
    if (!side) return json_({ ok: false, error: "invalid_side" });

    let events = [];
    if (attending) {
      events = (Array.isArray(d.events) ? d.events : []).map(String).filter((x, i, a) => ALL_EVENTS.indexOf(x) >= 0 && a.indexOf(x) === i);
      if (!events.length) return json_({ ok: false, error: "choose_events" });
    }
    let guests = parseInt(d.guests, 10);
    if (attending) {
      if (!(guests >= 1 && guests <= MAX_GUESTS)) return json_({ ok: false, error: "invalid_guests" });
    } else {
      guests = 0;
    }
    const message = cleanText_(d.message, 300);

    // ---- rate limit per guest --------------------------------------------------------------
    const cache = CacheService.getScriptCache();
    const ck = "rl:" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key)).slice(0, 20);
    const hits = parseInt(cache.get(ck) || "0", 10);
    if (hits >= MAX_PER_HOUR) return json_({ ok: false, error: "too_many" });
    cache.put(ck, String(hits + 1), 3600);

    // ---- write (serialised) ----------------------------------------------------------------
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) return json_({ ok: false, error: "busy" });
    let result;
    try {
      const ss = spreadsheet_();
      const sheet = sheet_(ss);
      summary_(ss);
      const r = upsert_(sheet, key, {
        name: name, side: side, attending: attending ? "Yes" : "No", guests: attending ? guests : 0,
        flags: ALL_EVENTS.map(function (ev) { return events.indexOf(ev) >= 0 ? "Yes" : "No"; }),
        message: message,
      }, new Date());
      result = { ok: true, updated: r === "updated", created: r === "created" };
    } finally {
      lock.releaseLock();
    }
    return json_(result);
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: "server" });
  }
}

/* ----------------------------------------------------------------------------- helpers */

function upsert_(sheet, key, g, now) {
  const H = HEADERS;
  const KEYCOL = H.indexOf("Match key") + 1;
  const last = sheet.getLastRow();
  const keys = last > 1 ? sheet.getRange(2, KEYCOL, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  const idx = keys.indexOf(key);                       // first match; there is only ever one

  if (idx >= 0) {
    const rowNo = idx + 2;
    const old = sheet.getRange(rowNo, 1, 1, H.length).getValues()[0];
    const first = old[H.indexOf("First submitted")] || now;
    const times = (parseInt(old[H.indexOf("Times updated")], 10) || 0) + 1;
    sheet.getRange(rowNo, 1, 1, H.length).setValues([buildRow_(key, g, first, now, times)]);
    return "updated";
  }
  if (last >= MAX_ROWS) throw new Error("sheet full");
  sheet.getRange(last + 1, 1, 1, H.length).setValues([buildRow_(key, g, now, now, 0)]);
  return "created";
}

function buildRow_(key, g, first, last, times) {
  return [safe_(g.name), key, g.side, g.attending, g.guests].concat(g.flags, [safe_(g.message), first, last, times]);
}

function sheet_(ss) {
  let sh = ss.getSheetByName(RSVP_TAB);
  if (!sh) sh = ss.insertSheet(RSVP_TAB, 0);
  const H = HEADERS;
  const first = sh.getRange(1, 1, 1, H.length).getValues()[0];
  if (first.join("|") !== H.join("|")) {
    sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight("bold").setBackground("#f3e6c9");
    sh.setFrozenRows(1);
    sh.getRange(2, 1, sh.getMaxRows() - 1, 2).setNumberFormat("@");   // Name + Match key always plain text
    sh.getRange(2, H.indexOf("First submitted") + 1, sh.getMaxRows() - 1, 2).setNumberFormat("dd mmm yyyy hh:mm");
    sh.getRange(1, 1, sh.getMaxRows(), H.length).createFilter();      // filter arrows on every column
    sh.hideColumns(2);                                                // the match key is internal
  }
  return sh;
}

/** "Summary" tab: written once, plain formulas (replies = attending parties, heads = total guests). */
function summary_(ss) {
  if (ss.getSheetByName(SUMMARY_TAB)) return;
  const sh = ss.insertSheet(SUMMARY_TAB);
  const R = "'" + RSVP_TAB + "'!";
  const col = function (name) { const c = String.fromCharCode(65 + HEADERS.indexOf(name)); return R + c + "2:" + c; };
  const events = ["Haldi", "Sangeet", "Wedding", "Reception"];
  const rows = [["Heads attending (guests incl. the guest)", "Replies", "Haldi", "Sangeet", "Wedding", "Reception", "Declined"]];
  ["Groom", "Bride"].forEach(function (side, i) {
    const r = i + 2;
    const row = [side + "'s side"];
    row.push('=COUNTIFS(' + col("Side") + ',"' + side + '",' + col("Attending") + ',"Yes")');
    events.forEach(function (ev) { row.push('=SUMIFS(' + col("Guests") + ',' + col("Side") + ',"' + side + '",' + col(ev) + ',"Yes")'); });
    row.push('=COUNTIFS(' + col("Side") + ',"' + side + '",' + col("Attending") + ',"No")');
    rows.push(row);
  });
  rows.push(["Total"].concat([1, 2, 3, 4, 5, 6].map(function (i) { const c = String.fromCharCode(65 + i); return "=SUM(" + c + "2:" + c + "3)"; })));
  sh.getRange(1, 1, rows.length, 7).setValues(rows);        // text stays text, strings starting with = become formulas
  sh.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f3e6c9");
  sh.getRange(4, 1, 1, 7).setFontWeight("bold");
  sh.setColumnWidth(1, 260);
}

function spreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** Case, accents, spacing and punctuation are ignored: "  Rutuja   S. " == "rutuja s" */
function nameKey_(s) {
  return String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function cleanText_(v, max) {
  return String(v == null ? "" : v).normalize("NFKC").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Stops spreadsheet formulas (=, +, -, @) typed into free-text fields from executing. */
function safe_(v) {
  v = String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
