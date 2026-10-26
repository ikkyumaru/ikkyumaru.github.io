/* 共通：スマホメニューの開閉、動きを減らす設定への対応 */
(function () {
  'use strict';
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('gnav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var o = document.body.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', o);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { document.body.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }
  var v = document.querySelector('.hero-bg');
  if (v && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); }
})();
