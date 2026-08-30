(function () {
  "use strict";

  var SAMPLE_WA = [
    "[28/08/2026, 9:14 AM] Amy: 3 cartons to TST, buyer Hang Fai",
    "[28/08/2026, 9:16 AM] Ken: Noted. Van leaves at 11.",
    "[28/08/2026, 11:42 AM] Ken: Delivered TST. Signed by front desk.",
    "[29/08/2026, 2:05 PM] Amy: 1 pallet to Kwun Tong, dock 2. PO 8841",
    "[29/08/2026, 2:07 PM] Wai: Can take it after 4pm",
    "[29/08/2026, 5:33 PM] Wai: Kwun Tong done. 1 carton damaged — photo in chat",
    "[30/08/2026, 7:02 PM] Amy: 3 cartons to TST",
    "[30/08/2026, 7:15 PM] Ken: 12 boxes to Cheung Sha Wan warehouse",
    "[30/08/2026, 8:01 PM] Amy: Cancel the TST drop — buyer postponed to Tue"
  ].join("\n");

  var SAMPLE_CSV = [
    "date,who,item,qty,destination,status",
    "2026-08-28,Amy,carton,3,Tsim Sha Tsui,delivered",
    "2026-08-28,Ken,van,1,Tsim Sha Tsui,done",
    "2026-08-29,Amy,pallet,1,Kwun Tong,delivered",
    "2026-08-29,Wai,carton,1,Kwun Tong,damaged",
    "2026-08-30,Amy,carton,3,Tsim Sha Tsui,postponed",
    "2026-08-30,Ken,box,12,Cheung Sha Wan,in transit"
  ].join("\n");

  var WA_RE = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*([^\]]+)\]\s*([^:]+):\s*(.*)$/;

  var sourceEl = document.getElementById("source");
  var fileEl = document.getElementById("file");
  var filterEl = document.getElementById("filter");
  var statusEl = document.getElementById("status");
  var thead = document.querySelector("#table thead");
  var tbody = document.querySelector("#table tbody");
  var parsed = { headers: [], rows: [] };

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = "";
    var inQuotes = false;
    var s = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (inQuotes) {
        if (c === '"') {
          if (s[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += c;
      }
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter(function (r) {
      return r.some(function (x) {
        return String(x).trim() !== "";
      });
    });
  }

  function parseWhatsApp(text) {
    var lines = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    var rows = [];
    var current = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = line.match(WA_RE);
      if (m) {
        if (current) rows.push(current);
        current = {
          time: m[1] + ", " + m[2],
          who: m[3].trim(),
          text: m[4]
        };
      } else if (current && line.trim()) {
        current.text += " " + line.trim();
      }
    }
    if (current) rows.push(current);
    return {
      headers: ["time", "who", "text"],
      rows: rows.map(function (r) {
        return [r.time, r.who, r.text];
      })
    };
  }

  function looksLikeWhatsApp(text) {
    var lines = String(text)
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    if (!lines.length) return false;
    var hits = 0;
    for (var i = 0; i < lines.length; i++) {
      if (WA_RE.test(lines[i])) hits++;
    }
    return hits >= 1 && hits / lines.length >= 0.3;
  }

  function parseSource(text) {
    var trimmed = String(text || "").trim();
    if (!trimmed) {
      return { headers: [], rows: [], kind: "empty" };
    }
    if (looksLikeWhatsApp(trimmed)) {
      var wa = parseWhatsApp(trimmed);
      wa.kind = "whatsapp";
      return wa;
    }
    var csvRows = parseCsv(trimmed);
    if (!csvRows.length) {
      return { headers: [], rows: [], kind: "empty" };
    }
    var headers = csvRows[0].map(function (h) {
      return String(h).trim() || "col";
    });
    var body = csvRows.slice(1).map(function (r) {
      var out = [];
      for (var i = 0; i < headers.length; i++) {
        out[i] = r[i] == null ? "" : String(r[i]);
      }
      return out;
    });
    return { headers: headers, rows: body, kind: "csv" };
  }

  function csvCell(s) {
    var v = String(s);
    if (/[",\n\r]/.test(v)) {
      return '"' + v.replace(/"/g, '""') + '"';
    }
    return v;
  }

  function applyFilter() {
    var q = (filterEl.value || "").trim().toLowerCase();
    var shown = 0;
    var trs = tbody.querySelectorAll("tr");
    for (var i = 0; i < trs.length; i++) {
      var hay = trs[i].getAttribute("data-hay") || "";
      var ok = !q || hay.indexOf(q) !== -1;
      trs[i].hidden = !ok;
      if (ok) shown++;
    }
    var total = parsed.rows.length;
    if (!total) {
      statusEl.textContent = "No rows yet.";
    } else if (q) {
      statusEl.textContent = shown + " of " + total + " rows";
    } else {
      statusEl.textContent = total + " row" + (total === 1 ? "" : "s") + " · " + (parsed.kind === "whatsapp" ? "WhatsApp" : "CSV");
    }
  }

  function render() {
    thead.innerHTML = "";
    tbody.innerHTML = "";
    if (!parsed.headers.length) {
      tbody.innerHTML = '<tr><td class="empty">Nothing to show. Paste a chat or CSV, or reset to sample.</td></tr>';
      applyFilter();
      return;
    }
    var hr = document.createElement("tr");
    for (var i = 0; i < parsed.headers.length; i++) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = parsed.headers[i];
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    for (var r = 0; r < parsed.rows.length; r++) {
      var tr = document.createElement("tr");
      var hay = parsed.rows[r].join(" ").toLowerCase();
      tr.setAttribute("data-hay", hay);
      for (var c = 0; c < parsed.headers.length; c++) {
        var td = document.createElement("td");
        td.textContent = parsed.rows[r][c] == null ? "" : parsed.rows[r][c];
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    applyFilter();
  }

  function ingest(text) {
    parsed = parseSource(text);
    render();
  }

  function loadSample(kind) {
    var text = kind === "csv" ? SAMPLE_CSV : SAMPLE_WA;
    sourceEl.value = text;
    filterEl.value = "";
    if (fileEl) fileEl.value = "";
    ingest(text);
  }

  var parseTimer;
  sourceEl.addEventListener("input", function () {
    clearTimeout(parseTimer);
    parseTimer = setTimeout(function () {
      ingest(sourceEl.value);
    }, 120);
  });

  fileEl.addEventListener("change", function () {
    var f = fileEl.files && fileEl.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      sourceEl.value = String(reader.result || "");
      filterEl.value = "";
      ingest(sourceEl.value);
    };
    reader.readAsText(f);
  });

  filterEl.addEventListener("input", applyFilter);

  document.getElementById("reset").addEventListener("click", function () {
    loadSample("wa");
  });

  document.getElementById("load-wa").addEventListener("click", function (e) {
    e.preventDefault();
    loadSample("wa");
    sourceEl.focus();
  });

  document.getElementById("load-csv").addEventListener("click", function (e) {
    e.preventDefault();
    loadSample("csv");
    sourceEl.focus();
  });

  document.getElementById("export").addEventListener("click", function () {
    if (!parsed.headers.length || !parsed.rows.length) return;
    var q = (filterEl.value || "").trim().toLowerCase();
    var lines = [parsed.headers.map(csvCell).join(",")];
    for (var i = 0; i < parsed.rows.length; i++) {
      var hay = parsed.rows[i].join(" ").toLowerCase();
      if (q && hay.indexOf(q) === -1) continue;
      lines.push(parsed.rows[i].map(csvCell).join(","));
    }
    var blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "workflow-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  loadSample("wa");
})();
