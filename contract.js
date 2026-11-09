(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ContractPDF = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PAGE_W = 596;
  var PAGE_H = 842;
  var MARGIN = 72;
  var RIGHT = PAGE_W - MARGIN;
  var BODY = 11;
  var HEAD = 13;
  var LINE = 14.5463;
  var PARA = 12;
  var HEAD_TOP = 14;
  var HEAD_BOTTOM = 4;
  var ASCENT = 10.3179;
  var LIST_X = MARGIN + 18;
  var LIST_TEXT_X = MARGIN + 36;
  var SIGN_RIGHT_X = 311.21;

  var MONTHS_NOM = [
    "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
    "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"
  ];
  var MONTHS_GEN = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
  ];

  function money(value) {
    var n = Number(value) || 0;
    return n.toFixed(2).replace(".", ",") + " zł";
  }

  function plural(n, one, few, many) {
    n = Math.abs(n);
    if (n === 1) return one;
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
    return many;
  }

  function dateInfo(value) {
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth();
    return {
      month: month,
      year: year,
      lastDay: new Date(year, month + 1, 0).getDate(),
      shortYear: String(year).slice(-2)
    };
  }

  function create(opts) {
    var JsPDF = opts.jsPDF;
    var data = opts.data || {};
    var info = dateInfo(data.date);
    var doc = new JsPDF({ unit: "pt", format: [PAGE_W, PAGE_H], compress: true });

    doc.addFileToVFS("LiberationSans-Regular.ttf", opts.regular);
    doc.addFileToVFS("LiberationSans-Bold.ttf", opts.bold);
    doc.addFont("LiberationSans-Regular.ttf", "Liberation", "normal");
    doc.addFont("LiberationSans-Bold.ttf", "Liberation", "bold");

    function setStyle(isBold, size) {
      doc.setFont("Liberation", isBold ? "bold" : "normal");
      doc.setFontSize(size);
    }

    function measure(text, isBold, size) {
      setStyle(isBold, size);
      return doc.getTextWidth(text);
    }

    function ascent(size) {
      return ASCENT * size / BODY;
    }

    function lineAdvance(size) {
      return LINE * size / BODY;
    }

    function wrapRuns(runs, size, startX, contX) {
      var lines = [];
      var line = { tokens: [], x: startX };
      var x = startX;
      var firstLine = true;

      function pushLine() {
        lines.push(line);
        line = { tokens: [], x: contX };
        x = contX;
        firstLine = false;
      }

      runs.forEach(function (run) {
        var parts = String(run.text).split(/(\n| +)/);
        parts.forEach(function (part) {
          if (part === "") return;
          if (part === "\n") {
            pushLine();
            return;
          }
          var isSpace = /^ +$/.test(part);
          var w = measure(part, run.bold, size);

          if (isSpace && line.tokens.length === 0 && !firstLine) return;

          if (x + w > RIGHT && line.tokens.length > 0) {
            pushLine();
            if (isSpace) return;
          }

          line.tokens.push({ text: part, bold: run.bold, x: x });
          x += w;
        });
      });

      lines.push(line);
      return lines;
    }

    var cursor = MARGIN;
    var prevMargin = 0;

    function drawLines(lines, size, marginTop, marginBottom, startX) {
      var top = cursor + Math.max(prevMargin, marginTop);
      var la = lineAdvance(size);
      var base = top + ascent(size);

      lines.forEach(function (line, i) {
        var y = base + i * la;
        var current = null;
        line.tokens.forEach(function (token) {
          if (!current || current.bold !== token.bold) {
            if (current) {
              setStyle(current.bold, size);
              doc.text(current.text, current.x, y);
            }
            current = { text: token.text, bold: token.bold, x: token.x };
          } else {
            current.text += token.text;
          }
        });
        if (current) {
          setStyle(current.bold, size);
          doc.text(current.text, current.x, y);
        }
      });

      cursor = top + lines.length * la;
      prevMargin = marginBottom;
    }

    function drawRuns(runs, size, marginTop, marginBottom) {
      drawLines(wrapRuns(runs, size, MARGIN, MARGIN), size, marginTop, marginBottom);
    }

    function drawListItem(label, runs, marginTop, marginBottom) {
      var lines = wrapRuns(runs, BODY, LIST_TEXT_X, LIST_TEXT_X);
      setStyle(false, BODY);
      doc.text(label, LIST_X, cursor + Math.max(prevMargin, marginTop) + ascent(BODY));
      drawLines(lines, BODY, marginTop, marginBottom);
    }

    var monthNom = MONTHS_NOM[info.month];
    var monthGen = MONTHS_GEN[info.month];
    var items = Math.round(Number(data.items) || 0);
    var unit = plural(items, "sztuka", "sztuki", "sztuk");
    var drawing = plural(items, "rysunku", "rysunków", "rysunków");
    var payout = money(data.payout);
    var tax = money(data.tax);

    drawRuns([{ text: "", bold: false }], BODY, PARA, PARA);

    drawRuns([
      { text: "UMOWA  - do umowy ramowej o dzieło z dnia 01,07,2026 ( załącznik " + monthNom + " " + info.shortYear + ")\n Z PRZENIESIENIEM AUTORSKICH PRAW MAJĄTKOWYCH ", bold: true }
    ], BODY, PARA, PARA);

    drawRuns([
      { text: "Nazwa umowy - rysunki ręczne " + items + " " + unit + " ", bold: true }
    ], BODY, PARA, PARA);

    drawRuns([
      { text: "IPrimus Sp. z o.o.", bold: true },
      { text: ", z siedzibą w Wojkowicach Kościelnych, 42-510 Wojkowice Kościelne, NIP: 6252494677, reprezentowaną przez osobę upoważnioną, Zdzisławem Ziarnowskim zwaną dalej ", bold: false },
      { text: "Zamawiającym", bold: true },
      { text: ", ", bold: false }
    ], BODY, PARA, PARA);

    drawRuns([{ text: "a ", bold: false }], BODY, PARA, PARA);

    drawRuns([
      { text: "Rafałem Ziarnowskim", bold: true },
      { text: ", zamieszkałym: 40-073 Katowice ul Strzelecka 4/14, adres korespondencyjny: 42-510 Wojkowice Kościelne, ul. Karsów 6, zwanym dalej ", bold: false },
      { text: "Wykonawcą", bold: true },
      { text: ", ", bold: false }
    ], BODY, PARA, PARA);

    drawRuns([
      { text: "zwanymi dalej łącznie ", bold: false },
      { text: "Stronami", bold: true },
      { text: ". ", bold: false }
    ], BODY, PARA, PARA);

    drawRuns([{ text: "§ 1. Przedmiot umowy ", bold: true }], HEAD, HEAD_TOP, HEAD_BOTTOM);

    drawRuns([{ text: " Wykonanie " + items + " " + drawing + " ", bold: false }], BODY, PARA, PARA);

    drawRuns([
      { text: "oddane do użytku Zamawiającego do dnia " + info.lastDay + " " + monthGen + " " + info.year + " roku.\n\n", bold: false }
    ], BODY, PARA, PARA);

    drawRuns([{ text: "§ 2. Wynagrodzenie ", bold: true }], HEAD, HEAD_TOP, HEAD_BOTTOM);

    drawListItem("1.", [
      { text: "Za wykonanie dzieła wykonawcy przysługuje wynagrodzenie w wysokości " + payout + " netto  ", bold: false }
    ], PARA, 0);

    drawListItem("2.", [
      { text: tax + " podatek od umowy o dzieło\n", bold: false }
    ], 0, 0);

    drawListItem("3.", [
      { text: "Wynagrodzenie zostanie przelane  na rachunek Wykonawcy w terminie 10 dni od dnia sprzedaży  dzieła przez Zamawiającego.\n", bold: false }
    ], 0, PARA);

    drawRuns([{ text: "§ 3. Przeniesienie praw autorskich ", bold: true }], HEAD, HEAD_TOP, HEAD_BOTTOM);

    drawListItem("1.", [
      { text: "Wykonawca oświadcza, że przysługują mu pełne majątkowe prawa autorskie do dzieła wykonanego na podstawie niniejszej umowy.\n", bold: false }
    ], PARA, 0);

    drawListItem("2.", [
      { text: "Wynagrodzenie, o którym mowa w § 2, obejmuje przeniesienie majątkowych praw autorskich do dzieła.\n\n", bold: false }
    ], 0, PARA);

    var sigBase = cursor + Math.max(prevMargin, PARA) + ascent(BODY);
    setStyle(true, BODY);
    doc.text("Zamawiający:", MARGIN, sigBase);
    doc.text("Wykonawca:", SIGN_RIGHT_X, sigBase);

    return doc.output("arraybuffer");
  }

  return { create: create };
});
