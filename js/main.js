(function () {
  "use strict";

  // 채널 주소와 메일
  document.querySelectorAll("[data-channel]").forEach(function (a) {
    var ch = CONTENT.channels[a.dataset.channel];
    if (ch) a.href = ch.url;
  });
  document.querySelectorAll("[data-handle]").forEach(function (el) {
    var ch = CONTENT.channels[el.dataset.handle];
    if (ch) el.textContent = ch.handle;
  });
  var mail = document.getElementById("contact-mail");
  mail.href = "mailto:" + CONTENT.mail;
  mail.textContent = CONTENT.mail;
  document.getElementById("year").textContent = new Date().getFullYear();

  // 갤러리
  function renderGallery(listId, items, fallbackUrl, size) {
    var list = document.getElementById(listId);
    items.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.link || fallbackUrl;
      a.target = "_blank";
      a.rel = "noopener";

      var img = document.createElement("img");
      img.src = item.img;
      img.alt = "";
      img.loading = "lazy";
      img.width = size[0];
      img.height = size[1];

      var title = document.createElement("strong");
      title.textContent = item.title;

      a.appendChild(img);
      a.appendChild(title);
      if (item.meta) {
        var meta = document.createElement("span");
        meta.textContent = item.meta;
        a.appendChild(meta);
      }
      li.appendChild(a);
      list.appendChild(li);
    });
  }
  document.getElementById("stay-series").textContent = CONTENT.stay.series;
  renderGallery("stay-gallery", CONTENT.stay.items, CONTENT.channels.instagram.url, [720, 900]);
  renderGallery("things-gallery", CONTENT.things.items, CONTENT.channels.youtube.url, [562, 1000]);

  // 첫 화면 제목 첫 줄: 낱말을 한 글자씩 지우고 다음 낱말을 한 글자씩 쓴다
  var rotator = document.querySelector("[data-rotate]");
  if (rotator) {
    var words = rotator.dataset.rotate.split("|");
    var wordIndex = 0;
    var HOLD = 2400, STEP = 40, FADE = 200;   // 머무는 시간, 글자 사이 간격, 한 글자가 바뀌는 시간 (style.css와 맞춘다)
    var FLOW = 9000;                          // 글자색 그라데이션이 한 바퀴 도는 시간 (style.css와 맞춘다)
    var letters = function () { return Array.prototype.slice.call(rotator.children); };
    var place = function () {
      letters().forEach(function (el) { el.style.setProperty("--x", el.offsetLeft + "px"); });
    };
    var setWord = function (word, cls) {
      rotator.textContent = "";
      var phase = -(performance.now() % FLOW) + "ms";   // 낱말이 바뀌어도 색의 흐름은 이어진다
      word.split("").forEach(function (ch, i) {
        var el = document.createElement("span");
        el.className = "ch" + (cls ? " " + cls : "");
        el.style.setProperty("--i", i);
        el.style.animationDelay = phase;
        el.textContent = ch;
        rotator.appendChild(el);
      });
      place();
    };
    var duration = function (word) { return (word.length - 1) * STEP + FADE; };
    var nextWord = function () {
      var leaving = words[wordIndex];
      letters().forEach(function (el) { el.classList.add("is-out"); });
      setTimeout(function () {
        wordIndex = (wordIndex + 1) % words.length;
        setWord(words[wordIndex], "is-pre");
        void rotator.offsetWidth;   // 처음 상태를 그리게 한 뒤에 풀어야 움직인다
        letters().forEach(function (el) { el.classList.remove("is-pre"); });
        setTimeout(nextWord, duration(words[wordIndex]) + HOLD);
      }, duration(leaving) + 30);
    };
    setWord(words[0]);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);   // 글꼴이 바뀌면 글자 위치도 바뀐다
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(nextWord, HOLD);
  }

  // 앱 사용 장면 영상: 화면에 보일 때만 돌리고, 누르면 멈추거나 다시 돈다
  var appVideo = document.getElementById("app-video");
  if (appVideo) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      appVideo.controls = true;   // 움직임을 줄이는 설정에서는 저절로 돌리지 않는다
    } else {
      var videoStopped = false;   // 사람이 직접 멈춘 영상은 다시 보여도 저절로 돌리지 않는다
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && !videoStopped) appVideo.play().catch(function () {});
        else appVideo.pause();
      }, { threshold: 0.35 }).observe(appVideo);
      appVideo.addEventListener("click", function () {
        videoStopped = !appVideo.paused;
        if (appVideo.paused) appVideo.play().catch(function () {});
        else appVideo.pause();
      });
    }
  }

  // 모바일 메뉴
  var header = document.getElementById("site-header");
  var toggle = document.getElementById("nav-toggle");
  function setMenu(open) {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "메뉴 닫기" : "메뉴 열기";
  }
  toggle.addEventListener("click", function () {
    setMenu(!header.classList.contains("is-open"));
  });
  document.querySelectorAll("#site-nav a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  // 스크롤: 헤더 경계선과 현재 구간의 메뉴 강조
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));
  var darkHero = document.querySelector(".hero-dark");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    // 검은 첫 화면이 헤더 뒤에 있는 동안은 헤더도 어둡게 한다
    header.classList.toggle("is-dark", !!darkHero && darkHero.getBoundingClientRect().bottom > header.offsetHeight);

    // 화면 위에서 40% 지점을 지난 마지막 구간이 현재 구간이다
    var line = window.innerHeight * 0.4;
    var current = "";
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= line) current = s.id;
    });
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom && sections.length) current = sections[sections.length - 1].id;

    navLinks.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + current;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  onScroll();
})();
