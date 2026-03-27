# JoinLive Platform Reverse-Engineering Specification

> **Target URL:** https://live.yongmingu.com/s/ODod5C
> **Page Title:** AIC双风口机遇讲座
> **Analysis Date:** 2026-02-23
> **Status:** COMPLETE — Full user journey documented across 26 sections: landing page, registration modal, confirmation, waiting room, live room (video, chat, CTAs, sidebar), end page, API architecture, analytics, payment/checkout flow, URL routing edge cases, mobile responsive behavior (375px/768px/1280px), and raw data appendix.

---

## Table of Contents

### Landing Page
1. [Page Overview](#1-page-overview)
2. [Section 1: Hero Banner](#2-section-1-hero-banner)
3. [Section 2: Speaker Bio](#3-section-2-speaker-bio)
4. [Section 3: Schedule + Countdown + Benefits](#4-section-3-schedule--countdown--benefits)
5. [Section 4: Urgency/Disclaimer + Final CTA](#5-section-4-urgencydisclaimer--final-cta)
6. [Section 5: Footer](#6-section-5-footer)
7. [Registration Modal (Overlay)](#7-registration-modal-overlay)

### Design & Strategy
8. [Design System & Visual Tokens](#8-design-system--visual-tokens)
9. [Content Strategy Analysis](#9-content-strategy-analysis)

### Post-Registration Flow
10. [User Flow Map](#10-user-flow-map)
11. [Confirmation / Thank You Page](#11-confirmation--thank-you-page)
12. [Waiting Room / Countdown Page](#12-waiting-room--countdown-page)
13. [Live Room — Join Overlay](#13-live-room--join-overlay)
14. [Live Room — Video Player](#14-live-room--video-player)
15. [Live Room — Bottom Bar](#15-live-room--bottom-bar)
16. [Live Room — Sidebar (4 Tabs)](#16-live-room--sidebar-4-tabs)
17. [Live Room — Chat Replay System](#17-live-room--chat-replay-system)
18. [Live Room — CTA Overlays](#18-live-room--cta-overlays)
19. [End / Complete Page](#19-end--complete-page)

### Technical Architecture
20. [API Architecture](#20-api-architecture)
21. [Analytics & Tracking](#21-analytics--tracking)
22. [URL Routing & Page Types](#22-url-routing--page-types)

### Conversion & Monetization
23. [Payment / Checkout Flow](#23-payment--checkout-flow)

### Responsive Design
24. [Mobile Responsive Behavior](#24-mobile-responsive-behavior)

### Appendix
25. [Raw Data & Asset URLs](#25-raw-data--asset-urls)
26. [Remaining Investigation Items](#26-remaining-investigation-items)

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
- **Behavior:** When checked, reveals Field 5 (phone number) with slide-down animation

#### Field 5: Phone Number (Conditional — shown when SMS checkbox is checked)
- **Visibility:** Hidden by default, appears with slide-down animation when SMS checkbox is checked
- **Input type:** `tel`
- **Placeholder:** `1 (702) 123-4567`
- **Country selector:** Dropdown with flag emojis + country name + dial code
  - Default: US flag + `+1`
  - Scrollable list with all countries (e.g., `🇺🇸 United States +1`, `🇨🇳 China +86`, etc.)
  - Custom styled `<select>` or dropdown component
- **Description text below field:** `输入你手机号码，我们将在讲座开始前发送短信提醒给你`
  (Enter your phone number, we'll send you an SMS reminder before the lecture starts)

### Submit Button
- **Text:** `提交` (Submit)
- **Type:** `<input type="submit" value="提交" class="button btn">` (**NOT** `<button>` — important for replication)
- **Background:** Green `rgb(148, 192, 71)` / `#94C047`
- **Text color:** White
- **Font size:** 18px
- **Border radius:** 5px
- **Dimensions:** ~157px wide × ~61px tall (same styling as hero CTA)
- **Position:** Centered below form fields

### Form Submission Behavior
- **Method:** Full-page navigation (NOT AJAX/fetch)
- **On submit:** Browser navigates to `/t/{webinarSlug}?id={attendeeId}`
- **No client-side form validation** beyond required field checks
- **Google Ads tracking:** Fires `form_start` event on first field interaction, `form-data` event on form submission

### Error States (Invalid Submission)
- **Trigger:** Submitting the form with empty required fields
- **Error message bar:**
  - Class: `input-validation`
  - Background: `rgba(239, 72, 54, 0.15)` (translucent red)
  - Text color: `rgb(239, 72, 54)` (red)
  - Font size: 14px
  - Padding: `6px 8px`
  - Position: Appears below the invalid input field
- **Input border on error:** `rgb(255, 0, 0)`, width `1.82px`
- **Error messages (from API `validation_strings`):**
  - Empty name: `请输入姓名`
  - Empty email: `请输入你的电子邮件地址`
  - Invalid email: `必须为有效电邮地址`
  - Invalid SMS: `请输入有效手机号。美国以外的手机号请包含国际区号。`
  - Required field: `本栏为必填项。`

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

#### Landing Page Colors
| Name | Value | Usage |
|------|-------|-------|
| Primary Green | `#94C047` / `rgb(148, 192, 71)` | CTA buttons, countdown timer boxes, date card headers, checkmark icons |
| CTA Hover Green | `linear-gradient(rgb(135, 180, 57), rgb(148, 192, 71))` | CTA button hover state (0.5s transition) |
| White | `#ffffff` | Page background, button text, hero text |
| Light Gray BG | `#f6f6f6` / `rgb(246, 246, 246)` | Schedule/benefits section background |
| Modal Gray BG | `#ededed` / `rgb(237, 237, 237)` | Registration modal background |
| Dark Text | `#252525` / `rgb(37, 37, 37)` | Body text, benefit items |
| Gray Text | `#707070` / `rgb(112, 112, 112)` | Subtitles, secondary text |
| Border Gray | `#cccccc` / `rgb(204, 204, 204)` | Form input borders |
| Error Red | `rgb(239, 72, 54)` | Form validation errors |
| Error Red BG | `rgba(239, 72, 54, 0.15)` | Form validation error background |
| Hero BG | Dark blue/purple | Background image overlay |

#### Live Room Colors
| Name | Value | Usage |
|------|-------|-------|
| Live Room BG | `#1a1a2e` / dark navy | Main background |
| Stage BG | `#000000` (black) | Video player area |
| Control Bar BG | `rgba(0, 0, 0, 0.5)` | Semi-transparent video controls |
| Sidebar BG | `#1e293b` / dark slate | Sidebar panel background |
| Primary Blue | `rgb(26, 157, 208)` / `#1a9dd0` | Join button, send button, active tab indicator |
| LIVE Badge Red | `#ef4444` (red) | LIVE indicator badge |
| Host Green Badge | Green circle | Host message indicator |
| Host Name Teal | Teal/cyan | Host name color in viewers tab |
| Chat Name Colors | Various (red, green, teal, blue) | Auto-chat user names (color-coded) |
| Bottom Bar BG | Dark, semi-transparent | Bottom info bar |
| CTA Green | `#7ed321` | Mid-video CTA button (join course) |
| CTA Red | `#d0021b` | End-video CTA button (urgency/scarcity) |
| CTA Purple | `#9013fe` | End page CTA button |

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
┌─────────────────────────────────────────────────────────────────┐
│  LANDING PAGE                                                    │
│  URL: /s/{slug}                                                  │
│                                                                  │
│  Hero → Speaker Bio → Schedule/Countdown → Benefits →            │
│  Disclaimer → CTA                                                │
│                                                                  │
│  [CTA Button] ──→ Opens Registration Modal (overlay)             │
│  [Submit Form] ──→ Full-page navigation to Thank You page        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (full page navigation, not AJAX)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  THANK YOU / CONFIRMATION PAGE                                   │
│  URL: /t/{slug}?id={attendeeId}                                  │
│                                                                  │
│  Confetti header → Promotional image → Session time display →    │
│  Countdown timer (天/时/分/秒) → "Add to Calendar" button        │
│                                                                  │
│  Auto-redirects to /a/ when countdown nears zero                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (auto-redirect)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  WAITING ROOM / COUNTDOWN PAGE                                   │
│  URL: /a/{slug}?id={attendeeId}                                  │
│                                                                  │
│  Title bar → Promotional image → Session info + Countdown →      │
│  "Add to Calendar" button                                        │
│                                                                  │
│  When session starts → Shows JOIN overlay                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (user clicks "Join" button)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LIVE ROOM (same URL /a/{slug}?id={attendeeId})                  │
│                                                                  │
│  ┌──────────────────────────┬──────────────┐                     │
│  │  VIDEO PLAYER (844×437)  │  SIDEBAR     │                     │
│  │  HLS stream via blob URL │  (320px)     │                     │
│  │  No seeking allowed      │              │                     │
│  │  Fullscreen only control │  4 tabs:     │                     │
│  │                          │  ℹ Info      │                     │
│  │  CTA overlay at 62:00    │  👁 Viewers  │                     │
│  │  CTA overlay at 134:59   │  💬 Chat     │                     │
│  │                          │  ⭐ Offers   │                     │
│  ├──────────────────────────┴──────────────┤                     │
│  │  BOTTOM BAR: Title | Date | LIVE | 👁 N │                     │
│  └─────────────────────────────────────────┘                     │
│                                                                  │
│  Video duration: 8184.5 sec (~136 min)                           │
│  Chat: 81 auto-messages timed to video position                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (video ends)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  END / COMPLETE PAGE (same URL, different view)                  │
│                                                                  │
│  Header: "非常感谢观看本次讲座！"                                  │
│  Sales copy for "2K交易高手" course                               │
│  Purple CTA button → Payment link                                │
│  Social sharing (Facebook + Twitter)                             │
└─────────────────────────────────────────────────────────────────┘

ALTERNATE FLOWS:
  • Missed webinar → Redirect to: /s/poSgBg (different landing page)
  • Direct /a/ access without registration → Prompts login
  • Session not yet started → Shows countdown/waiting room view
```

---

## 11. Confirmation / Thank You Page

### URL Pattern
- **Path:** `/t/{webinarSlug}?id={attendeeId}`
- **Example:** `/t/ODod5C?id=SN9A57`
- **Page type:** `thank_you` (from API `thankYouPage.type`)

### Layout (Top to Bottom)

#### Header
- **Text:** `🎉 恭喜！你已成功锁定双风口财富讲座席位！一场可能改变你财富认知的讲座，正为你而来。`
- **Background:** Dark (matches live room theme)
- **Emoji:** Confetti 🎉 prefix
- **Font:** Large, bold, white text

#### Promotional Image
- **Position:** Left side or top of content area
- **URL:** `https://cdn.joinnow.live/uploads/1682649b-47d6-4a0e-8de7-3115204eb54e`
- **Same image as landing page** (promotional banner)
- **Content location:** `bottom` (custom content below image)

#### Session Time Display
- **Label:** `讲座时间：` (from `thankYouPage.date_label_text`)
- **Format:** Time + timezone (e.g., `11:50 中午 (Asia/Taipei)`)

#### Countdown Timer
- **Label:** `您预约的北美掘金线上免费讲座即将开始：` (from `thankYouPage.countdown_text`)
- **Timer units (Chinese):**
  - `天` (days) | `时` (hours) | `分` (minutes) | `秒` (seconds)
- **Behavior:** Counts down to the selected session start time
- **Auto-redirect:** When countdown reaches near zero, page automatically redirects to `/a/{slug}?id={attendeeId}`

#### Calendar Button
- **Text:** `添加到日历` (from `thankYouPage.calendar_button_text`)
- **Enabled:** `allow_save_to_calendar: true`
- **Behavior:** Downloads .ics calendar file or opens calendar app

#### Social Sharing
- **Facebook sharing:** Disabled (`false`)
- **Twitter sharing:** Disabled (`false`)
- **Share header text:** `让其他人也知道这个线上分享会吧！`

---

## 12. Waiting Room / Countdown Page

### URL Pattern
- **Path:** `/a/{webinarSlug}?id={attendeeId}` (same URL as live room)
- **Page type:** `countdown` (from API `countdownPage.type`)
- **Shown when:** Session has not yet started

### Layout

#### Title Bar
- **Text:** `AIC双风口机遇讲座：我是如何抓住AI时代第一个财富翻盘信号的`
- **Position:** Top of page
- **Style:** Dark background, white text

#### Promotional Image
- **URL:** `https://cdn.joinnow.live/uploads/56cfaacd-6f64-4b2e-aa4b-a1ad7fd63c42`
- **Position:** Centered in content area

#### Session Info + Countdown
- **Date label:** `你的预约：` (from `countdownPage.date_label_text`)
- **Countdown text:** `你预约的AIC双风口机遇讲座将在以下时间内开始：` (from `countdownPage.countdown_text`)
- **Timer units (Chinese):**
  - `天` (days) | `小时` (hours) | `分钟` (minutes) | `秒` (seconds)
- **Note:** Different unit labels from Thank You page (小时 vs 时, 分钟 vs 分)

#### Calendar Button
- **Text:** `添加到日历` (from `countdownPage.calendar_button_text`)

### Transition to Live Room
- When session start time is reached, the waiting room transitions to show a "Join" overlay
- Transition is client-side (no page reload) — same `/a/` URL

---

## 13. Live Room — Join Overlay

### Trigger
- Appears when the session start time has passed and the user is on the `/a/` page

### Layout
- **Background:** Black/dark, covering the full stage area
- **Centered card** with text and button

### Content
- **Status text:** `正在连接到线上讲座……` (from `viewing_strings.connectingNotice`)
  - Shown briefly as "connecting" state
- **Ready text:** `《AIC双风口机遇讲座》可以观看了，请现在加入` (from `viewing_strings.connectingReady`)
- **Join button:**
  - Text: `观看《AIC双风口机遇讲座》` (from `viewing_strings.connectButton`)
  - Background: Primary Blue `rgb(26, 157, 208)` / `#1a9dd0`
  - Class: `button button--color--primary`
  - Font: Bold, 14px, white
  - Border radius: 2px
- **Bottom bar preview:** Visible below the overlay showing:
  - Webinar title
  - Date: `二月 23, 2026`
  - LIVE badge (red)
  - Eye icon + viewer count (e.g., `2`)
  - Chat badge with unread count (e.g., `5+`)

### Behavior
- Clicking the join button dismisses the overlay and starts video playback
- The preroll video loads first (see Video Player section)

---

## 14. Live Room — Video Player

### Technical Stack
- **Player library:** ReactPlayer (`react-player` npm package)
- **Streaming:** HLS via hls.js, served through blob URLs
- **Two video elements in DOM:**
  - Video 0: Preroll video (paused after playing, `currentTime: 0`)
  - Video 1: Main webinar video (playing, duration via HLS)

### Preroll Video
- **CDN Key:** `bd4764fd-54e4-4c05-ad90-a0d9d1ce3ce9`
- **HLS URLs:**
  - Master: `https://cdn.joinnow.live/bd4764fd-54e4-4c05-ad90-a0d9d1ce3ce9/hls.m3u8`
  - 1080p: `https://cdn.joinnow.live/bd4764fd-54e4-4c05-ad90-a0d9d1ce3ce9/hls-1080p.m3u8`
- **Purpose:** Plays before the main webinar video (intro/bumper)
- **From API:** `preroll_key: "bd4764fd-54e4-4c05-ad90-a0d9d1ce3ce9"`

### Main Webinar Video
- **CDN Key:** `7324dc05-4615-4f9f-8324-b4cbddf9de7a`
- **HLS URLs:**
  - Master: `https://cdn.joinnow.live/7324dc05-4615-4f9f-8324-b4cbddf9de7a/hls.m3u8`
  - 1080p: `https://cdn.joinnow.live/7324dc05-4615-4f9f-8324-b4cbddf9de7a/hls-1080p.m3u8`
- **Duration:** 8184.5 seconds (~136 minutes 24 seconds, ~2 hours 16 minutes)
- **From API:** `video.key: "7324dc05-4615-4f9f-8324-b4cbddf9de7a"`, `video.duration: 8184.5`

### Player Dimensions
- **Stage area (full):** 1164×527px (includes sidebar)
- **Player area:** 844×437px (video viewport)
- **Control bar:** 844×58px
- **Sidebar width:** 320px

### Player Controls
- **API setting:** `video_controls: "full_screen"` — only fullscreen toggle available
- **Volume slider:** Bottom-left of control bar
- **Fullscreen button:** Bottom-right of control bar (icon)
- **NO progress bar / seek bar visible**
- **NO seeking allowed** — user cannot skip forward or backward
- **NO playback speed controls**
- **Collapse sidebar arrow:** `→|` icon at top-left of video area (toggles sidebar)

### DOM Structure
```
div.stage__player
  └─ div.player-wrapper
       └─ div.react-player__wrapper
            └─ div.react-player
                 └─ video (blob:https://...)
```

### HLS URL Pattern
```
https://cdn.joinnow.live/{video-key}/hls.m3u8         (master playlist)
https://cdn.joinnow.live/{video-key}/hls-1080p.m3u8   (1080p variant)
```

---

## 15. Live Room — Bottom Bar

### Layout
- **Width:** Full stage width (1164px)
- **Height:** ~40px
- **Background:** Dark, semi-transparent
- **Position:** Fixed at bottom of the stage area

### Content (left to right)
1. **Webinar title:** `AIC双风口机遇讲座：我是如何抓住AI时代第一个财富翻盘信号的`
   - Truncated with ellipsis if too long
   - White text, ~14px
2. **Date:** `二月 23, 2026` (formatted per `datetime_format` config)
3. **LIVE badge:**
   - Text: `LIVE`
   - Background: Red (`#ef4444`)
   - Font: Bold, white, small caps
   - Border radius: ~4px
   - Animated/pulsing effect (suggests live)
4. **Viewer count:**
   - Eye icon (👁) + number (e.g., `2`)
   - Label from API: `在线观众` (`viewing_strings.attendeeCountLabel`)
   - **Fully simulated** — `audienceReporting: "simulate_full"`
   - **Base count:** `simulatedCount: 200` (API-configured)
   - **Actual displayed count** varies (showed `2` during testing — may be calculated differently for low-traffic instances)
5. **Chat badge:** (on sidebar chat tab icon)
   - Shows unread message count (e.g., `5+`, `6+`)
   - Red/orange badge circle

---

## 16. Live Room — Sidebar (4 Tabs)

### Layout
- **Width:** 320px
- **Position:** Right side of the stage
- **Background:** Dark slate (`#1e293b` approximate)
- **Tab bar:** 4 icon-based tabs at the top

### Tab Icons (left to right)
1. **ℹ Info** — Circle-i icon
2. **👁 Viewers** — Eye icon
3. **💬 Chat** — Chat bubble icon (active by default, has unread badge)
4. **⭐ Special/Offers** — Star icon

### Tab 1: Info
- **Content:** Promotional image + description text
- **Image:** Same promotional banner used across the funnel
- **Text:** Webinar description (from `watchPage.custom_content` — DraftJS block format)
- **Layout:** Image on top, text below

### Tab 2: Viewers
- **Host section:**
  - Label: `Host`
  - Blue verified badge icon
  - Name: `Dian Li` (from API `host` field)
  - Name color: Teal/cyan
- **Online viewers section:**
  - Heading: `在线观众 (N)` (where N = viewer count)
  - User list with names and avatars
  - Each entry shows user's display name

### Tab 3: Chat (Default Active Tab)
- See [Section 17: Chat Replay System](#17-live-room--chat-replay-system) for full details
- **Chat input:**
  - Placeholder: `在此输入您的问题...` (from `viewing_strings.chatInputLabelModern`)
  - Position: Fixed at bottom of sidebar
- **Send button:**
  - Text: `发送` (from `viewing_strings.chatSubmitButtonModern`)
  - Background: `rgb(26, 157, 208)` (primary blue)
  - Text color: White
  - Font: 14px
  - Border radius: 2px
  - Padding: `10px 32px`

### Tab 4: Special / Offers
- **Content:** Empty state — `"There is nothing here"` placeholder
- **Purpose:** Can display special offers, polls, or downloadable resources
- **Note:** Content may appear dynamically during video playback, timed to CTA events

---

## 17. Live Room — Chat Replay System

### System Architecture
- **API field:** `interaction: "chat_replay"` — chat messages are pre-recorded and replayed
- **Message source:** `chat` array in the viewing-information API (81 messages total)
- **All messages have `type: "robot"`** — every message is automated, no real users

### Message Data Structure
```json
{
  "id": 123456,
  "webinar_id": "b308fcf7-...",
  "minute": 1,
  "second": 26,
  "type": "robot",
  "host": false,
  "nickname": "Alex",
  "message": "1",
  "approved": true,
  "attendee_id": null,
  "blocked": false,
  "instance_id": null
}
```

### Message Display Format
```
{nickname} {HH:MM}
{message text}
```
- **Nickname color:** Each user gets a consistent color (varies per user — red, green, blue, teal, etc.)
- **Timestamp:** Displayed as session-relative time (e.g., `11:51`, `11:52`)
- **Host messages:** Prefixed with green circle badge, displayed as `Sherry | 北美掘金顾问`

### Chat Timeline (81 messages organized by video timestamp)

#### Phase 1: Opening / Roll Call (0:00–3:00)
- **HOST Sherry** [1:15]: Welcome message — `讲座即将开始，欢迎各位朋友！...`
- **15 users** [1:22–1:45]: All type `1` (acknowledgment/roll call)
  - Names: Alex, Jamie, Jordan, Li Amy, YC, 彼得, Marry Wang, Wayen, Katherine, xue, 小何, Vince, 梁女士
- **xue** [1:58]: `老师你好` (Hello teacher)
- **Henry** [2:00]: `你好` (Hello)
- **HOST Sherry** [3:00]: Welcome to `《AIC双风口财富讲座》`, please mute microphones
- **Ryan** [3:00]: `1`
- **Sam** [3:15]: `1 你好你好`

#### Phase 2: "2K" Keyword Prompt (18:56–19:10)
- **HOST Sherry** [18:56]: Prompts audience to type `2K` if interested
- **9 users** [18:58–19:10]: Type `2k` or `2K` (peter, Mary Wang, Jordan, Henry, Li Amy, Alex, etc.)

#### Phase 3: Experience Survey — "0" or "1" (26:05–26:11)
- **6 users** type `2` as response to host prompt
  - John, peter, Jamie, Alex, Katherine, 麦克, Mary Wang, YC

#### Phase 4: First-Timer Survey (39:15–39:39)
- **HOST Sherry** [39:15]: Survey — type `0` if never traded crypto, `1` if have
- **8 users** [39:21–39:39]: Type `0` or `1` (peter, Li Amy, Jamie, Alex, 莉莉, xue, John, 小何)

#### Phase 5: "2K" Reinforcement (48:56–49:07)
- **4 users** type `2k` again (peter, Mary Wang, Jacky, xue)

#### Phase 6: "Action" + "888" Lucky Number (58:10–61:31)
- **3 users** [58:10–58:14]: Type `行动` (action)
- **6 users** [59:00–61:31]: Type `888` (lucky number — cultural signal)
  - Wayen, Marry Wang, xue, 张生, peter, YC

#### Phase 7: Q&A Period (68:00–92:00)
- **Amy** [68:00]: `有助教吗，不懂可以直接问吗` (Is there a TA? Can I ask questions?)
- **Ryan** [76:00]: `今天第一次看K线图，感觉很有趣，纯新手能学会吗` (First time seeing K-line charts)
- **Mary Wang** [79:00]: `如果成功率没达到90%怎么办？` (What if success rate doesn't reach 90%?)
- **xue** [86:11]: `老师，我好忙啊。每天只有1、2个小时，够时间学会吗` (I'm busy, 1-2 hours/day enough?)
- **小何** [86:00]: `有加入课程的朋友分享一下吗` (Can anyone who joined share?)
- **Li Amy** [86:16]: `是直播课？还是录播课？` (Live or recorded course?)
- **HOST Sherry** [90:00]: Answers — course is pre-recorded, can watch anytime, TA available
- **HOST Sherry** [90:00]: Announces limited bonus offer (repeated 3 times at 90:00, 120:00, 130:00)
- **HOST Sherry** [91:00]: Bonus details — exchange account setup, deposit/withdrawal guidance, first simulated trade
- **YC** [92:00]: `老师你好，请问有交如何在交易所上面开户吗？` (How to open exchange account?)

#### Phase 8: Final Sales Push (120:00–135:00)
- **HOST Sherry** [120:00]: Repeats limited bonus for first 20 students ($997 value)
- **HOST Sherry** [121:00]: Bonus details repeated
- **HOST Sherry** [130:00]: Repeats limited bonus again (urgency)
- **Users** [130:36–130:40]: Alex, Jeff, Jamie type `2`
- **麦克** [131:00]: `还是不太懂` (Still don't quite understand)
- **YC** [134:00]: `你好，我想加入。看不到付款链接` (I want to join, can't see payment link)
- **HOST Sherry** [134:56–135:00]: Posts payment link 3 times

### Chat Design Pattern Analysis
The 81 messages follow a deliberate sales funnel psychology:
1. **Social proof** (1-3 min): Mass "1" responses create energy/participation illusion
2. **Interest signals** (19 min): "2K" keyword creates commitment consistency
3. **Segmentation** (26, 39 min): Surveys make users self-identify (engagement technique)
4. **Desire building** (49 min): "2K" keyword reinforcement
5. **Action trigger** (58-61 min): "行动" and "888" create group momentum
6. **Objection handling** (68-92 min): Pre-scripted Q&A addresses common doubts
7. **Urgency/scarcity** (120-135 min): Limited bonus, payment links, final push

---

## 18. Live Room — CTA Overlays

### Overview
- **Total CTAs:** 2 (from API `callsToAction` array)
- **Position:** Both set to `on_video` (overlay on the video player area)
- **Content format:** DraftJS block structure with embedded BUTTON entities
- **Available for:** `prerecorded` (only shown during pre-recorded playback)

### CTA 1: Course Join (Mid-Video)

| Field | Value |
|-------|-------|
| **ID** | 78081 |
| **Name** | `加入《2K交易高手》` |
| **Appears at** | 62:00 (62 minutes into video) |
| **Duration** | 72 min 40 sec (stays visible until ~134:40) |
| **Position** | `on_video` (overlay) |
| **Display timer** | `false` |

#### Button
- **Main text:** `现在加入《2K交易高手》` (Join "2K Trading Master" now)
- **Secondary text:** `前20名加入的学员，免费获赠【一对一专属基础配置指导】增值服务` (First 20 students get free 1-on-1 setup guidance)
- **Color:** `#7ed321` (green — positive/go)
- **Text color:** `#000000` (black)
- **Size:** `large`
- **Icon:** `ShoppingCart` (left position)
- **Links to:** Payment/checkout URL (external)

### CTA 2: Urgency / Last Chance (End-Video)

| Field | Value |
|-------|-------|
| **ID** | 78082 |
| **Name** | `最后3个名额` (Last 3 seats) |
| **Appears at** | 134:59 (nearly end of 136-min video) |
| **Duration** | 90 min 40 sec (stays visible through end page) |
| **Position** | `on_video` (overlay) |
| **Display timer** | `false` |

#### Button
- **Main text:** `最后3个名额` (Last 3 seats)
- **Secondary text:** `免费获赠【一对一专属基础配置指导】增值服务` (Free 1-on-1 setup guidance bonus)
- **Color:** `#d0021b` (red — urgency/scarcity)
- **Text color:** `#000000` (black)
- **Size:** `large`
- **Icon:** `ShoppingCart` (left position)
- **Links to:** Payment/checkout URL (external)

### CTA Color Psychology
- **CTA 1 (62 min):** Green `#7ed321` — "go/join" positive signal, early in the sales pitch
- **CTA 2 (135 min):** Red `#d0021b` — "urgency/scarcity" signal, at the very end
- This green-to-red progression is a deliberate conversion optimization technique

---

## 19. End / Complete Page

### Trigger
- Shown when the video reaches the end (after 8184.5 seconds)
- Same `/a/` URL — view changes client-side
- Also shown when accessing `/a/{slug}` without `?id=` param for an expired session (no auth required)

### Configuration (from API `completePage`)
- **Type:** `complete`
- **Header:** `非常感谢观看本次讲座！` (Thank you for watching this lecture!)

### Visual Layout (Observed)

#### Header Section
- **H1 text:** `非常感谢观看本次讲座！` — white text on dark background
- **Background:** `rgb(20, 22, 26)` — near-black
- **Padding:** 40px

#### Hero Image
- **Type:** Default stock photo (woman at desk with laptop, window view)
- **Yellow banner overlay:** "THIS EVENT IS OVER" — positioned top-left
- **Banner style:** Bright yellow background, uppercase black text, angled/ribbon effect
- **Note:** This is a JoinLive default, not custom content

#### CTA Button (Purple)
- **Class:** `user-btn user-btn-large user-btn-icon-left`
- **Background color:** `rgb(144, 19, 254)` / `#9013fe` (purple — premium/exclusive feel)
- **Text color:** `#fefefe` (near-white)
- **Dimensions:** ~300px × 191px (tall button with multi-line text)
- **Border radius:** 8px
- **Padding:** 8px 32px
- **Display:** `inline-flex`
- **Icon:** Shopping cart icon (left-aligned)
- **Main text:** `这是最后的机会，特惠价加入到《2K交易高手》！`
- **Secondary text:** `为什么叫这个名字？因为它简单到令人难以置信——你只需要掌握2条黄金K线规律，就能复制我90%的超高胜率，快速蜕变为每天稳定盈利的交易高手。`
- **Links to:** `https://learn.yongmingu.com/enroll/3466565?price_id=4386209&coupon=100xe0002`

#### Sales Copy Section
- **Background:** `rgb(20, 22, 26)` — same near-black as header
- **Text color:** White
- **Padding:** 32px
- **Content height:** ~1002px (tall scrolling sales copy)
- **Content structure:** Series of `<p>` paragraphs with sales copy
- **Bold emphasis:** Key persuasion phrases wrapped in `<strong>` tags
- **Copy topics (top to bottom):**
  1. Hidden "wealth code" that takes years to master
  2. Precise escape-top signals (avoid crashes)
  3. AI-powered price trend analysis
  4. Automated stop-loss/stop-profit execution
  5. All techniques condensed into "2K Trading Master" course
  6. No coding, no insider info, no stress — just follow the system

#### Social Sharing Section
- **Background:** Lighter dark area (distinct from sales copy section)
- **Header:** `让其他人也知道这场讲座！` (bold)
- **Description:** `本场讲座的内容很有价值，也很及时。邀请你的朋友们来听，以便他们也能受益。`
- **Sharing buttons:** 2 buttons, each ~40×43px
  - Facebook (blue `f` icon) — uses `react-share__ShareButton` component
  - Twitter (blue bird icon) — uses `react-share__ShareButton` component
- **Library:** `react-share` (React sharing component library)

#### Footer
- Same as landing page footer:
  - Purchase Agreement (Refund Policy) link → `yongmingu.com/purchase-agreement`
  - Terms of Service link → `yongmingu.com/terms-of-use`
  - Address: `527 21st Street #216, Galveston, TX 77550, USA`

### Countdown (Next Session)
- **Date label:** `Scheduled for:` (English — not translated)
- **Countdown text:** `Your event will begin in:` (English — not translated)
- **Calendar button:** `Add to Calendar` (English — not translated)
- **Timer units:** `days`, `hours`, `minutes`, `seconds` (English)
- **Note:** End page countdown strings are NOT localized to Chinese (unlike other pages)

---

## 20. API Architecture

### Base URL
```
https://api.joinnow.live
```

### CDN Base URL
```
https://cdn.joinnow.live
```

### Endpoints

#### 1. Viewing Information (GET)
```
GET /webinars/{slug}/viewing-information?attendee={attendeeId}&timezone={tz}
```
- **Purpose:** Returns ALL configuration for the webinar viewing experience
- **Response:** Single massive JSON object containing:
  - Webinar metadata (title, description, type, interaction mode)
  - Video configuration (duration, CDN key, preroll key)
  - All page configs (thankYouPage, countdownPage, watchPage, completePage)
  - CTA definitions (callsToAction array)
  - Chat replay messages (chat array — 81 messages)
  - Registration schema (form fields + validation strings)
  - UI strings (viewing_strings, validation_strings)
  - Analytics config (gaNumber, tracking code)
  - Audience simulation (simulatedCount, audienceReporting)
  - Session schedule (upcoming_times)

**Key response fields:**
```json
{
  "id": "b308fcf7-2f15-44a8-9572-4afb17ff9a8c",
  "title": "AIC双风口机遇讲座：我是如何抓住AI时代第一个财富翻盘信号的",
  "interaction": "chat_replay",
  "type": "automated",
  "reset": 4,
  "replay": 72,
  "preroll_key": "bd4764fd-...",
  "video": { "duration": 8184.5, "key": "7324dc05-..." },
  "host": "Dian Li",
  "simulatedCount": 200,
  "audienceReporting": "simulate_full",
  "video_controls": "full_screen",
  "date_locale": "zh-cn",
  "gaNumber": "G-VCKHLGNES3",
  "public": false,
  "skip_public_login": true,
  "missed_webinar_redirect_url": "https://live.yongmingu.com/s/poSgBg",
  "start_date": "2021-04-24T03:00:00.000Z",
  "timezone_id": "America/Chicago",
  "datetime_format": {
    "type": "separate",
    "date_format": "LL",
    "separator": " -",
    "time_format": "h:mmA z",
    "combined_format": "llll"
  }
}
```

#### 2. Attendees Online (GET) — Polled repeatedly
```
GET /webinars/instances/{instanceId}/attendees-online
```
- **Purpose:** Returns list of currently online attendees
- **Response:**
```json
{
  "attendees": [],
  "remainingCount": 0
}
```
- **Polling interval:** Every ~30-60 seconds
- **Note:** Returns empty in practice — viewer count is fully simulated

#### 3. Attendee Events (POST) — Tracking
```
POST /webinars/{slug}/attendees/{attendeeId}/events
```
- **Purpose:** Tracks attendee behavior events (page views, clicks, video progress, etc.)
- **Frequency:** Called repeatedly during the session (every few seconds)
- **Response:** `201 Created`

### API Design Notes
- **Single-request architecture:** The viewing-information endpoint returns EVERYTHING in one call
- **No pagination:** Chat messages, CTAs, page configs all embedded in single response
- **Instance IDs:** Each scheduled session has a unique instance ID (e.g., `UF0BJF`) separate from the webinar slug
- **Attendee IDs:** Short alphanumeric codes (e.g., `SN9A57`) assigned at registration

---

## 21. Analytics & Tracking

### Google Analytics
- **3 GA4 properties configured:**
  1. `G-ZVDWFYYH06`
  2. `G-VCKHLGNES3` (primary — configured in API `gaNumber` field)
  3. `G-3R637K77HH`

### Google Ads Conversion
- **Conversion ID:** `491566409`
- **Conversion value:** `$1 USD`
- **Trigger:** Fires on the live room page (when attendee joins the webinar)

### Event Tracking
| Event | Page | Trigger |
|-------|------|---------|
| `page_view` | All pages | Page load |
| `scroll` | Landing page | User scrolls |
| `form_start` | Registration modal | First field interaction |
| `form-data` | Registration modal | Form submission |
| `click` (Webinar/joined) | Live room | Clicking the join button |
| `conversion` | Live room | Google Ads conversion fire |

### GA Page Titles
- Landing page: `Registration`
- Thank you page: `AIC双风口机遇讲座` (webinar title)
- Live room: `Live Page`

### Custom Tracking (JoinLive Platform)
- Attendee events are tracked via `POST /webinars/{slug}/attendees/{attendeeId}/events`
- Events are posted every few seconds during the live session
- Used for engagement analytics and replay detection

---

## 22. URL Routing & Page Types

### URL Structure
```
/s/{slug}                    → Landing / Registration page
/t/{slug}?id={attendeeId}   → Thank You / Confirmation page
/a/{slug}?id={attendeeId}   → Attendance page (waiting room → live room → end page)
```

### URL Components
- **`{slug}`:** Short alphanumeric webinar identifier (e.g., `ODod5C`)
- **`{attendeeId}`:** Short alphanumeric attendee identifier (e.g., `SN9A57`)
- **`{instanceId}`:** Internal session instance ID (e.g., `UF0BJF`) — used in API calls, not in URLs

### Page Type Transitions on `/a/` URL
The `/a/` URL serves 3 different views based on session state:

```
Session not started  →  Countdown/Waiting Room view
Session started      →  Join Overlay → Live Room view
Video ended          →  Complete/End Page view
```

All transitions happen client-side without URL changes.

### Route Edge Cases (Tested)

| URL Pattern | Behavior | Notes |
|-------------|----------|-------|
| `/a/{slug}?id={validId}` | Shows live room or end page (depending on video state) | Normal authenticated path |
| `/a/{slug}` (no `?id=`) | Shows end page directly (for expired sessions) | **No authentication required** — anyone can see the end page/sales copy |
| `/a/{slug}?id=INVALID_ID` | 404 page — JoinNow.Live branded | Dark background, "404" large text, no "Go Back" button |
| `/s/{validSlug}` | Landing page | Normal registration flow |
| `/s/INVALID_SLUG` | Redirects to `/error/404` | Shows JoinNow.Live 404 page with "Go Back" button → navigates to `joinnow.live` |
| `/t/{slug}?id=INVALID_ID` | 404 page — JoinNow.Live branded | Same dark 404 as `/a/` with invalid ID |
| `/s/poSgBg` | Landing page with new session schedule | This is the **missed webinar redirect** target — shows a valid webinar landing page |

### 404 Page Designs

**Type 1: `/error/404` (slug-level invalid)**
- Dark background
- Large "404" centered text
- JoinNow.Live branding visible
- **"Go Back" button** present — navigates to `joinnow.live` homepage

**Type 2: Direct 404 (invalid attendee ID)**
- Dark background
- Large "404" text
- JoinNow.Live branding
- **No "Go Back" button** — stays on the URL

### Alternative Flows
- **Missed webinar:** Redirects to `https://live.yongmingu.com/s/poSgBg` (configurable via `missed_webinar_redirect_url` in API)
- **No upcoming sessions:** Shows `目前没有线上讲座可参加，请稍晚重试。` message
- **Unregistered access to /a/:** For expired sessions, shows end page directly (no auth); for active sessions, shows login prompt
- **Viewer hours exceeded:** `viewerHoursExceeded` flag (not observed in testing)

---

## 23. Payment / Checkout Flow

### Conversion Path
```
CTA Button (on video or end page)
  → Opens new tab to learn.yongmingu.com
  → /enroll/3466565?price_id=4386209&coupon=100xe0002
```

### Checkout Page: `learn.yongmingu.com`

#### Platform
- **Domain:** `learn.yongmingu.com`
- **Branding:** "北美掘金 Yongming Universe 全球华人的财富课堂"
- **Platform:** Course hosting SaaS (likely Kajabi or similar — branded checkout)

#### Product
- **Course name:** `2K交易高手` (2K Trading Master)
- **Original price:** $16,879.00 USD (displayed as strikethrough)
- **Discount:** -$16,382.00 (coupon: `100xe0002`)
- **Final price:** **$497.00 USD**
- **Discount strategy:** Shows extreme markdown (97% off) — anchoring technique

#### Order Bump
- **Product:** 《加密币投资入门指南》(Crypto Investment Beginner's Guide)
- **Price:** $19.90 USD (add-on checkbox at checkout)
- **Position:** Shown inline in the order summary before payment

#### Payment Methods
1. **Stripe (Link)** — Credit card processing with Stripe's Link one-click checkout
2. **PayPal** — Alternative payment option

#### Social Login / Account Creation
- **Facebook** login/signup
- **Google** login/signup
- **LinkedIn** login/signup
- **Email + password** manual registration

#### Page Layout
- Left column: Product info, pricing, order bump
- Right column: Payment form (card details or PayPal)
- Mobile: Stacks to single column

### Conversion Funnel Summary
```
Landing Page (/s/) → Free registration
  → Webinar viewing (/a/) → 136-min video with sales pitch
    → CTA 1 (green, 62 min) → learn.yongmingu.com checkout
    → CTA 2 (red, 135 min) → learn.yongmingu.com checkout
    → End page CTA (purple) → learn.yongmingu.com checkout
```
All 3 CTA buttons lead to the same checkout URL with the same coupon code.

---

## 24. Mobile Responsive Behavior

### Breakpoint Testing Results
Tested at 3 viewports: 375px (iPhone), 768px (tablet), and 1280px (desktop).

### Landing Page — Mobile (375px)

#### Layout Changes
- **Single column:** All sections stack vertically, no side-by-side content
- **Hero banner:** Full-width, reduced height (~300px vs ~441px desktop)
- **Heading font size:** Reduced from 55px to ~28-32px (responsive scaling)
- **Subheading (限时公开内容):** Reduced from 24px proportionally
- **CTA button (观看讲座):** Full-width within padding, larger touch target
- **Speaker avatar:** Centered, reduced to ~80px diameter
- **Speaker bio text:** Full-width paragraph, reduced font size

#### Session Schedule Cards
- **Layout:** Stacked vertically (one per row) instead of any grid
- **Date badges:** Left-aligned with date text to the right
- **Countdown timer:** 4 boxes in a row, slightly reduced box size
- **Timer labels:** DAYS / HOURS / MINUTES / SECONDS (English, same as desktop)

#### Benefits List
- **Checkmarks + text:** Full-width items, stacked vertically
- **Green checkmark icons:** Same size as desktop

#### Footer Section
- **Urgency section:** Warning icon + text centered
- **CTA button (锁定名额):** Full-width centered
- **Legal links:** Wrapped to multiple lines
- **Address text:** Wrapped, centered

### Registration Modal — Mobile (375px)

#### Modal Behavior
- **Takes full screen width** (minus small margin/padding)
- **Close button (×):** Top-right corner, accessible
- **Scrollable:** Content extends below fold — user scrolls within modal

#### Form Layout
- **All fields full-width:** Name, email, session dropdown all stretch to container width
- **Session time dropdown:** Full-width `<select>`, text size readable
- **SMS checkbox + phone field:** Stacks below, full-width when revealed
- **Submit button (提交):** Centered, green, full-width
- **Privacy notice (🔒):** Below submit, wraps to multiple lines

#### Below-Modal Content (visible on scroll)
- Motivational heading "未来的你，会感谢今天的决定" — visible below form
- Session cards, countdown, benefits all render below the modal scroll area

### End Page — Mobile (375px)

#### Layout
- **H1 heading:** `非常感谢观看本次讲座！` — large white text, centered, wraps to 2-3 lines
- **Hero image:** Full-width, "THIS EVENT IS OVER" yellow banner scales proportionally
- **Purple CTA button:** Full-width within container padding, text wraps within button
- **Sales copy paragraphs:** Full-width, white text on dark background, generous line spacing
- **Bold text:** Remains bold, breaks at container edge
- **Social sharing buttons:** Centered, Facebook + Twitter icons side by side
- **Footer links:** Wrap to multiple lines

### Tablet (768px) Behavior
- **Same single-column layout** as mobile — no two-column grid at 768px
- **Increased padding** compared to 375px
- **Larger text sizes** — heading more prominent than mobile but smaller than desktop
- **Session cards:** Still vertically stacked, more horizontal space within each card
- **End page:** More breathing room around CTA and sales copy, but still single column
- **Registration modal:** Wider but still vertically stacked fields

### Desktop (1280px) — Reference
- **Landing page:** Single column centered (max-width container)
- **Live room:** Two-column layout — video (left, ~844px) + sidebar (right, ~320px)
- **End page:** Single column, centered content, wider than mobile

### Key Responsive Design Patterns
1. **No CSS grid breakpoints observed** — mobile-first design, single column throughout
2. **Font scaling:** Headings reduce from 55px → ~28px (roughly 50% reduction)
3. **Image scaling:** Background images use `cover` — automatically scale and crop
4. **Touch targets:** CTA buttons expand to full-width on mobile for easier tapping
5. **Modal behavior:** Registration modal becomes full-screen overlay on mobile
6. **Video player:** Not tested at mobile (end page shown instead) — but live room likely stacks video above sidebar chat at mobile widths

---

## 25. Raw Data & Asset URLs

### CDN Asset URLs
| Asset | URL |
|-------|-----|
| Hero background | `https://cdn.joinnow.live/uploads/561f63a8-33ea-491e-9b64-9f84211c0c54` |
| Speaker avatar | `https://cdn.joinnow.live/uploads/34e80de7-c966-4faa-b41b-c2b494409dd2` |
| Thank You page image | `https://cdn.joinnow.live/uploads/1682649b-47d6-4a0e-8de7-3115204eb54e` |
| Countdown page image | `https://cdn.joinnow.live/uploads/56cfaacd-6f64-4b2e-aa4b-a1ad7fd63c42` |
| Preroll video (HLS) | `https://cdn.joinnow.live/bd4764fd-54e4-4c05-ad90-a0d9d1ce3ce9/hls.m3u8` |
| Main video (HLS) | `https://cdn.joinnow.live/7324dc05-4615-4f9f-8324-b4cbddf9de7a/hls.m3u8` |
| Platform CDN base | `cdn.joinnow.live` |
| API base | `api.joinnow.live` |

### Session Time Values (ISO 8601)
```json
[
  "2026-02-23T04:10:00.000Z",
  "2026-02-23T13:00:00.000Z",
  "2026-02-24T00:00:00.000Z",
  "2026-02-24T13:00:00.000Z"
]
```

### Registration Form Schema (from API)
```json
{
  "name": "registration-form",
  "fields": [
    { "type": "Name", "label": "姓名", "name": "name", "required": true, "useSeparateFields": false },
    { "type": "Email", "label": "电子邮箱", "name": "email", "required": true },
    { "type": "StartTime", "label": "选择一个时间", "name": "start_time", "required": true,
      "wywnOptionText": "现在观看昨天的讲座回放",
      "noUpcomingTimesText": "没有即将开始的讲座" },
    { "type": "GdprConsent", "label": "GDPR Consent", "name": "gdpr_consent", "required": false, "disabled": true },
    { "type": "SmsNumber", "label": "短信号码", "name": "sms_number",
      "optinText": "我想要在讲座开始前收到短信提醒 (可选，但强烈建议使用)",
      "placeholder": "现在这里输入手机号......" }
  ]
}
```

### Viewing Strings (Configurable UI Text)
```json
{
  "chatLabel": "讲座对话区",
  "pageTitle": "AIC双风口机遇讲座",
  "loginButton": "登录",
  "connectButton": "观看《AIC双风口机遇讲座》",
  "chatInputLabel": "在下方输入你的信息",
  "connectingReady": "《AIC双风口机遇讲座》可以观看了，请现在加入",
  "chatSubmitButton": "提交",
  "connectingNotice": "正在连接到线上讲座……",
  "pollSubmitButton": "提交",
  "attendeeCountLabel": "在线观众",
  "pollSubmittedNotice": "你的回答已提交。",
  "chatInputLabelModern": "在此输入您的问题...",
  "chatSubmitButtonModern": "发送",
  "publicUpcomingTimeLabel": "选择线上讲座的时间"
}
```

### Validation Strings (Error Messages)
```json
{
  "emptyName": "请输入姓名",
  "emptyEmail": "请输入你的电子邮件地址",
  "invalidSms": "请输入有效手机号。美国以外的手机号请包含国际区号。",
  "invalidEmail": "必须为有效电邮地址",
  "noUpcomingTimes": "目前没有线上讲座可参加，请稍晚重试。",
  "eventUnavailable": "请刷新页面，重新进入《AIC双风口机遇讲座》。",
  "noQuestionEntered": "请输入一个问题",
  "emailNotRegistered": "你的电子邮箱没有登记参加本次讲座。",
  "requiredFieldEmpty": "本栏为必填项。"
}
```

### HTML Structure — Landing Page (Simplified)
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
    <h2>讲座中你将会获得什么：</h2>
    <ul><li><!-- checkmark icon + text --></li> <!-- ×6 --></ul>
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

  <!-- Registration Modal (hidden by default) -->
  <div style="z-index: 2147483646; position: fixed">
    <button>Close</button>
    <h2>现在预订你的席位</h2>
    <p>注册完成后，即可观看讲座。</p>
    <form>
      <input name="name" placeholder="姓名 *" />
      <input type="text" name="email" placeholder="电子邮箱 *" />
      <label>选择一个时间</label>
      <select name="start_time"><!-- 4 session options --></select>
      <label><input type="checkbox" /> 我想要在讲座开始前收到短信提醒</label>
      <!-- Phone field (hidden, shown when checkbox checked) -->
      <input type="tel" name="sms_number" placeholder="1 (702) 123-4567" />
      <input type="submit" value="提交" class="button btn" />
    </form>
    <p>🔒 注意：我们不会给你发送垃圾信息...</p>
  </div>
  <h3>未来的你，会感谢今天的决定</h3>
</body>
```

### HTML Structure — Live Room (Simplified)
```html
<div class="stage"> <!-- Full stage wrapper -->
  <div class="stage__player"> <!-- Video area (844×437) -->
    <div class="player-wrapper">
      <div class="react-player__wrapper">
        <div class="react-player">
          <video src="blob:https://..."></video>
        </div>
      </div>
    </div>
    <!-- CTA overlay (positioned on_video, shown at time_mark) -->
    <div class="cta-overlay">
      <p>现在加入《2K交易高手》</p>
      <button style="background: #7ed321">
        <span class="icon">🛒</span>
        <span class="main-text">现在加入《2K交易高手》</span>
        <span class="secondary-text">前20名加入的学员...</span>
      </button>
    </div>
    <!-- Control bar -->
    <div class="control-bar" style="background: rgba(0,0,0,0.5); height: 58px">
      <div class="volume-slider"><!-- Volume --></div>
      <div class="fullscreen-btn"><!-- ⛶ --></div>
    </div>
  </div>

  <div class="sidebar" style="width: 320px"> <!-- Sidebar -->
    <div class="tab-bar">
      <button>ℹ</button> <!-- Info -->
      <button>👁</button> <!-- Viewers -->
      <button class="active">💬</button> <!-- Chat -->
      <button>⭐</button> <!-- Offers -->
    </div>
    <div class="tab-content">
      <!-- Chat messages -->
      <div class="chat-message">
        <span class="nickname" style="color: red">Alex</span>
        <span class="time">11:51</span>
        <div class="message-text">1</div>
      </div>
      <!-- ... more messages -->
    </div>
    <div class="chat-input">
      <input placeholder="在此输入您的问题..." />
      <button style="background: #1a9dd0">发送</button>
    </div>
  </div>

  <div class="bottom-bar"> <!-- Bottom info bar -->
    <span class="title">AIC双风口机遇讲座：我是如何抓住AI时代...</span>
    <span class="date">二月 23, 2026</span>
    <span class="live-badge" style="background: #ef4444">LIVE</span>
    <span class="viewers">👁 2</span>
  </div>
</div>
```

---

## 26. Remaining Investigation Items

### Captured in This Analysis:
- [x] Post-registration flow (confirmation page, waiting room, live room)
- [x] Video player (HLS, dimensions, controls, seeking behavior)
- [x] Chat replay system (81 timed messages, full timeline)
- [x] CTA overlays (2 CTAs with timing, styling, button content)
- [x] Viewer count (simulated, API config)
- [x] End page (sales copy, CTA button, social sharing) — **including visual CSS details**
- [x] SMS checkbox → phone number field behavior
- [x] Error states (validation messages, styling)
- [x] CTA button hover state (gradient transition)
- [x] API endpoints and data structure
- [x] Analytics tracking (GA4 × 3, Google Ads conversion)
- [x] Payment/checkout flow (learn.yongmingu.com — $497, Stripe + PayPal)
- [x] Mobile responsive behavior (375px, 768px, 1280px — landing, modal, end page)
- [x] URL route edge cases (invalid slugs, invalid IDs, expired sessions, 404 pages)
- [x] Social sharing (react-share — Facebook + Twitter)
- [x] End page visual layout (dark background, stock image, yellow "EVENT IS OVER" banner)

### Still Not Captured:
- [ ] **Email confirmation:** Content/design of post-registration email
- [ ] **Preroll video content:** What plays before the main webinar
- [ ] **Cookie/localStorage behavior:** Session persistence mechanism
- [ ] **Exact video overlay rendering:** CTA overlay CSS positioning and animation
- [ ] **Chat scroll behavior:** Auto-scroll, manual scroll pause
- [ ] **Real-time user messages:** How user-typed messages appear in the chat alongside replayed messages
- [ ] **Calendar .ics file format:** Exact content of calendar download
- [ ] **Framework/bundle analysis:** React version, build tool, bundle size
- [ ] **Live room mobile layout:** How video + sidebar stack at mobile widths (not tested — session expired)
