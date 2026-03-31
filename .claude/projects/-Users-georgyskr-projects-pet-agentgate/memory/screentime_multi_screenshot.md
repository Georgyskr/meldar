---
name: Screen Time multi-screenshot support
description: Accept 4 screen time screenshots (usage, app list, pickups/first-used-after-pickup, notifications) + App Store subscriptions screenshot. Each adds behavioral data layers.
type: project
---

Screen Time upload should accept multiple screenshots (1-4), not just one. Each section provides different data:

1. Daily average + category chart + most used apps (current)
2. Full app list + pickups count (scrolled down)
3. Pickups detail + "First Used After Pickup" (behavioral — reflex grab apps)
4. Notifications breakdown per app (which apps interrupt most)

**Why:** Notification data (e.g., 232/day, Telegram 178) is a strong signal for "you need notification triage." First-used-after-pickup reveals habit loops. We're leaving valuable data on the table by accepting only 1 screenshot.

**How to apply:** Update Claude Vision prompt to handle all 4 sections. Allow multiple file uploads for the screen time card. Add a separate upload card for App Store Subscriptions (Settings → Apple ID → Subscriptions).

Also add App Store Subscriptions as a new data source — screenshot of Settings → Apple ID → Subscriptions. Parse with same Claude Vision infrastructure.
