# Comprehensive Ad Platform Guide (2025-2026)

> Compiled March 2026. All data reflects the latest available benchmarks and platform features.

---

## Table of Contents

- [Part 1: TikTok Ads (Primary Focus)](#part-1-tiktok-ads)
  - [1.1 Platform Overview](#11-platform-overview)
  - [1.2 Campaign Structure](#12-campaign-structure)
  - [1.3 Audience Targeting](#13-audience-targeting)
  - [1.4 Creative Best Practices](#14-creative-best-practices)
  - [1.5 TikTok Creative Center](#15-tiktok-creative-center)
  - [1.6 Smart+ Performance Campaigns](#16-smart-performance-campaigns)
  - [1.7 TikTok Shop Ads](#17-tiktok-shop-ads)
  - [1.8 Bidding and Budget](#18-bidding-and-budget)
  - [1.9 Conversion Tracking](#19-conversion-tracking)
  - [1.10 Scaling Strategies](#110-scaling-strategies)
  - [1.11 Cost Benchmarks](#111-cost-benchmarks)
- [Part 2: Other Platforms](#part-2-other-platforms)
  - [2.1 LinkedIn Ads](#21-linkedin-ads)
  - [2.2 Twitter/X Ads](#22-twitterx-ads)
  - [2.3 Pinterest Ads](#23-pinterest-ads)
  - [2.4 YouTube Ads](#24-youtube-ads)
  - [2.5 Programmatic / DSP](#25-programmatic--dsp)
- [Part 3: Cross-Platform Strategy](#part-3-cross-platform-strategy)
  - [3.1 Multi-Channel Attribution](#31-multi-channel-attribution)
  - [3.2 Budget Allocation Across Platforms](#32-budget-allocation-across-platforms)
  - [3.3 Creative Adaptation](#33-creative-adaptation)
  - [3.4 Funnel Strategy](#34-funnel-strategy)

---

# Part 1: TikTok Ads

## 1.1 Platform Overview

TikTok has matured from an experimental channel to an essential platform for consumer brands. With CPMs significantly lower than Meta ($3.20-$10.00 vs. Meta's $14.91 average), it offers one of the most cost-efficient ways to reach new audiences, particularly younger demographics.

### Campaign Objectives (Three-Tier Funnel)

| Funnel Stage | Objective | Goal |
|---|---|---|
| **Awareness** | Reach | Maximize brand exposure at the top of funnel |
| **Consideration** | Traffic, App Installs, Video Views | Drive mid-funnel engagement and interest |
| **Conversion** | Conversions (downloads, sign-ups, purchases) | Bottom-funnel actions on your site or app |

### Ad Formats

| Format | Description | Duration | Best For |
|---|---|---|---|
| **In-Feed Ads** | Standard ads in the For You Page feed | Up to 60s (15-30s recommended) | General performance campaigns |
| **TopView** | Full-screen, sound-on video on app open | Up to 60s | Premium brand awareness |
| **Brand Takeover** | Full-screen ad on app open, one advertiser per category per day | 3-5s | Exclusive high-impact awareness |
| **Branded Hashtag Challenge** | Sponsored hashtag with landing page + featured videos | 6-day standard campaigns | Viral engagement, UGC generation |
| **Branded Effects** | Custom interactive filters, stickers, AR effects | Up to 10 days | Interactive brand engagement |
| **Spark Ads** | Amplify existing organic content (yours or a creator's) | Varies | Authentic feel, highest engagement |
| **Carousel Ads** | 2-35 swipeable images | N/A | Multi-product showcase, storytelling |
| **Playable Ads** | Interactive videos users can swipe/tap through | Varies | App installs, gamified experiences |

### Spark Ads (Deep Dive)

Spark Ads deserve special attention as they consistently outperform standard ads:

- **How they work:** Brands amplify existing organic posts (their own or creator content with permission). The original account's username, profile image, caption, and sound all carry over. Users can still like, share, comment, Duet, and Stitch.
- **Performance lift:** 30% higher completion rates and 142% higher engagement than standard In-Feed ads. Typically 20-40% better performance because content has already proven itself organically.
- **Cost advantage:** 30-40% lower CPC compared to standard dark-post ads.
- **Best use cases:** UGC campaigns, influencer partnerships, promoting your own high-performing organic posts.

---

## 1.2 Campaign Structure

TikTok uses a **three-level hierarchy**:

```
Campaign (Objective)
  |
  +-- Ad Group (Targeting, Budget, Schedule, Placement)
  |     |
  |     +-- Ad (Video, Text, CTA)
  |     +-- Ad (Video, Text, CTA)
  |     +-- Ad ...
  |
  +-- Ad Group
  |     +-- Ad ...
  |
  +-- Ad Group ...
```

### Level-by-Level Breakdown

**Campaign Level**
- Set one advertising objective (e.g., Conversions, Traffic)
- Contains one or more ad groups
- Campaign Budget Optimization (CBO) can be enabled here to distribute budget across ad groups automatically

**Ad Group Level**
- This is where the detailed work happens:
  - Placements (TikTok feed, Pangle, etc.)
  - Target audience (demographics, interests, behaviors, custom audiences)
  - Budget and schedule (daily or lifetime)
  - Bidding method and delivery type
- Each campaign can have multiple ad groups with different targeting

**Ad Level**
- The actual creative: video, ad text, CTA button
- The content the user sees

### Structure Best Practices

- Use **3-5 ad groups per campaign**
- Use **3-5 creatives per ad group**
- This gives TikTok's algorithm enough data to learn and optimize effectively

### Budget Options

| Budget Type | Level | Minimum | Notes |
|---|---|---|---|
| **Daily Budget** | Campaign | $50 USD | Spend limit per day |
| **Lifetime Budget** | Campaign | $50 USD | Total spend over campaign lifetime |
| **Daily Budget** | Ad Group | $20 USD | Per ad group per day |
| **Lifetime Budget** | Ad Group | $20 USD x scheduled days | Calculated automatically |

**Important:** You cannot switch between daily and lifetime budgets after a campaign or ad group goes live. Choose your strategy before launching.

**Campaign Budget Optimization (CBO):** Sets a unified budget at the campaign level and automatically distributes spend across ad groups to maximize overall conversions, rather than optimizing each ad group independently.

---

## 1.3 Audience Targeting

### Demographic Targeting

| Dimension | Options |
|---|---|
| **Location** | Country, state/region, city, DMA |
| **Age** | 13-17, 18-24, 25-34, 35-44, 45-54, 55+ |
| **Gender** | Male, Female, All |
| **Language** | Filter by user language settings |

### Interest Targeting

Interest targeting finds people based on their **long-term** interaction patterns with content on TikTok. Categories span dozens of verticals (food, fashion, technology, finance, gaming, etc.).

### Behavior Targeting

Behavior targeting reaches people based on **recent** in-app actions:

- **Video behaviors:** Watching, liking, commenting, sharing videos by category
- **Creator behaviors:** Following or viewing specific types of creators
- **Hashtag interactions:** Engagement with specific hashtag categories

### Custom Audiences

Custom Audiences let you target known or previously engaged users. Sources include:

| Source | Description |
|---|---|
| **Customer File** | Upload hashed email/phone lists |
| **Website Traffic** | TikTok Pixel-based website visitors |
| **App Activity** | Users who took actions in your app |
| **Engagement** | Users who interacted with your TikTok content |
| **Lead Generation** | Users who submitted lead forms |
| **Partner Audiences** | Via audience activation partners |

**Minimum size:** 1,000 matched users required to use a Custom Audience in an ad group.

**Use cases:**
- Retarget leads or past engagers toward conversion
- Exclude recent customers to avoid wasted spend
- Create seed audiences for Lookalike expansion

### Lookalike Audiences

Built from Custom Audiences, Lookalike Audiences find new users with similar traits:

| Lookalike Size | Match Precision | Reach |
|---|---|---|
| **Narrow** (1-2%) | Most precise | Smallest audience |
| **Balanced** (3-5%) | Moderate | Medium audience |
| **Broad** (6-10%) | Least precise | Largest audience |

### Smart Targeting

When using Audiences, Interests, or Behavior targeting, **enable Smart Targeting** for best results. Smart Targeting:
- Expands beyond set parameters when it identifies high-potential users
- Reduces Cost Per Acquisition (CPA)
- Reduces ad fatigue
- Finds users most likely to complete your objective

---

## 1.4 Creative Best Practices

### The Hook (First 3-6 Seconds)

**90% of ad recall impact is captured within the first six seconds.** This is the single most important element.

**Hook strategies:**
- **Problem hook:** "Stop using [common product] -- here's why..."
- **Surprise/curiosity:** An unexpected visual or statement
- **Pattern interrupt:** Unusual camera angle, sudden movement, or visual contrast
- **Question hook:** Ask something that compels the viewer to stay for the answer
- **Scream/emotion:** Start with raw emotional energy

**Pro tip:** Keep the body of the video but create 5-10 variations with different first-3-second hooks. This is the highest-ROI testing approach.

### Native Content & UGC

**If your ad looks like a TV commercial, users will scroll past it.**

TikTok users engage most with content that feels authentic to the platform:
- UGC-style formats: real people using your product
- Testimonials, unboxings, before/after, problem-solution narratives
- DIY aesthetics, trending sounds, native text overlays
- Minimal branding in the creative itself

**Performance data:** UGC + Spark/whitelist ads deliver **40-60% better CPA/ROAS** than brand-only ads. Ads repurposed from Facebook/TV see **50-70% lower engagement** than TikTok-native content.

### Video Production & Editing

- **Switch visuals every 2-3 seconds** (camera angles, scenes, text overlays) to maintain attention
- **Shoot vertical (9:16)** -- full screen, no black bars
- **Use on-screen text** that reinforces your audio hook
- **Add subtitles** -- many users browse with sound off initially
- **Use trending sounds** when relevant (check Creative Center for what's hot)

### Optimal Video Length

- **9-15 seconds** for engagement-optimized campaigns
- **15-30 seconds** for performance/conversion campaigns (recommended sweet spot)
- Up to 60 seconds supported, but front-load the value

### Call-to-Action

- Action-oriented CTAs ("Shop now," "Learn more," "Get yours") increase conversion rates by **18%+**
- Place CTA both in the video and as a button overlay

### Creative Volume & Refresh Cadence

- Test **10-20 creative variations** per campaign
- Refresh content **every 2-3 weeks** (TikTok fatigue is faster than other platforms)
- Update ad visuals **every 7-10 days** to combat ad fatigue
- Top brands generate **20-50 new variations per month**

---

## 1.5 TikTok Creative Center

The [TikTok Creative Center](https://ads.tiktok.com/business/creativecenter) is a free tool available to anyone with a TikTok account. It is essential for competitive research, trend discovery, and creative inspiration.

### Main Sections

#### 1. Trends

| Tab | What It Shows | How to Use |
|---|---|---|
| **Hashtags** | Trending hashtags by industry, timeframe (7-30 days) | Search/filter by industry; click "See Analytics" for trendlines, related videos, audience insights, regional popularity |
| **Songs** | Popular and breakout music tracks | Filter by "Approved for business use"; view trendlines and audience data |
| **Creators** | Trending creator accounts | Identify potential Spark Ads or collaboration partners |
| **Videos** | Top-performing video content | Study formats, hooks, and storytelling approaches that work |

#### 2. Keyword Insights

Navigate to **Creative Center > Trends > Keywords**. Type in a product, service, or industry term to view:
- Most popular keywords audiences engage with
- Trending search terms
- Regional keyword variations

#### 3. Inspiration (Ad Library)

Browse high-performing ads by:
- Industry vertical
- Campaign objective
- Region/country
- Ad format
- Time period

#### 4. Creative Tools

- **Video editor** for basic ad creation
- **Template library** with ready-to-use formats
- **AI-powered creative generation** tools

### Best Practices for Using Creative Center

1. Use it to **spark ideas, not to mimic** -- audiences can spot copied formats
2. **Filter by region** if marketing in multiple locations (trends vary widely by country)
3. Check **weekly** for new trending sounds and hashtags
4. Study the **top-performing ads** in your industry to understand what hooks and formats win
5. Track **keyword insights** to align ad copy with what your audience is searching

---

## 1.6 Smart+ Performance Campaigns

Smart+ is TikTok's AI-powered automation system that has undergone significant upgrades in 2025-2026.

### What Smart+ Does

Smart+ finds the right people, learns from engagement, and delivers what works to maximize performance. It automates:
- **Targeting:** AI determines the best audience
- **Budget allocation:** Automatic distribution across ad groups
- **Creative optimization:** Selects and serves top-performing creative combinations
- **Bidding:** Optimizes bids in real-time

### 2026 Upgraded Experience

The unified manual/Smart+ campaign flow now offers **three levels of automation:**

| Mode | What's Automated | Best For |
|---|---|---|
| **Full Automation** | Targeting, budget, creative, bidding | Brands spending < $10k/month, fast setup |
| **Partial Automation** | Choose which modules to automate | Experienced advertisers wanting control over specific elements |
| **Fully Manual** | Nothing automated | Expert advertisers with specific targeting needs |

### Module-by-Module Control

You can now customize automation **per module:**
- Targeting: automated or manual
- Budget: automated or manual
- Creative: automated or manual

This addresses the previous main complaint that Smart+ was "all or nothing."

### Creative Automation Tools

- **Recommended Creatives:** AI generates new creative assets
- **Automatic Enhancements:** Optimizes existing assets with resizing, quality boosts, translation, dubbing
- **Creative Preview:** Preview every possible creative combination before it goes live

### Campaign Structure Limits

| Element | Maximum |
|---|---|
| Ad groups per campaign | 30 |
| Asset groups per ad group | 30 |
| Creatives per asset group | 50 |

### Performance Data

Over **60% of brands** saw at least a **10% ROI lift** using Smart+.

### Efficiency Features (January 2026 Update)

- Campaign duplication
- Draft mode
- Automated rules
- Bulk editing

---

## 1.7 TikTok Shop Ads

TikTok Shop has become a serious ecommerce channel, with sales forecast to exceed **$20 billion in 2026** and projected to surpass $30 billion by 2028.

### Ad Formats for Shop

| Format | Description | Best For |
|---|---|---|
| **Video Shopping Ads (VSA)** | Catalog card overlay on video; users browse without leaving | Direct product sales |
| **LIVE Shopping Ads** | Promote live shopping streams | Real-time product demos |
| **Product Shopping Ads** | Product-level ads from your catalog | Specific product promotion |
| **Shop Ads** | General Shop awareness | Store-level promotion |

### Key Features

**Smart+ with Catalog Ads:** Delivers personalized product recommendations using AI, optimizing which products are shown to which users.

**GMV Max with Affiliate Creatives:** Sellers can use authorized creator content in paid campaigns, combining authentic UGC with targeted ad reach.

**Fulfilled by TikTok (FBT):**
- TikTok handles storage, packing, and shipping from US warehouses
- Products using FBT get a **ranking boost** in search results
- Qualify for **next-day delivery** badges

### Platform Integrations

TikTok Shop supports:
- Bulk CSV catalog uploads
- Direct integrations with **Shopify, WooCommerce, BigCommerce, Salesforce Commerce Cloud**
- Automatic inventory synchronization

---

## 1.8 Bidding and Budget

### Bidding Strategies

TikTok offers **two primary bidding strategies:**

| Strategy | How It Works | Best For |
|---|---|---|
| **Cost Cap** | You set a target CPA; TikTok optimizes to stay as close to that target as possible | When you have a specific CPA target and need cost control |
| **Maximum Delivery** | TikTok maximizes conversions within your budget, regardless of individual CPA | When you want the most conversions possible and CPA is flexible |

### Bidding Methods

| Method | Description | Charged On |
|---|---|---|
| **CPM** | Cost per thousand impressions | Impressions |
| **oCPM** | Optimized CPM -- targets people likely to take action | Impressions (optimized for actions) |
| **CPC** | Cost per click | Clicks |
| **CPA** | Cost per action (available in some objectives) | Conversions |

### Budget-to-Bid Ratio

**Set your budget at minimum 10x your CPA bid.** This is critical for giving TikTok enough room to optimize.

Example: If target CPA is $20, minimum daily budget should be $200.

### Learning Phase

The **learning phase** requires approximately **50 conversions within 7 days** to complete. Until this threshold is met, performance will be volatile. Never scale a campaign before it exits the learning phase.

### Bidding Best Practices

1. **Start with Maximum Delivery** to test new ideas aggressively
2. **Switch to Cost Cap** to scale your winners cautiously
3. Set initial bid at **1.2x your target CPA** (e.g., if target is $20, bid $24)
4. Do not change bids by more than **20%** at a time
5. Allow **48-72 hours** after any bid change before evaluating results

---

## 1.9 Conversion Tracking

### Recommended Setup

TikTok recommends using **both Pixel and Events API together** with Event Deduplication for all web conversion tracking.

```
Browser-Side                    Server-Side
+------------------+           +------------------+
|  TikTok Pixel    |           |  Events API      |
|  (JavaScript)    |           |  (Server-to-      |
|                  |           |   Server)         |
+--------+---------+           +--------+---------+
         |                              |
         +---------- Dedup ------------+
                      |
              TikTok Ads Manager
```

### TikTok Pixel

**What it does:** JavaScript code snippet placed on your website that captures browser-side user events in real time.

**Setup steps:**
1. Log in to TikTok Ads Manager
2. Navigate to **Tools > Events Manager**
3. Select **Connect Data Source > Web**
4. Enter website URL
5. Choose **Manual Setup** or partner integration
6. Create pixel and name it clearly
7. Copy the Pixel Base Code and paste before `</head>` tag

### Events API (Server-Side)

**What it does:** Server-to-server integration that captures conversion events even when browser-side tracking fails (ad blockers, cookie restrictions, connectivity issues).

**Setup requirements:**
- Access Token and Pixel ID
- Server-side implementation or GTM server container
- Test Event Code for debugging during setup

### Performance Lift from Dual Setup

When Pixel + Events API are used together:
- **13% increase** in event capture
- **15% drop** in cost per action
- Up to **60% more conversions tracked**

### Standard Events

TikTok defines standard events with predefined names for consistent tracking:

| Event | Description |
|---|---|
| `ViewContent` | User views a product/content page |
| `AddToCart` | User adds item to cart |
| `InitiateCheckout` | User begins checkout |
| `CompletePayment` | Purchase completed |
| `Subscribe` | User subscribes |
| `SubmitForm` | Form submission |
| `Contact` | User contacts business |
| `Download` | App/file downloaded |
| `CompleteRegistration` | User registers an account |

---

## 1.10 Scaling Strategies

### Vertical Scaling (Increase Budget on Winners)

**The 20% Rule:** Only increase daily budgets by **20% every 24 hours**. Larger jumps shock the algorithm and ruin CPA.

**Prerequisites before scaling:**
- Campaign has **exited the Learning Phase** (50 conversions in 7 days)
- Stable CPA for at least 3-5 consecutive days
- ROAS meets or exceeds target

**Intraday scaling:** On exceptionally high-performance days, you can increase budgets during the day to maximize profit, but **always reset to baseline at midnight**.

### Horizontal Scaling (Expand to New Audiences)

- Duplicate winning ad groups with different targeting
- Test new interest categories and behavior segments
- Expand Lookalike audiences (Narrow -> Balanced -> Broad)
- Test new regions or demographics

### Creative Scaling

**This is the #1 lever for TikTok growth.**

- Maintain a pipeline of **10-20 creative variations** at all times
- Refresh hooks every 7-10 days
- Jump on trending sounds before they peak (use Creative Center)
- Use the **hook swap method:** Keep the video body but create multiple opening hooks
- UGC + Spark/whitelist consistently delivers the best CPA at scale

### Budget Scaling Strategy

1. **Cost Cap bidding** when scaling aggressively -- ensures TikTok only spends on profitable conversions
2. **Increase budgets gradually** (20% increments)
3. **Monitor CPA daily** during scaling -- if CPA rises >20% above target, pause and reassess
4. **Don't scale everything at once** -- scale one variable at a time (budget OR audience OR creative)

### What NOT to Do

- Do not increase budget by more than 20% in a single day
- Do not scale campaigns still in the learning phase
- Do not pause and restart campaigns (resets the algorithm)
- Do not copy-paste creative from other platforms without adaptation

---

## 1.11 Cost Benchmarks (2025-2026)

### Average Costs

| Metric | Range | Average |
|---|---|---|
| **CPM** (cost per 1,000 impressions) | $0.50 - $10.00 | $6.21 - $9.16 |
| **CPC** (cost per click) | $0.02 - $2.00 | $0.10 - $0.30 (In-Feed) |
| **In-Feed Ad CPM** | $8.00 - $15.00 | ~$10.00 |
| **Conversion Rate** | 1% - 2% | ~1.5% (improves with retargeting) |

### Cost Comparison vs. Other Platforms

| Platform | Average CPM |
|---|---|
| **TikTok** | $3.20 - $10.00 |
| **Meta (Facebook)** | $14.91 |
| **YouTube** | $6.00 - $15.00 |
| **LinkedIn** | $30.00 - $50.00 |

### Seasonal Variations

CPMs peak during high-demand periods:
- **Black Friday / Cyber Monday:** CPMs rise to $6.26-$6.28+
- **Q4 generally:** Higher competition across all platforms
- **Year-over-year:** TikTok ad costs rose **12.28%** YoY driven by increased advertiser competition

### Cost by Ad Format

| Format | Approximate Cost |
|---|---|
| Spark Ads | 30-40% lower CPC than standard ads |
| In-Feed Ads | $8-$15 CPM |
| TopView | Premium pricing (negotiated) |
| Brand Takeover | $50,000+ per day (exclusive) |
| Branded Hashtag Challenge | $150,000+ for 6-day campaign |

---

# Part 2: Other Platforms

## 2.1 LinkedIn Ads

### Platform Positioning

LinkedIn is the **only platform that can predictably generate enterprise B2B leads at scale**. It has solidified this position through unmatched professional targeting data.

### Ad Formats

| Format | Description | Best For |
|---|---|---|
| **Single Image Ads** | Sponsored content in feed | General awareness and traffic |
| **Carousel Ads** | 2-10 swipeable cards | Multi-product/multi-point storytelling |
| **Video Ads** | Autoplay, up to 30 min (15s recommended) | Highest engagement format |
| **Document Ads** | Ungated content documents in feed | Thought leadership, lead gen without form friction |
| **Message Ads** | Direct InMail with single CTA | Personalized lead gen, event promotion |
| **Conversation Ads** | Multi-CTA InMail with branching paths | Interactive lead engagement |
| **Lead Gen Forms** | Pre-filled forms within LinkedIn | Frictionless lead capture |
| **Thought Leader Ads** | Promote individual employee posts | Authentic, personal brand amplification |

**2026 trend:** Video is LinkedIn's **fastest-growing and highest-engagement** format. The platform is prioritizing video inventory, potentially at the expense of static formats.

### B2B Targeting Capabilities

LinkedIn's targeting is unmatched for B2B:

| Targeting Dimension | Examples |
|---|---|
| **Job Title** | Exact title matching |
| **Job Function** | Marketing, Engineering, Finance, etc. |
| **Seniority Level** | C-suite, VP, Director, Manager, Entry-level |
| **Company Size** | 1-10 to 10,000+ employees |
| **Company Name** | Target specific companies (ABM) |
| **Industry** | 100+ industry categories |
| **Skills** | Self-reported professional skills |
| **Groups** | LinkedIn group memberships |
| **Interests** | Professional interest categories |
| **Lookalike Audiences** | Expand reach based on best customers |

### Best Practices

- **Don't over-filter:** Combining too many targeting filters shrinks your audience and raises CPCs
- **Test audiences weekly:** Audit performance and reallocate budget to best-performing segments
- **Expected conversion rates:** 2.5-3.5% for B2B ads
- **Top performers:** Lead Gen Forms and Thought Leader Ads outperform traditional formats on cost per qualified lead
- **Video best practices:** Keep to ~15 seconds; always add subtitles (most viewers watch on mute)
- **Cost:** Expect high CPMs ($30-50+) but high lead quality

---

## 2.2 Twitter/X Ads

### Campaign Objectives

| Funnel Stage | Objective | Billing |
|---|---|---|
| **Awareness** | Brand Awareness / Reach | CPM (impressions) |
| **Consideration** | Traffic, Video Views, Engagement, App Installs | CPV, CPE, CPC |
| **Conversion** | App Conversions | Cost per app click |

### Ad Formats

| Format | Description |
|---|---|
| **Promoted Posts** | Sponsored tweets in timeline |
| **Follower Ads** | Promote your account for follows |
| **Amplify Campaigns** | Pre-roll video on premium publisher content |
| **Takeover** | Timeline takeover, Trend takeover, Trend Spotlight |

### Targeting Options

| Category | Details |
|---|---|
| **Demographics** | Location, language, device, age, gender |
| **Interest-Based** | 350+ pre-set interests across 25 categories |
| **Keyword** | Target/exclude based on search, posts, engagement with specific keywords |
| **Follower Lookalike** | People who behave like another account's followers |
| **Custom Audiences** | Upload lists, website visitors, app users |
| **Lookalike Audiences** | AI-powered similar audience expansion |
| **Retargeting** | People who've seen/engaged with previous campaigns or organic posts |

### Notable Features

- **AI-powered optimized targeting** is automatically enabled for sales campaigns, expanding beyond set audiences when potential ROI improvement is detected
- Strong for **real-time conversation marketing** and trending topic adjacency
- Lower CPMs than LinkedIn but less precise B2B targeting
- Best for brands with a strong voice/personality that fits the platform culture

---

## 2.3 Pinterest Ads

### Platform Positioning

Pinterest is unique because users are in **active discovery and planning mode** -- they come with purchase intent. 97% of top Pinterest searches are unbranded, making it ideal for product discovery.

### Ad Formats

| Format | Description |
|---|---|
| **Standard Pins** | Single image promoted pins |
| **Video Pins** | Autoplay video in feed |
| **Carousel Pins** | 2-5 swipeable images |
| **Shopping Ads** | Product catalog-connected pins with pricing |
| **Collections** | Hero image/video with related product cards |
| **Idea Pins** | Multi-page, story-like format |
| **Quiz Ads** | Interactive quiz format for engagement |

### Shopping Ads Features (2025-2026)

- Updated product feed capabilities for seamless shopping
- **Local inventory** highlighting for nearby pickup/delivery
- Automatic promotion of **price drops and sales** (imported from Shopify or bulk editor)
- **"Where-to-buy"** links for multi-retailer products

### Audience Targeting

| Method | Description |
|---|---|
| **Keyword Targeting** | Based on search terms (unique to Pinterest among social platforms) |
| **Interest Targeting** | Topic-based interests |
| **Demographics** | Gender, age, location, language, device |
| **Customer List** | Hashed emails or mobile ad IDs from CRM |
| **Website Visitors** | Pinterest Tag-based retargeting |
| **Engagement Audiences** | Users who interacted with your Pins |
| **Actalike Audiences** | Pinterest's version of Lookalike audiences |

### Best Practices

- **Combine keyword + interest targeting** for best results (e.g., "summer outfit ideas" keyword + "women's fashion" interest)
- **Layer targeting:** Demographics + interest signals + keywords for precise reach
- Long content shelf life: Pins can drive traffic for **months** after posting (unlike most social platforms)
- **Install tracking** (Pinterest Tag) before spending significantly
- Strong for **ecommerce and CPG brands** with visually appealing products

---

## 2.4 YouTube Ads

### Platform Positioning

YouTube reaches over **2 billion logged-in users monthly**. Connected TV (CTV) now accounts for over **45% of total YouTube watch time** in the US -- the biggest greenfield opportunity of 2026.

### Ad Formats

| Format | Duration | Skippable? | Billing | Best For |
|---|---|---|---|---|
| **Skippable In-Stream** | 15-60s+ | Yes (after 5s) | CPV (pay when 30s watched or interacted) | Consideration campaigns |
| **Non-Skippable In-Stream** | Up to 60s | No | Target CPM | Awareness with guaranteed views |
| **Bumper Ads** | 6s | No | Target CPM | Top-of-funnel awareness at scale |
| **YouTube Shorts** | Up to 60s | No | CPM / CPA | Reaching younger audiences, mobile-first |
| **In-Feed Video** | Any length | N/A (user clicks to watch) | CPC | Consideration, channel growth |
| **Masthead** | 24 hours | N/A | Fixed CPD | Massive awareness events (product launches) |

### YouTube Shorts Ads (2026 Focus)

- Run between organic Shorts content in the vertical feed
- **Non-skippable**, up to 60 seconds
- Require **9:16 vertical creative** to appear native
- Growing rapidly as the fastest-scaling YouTube ad surface

### Bidding Strategies

| Strategy | Best For |
|---|---|
| **Maximum CPV** | Consideration campaigns (video views) |
| **Target CPM** | Awareness campaigns (impressions) |
| **Target CPA** | Conversion campaigns |
| **Maximize Conversions** | Automated conversion optimization |

### Targeting

- **Demographics:** Age, gender, household income, parental status
- **Affinity Audiences:** Long-term interests and lifestyle
- **In-Market Audiences:** Actively researching/considering products
- **Custom Intent:** Based on Google search keywords
- **Remarketing Lists:** Website/app/YouTube engagement
- **Placement Targeting:** Specific channels or videos
- **Topic Targeting:** Content categories

### Connected TV Opportunity

CTV represents the most significant greenfield opportunity in 2026:
- **45%+** of YouTube watch time is now on TV screens
- Doubled since 2022
- Combines scale + visual impact + shopping integration + attribution clarity
- Best for brands with visual products and mature marketing infrastructure

---

## 2.5 Programmatic / DSP

### Overview

Programmatic advertising uses automated technology to buy and sell digital ad inventory in real-time. The two dominant Demand-Side Platforms (DSPs) are Google's DV360 and The Trade Desk.

### Platform Comparison

| Feature | DV360 | The Trade Desk |
|---|---|---|
| **Market Share** | 47% | 19% |
| **Average CPM** | $0.89 | $1.07 |
| **Philosophy** | Walled garden (Google ecosystem) | Open internet, independent |
| **Unique Strength** | Exclusive access to YouTube inventory | Omnichannel reach, data independence |
| **Identity Solution** | Google's Privacy Sandbox | Unified ID 2.0 (open-source) |
| **Best For** | Advertisers in Google ecosystem | Agencies/brands wanting platform independence |

### Channel Access

Both platforms offer access to:
- **Display** (banner ads across millions of sites)
- **Video** (pre-roll, mid-roll, outstream)
- **Connected TV (CTV)** (streaming TV ads)
- **Audio** (podcast and streaming music ads)
- **Digital Out-of-Home (DOOH)** (digital billboards)
- **Native** (in-content placements)

### 2025-2026 Innovations

- **Privacy-first targeting:** Post-cookie identity solutions (UID 2.0, Privacy Sandbox)
- **AI-driven lookalike modeling** and real-time targeting optimization
- **Cross-channel measurement:** DV360 now has tighter integration with GA4
- **CTV growth:** The fastest-growing programmatic channel

### When to Use Programmatic

- You need **massive scale** beyond social platforms
- You want **CTV/streaming TV** reach at programmatic pricing
- You need **cross-channel frequency management** across many publishers
- You have **mature first-party data** to fuel targeting
- Your budget supports minimum $10k-$25k/month for meaningful programmatic testing

---

# Part 3: Cross-Platform Strategy

## 3.1 Multi-Channel Attribution

### The Core Problem

**Every platform takes credit for the same conversions.** Each platform exhibits self-attribution bias:
- Meta defaults to a **7-day click / 1-day view** window
- Google uses **last-click** by default
- TikTok uses a **7-day click / 1-day view** window
- LinkedIn uses a **30-day click / 7-day view** window

A customer who saw a Meta ad, clicked a Google search result, and engaged with a LinkedIn post gets counted three times.

### Attribution Models

| Model | Description | Best For |
|---|---|---|
| **Last-Click** | 100% credit to last touchpoint before conversion | Simple, but heavily biased toward bottom-funnel |
| **First-Click** | 100% credit to first touchpoint | Understanding awareness drivers |
| **Linear** | Equal credit to all touchpoints | Balanced view of full journey |
| **Time-Decay** | More credit to touchpoints closer to conversion | Balanced with bottom-funnel emphasis |
| **Data-Driven** | AI/ML assigns credit based on actual contribution | Most accurate, requires data volume |
| **Marketing Mix Modeling (MMM)** | Statistical model using aggregate data | Privacy-safe, cross-channel strategic view |
| **Incrementality Testing** | Controlled experiments measuring true lift | Gold standard for proving causation |

### 2026 Measurement Stack

1. **Platform-reported metrics** -- Use for relative performance within each platform
2. **Google Analytics 4** -- Cross-channel attribution analysis report (launched January 2026)
3. **Google Meridian** -- Open-source Marketing Mix Model with Search and video signals
4. **Third-party tools** -- Triple Whale, Cometly, Northbeam, etc. for unified cross-platform view
5. **Server-side tracking** -- Privacy-preserving measurement replacing pixel-based tracking

### Key Insight

Advertisers running coordinated campaigns across **three or more platforms outperform single-platform strategies by 25-35%**, with efficiency gains from frequency control, sequential messaging, and reaching audiences at different intent stages.

---

## 3.2 Budget Allocation Across Platforms

### The 60-30-10 Framework

| Allocation | Purpose |
|---|---|
| **60%** | Your proven, highest-performing platform |
| **30%** | Secondary platform with growth potential |
| **10%** | Testing new platforms, formats, or audiences |

### Testing Budget Guidelines

- Reserve **10% of total ad spend** for testing
- Run tests for **minimum 60 days**
- Minimum viable test budget: **$1,500-$3,000/month** per platform
- Do not judge a new platform in less than 2-4 weeks

### Platform-Specific Recommendations by Business Type

| Business Type | Primary Platform | Secondary | Test |
|---|---|---|---|
| **DTC Ecommerce** | Meta (Facebook/Instagram) | TikTok | Pinterest, YouTube |
| **B2B SaaS** | LinkedIn | Google Search | Twitter/X, YouTube |
| **Local Business** | Google (Search + Maps) | Meta | TikTok |
| **Mobile App** | TikTok | Meta | Google UAC |
| **CPG / Retail** | Meta | TikTok Shop | Pinterest, Programmatic |

### Dynamic Budget Allocation (2026 Standard)

Static quarterly budgets are outdated. Modern allocation should flex based on:
- **Real-time performance signals** (shift budget toward what's working today)
- **Seasonality** (increase spend during peak periods for your industry)
- **Creative freshness** (pull budget from fatigued campaigns, redirect to fresh creative)
- **Competitive dynamics** (CPMs spike when competitors increase spend)

### Critical Rule: Don't Starve the Top of Funnel

Maintain **at least 20-30% of budget** in awareness and consideration campaigns. Over-investing in retargeting/conversion campaigns while underinvesting in awareness starves your pipeline and leads to diminishing returns.

---

## 3.3 Creative Adaptation

### Core Principle: Platform-Native Over Repurposing

**Simply trimming a long video for different platforms underperforms platform-native creative.** Content must be conceived for each platform's format and audience behavior.

### Platform Creative Specifications

| Platform | Format | Tone | Length | Key Elements |
|---|---|---|---|---|
| **TikTok** | 9:16 vertical | Authentic, raw, UGC-style | 9-30s | Trending sounds, fast cuts, text overlays, hooks |
| **Meta (Reels)** | 9:16 vertical | Polished UGC to brand-quality | 15-60s | Clear CTA, benefit-focused, emotional |
| **Meta (Feed)** | 1:1 or 4:5 | Brand-quality | 15-30s | Strong thumbnail, subtitles |
| **YouTube (Pre-roll)** | 16:9 horizontal | Professional | 15-30s | Hook in 5s (before skip), clear brand early |
| **YouTube (Shorts)** | 9:16 vertical | Native, fast-paced | Up to 60s | Similar to TikTok but slightly more polished |
| **LinkedIn** | 1:1 or 16:9 | Professional, thought-leadership | ~15s | Subtitles essential, educational value |
| **Pinterest** | 2:3 or 9:16 | Aspirational, clean | 6-15s | Product-forward, lifestyle imagery |
| **CTV** | 16:9 horizontal | Premium, lean-back | 15-30s | High production value, clear branding |

### Modular Creative Production

The most efficient approach is **modular production:**

1. **Shoot a core set of footage** with multiple hooks, middle sections, and CTAs
2. **Assemble platform-specific versions** from the modules
3. **Maintain brand consistency** across platforms: same logo, colors, tone, core message
4. **Adapt execution** for each platform's native behavior

### What to Avoid

- Repurposing TV/Facebook ads directly to TikTok (50-70% lower engagement)
- Using the same aspect ratio across all platforms
- Ignoring platform-specific audio norms (TikTok = sound on; LinkedIn = sound off)
- Static images on video-first platforms

---

## 3.4 Funnel Strategy

### Modern Funnel Reality

The marketing funnel in 2026 is **non-linear and multi-touch**. Prospects may enter at different points, move backward, pause, or be influenced by social media, reviews, and AI shopping assistants. Think of it as a **loop rather than a straight line**.

### Platform Roles by Funnel Stage

| Funnel Stage | Best Platforms | Objective | Metrics |
|---|---|---|---|
| **Awareness** | TikTok, YouTube, Programmatic (CTV/DOOH), Pinterest | Maximum reach, introduce brand | CPM, Reach, Video Views, Brand Lift |
| **Consideration** | Meta, TikTok, YouTube, Pinterest | Engage, educate, build interest | CTR, CPC, Video Completion Rate, Engagement Rate |
| **Conversion** | Meta, Google Search, TikTok Shop, LinkedIn (B2B) | Drive purchase/sign-up/lead | CPA, ROAS, Conversion Rate, Cost per Lead |
| **Retention** | Meta (Custom Audiences), Email, Google Display | Re-engage existing customers | LTV, Repeat Purchase Rate, Churn Rate |

### Full-Funnel Execution Framework

```
STAGE 1: AWARENESS (20-30% of budget)
  Platforms: TikTok (In-Feed, TopView), YouTube (Bumper, Shorts), Programmatic CTV
  Creative: Broad, entertaining, brand-story content
  Targeting: Broad interests, Lookalikes, contextual
  KPIs: CPM, Reach, Video View Rate

        |
        v

STAGE 2: CONSIDERATION (30-40% of budget)
  Platforms: Meta (Reels, Stories), TikTok (Spark Ads), YouTube (Skippable In-Stream), Pinterest
  Creative: Problem-solution, testimonials, product demos, educational
  Targeting: Engaged audiences, website visitors, video viewers
  KPIs: CTR, CPC, Engagement Rate, Cost per ThruPlay

        |
        v

STAGE 3: CONVERSION (30-40% of budget)
  Platforms: Meta (Conversion campaigns), Google Search, TikTok Shop (VSA), LinkedIn Lead Gen (B2B)
  Creative: Strong CTA, urgency, social proof, pricing
  Targeting: Retargeting (site visitors, cart abandoners), Narrow Lookalikes, high-intent keywords
  KPIs: CPA, ROAS, Conversion Rate

        |
        v

STAGE 4: RETENTION (5-10% of budget)
  Platforms: Meta Custom Audiences, Google Display, Email
  Creative: Loyalty offers, cross-sell, new product announcements
  Targeting: Customer lists, past purchasers
  KPIs: LTV, Repeat Rate, Customer Retention Cost
```

### Sequential Messaging Strategy

The most sophisticated advertisers use **sequential messaging** across platforms:

1. **Day 0:** User sees a TikTok awareness ad (entertaining, brand intro)
2. **Day 1-3:** User sees a Meta retargeting ad (product benefits, social proof)
3. **Day 4-7:** User sees a Google Display ad (specific offer, CTA)
4. **Day 7-14:** If not converted, user sees a stronger offer ad (urgency, discount)

This requires:
- Proper cross-platform tracking (pixels + server-side on all platforms)
- Shared audience lists where possible
- A unified creative calendar
- Regular cross-platform performance reviews

---

## Summary: Quick Reference Card

### TikTok Ads Essentials

| Element | Recommendation |
|---|---|
| Starting Budget | $50/day minimum campaign, $20/day minimum ad group |
| Creative | UGC-style, 9:16 vertical, 15-30s, hook in first 3s |
| Targeting | Start broad, use Smart Targeting, build Custom/Lookalike over time |
| Bidding | Maximum Delivery to test, Cost Cap to scale |
| Scaling | 20% budget increases per day, refresh creative every 2-3 weeks |
| Tracking | Pixel + Events API together, always |
| Testing | 10-20 creative variations, test hooks first |

### Platform Selection Matrix

| If Your Goal Is... | Use These Platforms |
|---|---|
| Cheapest reach to younger audiences | TikTok |
| Highest-quality B2B leads | LinkedIn |
| Highest ROAS for ecommerce | Meta + TikTok Shop |
| Maximum video reach | YouTube + TikTok |
| Discovery/planning-stage shoppers | Pinterest |
| Real-time conversation/trending topics | Twitter/X |
| Premium CTV/streaming reach | YouTube CTV, Programmatic (DV360/TTD) |
| Massive multi-channel scale | Programmatic DSP |

---

## Sources

### TikTok Ads
- [TikTok Ads in 2026: Strategy, Costs & Best Practices - Shopify](https://www.shopify.com/blog/tiktok-ads)
- [TikTok Ad Formats 2026 - FanIQ](https://www.faniq.live/blog/tiktok-ad-unit-breakdown)
- [TikTok Ads Structure - Official](https://ads.tiktok.com/help/article/tiktok-ads-structure?lang=en)
- [Campaign Budget Optimization - Official](https://ads.tiktok.com/help/article/campaign-budget-optimization)
- [TikTok Ads Campaign Structure - TLinky](https://tlinky.com/tiktok-ads-campaign-structure/)
- [About Budget - Official](https://ads.tiktok.com/help/article/budget?lang=en)
- [Account Structure Best Practices - Official](https://ads.tiktok.com/help/article/account-structure-best-practices?lang=en)
- [Ad Targeting Dimensions - Official](https://ads.tiktok.com/help/article/ad-targeting?lang=en)
- [Custom Audiences - Official](https://ads.tiktok.com/help/article/custom-audiences)
- [TikTok Ads Targeting Options 2026 - Stackmatix](https://www.stackmatix.com/blog/tiktok-ads-targeting-options-guide)
- [Best Practices for Targeting - Official](https://ads.tiktok.com/help/article/best-practices-for-targeting)
- [Creative Best Practices - Official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
- [TikTok Ads Complete Guide 2026 - Creatify](https://creatify.ai/blog/tiktok-ads-complete-guide-to-creating-high-performing-creatives-in-2026)
- [TikTok Creative Center Guide 2026 - Birch](https://bir.ch/blog/tiktok-creative-center)
- [TikTok Creative Center Complete Guide 2025 - Creatify](https://creatify.ai/blog/tiktok-creative-center)
- [Smart+ AI-Powered Solution - Official Blog](https://ads.tiktok.com/business/en-US/blog/smart-plus-ai-performance-solution)
- [About Smart+ Campaigns - Official](https://ads.tiktok.com/help/article/about-smart-plus-campaign?lang=en)
- [Smart+ Upgraded Experience - Official](https://ads.tiktok.com/help/article/about-updates-to-smart-plus?lang=en)
- [TikTok Smart+ Upgrade 2025 - Segwise](https://segwise.ai/blog/tiktok-smart-campaigns-guide-benefits)
- [TikTok for eCommerce 2026 - eDesk](https://www.edesk.com/blog/tiktok-for-ecommerce/)
- [TikTok Shop 2026 Social Commerce Guide - Digital Applied](https://www.digitalapplied.com/blog/tiktok-shop-2026-social-commerce-guide)
- [TikTok Shop 2025 - eFulfillment](https://www.efulfillmentservice.com/2025/12/how-tiktok-shop-became-a-serious-ecommerce-channel-in-2025/)
- [Available Bidding Strategies - Official](https://ads.tiktok.com/help/article/bidding-strategies)
- [Best Practices for Bidding - Official](https://ads.tiktok.com/help/article/best-practices-for-bidding-strategies)
- [TikTok Ad Bidding Strategies 2026 - TikAdSuite](https://tikadsuite.com/blog/tiktok-ad-bidding-strategies/)
- [Events API - Official](https://ads.tiktok.com/help/article/events-api)
- [TikTok Pixel Setup 2026 - AdNabu](https://blog.adnabu.com/tiktok/what-is-tiktok-pixel/)
- [TikTok Conversion Tracking - AdNabu](https://blog.adnabu.com/tiktok/tiktok-conversion-tracking/)
- [About Spark Ads - Official](https://ads.tiktok.com/help/article/spark-ads)
- [How to Scale TikTok Ads 2026 - TikAdSuite](https://tikadsuite.com/blog/how-to-scale-tiktok-ads/)
- [Scaling Auction Ad Spend - Official](https://ads.tiktok.com/help/article/scaling-auction-ad-spend-solutions?lang=en)
- [TikTok Ads Cost Breakdown 2026 - TikAdSuite](https://tikadsuite.com/blog/tiktok-ads-cost/)
- [TikTok Ad Costs 2025 - Quimby Digital](https://quimbydigital.com/tiktok-ad-costs-2025-average-cpm-cpc-roi/)

### Other Platforms
- [LinkedIn Ads Ultimate Guide 2026 - ALM Corp](https://almcorp.com/blog/linkedin-ads-ultimate-guide-2026/)
- [LinkedIn Advertising Guide 2026 - Improvado](https://improvado.io/blog/linkedin-advertising-guide)
- [LinkedIn B2B Ads Trends 2026 - Zdimchov](https://www.zdimchov.com/linkedin-b2b-ads-trends-2026/)
- [Twitter Ads 2026 Guide - Improvado](https://improvado.io/blog/twitter-ads-guide)
- [X Ads Targeting - Official](https://business.twitter.com/en/advertising/targeting.html)
- [Pinterest Ads 2026 Guide - ALM Corp](https://almcorp.com/blog/pinterest-ads-ultimate-guide-2026/)
- [Pinterest Targeting Overview - Official](https://help.pinterest.com/en/business/article/targeting-overview)
- [YouTube Ads 2026 Strategy Guide - Digital Applied](https://www.digitalapplied.com/blog/youtube-ads-2026-video-advertising-strategy-guide)
- [Complete Guide to YouTube Advertising 2026 - Strike Social](https://strikesocial.com/blog/complete-guide-to-youtube-advertising-in-2025/)
- [DV360 vs The Trade Desk 2026 - Improvado](https://improvado.io/blog/dv360-vs-the-trade-desk)

### Cross-Platform Strategy
- [Multiple Ad Platforms Attribution 2026 - Cometly](https://www.cometly.com/post/multiple-ad-platforms-attribution)
- [Cross-Channel Attribution - Triple Whale](https://www.triplewhale.com/blog/cross-channel-attribution)
- [Social Media Ad ROI 2026 - Digital Applied](https://www.digitalapplied.com/blog/social-media-advertising-roi-2026-platform-guide)
- [2026 Digital Marketing Budget Allocation - ALM Corp](https://almcorp.com/blog/2026-digital-marketing-budget-allocation-roi-guide/)
- [Ad Budget Splitting Guide 2025 - Ad Times](https://ad-times.com/ad-budget-splitting-guide-2025/)
- [Full Funnel Marketing 2026 - Webeducare](https://www.webeducare.com/full-funnel-marketing-in-2026/)
- [Content Strategies for Different Platforms 2026 - InfluenceFlow](https://influenceflow.io/resources/content-strategies-for-different-social-platforms-a-2026-guide-to-platform-specific-success/)
