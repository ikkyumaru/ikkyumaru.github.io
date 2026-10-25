/* お知らせ・釣果を data/*.json から読み込んで表示する */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl2br(s) { return esc(s).replace(/\r?\n/g, '<br>'); }
  function ymd(d) {
    var m = String(d || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? m[1] + '.' + ('0' + m[2]).slice(-2) + '.' + ('0' + m[3]).slice(-2) : '';
  }
  function key(d) { return ymd(d).replace(/\./g, ''); }
  function img(p) {
    if (!p) return '';
    return String(p).replace(/^\/+/, ''); // 公開URL直下の相対パスにそろえる
  }
  function isExternal(u) { return /^https?:\/\//.test(u || ''); }
  function load(path) {
    return fetch(path + '?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  /* ---------- お知らせ ---------- */
  var BOATKEY = { '1号船': '1', '3号船': '3', '5号船': '5', '渡船': 'ferry' };

  function sortNews(list) {
    return list.filter(function (n) { return n && n.title; }).sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return key(b.date).localeCompare(key(a.date));
    });
  }

  function newsRow(n, i, onListPage) {
    var imp = n.category === '重要' || n.pinned;
    var title = imp ? '<b>' + esc(n.title) + '</b>' : esc(n.title);
    var date = n.pinned ? '—' : ymd(n.date);
    var inner;
    if (n.body && onListPage) {
      var more = n.link ? '<p class="news-link"><a href="' + esc(n.link) + '"' + (isExternal(n.link) ? ' target="_blank" rel="noopener"' : '') + '>詳しくはこちら →</a></p>' : '';
      inner = '<details id="n' + i + '"><summary>' + title + '</summary><div class="news-body">' + nl2br(n.body) + more + '</div></details>';
    } else if (n.body) {
      inner = '<a href="news.html#n' + i + '">' + title + '</a>';
    } else if (n.link) {
      inner = '<a href="' + esc(n.link) + '"' + (isExternal(n.link) ? ' target="_blank" rel="noopener"' : '') + '>' + title + '</a>';
    } else {
      inner = title;
    }
    return '<li data-cat="' + esc(n.category || 'お知らせ') + '"><span class="mono date">' + date + '</span>' +
      '<span class="tag' + (imp ? ' tag-imp' : '') + '">' + esc(n.category || 'お知らせ') + '</span>' +
      '<span class="title">' + inner + '</span></li>';
  }

  function renderNews(el, list) {
    var limit = parseInt(el.getAttribute('data-limit') || '0', 10);
    var onListPage = !limit;
    var items = sortNews(list);
    var shown = limit ? items.slice(0, limit) : items;
    el.innerHTML = shown.length ? shown.map(function (n) { return newsRow(n, items.indexOf(n), onListPage); }).join('')
      : '<li class="none">現在お知らせはありません。</li>';

    if (!onListPage) return;

    // カテゴリ絞り込み
    var bar = document.querySelector('[data-news-filter]');
    var empty = document.querySelector('[data-news-empty]');
    if (bar) {
      var cats = ['すべて'];
      items.forEach(function (n) { var c = n.category || 'お知らせ'; if (cats.indexOf(c) < 0) cats.push(c); });
      bar.innerHTML = cats.map(function (c, i) {
        return '<button type="button" class="chip" data-cat="' + esc(c) + '" aria-pressed="' + (i === 0) + '">' + esc(c) + '</button>';
      }).join('');
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        var c = b.getAttribute('data-cat'), n = 0;
        el.querySelectorAll('li').forEach(function (li) {
          var s = c === 'すべて' || li.getAttribute('data-cat') === c; li.hidden = !s; if (s) n++;
        });
        bar.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        if (empty) empty.hidden = n > 0;
      });
    }

    // 月別アーカイブ
    var arc = document.querySelector('[data-news-archive]');
    if (arc) {
      var counts = {}, order = [];
      items.forEach(function (n) {
        if (n.pinned) return;
        var m = String(n.date || '').match(/(\d{4})-(\d{1,2})/); if (!m) return;
        var k = m[1] + '年' + parseInt(m[2], 10) + '月';
        if (!counts[k]) { counts[k] = 0; order.push(k); } counts[k]++;
      });
      arc.innerHTML = order.map(function (k) { return '<li><span>' + k + '</span><span>(' + counts[k] + ')</span></li>'; }).join('') || '<li><span>—</span></li>';
    }

    // #n3 のようなリンクで来たら、その記事を開く
    var h = location.hash && document.querySelector(location.hash);
    if (h && h.tagName === 'DETAILS') { h.open = true; h.scrollIntoView(); }
  }

  /* ---------- 釣果 ---------- */
  function sortReports(list) {
    return list.filter(function (r) { return r && (r.method || r.catch); }).sort(function (a, b) {
      return key(b.date).localeCompare(key(a.date));
    });
  }

  function reportCard(r, blog) {
    var k = BOATKEY[r.boat] || '';
    var photo = r.photo ? '<img class="report-photo" src="' + esc(img(r.photo)) + '" alt="' + esc((r.boat || '') + ' ' + (r.method || '') + 'の釣果') + '" loading="lazy">' : '';
    var comment = r.comment ? '<span class="catch comment">' + nl2br(r.comment) + '</span>' : '';
    return '<article class="report' + (r.photo ? ' has-photo' : '') + '" data-boat="' + k + '">' + photo +
      '<div class="report-body"><span class="top"><span class="boat-tag">' + esc(r.boat || '') + '</span><span class="mono meta">' + ymd(r.date) + '</span></span>' +
      '<span class="method">' + esc(r.method || '') + '</span>' +
      '<span class="catch">' + nl2br(r.catch || '') + '</span>' + comment + '</div></article>';
  }

  function renderReports(el, list) {
    var limit = parseInt(el.getAttribute('data-limit') || '0', 10);
    var items = sortReports(list);
    var shown = limit ? items.slice(0, limit) : items;
    el.innerHTML = shown.map(function (r) { return reportCard(r); }).join('');
    var empty = document.querySelector('[data-report-empty]');
    var count = document.querySelector('[data-report-count]');
    var bar = document.querySelector('[data-report-filter]');
    if (limit) { if (!shown.length) el.innerHTML = '<p class="empty">釣果は準備中です。</p>'; return; }

    function apply(k) {
      var n = 0;
      el.querySelectorAll('.report').forEach(function (c) {
        var s = k === 'all' || c.getAttribute('data-boat') === k; c.hidden = !s; if (s) n++;
      });
      if (bar) bar.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-boat') === k); });
      if (empty) empty.hidden = n > 0;
      if (count) count.textContent = n + '件の釣果';
    }
    if (bar) bar.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) apply(b.getAttribute('data-boat')); });
    var map = { b1: '1', b3: '3', b5: '5', ferry: 'ferry' };
    apply(map[(location.hash || '').slice(1)] || 'all');
    window.addEventListener('hashchange', function () { var k = map[location.hash.slice(1)]; if (k) apply(k); });
  }

  /* ---------- 起動 ---------- */
  var newsEls = document.querySelectorAll('[data-news-list]');
  if (newsEls.length) {
    load('data/news.json').then(function (list) {
      newsEls.forEach(function (el) { renderNews(el, Array.isArray(list) ? list : []); });
    }).catch(function () {
      newsEls.forEach(function (el) { el.innerHTML = '<li class="none">お知らせを読み込めませんでした。時間をおいて再読み込みしてください。</li>'; });
    });
  }
  var repEls = document.querySelectorAll('[data-report-list]');
  if (repEls.length) {
    load('data/reports.json').then(function (list) {
      repEls.forEach(function (el) { renderReports(el, Array.isArray(list) ? list : []); });
    }).catch(function () {
      repEls.forEach(function (el) { el.innerHTML = '<p class="empty">釣果を読み込めませんでした。時間をおいて再読み込みしてください。</p>'; });
    });
  }
})();
