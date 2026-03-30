# Reddit Student/Education Use-Case Research

> Research date: 2026-03-30
> Sources: Reddit discussions, university newspapers, Quora threads, edtech blogs, student forums

## Summary

Students repeatedly express frustration with fragmented, poorly-designed university systems that require constant manual checking. The core theme is: **information exists but is scattered across too many platforms with unreliable or nonexistent notifications**. Below are 8 use cases where students wish things were automated.

---

## Use Case 1: Unified Assignment Deadline Tracking

**Pain point:** Deadlines live in too many places -- syllabi, Canvas/Blackboard announcements, email reminders, and calendar events -- and they rarely stay in sync. Even organized students fall behind when manually tracking everything across 4-6 courses.

**What students want:** A single feed that automatically pulls every deadline from LMS platforms (Canvas, Blackboard, Moodle), syllabi PDFs, and professor emails into one unified view with smart reminders.

**Evidence:**
- Coursicle and Due Gooder exist specifically because this problem is so widespread -- Due Gooder markets itself as "automatically pulling assignments from your syllabus or LMS"
- Students report checking discussions, announcements, assignments, modules, and syllabi multiple times per week across every course just to avoid missing something
- Students who use planner apps are reportedly 30% more likely to meet deadlines and report lower stress

**Automation opportunity:** Monitor LMS APIs + parse syllabus PDFs -> consolidated deadline feed with configurable alerts (24h, 1h before due).

---

## Use Case 2: Grade Posting Notifications

**Pain point:** Students obsessively refresh Canvas/Blackboard to check whether professors have posted grades. Canvas has notification settings but they are unreliable -- professors often use "manual posting" policies that suppress automatic notifications, or grade columns are hidden entirely.

**What students want:** Instant, reliable push notification the moment a grade appears or changes in any course, regardless of the professor's posting policy.

**Evidence:**
- Canvas community forums have long-standing threads about "Canvas not providing real-time updated grades" (Instructure Community thread #629972)
- Chapman University published multiple articles in 2025 about grade posting policy confusion -- professors often don't realize their settings suppress student notifications
- Quora has dozens of threads from students asking why they can't see grades their professors claim to have posted
- Boston College CTE documented that student-facing grade notifications depend on instructor posting policies, creating an unreliable experience

**Automation opportunity:** Poll LMS gradebook on interval -> detect new/changed grades -> push notification with grade + assignment name + running course average.

---

## Use Case 3: Course Registration Seat Monitoring

**Pain point:** Students need specific classes to graduate on time but sections fill up instantly during registration. Waitlist systems exist at some schools but are clunky, and many schools have no automated waitlist at all -- students must manually refresh the registration portal hoping a seat opens.

**What students want:** Automated monitoring that alerts them the instant a seat opens in a specific course section, with one-click registration.

**Evidence:**
- 34% of Rollins College students reported technical difficulties during Spring 2026 registration
- Multiple university newspapers (Howard, Lehigh, Elon, Rice) ran stories in 2024-2025 about student frustration with registration systems crashing, classes filling before students can register
- Students call for "better communication from the university about registration" and "more available places to get information"
- Existing waitlist systems give students only 24 hours to act on notifications, but the notification itself is often just an email that gets buried

**Automation opportunity:** Monitor course catalog API for seat availability changes -> instant push notification -> deep link to registration page.

---

## Use Case 4: Campus Parking Lot Availability

**Pain point:** Students spend 30-50 minutes circling parking lots before class, frequently arriving late or missing class entirely. Parking pass prices are rising (e.g., 40% increase at Elon University) while available spots are shrinking due to campus construction.

**What students want:** Real-time lot occupancy data with predictive "best time to arrive" recommendations and alerts when their preferred lot drops below a threshold.

**Evidence:**
- Ohio State students took to Reddit to express frustration about "endlessly circling lots"
- UC San Diego adjusted parking prices and allocations after student backlash on Reddit in 2024
- Washburn Review, Rice Thresher, Elon News Network all published student frustration pieces about parking in 2024
- Smart parking solutions (Parking Logix) are being adopted by some universities but student-facing notification features are limited

**Automation opportunity:** Integrate with campus parking sensors/cameras or crowdsource -> predict lot fullness by time of day -> alert when preferred lot is filling up -> suggest alternatives.

---

## Use Case 5: Financial Aid & Scholarship Deadline Alerts

**Pain point:** Financial aid deadlines are scattered across federal (FAFSA), state, institutional, and individual scholarship portals. Missing a single deadline can cost thousands of dollars. Students describe financial aid portals as deliberately confusing.

**What students want:** A consolidated calendar of every financial aid and scholarship deadline relevant to them, with escalating reminders and document-readiness checklists.

**Evidence:**
- Forum discussions include students stating "THEY MAKE IT CONFUSING ON PURPOSE!!" about financial aid portals
- Students report award letters ending up in email spam folders, nearly causing missed deadlines
- FAFSA has 3 different deadline types (federal, state, school) that students must track independently
- Average student spends $1,290/year on books alone; missing aid deadlines compounds financial stress
- Scholarship peak months (October-March) overlap with midterms, creating attention competition

**Automation opportunity:** Aggregate deadlines from FAFSA, state agencies, school portal, and scholarship databases -> personalized timeline -> document readiness checks -> escalating reminders.

---

## Use Case 6: Campus Dining Hall Real-Time Info

**Pain point:** Students walk to dining halls only to find them closed, overcrowded, or serving food they can't/won't eat. Menu information and hours are buried in separate apps or outdated web pages. Dietary restriction filtering is poor.

**What students want:** Real-time dining hall occupancy, today's menu with allergen/dietary filters, and alerts for when their preferred dining hall has short lines or is serving a specific dish.

**Evidence:**
- UCLA Daily Bruin reported in April 2025 that a new campus dining website "sparks criticism from students" for poor UX
- University of Maryland pushes dining specials through their app but most campuses lack this
- Students report that dining apps show incorrect availability -- "the app would say a washer or dryer is available, but it would be occupied" (similar reliability complaints extend to dining capacity data)
- Late-night dining crowds peak 9-10 PM; students who know to arrive at 8 PM or after 11 PM save significant time

**Automation opportunity:** Scrape/API dining menus + occupancy sensors -> personalized feed (dietary preferences) -> "dining hall X has short line and is serving Y" notifications.

---

## Use Case 7: Library & Study Room Availability

**Pain point:** During midterms and finals, every study space on campus is packed. Room booking systems require advance planning, have strict time limits (typically 2 hours/day), and cancellation policies that punish no-shows within 10 minutes. Students waste time walking between buildings looking for open spots.

**What students want:** Real-time map of available study spaces across campus, with notifications when a preferred room opens up or a booking gets cancelled.

**Evidence:**
- Loyola Marymount student newspaper ran an opinion piece: "Stop booking the group study rooms for individual study" -- highlighting demand exceeding supply
- Georgia Tech, Kennesaw State, and others implemented strict check-in verification (10-minute auto-cancel) in 2025 to combat no-shows, indicating severe demand pressure
- Students at UCSD are directed to a "Where to Study on Campus" guide listing alternatives, implying the primary spaces are chronically full

**Automation opportunity:** Monitor LibCal/booking system APIs -> alert when preferred room type becomes available -> one-tap reservation -> auto check-in reminder.

---

## Use Case 8: Professor Schedule & Class Cancellation Alerts

**Pain point:** Professors cancel classes or office hours with little notice, sometimes only posting on a door sign or sending a Canvas announcement that students don't see until they've already commuted to campus. There is no standardized cancellation notification system.

**What students want:** Instant push notification when a professor cancels class or office hours, ideally before the student leaves home.

**Evidence:**
- College Confidential thread: "Have you ever had a professor cancel class but not notify you?" -- students describe driving to campus only to find a note on the door
- Students describe feeling bad for commuters who drove to class only to find it canceled without advance notification
- Canvas announcements are the closest thing to a notification system but open rates are low and timing depends on when students check

**Automation opportunity:** Monitor Canvas announcements + email + professor calendar for cancellation signals -> push notification to enrolled students with lead time before class start.

---

## Cross-Cutting Themes

| Theme | Use Cases | Implication |
|-------|-----------|-------------|
| **Fragmented information** | 1, 2, 5, 8 | Data exists but lives in 3-5 different systems per task |
| **Unreliable native notifications** | 2, 3, 8 | LMS notification settings are confusing and professor-dependent |
| **Wasted physical trips** | 4, 6, 7, 8 | Students commute/walk only to find resources unavailable |
| **High-stakes missed deadlines** | 1, 3, 5 | Missing a deadline = lost money, delayed graduation |
| **Poor mobile experience** | All | Most university portals are desktop-first with terrible mobile UX |

## Key Insight for Meldar

The strongest automation opportunities are those where **the student currently has to poll (manually check) a system that changes unpredictably**. Converting any polling workflow into a push notification with actionable context is immediately valuable. The top 3 by student pain intensity:

1. **Grade posting notifications** -- emotional urgency, checked compulsively
2. **Assignment deadline consolidation** -- high stakes, fragmented sources
3. **Course seat availability alerts** -- time-critical, graduation-blocking
