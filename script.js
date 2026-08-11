/* =====================================================
   CalamitySafePH — Emergency Information Verifier
   All logic runs locally in the browser.
   No network requests, no storage, no analytics.
   ===================================================== */

var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", function () {
  initNav();
  initRain();
  initLightning();
  initTilt();
  initScrollReveal();
  initVerifier();
  initDisasterRisks();
  initGuide();
  initSafetyTips();
});

/* =====================================================
   NAVIGATION (mobile menu toggle)
   ===================================================== */
function initNav() {
  var toggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("site-nav-mobile");

  toggle.addEventListener("click", function () {
    var isOpen = mobileNav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mobileNav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* =====================================================
   AMBIENT RAIN (canvas, subtle, decorative only)
   ===================================================== */
function initRain() {
  var canvas = document.getElementById("rainCanvas");
  if (!canvas || prefersReducedMotion) return;

  var ctx = canvas.getContext("2d");
  var drops = [];
  var dropCount = window.innerWidth < 760 ? 60 : 130;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function makeDrop() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: 10 + Math.random() * 18,
      speed: 4 + Math.random() * 6,
      opacity: 0.08 + Math.random() * 0.12
    };
  }

  for (var i = 0; i < dropCount; i++) drops.push(makeDrop());

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(200, 215, 240, 0.5)";
    ctx.lineWidth = 1;

    drops.forEach(function (drop) {
      ctx.globalAlpha = drop.opacity;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 2, drop.y + drop.len);
      ctx.stroke();

      drop.y += drop.speed;
      drop.x -= 0.5;

      if (drop.y > canvas.height) {
        drop.y = -drop.len;
        drop.x = Math.random() * canvas.width;
      }
    });
    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* =====================================================
   LIGHTNING FLASH (occasional, subtle)
   ===================================================== */
function initLightning() {
  var flashEl = document.getElementById("lightningFlash");
  if (!flashEl || prefersReducedMotion) return;

  function scheduleFlash() {
    var delay = 6000 + Math.random() * 9000;
    setTimeout(function () {
      flashEl.classList.add("flash");
      setTimeout(function () { flashEl.classList.remove("flash"); }, 550);
      scheduleFlash();
    }, delay);
  }
  scheduleFlash();
}

/* =====================================================
   3D TILT for the hero status panel
   ===================================================== */
function initTilt() {
  var panel = document.getElementById("statusPanel");
  if (!panel || prefersReducedMotion) return;
  if (window.matchMedia("(max-width: 760px)").matches) return;

  var bounds;

  panel.addEventListener("mouseenter", function () {
    bounds = panel.getBoundingClientRect();
  });

  panel.addEventListener("mousemove", function (e) {
    if (!bounds) bounds = panel.getBoundingClientRect();
    var relX = (e.clientX - bounds.left) / bounds.width;
    var relY = (e.clientY - bounds.top) / bounds.height;
    var rotateY = (relX - 0.5) * 14 - 6;
    var rotateX = (0.5 - relY) * 14 + 4;
    panel.style.transform = "rotateY(" + rotateY + "deg) rotateX(" + rotateX + "deg)";
  });

  panel.addEventListener("mouseleave", function () {
    panel.style.transform = "rotateY(-6deg) rotateX(4deg)";
  });
}

/* =====================================================
   SCROLL REVEAL
   ===================================================== */
function initScrollReveal() {
  var targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

  targets.forEach(function (el) { observer.observe(el); });
}

/* =====================================================
   RULE-BASED RISK DATA
   ===================================================== */
var RISK_CATEGORIES = [
  {
    id: "urgency",
    label: "Urgency Language",
    explanation: "Urgent language can be used by scammers to pressure people into acting before verifying information.",
    patterns: [
      "urgent", "act now", "share now", "share immediately", "immediately",
      "last chance", "do this now", "warning", "important", "emergency"
    ]
  },
  {
    id: "otp",
    label: "OTP Request",
    explanation: "Never share an OTP with another person or suspicious website. An OTP is a security credential and should remain private.",
    patterns: ["otp", "one-time password", "one time password"]
  },
  {
    id: "sensitive-info",
    label: "Sensitive Information Request",
    explanation: "Legitimate agencies do not usually ask for passwords, PINs, or account details through unsolicited messages or links.",
    patterns: [
      "password", "pin", "gcash", "bank account", "credit card", "debit card",
      "cvv", "account number", "personal information", "id number", "government id"
    ]
  },
  {
    id: "financial",
    label: "Financial Assistance Claim",
    explanation: "Financial assistance and donation claims should be verified through official sources before providing information or sending money.",
    patterns: [
      "₱5,000", "₱10,000", "5,000", "10,000", "cash assistance", "financial assistance",
      "emergency assistance", "relief assistance", "free money", "claim your money",
      "government aid", "donation", "donate now", "relief fund"
    ]
  },
  {
    id: "links",
    label: "Suspicious Link",
    explanation: "Suspicious or unfamiliar links should be checked carefully before opening.",
    patterns: [
      "bit.ly", "tinyurl", "http://", "https://", "www.",
      "claim", "reward", "verify", "assistance", "registration", "free"
    ],
    requiresUrlContext: true
  },
  {
    id: "impersonation",
    label: "Government Impersonation",
    explanation: "An organization name can be used to make a fraudulent message appear legitimate. Verify the announcement through the organization's official communication channels.",
    patterns: [
      "pagasa", "phivolcs", "ndrrmc", "dswd", "deped", "dost", "dict", "doh", "lgu",
      "philippine government"
    ]
  },
  {
    id: "unverified",
    label: "Unverified Claim",
    explanation: "Claims should be verified through an official source before being shared.",
    patterns: [
      "confirmed", "official announcement", "government says", "according to authorities",
      "officially announced", "breaking news"
    ]
  }
];

var URL_PATTERN = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(bit\.ly[^\s]*)|(tinyurl[^\s]*)/i;

/* =====================================================
   VERIFIER SECTION
   ===================================================== */
function initVerifier() {
  var textarea = document.getElementById("messageInput");
  var charCount = document.getElementById("charCount");
  var verifyBtn = document.getElementById("verifyBtn");
  var exampleBtn = document.getElementById("exampleBtn");
  var clearBtn = document.getElementById("clearBtn");
  var resultsWrap = document.getElementById("resultsWrap");
  var analyzingRow = document.getElementById("analyzingRow");

  var EXAMPLE_MESSAGE = "URGENT! Classes are suspended nationwide because of the incoming typhoon. Share this message immediately! DepEd confirmed this official announcement. Click this link bit.ly/reliefclaim to register for \u20B15,000 emergency assistance. Enter the OTP sent to your phone to verify your account.";

  textarea.addEventListener("input", function () {
    charCount.textContent = textarea.value.length;
  });

  exampleBtn.addEventListener("click", function () {
    textarea.value = EXAMPLE_MESSAGE;
    charCount.textContent = textarea.value.length;
    textarea.focus();
  });

  clearBtn.addEventListener("click", function () {
    textarea.value = "";
    charCount.textContent = "0";
    resultsWrap.hidden = true;
    textarea.focus();
  });

  verifyBtn.addEventListener("click", function () {
    var message = textarea.value.trim();
    if (!message) {
      textarea.focus();
      textarea.classList.add("shake");
      setTimeout(function () { textarea.classList.remove("shake"); }, 300);
      return;
    }

    resultsWrap.hidden = true;
    analyzingRow.hidden = false;
    verifyBtn.disabled = true;

    var delay = prefersReducedMotion ? 50 : 900;
    setTimeout(function () {
      analyzingRow.hidden = true;
      verifyBtn.disabled = false;
      var results = analyzeMessage(message);
      renderResults(results);
      resultsWrap.hidden = false;
      resultsWrap.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
    }, delay);
  });
}

/**
 * Scans the message text against each risk category's patterns.
 * Returns a list of matched categories (each matched only once,
 * regardless of how many of its patterns were found) plus a score.
 */
function analyzeMessage(message) {
  var lowerMessage = message.toLowerCase();
  var hasUrl = URL_PATTERN.test(message);
  var matched = [];

  RISK_CATEGORIES.forEach(function (category) {
    var found = category.patterns.some(function (pattern) {
      return lowerMessage.indexOf(pattern.toLowerCase()) !== -1;
    });

    if (category.id === "links") {
      found = hasUrl;
    }

    if (found) {
      matched.push(category);
    }
  });

  var score = matched.length;
  var level = "low";
  if (score >= 6) level = "high";
  else if (score >= 3) level = "medium";

  return { matched: matched, score: score, level: level };
}

function renderResults(results) {
  var banner = document.getElementById("riskBanner");
  var riskLevel = document.getElementById("riskLevel");
  var riskScoreText = document.getElementById("riskScoreText");
  var indicatorList = document.getElementById("indicatorList");
  var explanationList = document.getElementById("explanationList");
  var recommendationText = document.getElementById("recommendationText");
  var ringProgress = document.getElementById("ringProgress");
  var ringScore = document.getElementById("ringScore");
  var progressFill = document.getElementById("riskProgressFill");

  banner.classList.remove("risk-low", "risk-medium", "risk-high");
  banner.classList.add("risk-" + results.level);

  var levelText = { low: "LOW RISK", medium: "MEDIUM RISK", high: "HIGH RISK" };
  var levelRecommendation = {
    low: "No obvious warning signs were detected. Even so, verify any emergency information through an official source before acting on it or sharing it further.",
    medium: "This message contains warning signs that are common in scam or misinformation content. Do not click links or share personal information until you verify it through an official source.",
    high: "This message contains multiple warning signs. Do not click suspicious links or provide sensitive information. Verify this announcement through an official source before sharing."
  };

  riskLevel.textContent = levelText[results.level];
  riskScoreText.textContent = results.score + " warning indicator" + (results.score === 1 ? "" : "s") + " detected";
  recommendationText.textContent = levelRecommendation[results.level];

  // Circular ring: circumference for r=52 is ~326.7
  var circumference = 2 * Math.PI * 52;
  var maxScore = RISK_CATEGORIES.length; // 7
  var fraction = Math.min(results.score / maxScore, 1);
  var offset = circumference - fraction * circumference;

  // Animated count-up for the score number
  animateCountUp(ringScore, results.score, prefersReducedMotion ? 0 : 700);

  requestAnimationFrame(function () {
    ringProgress.style.strokeDasharray = circumference;
    ringProgress.style.strokeDashoffset = prefersReducedMotion ? offset : circumference;
    requestAnimationFrame(function () {
      ringProgress.style.strokeDashoffset = offset;
    });
  });

  progressFill.style.width = prefersReducedMotion ? (fraction * 100) + "%" : "0%";
  setTimeout(function () {
    progressFill.style.width = (fraction * 100) + "%";
  }, prefersReducedMotion ? 0 : 60);

  // Indicator list — animate in one by one
  indicatorList.innerHTML = "";
  indicatorList.classList.toggle("empty-state", results.matched.length === 0);

  if (results.matched.length === 0) {
    var emptyItem = document.createElement("li");
    emptyItem.textContent = "No obvious warning signs detected in this message.";
    emptyItem.style.animationDelay = "0s";
    indicatorList.appendChild(emptyItem);
  } else {
    results.matched.forEach(function (category, index) {
      var li = document.createElement("li");
      var check = document.createElement("span");
      check.className = "check";
      check.textContent = "!";
      li.appendChild(check);
      li.appendChild(document.createTextNode(category.label));
      li.style.animationDelay = (prefersReducedMotion ? 0 : index * 0.08) + "s";
      indicatorList.appendChild(li);
    });
  }

  // Explanation list
  explanationList.innerHTML = "";
  if (results.matched.length === 0) {
    var li0 = document.createElement("li");
    li0.textContent = "This tool did not match any predefined warning patterns. This is not confirmation that the message is accurate — always verify through an official source.";
    explanationList.appendChild(li0);
  } else {
    results.matched.forEach(function (category) {
      var li = document.createElement("li");
      li.textContent = category.explanation;
      explanationList.appendChild(li);
    });
  }
}

function animateCountUp(el, target, duration) {
  if (!duration) {
    el.textContent = target;
    return;
  }
  var start = 0;
  var startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var progress = Math.min((timestamp - startTime) / duration, 1);
    var value = Math.round(start + (target - start) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* =====================================================
   DISASTER RISKS SECTION
   ===================================================== */
var DISASTER_DATA = [
  {
    id: "typhoon",
    icon: "\uD83C\uDF2A\uFE0F",
    name: "Typhoon",
    description: "Storm-driven scams around class suspensions and relief aid.",
    risks: [
      "Fake class suspension announcements",
      "Fake weather warnings",
      "Fake relief registration",
      "Donation scams",
      "Phishing links"
    ]
  },
  {
    id: "flood",
    icon: "\uD83C\uDF0A",
    name: "Flood",
    description: "False evacuation and assistance messages during flooding.",
    risks: [
      "Fake evacuation announcements",
      "Fake relief assistance",
      "Fake donation campaigns",
      "Fraudulent registration links"
    ]
  },
  {
    id: "earthquake",
    icon: "\uD83C\uDF0F",
    name: "Earthquake",
    description: "Panic-driven misinformation following seismic events.",
    risks: [
      "Fake casualty reports",
      "Fake evacuation instructions",
      "False emergency announcements",
      "Fake donation campaigns"
    ]
  },
  {
    id: "volcanic",
    icon: "\uD83C\uDF0B",
    name: "Volcanic Eruption",
    description: "Fabricated eruption and evacuation updates.",
    risks: [
      "Fake eruption warnings",
      "Fake evacuation orders",
      "False location information",
      "Fake government announcements"
    ]
  },
  {
    id: "fire",
    icon: "\uD83D\uDD25",
    name: "Fire",
    description: "Rapid-spread hoaxes during fire incidents.",
    risks: [
      "Fake evacuation information",
      "Fake donation campaigns",
      "False emergency reports",
      "Phishing messages"
    ]
  },
  {
    id: "general",
    icon: "\u26A0\uFE0F",
    name: "General Emergency",
    description: "Broad patterns seen across most calamity types.",
    risks: [
      "Fake government announcements",
      "Phishing",
      "Social engineering",
      "Identity theft",
      "Donation scams"
    ]
  }
];

function initDisasterRisks() {
  var grid = document.getElementById("disasterGrid");
  var detail = document.getElementById("disasterDetail");
  var detailIcon = document.getElementById("disasterDetailIcon");
  var detailTitle = document.getElementById("disasterDetailTitle");
  var detailDesc = document.getElementById("disasterDetailDesc");
  var detailList = document.getElementById("disasterDetailList");

  DISASTER_DATA.forEach(function (disaster) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "disaster-card";
    card.setAttribute("data-id", disaster.id);
    card.innerHTML =
      '<span class="icon" aria-hidden="true">' + disaster.icon + '</span>' +
      '<span class="card-name">' + disaster.name + '</span>' +
      '<span class="card-view">View Risks →</span>';

    card.addEventListener("click", function () {
      grid.querySelectorAll(".disaster-card").forEach(function (c) {
        c.classList.remove("active");
      });
      card.classList.add("active");

      detailIcon.textContent = disaster.icon;
      detailTitle.textContent = disaster.name;
      detailDesc.textContent = disaster.description;
      detailList.innerHTML = "";
      disaster.risks.forEach(function (risk) {
        var li = document.createElement("li");
        li.textContent = risk;
        detailList.appendChild(li);
      });

      detail.hidden = false;
      detail.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
    });

    if (!prefersReducedMotion && !window.matchMedia("(max-width: 760px)").matches) {
      card.addEventListener("mousemove", function (e) {
        var bounds = card.getBoundingClientRect();
        var relX = (e.clientX - bounds.left) / bounds.width;
        var relY = (e.clientY - bounds.top) / bounds.height;
        var rotateY = (relX - 0.5) * 10;
        var rotateX = (0.5 - relY) * 10;
        card.style.transform = "translateY(-4px) rotateY(" + rotateY + "deg) rotateX(" + rotateX + "deg)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    }

    grid.appendChild(card);
  });
}

/* =====================================================
   VERIFICATION GUIDE SECTION
   ===================================================== */
var GUIDE_STEPS = [
  { num: "01", title: "Check the Source", text: "Identify who originally posted or sent the information." },
  { num: "02", title: "Verify the Organization", text: "Check whether the announcement exists on the organization's official communication channel." },
  { num: "03", title: "Check the Date", text: "Old announcements may be reposted as if they are current." },
  { num: "04", title: "Compare Information", text: "Look for confirmation from other reliable sources." },
  { num: "05", title: "Avoid Suspicious Links", text: "Do not open unfamiliar links or download unknown files." },
  { num: "06", title: "Protect Your Information", text: "Never provide passwords, OTPs, PINs, banking information, or other sensitive information because of an unverified emergency message." },
  { num: "07", title: "Think Before Sharing", text: "Do not forward emergency information simply because it says \u201CURGENT.\u201D" }
];

function initGuide() {
  var list = document.getElementById("guideList");
  GUIDE_STEPS.forEach(function (step) {
    var li = document.createElement("li");
    li.innerHTML =
      '<span class="guide-num">' + step.num + '</span>' +
      '<h3>' + step.title + '</h3>' +
      '<p>' + step.text + '</p>';
    list.appendChild(li);
  });
}

/* =====================================================
   SAFETY TIPS SECTION
   ===================================================== */
var SAFETY_TIPS = [
  "Never share your OTP.",
  "Never share your password.",
  "Avoid suspicious links.",
  "Verify emergency announcements.",
  "Be careful with donation requests.",
  "Do not spread unverified information.",
  "Protect personal information.",
  "Use official communication channels."
];

function initSafetyTips() {
  var grid = document.getElementById("tipsGrid");
  SAFETY_TIPS.forEach(function (tip) {
    var card = document.createElement("div");
    card.className = "tip-card";
    card.innerHTML = '<span class="tip-icon" aria-hidden="true">\u2713</span><span>' + tip + '</span>';
    grid.appendChild(card);
  });
}
