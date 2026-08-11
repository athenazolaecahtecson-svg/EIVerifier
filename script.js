/* =====================================================
   CyberSafe PH — Emergency Information Verifier
   All logic runs locally in the browser.
   No network requests, no storage, no analytics.
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {
  initNav();
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

  // Close the mobile menu once a link is chosen
  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mobileNav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* =====================================================
   RULE-BASED RISK DATA
   Each category lists the phrases/patterns it looks for,
   the label shown when found, and the explanation shown
   to the user. This is intentionally simple and transparent:
   a real message can be scored by hand against this same list.
   ===================================================== */
var RISK_CATEGORIES = [
  {
    id: "urgency",
    label: "Urgency or panic language",
    explanation: "Urgent language can be used by scammers to pressure people into acting before verifying information.",
    patterns: [
      "urgent", "act now", "share now", "share immediately", "immediately",
      "last chance", "do this now", "warning", "important", "emergency"
    ]
  },
  {
    id: "otp",
    label: "OTP / sensitive credential request",
    explanation: "Never share an OTP with another person or suspicious website. An OTP is a security credential and should remain private.",
    patterns: ["otp", "one-time password", "one time password"]
  },
  {
    id: "sensitive-info",
    label: "Sensitive personal or financial information request",
    explanation: "Legitimate agencies do not usually ask for passwords, PINs, or account details through unsolicited messages or links.",
    patterns: [
      "password", "pin", "gcash", "bank account", "credit card", "debit card",
      "cvv", "account number", "personal information", "id number", "government id"
    ]
  },
  {
    id: "financial",
    label: "Financial or relief assistance claim",
    explanation: "Financial assistance and donation claims should be verified through official sources before providing information or sending money.",
    patterns: [
      "₱5,000", "₱10,000", "5,000", "10,000", "cash assistance", "financial assistance",
      "emergency assistance", "relief assistance", "free money", "claim your money",
      "government aid", "donation", "donate now", "relief fund"
    ]
  },
  {
    id: "links",
    label: "Suspicious or unfamiliar link",
    explanation: "Suspicious or unfamiliar links should be checked carefully before opening.",
    patterns: [
      "bit.ly", "tinyurl", "http://", "https://", "www.",
      "claim", "reward", "verify", "assistance", "registration", "free"
    ],
    // For links, only count the "link-shape" patterns as a hit on their own;
    // keyword patterns like "claim"/"reward" are only meaningful together with a URL.
    requiresUrlContext: true
  },
  {
    id: "impersonation",
    label: "Government organization mentioned",
    explanation: "An organization name can be used to make a fraudulent message appear legitimate. Verify the announcement through the organization's official communication channels.",
    patterns: [
      "pagasa", "phivolcs", "ndrrmc", "dswd", "deped", "dost", "dict", "doh", "lgu",
      "philippine government"
    ]
  },
  {
    id: "unverified",
    label: "Unverified or authority-based claim",
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
    var results = analyzeMessage(message);
    renderResults(results);
    resultsWrap.hidden = false;
    resultsWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
      // Only flag "suspicious link" when an actual URL/shortened-link pattern
      // is present, not just because a keyword like "claim" appears alone.
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
  var riskIcon = document.getElementById("riskIcon");
  var riskLevel = document.getElementById("riskLevel");
  var riskScoreText = document.getElementById("riskScoreText");
  var indicatorList = document.getElementById("indicatorList");
  var explanationList = document.getElementById("explanationList");
  var recommendationText = document.getElementById("recommendationText");

  banner.classList.remove("risk-low", "risk-medium", "risk-high");

  var levelText = {
    low: "LOW RISK",
    medium: "MEDIUM RISK",
    high: "HIGH RISK"
  };
  var levelIcon = {
    low: "\u2705",
    medium: "\u26A0\uFE0F",
    high: "\u26A0\uFE0F"
  };
  var levelRecommendation = {
    low: "No obvious warning signs were detected. Even so, verify any emergency information through an official source before acting on it or sharing it further.",
    medium: "This message contains warning signs that are common in scam or misinformation content. Do not click links or share personal information until you verify it through an official source.",
    high: "This message contains multiple warning signs. Do not click suspicious links or provide sensitive information. Verify this announcement through an official source before sharing."
  };

  banner.classList.add("risk-" + results.level);
  riskIcon.textContent = levelIcon[results.level];
  riskLevel.textContent = levelText[results.level];
  riskScoreText.textContent = "Risk Score: " + results.score;
  recommendationText.textContent = levelRecommendation[results.level];

  // Indicator list
  indicatorList.innerHTML = "";
  if (results.matched.length === 0) {
    indicatorList.classList.add("empty-state");
    var emptyItem = document.createElement("li");
    emptyItem.textContent = "No obvious warning signs detected in this message.";
    indicatorList.appendChild(emptyItem);
  } else {
    indicatorList.classList.remove("empty-state");
    results.matched.forEach(function (category) {
      var li = document.createElement("li");
      var check = document.createElement("span");
      check.className = "check";
      check.textContent = "\u2713";
      li.appendChild(check);
      li.appendChild(document.createTextNode(category.label));
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

/* =====================================================
   DISASTER RISKS SECTION
   ===================================================== */
var DISASTER_DATA = [
  {
    id: "typhoon",
    icon: "\uD83C\uDF2A\uFE0F",
    name: "Typhoon",
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
  var detailList = document.getElementById("disasterDetailList");

  DISASTER_DATA.forEach(function (disaster) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "disaster-card";
    card.setAttribute("data-id", disaster.id);
    card.innerHTML = '<span class="icon" aria-hidden="true">' + disaster.icon + '</span>' + disaster.name;

    card.addEventListener("click", function () {
      grid.querySelectorAll(".disaster-card").forEach(function (c) {
        c.classList.remove("active");
      });
      card.classList.add("active");

      detailIcon.textContent = disaster.icon;
      detailTitle.textContent = disaster.name;
      detailList.innerHTML = "";
      disaster.risks.forEach(function (risk) {
        var li = document.createElement("li");
        li.textContent = risk;
        detailList.appendChild(li);
      });

      detail.hidden = false;
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

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
