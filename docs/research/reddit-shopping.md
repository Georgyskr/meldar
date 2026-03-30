# Reddit Research: Shopping, Deals & Price Tracking Frustrations

> Research date: 2026-03-30
> Source: Web searches targeting Reddit discussions, shopping forums, and deal-hunting communities (r/Frugal, r/deals, r/BuildAPCSales, r/GameDeals, r/FrugalFemaleFashion, r/Churning)

---

## Use Case 1: Cross-Retailer Price Comparison Is Manual and Painful

**The frustration:** Shoppers who want to find the best price across multiple retailers (Amazon, Walmart, Target, Best Buy, niche stores) are stuck manually checking each site. One Reddit user described maintaining "a spreadsheet and like 4 Amazon wish lists" but said it's "really tedious to look up every item on 4+ sites to check the price, especially when trying to watch for price drops."

**Why existing tools fail:**
- CamelCamelCamel and Keepa only track Amazon
- Honey tracks some retailers but is primarily a coupon tool, not a true cross-platform price comparator
- Google Shopping results are ad-driven, not always showing the real lowest price
- No single tool consolidates wishlists across retailers with unified alerting

**Meldar angle:** An agent that monitors a product across all retailers simultaneously, alerts when the best price across any of them drops below a threshold, and presents a unified view of price history across stores.

---

## Use Case 2: Restock / Back-in-Stock Alerts Are Broken

**The frustration:** Retailer-provided "notify me when back in stock" buttons are unreliable -- emails arrive hours late, after items have already sold out again. This is especially painful for limited/high-demand items (sneakers, GPUs, gaming consoles, collectibles). When a PS5 availability bot was posted on Reddit, it gained 5,000 followers overnight (now 26,000), showing massive unmet demand.

**Why existing tools fail:**
- Retailer email notifications are delayed and unreliable
- Manual page-refreshing doesn't scale and misses restocks at inconvenient times
- Dedicated tools like HotStock or Distill.io exist but require per-product setup and are limited in scope
- Scalper bots outpace human shoppers, making speed of notification critical

**Meldar angle:** An agent that monitors product pages in real-time, detects stock changes instantly, and sends push/SMS alerts within seconds -- beating both retailer emails and manual checking.

---

## Use Case 3: Grocery Price Tracking Across Local Stores

**The frustration:** Grocery prices vary wildly between stores, and inflation has pushed weekly bills up significantly (one Midwest Reddit user reported their bill rising from $130 to $180 for less food). Shoppers want to compare prices at their local stores but existing tools are inaccurate or show stores too far away.

**Why existing tools fail:**
- Flipp shows deals but often for stores "an hour or more away" -- irrelevant for weekly shopping
- Quick Compare and similar apps have "significant" pricing mismatches vs actual store prices
- Store-brand price increases make even "budget" strategies unreliable
- No tool builds a personalized, location-aware grocery price comparison across your actual nearby stores

**Meldar angle:** An agent that tracks prices at your specific local stores (Costco, Trader Joe's, Kroger, etc.), builds a per-item price history, and generates optimized shopping lists telling you where to buy each item cheapest.

---

## Use Case 4: Flight Price Tracking and Alerts Are Unreliable

**The frustration:** Google Flights price alerts are frequently inaccurate or misconfigured. Users report alerts saying "your flight is lower than it has been!" when prices haven't changed, receiving alerts for wrong trip durations, and interface changes that removed the ability to view all tracked flights on a single comparison view.

**Why existing tools fail:**
- Google Flights alerts are unreliable and sometimes misleading
- Kayak and Momondo are more accurate but still limited in alert customization
- No tool lets you set complex conditions (e.g., "alert me when a round-trip under $400 appears for any weekend in June")
- Price prediction features are not trusted by users

**Meldar angle:** An agent that monitors flight prices with accurate, condition-based alerting -- supporting complex queries like date ranges, flexible airports, and budget thresholds, with trustworthy price history.

---

## Use Case 5: Coupon Codes Are Mostly Expired or Fake

**The frustration:** Coupon aggregator sites (RetailMeNot, coupon blogs) are flooded with expired or fake codes posted for clicks. Users waste time "clicking through page after page of promo code websites only to find expired or fake discounts." Many shoppers give up and pay full price. Even Honey came under fire for hijacking affiliate links without actually finding working codes.

**Why existing tools fail:**
- RetailMeNot and similar sites repost old codes for SEO/clicks
- Honey codes expire in ~7 days and the extension doesn't always find working codes
- Reddit coupon threads have codes pasted without checking expiry dates
- Honey was accused of hijacking affiliate commissions even when it didn't find or apply a coupon
- No tool verifies codes are working before presenting them to the user

**Meldar angle:** An agent that actively tests coupon codes at checkout (or monitors verified community reports) and only surfaces codes confirmed to work, eliminating wasted time on expired/fake codes.

---

## Use Case 6: Deal Alert Fatigue -- Too Many Irrelevant Notifications

**The frustration:** Shoppers who sign up for deal alerts (Slickdeals, email lists, app notifications) quickly become overwhelmed. Data shows 60% of users unsubscribe from irrelevant alerts, and 47% disable notifications entirely within the first week. 72% of users feel stressed by notifications that lack contextual relevance.

**Why existing tools fail:**
- Deal sites blast every deal, not personalized ones
- Category filters are too coarse (e.g., "electronics" includes thousands of irrelevant items)
- No tool learns your actual preferences and purchase patterns over time
- Unsubscribing from one channel doesn't fix the problem across all channels

**Meldar angle:** An agent that learns your specific interests, brands, price ranges, and purchase history to deliver only highly relevant deals -- with smart deduplication across sources and adaptive learning from what you click/ignore.

---

## Use Case 7: Price History Manipulation and "Fake" Discounts

**The frustration:** Retailers inflate prices before sales events (Black Friday, Prime Day) to make discounts appear larger. Subreddits like r/BuildAPCSales and r/Frugal regularly call out products where the "original price" was artificially raised. CamelCamelCamel users reported receiving alerts for prices that were "higher than their settings" or didn't match actual Amazon prices.

**Why existing tools fail:**
- CamelCamelCamel has accuracy issues and outdated data, especially for niche items
- Most trackers show the retailer's stated discount, not whether the deal is actually good historically
- No mainstream tool automatically flags suspicious price history patterns
- Flash sales can be missed due to slow refresh rates on free tiers

**Meldar angle:** An agent that maintains independent price history, automatically detects and flags artificial price inflation before "sales," and tells you whether a deal is genuinely good compared to the product's real price history.

---

## Use Case 8: Niche/Specialty Product Monitoring (Small Shops, Limited Runs)

**The frustration:** Enthusiast communities (mechanical keyboards, specialty coffee, craft supplies, vinyl records, indie fashion) deal with small-batch products on independent stores that no major price tracker supports. These products sell out quickly with no restock guarantee, and there's no centralized way to monitor availability across dozens of small shops.

**Why existing tools fail:**
- Major trackers (CamelCamelCamel, Keepa, Honey) only support Amazon and large retailers
- Small/independent shops have no API or standardized product pages
- Community-driven alerts (Discord, Reddit) are hit-or-miss and require constant monitoring
- No tool supports monitoring arbitrary web pages for price/stock changes without technical setup

**Meldar angle:** An agent that can monitor any web page (not just Amazon) for price changes and stock availability -- point it at any product URL and get alerts when something changes, regardless of the retailer's size or platform.

---

## Summary of Key Themes

| Theme | Severity | Frequency on Reddit |
|-------|----------|-------------------|
| Cross-retailer price comparison | High | Very common |
| Broken restock alerts | Critical | Very common (high-demand items) |
| Grocery price tracking | High | Common (inflation-driven) |
| Flight alert unreliability | Medium | Common |
| Fake/expired coupons | High | Very common |
| Alert fatigue/noise | Medium | Common |
| Fake discount detection | High | Common (seasonal spikes) |
| Niche product monitoring | Medium | Common in enthusiast communities |

**Common thread:** Users want a single, intelligent agent that monitors prices and availability across all retailers, sends timely and relevant alerts, and helps them make genuinely informed purchase decisions -- not another deal-spam firehose.
