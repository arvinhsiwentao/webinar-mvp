# JoinLive Platform Reverse-Engineering Specification

> **Target URL:** https://live.yongmingu.com/s/ODod5C
> **Page Title:** AIC双风口机遇讲座
> **Analysis Date:** 2026-02-23
> **Status:** PARTIAL — Landing page + registration modal fully documented. Post-registration flow (confirmation, waiting room, live room) still needs exploration.

---

## Table of Contents

1. [Page Overview](#1-page-overview)
2. [Section 1: Hero Banner](#2-section-1-hero-banner)
3. [Section 2: Speaker Bio](#3-section-2-speaker-bio)
4. [Section 3: Schedule + Countdown + Benefits](#4-section-3-schedule--countdown--benefits)
5. [Section 4: Urgency/Disclaimer + Final CTA](#5-section-4-urgencydisclaimer--final-cta)
6. [Section 5: Footer](#6-section-5-footer)
7. [Registration Modal (Overlay)](#7-registration-modal-overlay)
8. [Design System & Visual Tokens](#8-design-system--visual-tokens)
9. [Content Strategy Analysis](#9-content-strategy-analysis)
10. [User Flow Map](#10-user-flow-map)
11. [Remaining Investigation Items](#11-remaining-investigation-items)

---

## 1. Page Overview

### Page Metadata
- **Title tag:** `AIC双风口机遇讲座`
- **Language:** Simplified Chinese (zh-CN) — targeting Chinese-speaking global audience
- **Total page height:** 2196px
- **Viewport assumed:** 1280px wide (desktop)
- **Background color (body):** White (`#ffffff`)
- **Body font:** System/platform default (no custom web font detected)
- **Body font size:** 16px
- **Body text color:** Dark gray/black

### Page Structure (Top to Bottom)
| Section | Y-offset | Height | Background |
|---------|----------|--------|------------|
| Hero Banner (header) | 0px | ~441px | Background image (dark blue/purple tech motif) |
| Speaker Bio | 441px | ~252px | White (`#ffffff`) |
| Schedule + Countdown + Benefits | 693px | ~1046px | Light gray (`#f6f6f6`) |
| Urgency/Disclaimer + Final CTA | 1739px | ~300px | White with red top border accent |
| Footer | ~2050px | ~146px | Gray (`#f6f6f6`) |

### Overall Design Philosophy
- **Clean, minimal, conversion-focused** — single-column layout, no sidebar
- **Trust-building flow:** Hook → Credibility → Specifics → Urgency → Action
- **Color scheme:** White/light gray backgrounds, green accent for all CTAs, dark text
- **No navigation bar** — pure landing page, no escape routes

---

## 2. Section 1: Hero Banner

### Layout
- **Full-width** header element spanning entire viewport
- **Height:** ~441px
- **Background:** Full-bleed background image with `background-size: cover; background-position: 50% 50%`
- **Background image URL:** `https://cdn.joinnow.live/uploads/561f63a8-33ea-491e-9b64-9f84211c0c54`
- **Background image description:** Dark blue/purple abstract tech-themed image with geometric hexagonal shapes, light rays radiating from center, creating an AI/futuristic atmosphere
- **Content alignment:** Center-aligned, vertically centered within the banner

### Content Elements (top to bottom within hero)

#### Subheading (Eyebrow Text)
- **Text:** `限时公开内容`
- **Rendered as:** `<span>` inside `<h1>`, displayed as block
- **Font size:** 24px
- **Font weight:** Normal (implied from span)
- **Color:** White (`#ffffff`)
- **Purpose:** Creates scarcity/exclusivity — "Limited-time public content"

#### Main Headline
- **Text:** `如何抓住AI时代第一个财富翻盘信号？从负债30万到全球旅居`
- **HTML:** `<h1>` with `<br>` between the two lines
- **Font size:** 55px
- **Font weight:** 700 (bold)
- **Color:** White (`#ffffff`)
- **Text align:** Center
- **Line height:** 55px (tight, 1:1 ratio)
- **Line break point:** After `？` (question mark), creating two visual lines:
  - Line 1: `如何抓住AI时代第一个财富翻盘信号？`
  - Line 2: `从负债30万到全球旅居`

#### CTA Button
- **Text:** `观看讲座` (Watch the Lecture)
- **Type:** `<button type="button">`
- **Wrapper class:** `register-button__wrapper`
- **Background color:** Green `rgb(148, 192, 71)` / `#94C047`
- **Text color:** White `rgb(255, 255, 255)`
- **Font size:** 18px
- **Font weight:** 400 (normal)
- **Border radius:** 5px
- **Padding:** `0px 40px` (horizontal only)
- **Line height:** 60px (creates the button height)
- **Computed dimensions:** ~157px wide × ~61px tall
- **Position:** Centered below headline
- **Click behavior:** Opens registration modal overlay (slide-in from right or fade-in)

---

## 3. Section 2: Speaker Bio

### Layout
- **Height:** ~252px
- **Background:** White (`#ffffff`)
- **Padding:** `0px 0px 60px` (60px bottom padding)
- **Layout:** Two-column horizontal layout within centered container
  - Left: Circular avatar image
  - Right: Name + bio text

### Avatar Image
- **Rendered as:** `<div>` with CSS `background-image`
- **Image URL:** `https://cdn.joinnow.live/uploads/34e80de7-c966-4faa-b41b-c2b494409dd2`
- **Dimensions:** 153px × 153px
- **Border radius:** `50%` (perfect circle)
- **Image description:** Professional headshot of a young Asian woman in a dark blue blazer, smiling, light background

### Speaker Name
- **Text:** `Dian Li`
- **Font size:** ~20-24px (estimated from visual)
- **Font weight:** Bold
- **Color:** Dark/black
- **Position:** Top of the right column

### Speaker Bio Text
- **Full text:** `我曾经是一名银行的普通职员，朝九晚五，拿着固定薪资。因为帮助闺蜜，陷入30万债务危机。而2024年的一个财富机遇，竟然让我实现一年清债的奇迹，并盘下一家茶馆！我已经把方法分享给500+名学员实现财富认知升级，现在我想分享给你……`
- **Font size:** ~14-16px
- **Color:** Gray/dark gray
- **Line height:** ~1.6-1.8 (comfortable reading)
- **Content strategy:** Personal transformation story — relatable origin (bank employee), crisis (300K debt), resolution (opportunity in 2024), proof (500+ students), invitation to viewer

---

## 4. Section 3: Schedule + Countdown + Benefits

### Overall Container
- **Height:** ~1046px total
- **Background:** Light gray `rgb(246, 246, 246)` / `#f6f6f6`
- **Contains two sub-sections:**
  1. Schedule date cards + Countdown timer (~538px)
  2. Benefits list (~508px)

### 4a. Schedule Date Cards

#### Layout
- Horizontal row of 4 date cards, each representing a session time
- Each card is a mini-calendar icon style

#### Date Card Design
- **Card structure:**
  - Top bar: Green (`#94C047`) with month text, `border-radius: 4px 4px 0 0` (rounded top corners)
  - Top bar dimensions: 60px wide × 24px tall
  - Top bar text: `2月` (February), white, 16px
  - Bottom area: White background with day number
  - Day number: Large bold text (e.g., `23`, `24`)

#### Available Sessions (4 total)
| # | Date | Time | Timezone |
|---|------|------|----------|
| 1 | 2026年2月23日 | 10:40上午 | Central Standard Time (CST) |
| 2 | 2026年2月23日 | 9:00晚上 | Central Standard Time (CST) |
| 3 | 2026年2月24日 | 8:00早上 | Central Standard Time (CST) |
| 4 | 2026年2月24日 | 9:00晚上 | Central Standard Time (CST) |

- **Date format:** `YYYY年M月D日`
- **Time format:** `H:MM上午/晚上/早上` (Chinese AM/PM)
- **Timezone display:** Full text "Central Standard Time" below each time

### 4b. Countdown Timer

#### Layout
- **Heading:** `Webinar Starts In…` (English, not Chinese)
- **Heading position:** Centered above timer boxes
- **Timer display:** 4 green boxes in a horizontal row with labels below

#### Timer Box Design
- **Each box dimensions:** 64px × 64px
- **Background:** Green `rgb(148, 192, 71)` / `#94C047`
- **Border radius:** 4px
- **Number font size:** 36px
- **Number color:** White
- **Spacing between boxes:** ~12-16px gap

#### Timer Labels (below boxes, in English)
- `DAYS` | `HOURS` | `MINUTES` | `SECONDS`
- Labels in uppercase, dark text, ~12-14px font size

#### Timer Behavior
- Counts down to the nearest upcoming session start time
- When the session time has passed, all values show `0`
- Real-time decrement (JavaScript `setInterval` updating every second)

### 4c. Benefits List

#### Heading
- **Text:** `讲座中你将会获得什么：` (What you'll gain from this lecture:)
- **Font size:** ~28-32px (estimated from visual hierarchy)
- **Font weight:** Bold
- **Color:** Dark/black
- **Text align:** Center

#### List Items (6 items)
Each item follows the same pattern:

| # | Text | Translation |
|---|------|-------------|
| 1 | 一个真实的逆袭蓝图 | A real comeback blueprint |
| 2 | 理解"双风口"的财富逻辑 | Understand the wealth logic of "dual opportunities" |
| 3 | 看到普通人验证的结果 | See results verified by ordinary people |
| 4 | 掌握高胜率信号的核心思路 | Master the core approach to high-probability signals |
| 5 | 明确当下的行动窗口 | Clarify the current action window |
| 6 | 获得一份行动地图 | Get an action roadmap |

#### List Item Design
- **Icon:** Green circle checkmark (✓) — appears to be an SVG or image icon
- **Icon color:** Green matching the CTA button (`#94C047`)
- **Icon size:** ~24px
- **Text font size:** 16px
- **Text font weight:** 400 (normal)
- **Text color:** Dark gray `rgb(37, 37, 37)` / `#252525`
- **Item padding:** `0px 0px 15px` (15px bottom spacing between items)
- **Layout:** Icon left-aligned, text to the right of icon, left-aligned within centered container

---

## 5. Section 4: Urgency/Disclaimer + Final CTA

### Layout
- **Position:** Below benefits list
- **Background:** White
- **Top border accent:** Thin red/coral stripe at the very top of this section (~3-4px)
- **Content:** Centered, single column

### Warning Icon
- **Type:** Yellow triangle warning sign (⚠️)
- **Size:** ~60-80px
- **Position:** Centered above heading
- **Purpose:** Visual urgency signal — creates psychological tension

### Heading
- **Text:** `首次公开，过时不候` (First public release, won't wait)
- **Font size:** ~28-32px
- **Font weight:** Bold
- **Color:** Dark text
- **Text align:** Center

### Disclaimer Text
- **Full text:** `本次讲座内容仅为知识分享与案例探讨，不构成任何形式的投资建议、理财推荐或收益保证。所有提及的策略、工具及案例均为主讲人个人经验分享。`
- **Translation:** "This lecture is knowledge sharing and case study discussion only, not investment advice, financial recommendations, or income guarantees. All strategies, tools, and cases mentioned are the speaker's personal experience."
- **Font size:** ~14px
- **Color:** Gray
- **Purpose:** Legal disclaimer + trust signal (transparency builds credibility)

### Final CTA Button
- **Text:** `锁定名额，观看讲座` (Lock your seat, watch the lecture)
- **Background:** Green `rgb(148, 192, 71)` / `#94C047`
- **Text color:** White
- **Font size:** 18px
- **Border radius:** 5px
- **Padding:** `0px 40px`
- **Computed dimensions:** ~252px wide × ~61px tall
- **Line height:** 60px
- **Click behavior:** Same as hero CTA — opens registration modal
- **Note:** This button text is longer/more persuasive than the hero CTA ("Lock your seat" vs just "Watch")

---

## 6. Section 5: Footer

### Layout
- **Background:** Gray area
- **Height:** ~146px (estimated)
- **Content:** Single line, centered text

### Content
- **Links:**
  - `Purchase Agreement(Refund Policy)` → `https://www.yongmingu.com/purchase-agreement`
  - `Terms of Service` → `https://www.yongmingu.com/terms-of-use`
- **Separator:** Pipe character `|` between links and address
- **Address:** `527 21st Street #216, Galveston, TX 77550, USA`
- **Link styling:** Blue/teal underlined text (standard link appearance)
- **Text size:** ~12-14px
- **Color:** Gray

---

## 7. Registration Modal (Overlay)

### Trigger
- Clicking either CTA button (`观看讲座` or `锁定名额，观看讲座`) opens the modal

### Overlay Background
- **Type:** Semi-transparent dark overlay behind the modal
- **Z-index:** 2147483646 (extremely high — ensures it's on top of everything)
- **Covers:** Full viewport

### Modal Box
- **Width:** 480px
- **Height:** ~528px (content-dependent)
- **Background:** Light gray `rgb(237, 237, 237)` / `#ededed`
- **Border radius:** 0px (sharp corners)
- **Box shadow:** None
- **Padding:** `43px 49px 23px` (generous padding)
- **Position:** Centered in viewport

### Close Button (X)
- **Position:** Top-right corner of modal
- **Text:** "Close" (screen reader text, visually shows × icon)
- **Type:** `<button type="button">`

### Modal Heading
- **Text:** `现在预订你的席位` (Reserve your seat now)
- **Font size:** ~28-32px (estimated)
- **Font weight:** Bold
- **Text align:** Center
- **Color:** Dark/black

### Subtitle
- **Text:** `注册完成后，即可观看讲座。` (After registration, you can watch the lecture immediately.)
- **Font size:** 14px
- **Color:** Gray `rgb(112, 112, 112)` / `#707070`
- **Text align:** Center

### Form Fields

#### Field 1: Name
- **Input type:** `text`
- **Name attribute:** `name`
- **Placeholder:** `姓名 *`
- **Required:** Yes (asterisk in placeholder)
- **Width:** 382px
- **Height:** 50px
- **Font size:** 16px
- **Border:** `0.67px solid rgb(204, 204, 204)` / `#cccccc`
- **Border radius:** 2px
- **Padding:** `0px 42px 0px 15px` (extra right padding for icon)
- **Background:** White
- **Right icon:** Person silhouette icon (gray, ~20px)

#### Field 2: Email
- **Input type:** `text` (not `email` — note: no HTML5 email validation)
- **Name attribute:** `email`
- **Placeholder:** `电子邮箱 *`
- **Required:** Yes
- **Dimensions/styling:** Same as Name field
- **Right icon:** Envelope/mail icon (gray, ~20px)

#### Field 3: Session Time Selector
- **Label text:** `选择一个时间` (Choose a time)
- **Label font weight:** Bold
- **Input type:** `<select>` dropdown (custom styled combobox)
- **Default selected:** First upcoming session
- **Options (4 total):**
  - `2026年2月23日 -10:40上午 CST` (value: `2026-02-23T02:40:00.000Z`)
  - `2026年2月23日 -9:00晚上 CST` (value: `2026-02-23T13:00:00.000Z`)
  - `2026年2月24日 -8:00早上 CST` (value: `2026-02-24T00:00:00.000Z`)
  - `2026年2月24日 -9:00晚上 CST` (value: `2026-02-24T13:00:00.000Z`)
- **Dropdown has custom chevron:** Down arrow (▼) on the right side
- **Note:** Values are ISO 8601 UTC timestamps

#### Field 4: SMS Reminder Checkbox
- **Type:** Checkbox
- **Default state:** Unchecked
- **Label text:** `我想要在讲座开始前收到短信提醒 (可选，但强烈建议使用)`
- **Translation:** "I want to receive SMS reminder before the lecture starts (optional, but strongly recommended)"
- **Note:** When checked, likely reveals a phone number input field (not yet tested)

### Submit Button
- **Text:** `提交` (Submit)
- **Type:** `<button type="submit">`
- **Background:** Green `rgb(148, 192, 71)` / `#94C047`
- **Text color:** White
- **Font size:** 18px
- **Border radius:** 5px
- **Dimensions:** ~157px wide × ~61px tall (same styling as hero CTA)
- **Position:** Centered below form fields

### Privacy Notice (Below Form)
- **Icon:** Lock icon (🔒) before text
- **Text:** `注意：我们不会给你发送垃圾信息，也不会销售你的个人信息，请放心。`
- **Translation:** "Note: We won't send you spam or sell your personal information. Rest assured."
- **Font size:** ~12px
- **Color:** Gray
- **Purpose:** Trust-building micro-copy to reduce registration friction

### Motivational Text (Below Modal)
- **Text:** `未来的你，会感谢今天的决定` (Your future self will thank today's decision)
- **Font size:** ~24-28px
- **Font weight:** Bold
- **Color:** Dark/black
- **Position:** Below the modal, visible when scrolled down
- **Purpose:** Emotional reinforcement to encourage form completion

---

## 8. Design System & Visual Tokens

### Color Palette
| Name | Value | Usage |
|------|-------|-------|
| Primary Green | `#94C047` / `rgb(148, 192, 71)` | CTA buttons, countdown timer boxes, date card headers, checkmark icons |
| White | `#ffffff` | Page background, button text, hero text |
| Light Gray BG | `#f6f6f6` / `rgb(246, 246, 246)` | Schedule/benefits section background |
| Modal Gray BG | `#ededed` / `rgb(237, 237, 237)` | Registration modal background |
| Dark Text | `#252525` / `rgb(37, 37, 37)` | Body text, benefit items |
| Gray Text | `#707070` / `rgb(112, 112, 112)` | Subtitles, secondary text |
| Border Gray | `#cccccc` / `rgb(204, 204, 204)` | Form input borders |
| Hero BG | Dark blue/purple | Background image overlay |

### Typography Scale
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Hero H1 | 55px | 700 | 55px (1:1) |
| Hero eyebrow (span) | 24px | 400 | normal |
| Section headings | ~28-32px | 700 | normal |
| Body text / list items | 16px | 400 | ~1.6 |
| Subtitle/secondary | 14px | 400 | normal |
| Small/privacy text | ~12px | 400 | normal |
| CTA button text | 18px | 400 | 60px |
| Countdown numbers | 36px | 700 | normal |

### Button Style (Primary CTA)
```css
background-color: #94C047;
color: #ffffff;
font-size: 18px;
font-weight: 400;
border-radius: 5px;
padding: 0 40px;
line-height: 60px; /* Creates ~61px button height */
border: none;
cursor: pointer;
```

### Form Input Style
```css
width: 382px;
height: 50px;
font-size: 16px;
border: 0.67px solid #cccccc;
border-radius: 2px;
padding: 0 42px 0 15px; /* Extra right padding for trailing icon */
background: #ffffff;
```

### Spacing Patterns
- **Section padding (bottom):** 60px
- **Between list items:** 15px
- **Modal padding:** 43px top, 49px sides, 23px bottom
- **Between form fields:** ~20-24px (visual gap)

---

## 9. Content Strategy Analysis

### Persuasion Framework (Top to Bottom)

1. **HOOK (Hero):**
   - Scarcity trigger: "限时公开内容" (limited-time)
   - Curiosity + aspiration headline combining AI opportunity + debt-to-freedom transformation
   - Single clear CTA: "Watch the lecture"

2. **CREDIBILITY (Speaker Bio):**
   - Relatable origin story (ordinary bank employee)
   - Pain point mirror (debt crisis — audience likely relates)
   - Proof of transformation (cleared debt, bought tea shop)
   - Social proof number (500+ students)
   - Open invitation ("I want to share with you...")

3. **SPECIFICITY (Schedule + Benefits):**
   - Multiple session times = flexibility, reduces "bad timing" objection
   - Countdown timer = urgency, FOMO
   - 6 concrete benefit promises = value stacking
   - Benefits use action verbs: 理解, 看到, 掌握, 明确, 获得

4. **URGENCY + TRUST (Disclaimer Section):**
   - Warning icon creates visual tension
   - "First time public, won't wait" — scarcity
   - Legal disclaimer paradoxically BUILDS trust (transparency)
   - Stronger CTA copy: "Lock your seat" (implies limited availability)

5. **FRICTION REDUCTION (Registration Modal):**
   - Only 2 required fields (name + email) — ultra-low barrier
   - Session pre-selected — no decision fatigue
   - Privacy reassurance below submit button
   - Motivational text reinforces decision

### Language & Tone
- **Simplified Chinese (zh-CN)** — targets mainland China + global Chinese speakers
- Conversational but aspirational tone
- Uses concrete numbers (30万, 500+, 2024年)
- Emotional storytelling approach (not corporate/dry)
- Countdown/timer labels in **English** (`DAYS`, `HOURS`, etc.) — interesting bilingual choice

---

## 10. User Flow Map

```
┌─────────────────────────────────────────────────────────────┐
│                    LANDING PAGE                              │
│  URL: /s/ODod5C                                             │
│                                                              │
│  Hero → Speaker Bio → Schedule/Countdown → Benefits →       │
│  Disclaimer → CTA                                           │
│                                                              │
│  [CTA Button] ──→ Opens Registration Modal                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               REGISTRATION MODAL (Overlay)                   │
│                                                              │
│  Fields: Name, Email, Session Time (dropdown), SMS opt-in   │
│  [Submit] ──→ ???                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           CONFIRMATION / THANK YOU PAGE                      │
│           (NOT YET CAPTURED)                                 │
│                                                              │
│  Expected: Confirmation message, calendar add, countdown     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              WAITING ROOM PAGE                               │
│              (NOT YET CAPTURED)                               │
│                                                              │
│  Expected: Countdown to session start, auto-redirect         │
│  to live room when session begins                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 LIVE ROOM PAGE                                │
│                 (NOT YET CAPTURED)                            │
│                                                              │
│  Expected: Video player, chat panel, CTA overlays,           │
│  viewer count, engagement features                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   END PAGE                                    │
│                   (NOT YET CAPTURED)                          │
│                                                              │
│  Expected: Replay offer, upsell CTA, social sharing          │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Remaining Investigation Items

### HIGH PRIORITY — Next Session Must Capture:

- [ ] **Post-registration flow:** Submit the form and capture the confirmation/thank-you page
- [ ] **Waiting room page:** Layout, countdown behavior, auto-redirect logic
- [ ] **Live room page:** This is the CORE experience — needs extensive documentation:
  - [ ] Video player: dimensions, controls (or lack thereof), seeking behavior
  - [ ] Chat panel: layout, auto-chat messages, user input, timing logic
  - [ ] CTA overlays: when they appear, design, countdown within CTA
  - [ ] Viewer count: display, formula/simulation logic
  - [ ] Any other engagement features (polls, reactions, etc.)
- [ ] **End page:** What happens when the video ends
- [ ] **SMS checkbox behavior:** Does checking it reveal a phone field?
- [ ] **Mobile responsive behavior:** How the page adapts to smaller screens
- [ ] **Hover states and animations:** Button hover effects, modal open animation
- [ ] **Error states:** What happens with invalid form submission
- [ ] **Email confirmation:** What email is sent after registration

### NICE TO HAVE:
- [ ] Network requests analysis (API endpoints, data format)
- [ ] JavaScript bundle inspection (framework used by JoinLive platform)
- [ ] Cookie/localStorage behavior
- [ ] Performance metrics

---

## Appendix: Raw Data Collected

### CDN Asset URLs
- Hero background: `https://cdn.joinnow.live/uploads/561f63a8-33ea-491e-9b64-9f84211c0c54`
- Speaker avatar: `https://cdn.joinnow.live/uploads/34e80de7-c966-4faa-b41b-c2b494409dd2`
- Platform CDN base: `cdn.joinnow.live`

### HTML Structure (Simplified)
```html
<body>
  <header> <!-- Hero Banner -->
    <div class="row">
      <h1>
        <span>限时公开内容</span>
        如何抓住AI时代第一个财富翻盘信号？<br>从负债30万到全球旅居
      </h1>
      <div class="register-button__wrapper">
        <button type="button" class="btn">观看讲座</button>
      </div>
    </div>
  </header>

  <section> <!-- Speaker Bio -->
    <div><!-- Avatar (bg-image circle) --></div>
    <div><!-- Name: Dian Li --></div>
    <div><!-- Bio text --></div>
  </section>

  <section> <!-- Schedule + Benefits wrapper -->
    <section> <!-- Date cards + Countdown -->
      <!-- 4 date cards -->
      <!-- Countdown timer: 4 green boxes -->
    </section>
    <!-- Benefits heading + 6-item list -->
    <h2>讲座中你将会获得什么：</h2>
    <ul>
      <li><!-- checkmark icon + text --></li>
      <!-- ×6 -->
    </ul>
  </section>

  <section> <!-- Urgency/Disclaimer -->
    <!-- Warning triangle icon -->
    <h2>首次公开，过时不候</h2>
    <p><!-- Disclaimer text --></p>
    <button>锁定名额，观看讲座</button>
  </section>

  <div> <!-- Footer -->
    <a>Purchase Agreement</a> | <a>Terms of Service</a>
    <span>527 21st Street #216...</span>
  </div>

  <!-- Registration Modal (hidden by default, shown on CTA click) -->
  <div> <!-- Overlay -->
    <button>Close</button>
    <h2>现在预订你的席位</h2>
    <p>注册完成后，即可观看讲座。</p>
    <form>
      <input name="name" placeholder="姓名 *" />
      <input name="email" placeholder="电子邮箱 *" />
      <label>选择一个时间</label>
      <select><!-- 4 session options --></select>
      <label><input type="checkbox" /> SMS reminder</label>
      <button type="submit">提交</button>
    </form>
    <p><!-- Privacy notice --></p>
  </div>
  <h3>未来的你，会感谢今天的决定</h3>
</body>
```

### Session Time Values (ISO 8601)
```json
[
  {"label": "2026年2月23日 -10:40上午 CST", "value": "2026-02-23T02:40:00.000Z"},
  {"label": "2026年2月23日 -9:00晚上 CST", "value": "2026-02-23T13:00:00.000Z"},
  {"label": "2026年2月24日 -8:00早上 CST", "value": "2026-02-24T00:00:00.000Z"},
  {"label": "2026年2月24日 -9:00晚上 CST", "value": "2026-02-24T13:00:00.000Z"}
]
```
