# Voice Input for Meldar's Discovery Flow

**Research Date:** 2026-03-31
**Status:** Exploratory
**Author:** Research Agent

---

## Executive Summary

Voice input could become Meldar's lowest-friction discovery channel: a user talks for 60 seconds about their day, and Claude extracts the same insights as screenshots or Screen Time data — plus emotional context that images can never capture. The technical path is viable but requires a transcription step, since Claude's API does not yet accept raw audio. Cost is competitive with screenshots (~$0.01-0.02 per voice memo). Privacy concerns are significant because voice is biometric data under GDPR, but can be mitigated with client-side processing and immediate deletion.

---

## 1. Claude API Audio Support

### Current State (March 2026)

**Claude's Messages API does not accept native audio input.** The API supports text, images (JPEG, PNG, GIF, WebP), PDFs, and search results — but no audio content blocks. There is no `/docs/en/build-with-claude/audio` page in the official documentation, confirming audio is not a supported input modality.

### What Does Exist

- **Claude Voice Mode** (consumer product): Launched May 2025 for iOS/Android, expanded to web. This is a consumer feature in claude.ai — five selectable voices, conversational interface — but it is **not an API feature**. It uses internal STT/TTS pipelines not exposed to developers.
- **Claude Code Voice Mode**: Rolled out March 2026 for Claude Code CLI. Uses speech-to-text internally (likely Whisper or similar), but again not an API-level feature.

### Implication for Meldar

Meldar must use a **two-step pipeline**:
1. **Browser records audio** → sends to a speech-to-text (STT) service
2. **Transcript text** → sent to Claude API for insight extraction

This is the same architecture Rosebud, Otter.ai, and every other voice-enabled AI app uses today.

### Recommended STT Options

| Service | Cost per Minute | Notes |
|---------|----------------|-------|
| OpenAI Whisper API | $0.006 | Best accuracy/cost ratio. 25 MB file limit (~30 min). No streaming. |
| GPT-4o Mini Audio | $0.003 | Cheapest option as of 2026. |
| AssemblyAI | $0.0025 | Lowest per-minute cost. Good multilingual support. |
| Deepgram Nova-2 | $0.0043 | Real-time streaming available. |
| Google Cloud STT | $0.024 | Expensive but supports 125+ languages. |
| Azure Speech | $0.017 | Good enterprise option. |
| Client-side Whisper (WASM) | $0.00 | Free but ~10x slower. Requires loading ~40 MB model. Privacy-maximizing. |

**Recommendation:** Start with OpenAI Whisper API ($0.006/min) for reliability. Consider client-side Whisper.cpp WASM for the privacy-conscious tier — audio never leaves the device.

---

## 2. Browser MediaRecorder API

### How It Works

The MediaRecorder API is a browser-native way to capture audio from the user's microphone. No plugins, no Flash, no dependencies.

```typescript
// Simplified example
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream);
const chunks: Blob[] = [];

recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: recorder.mimeType });
  // Send blob to server or process client-side
};

recorder.start();
// ... user speaks ...
recorder.stop();
```

### Format Output by Browser

| Browser | Default Audio Format | MIME Type |
|---------|---------------------|-----------|
| Chrome (desktop/Android) | WebM + Opus | `audio/webm;codecs=opus` |
| Firefox | WebM + Opus | `audio/webm;codecs=opus` |
| Safari (desktop) | MP4 + AAC | `audio/mp4` |
| iOS Safari | MP4 + AAC (or WebM + Opus in newer versions) | `audio/mp4` or `audio/webm` |
| Edge | WebM + Opus | `audio/webm;codecs=opus` |

### iOS Safari Compatibility

**Fully supported since iOS 14.5** (released April 2021). Current iOS versions (17.x, 18.x) all support MediaRecorder. However, there are format quirks:

- Older iOS Safari versions output MP4/AAC, newer ones may output WebM/Opus
- **Must use `MediaRecorder.isTypeSupported()` at runtime** to detect the actual format
- Safari Technology Preview has added ALAC and PCM codec support (lossless), though release Safari still defaults to AAC

### Cross-Browser Strategy

```typescript
function getPreferredMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',  // Chrome, Firefox, Edge
    'audio/mp4',               // Safari fallback
    'audio/webm',              // Generic WebM
    'audio/ogg;codecs=opus',   // Firefox alternative
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}
```

### Key Constraints

- **Requires HTTPS** (or localhost). Will not work on plain HTTP.
- **Requires user permission** via browser prompt ("Allow microphone access?")
- **No background recording** — tab must be in foreground
- **File size:** 60 seconds of Opus audio ≈ 100-200 KB (very small)

---

## 3. UX Patterns for Voice Input

### Common Patterns in Production Apps

**Pattern 1: Hold-to-Talk (WhatsApp, Telegram)**
- User presses and holds a mic button
- Visual waveform animation shows recording is active
- Release to send, swipe to cancel
- Best for: short messages (< 30s)

**Pattern 2: Tap-to-Record / Tap-to-Stop (Voice Memos, Otter.ai)**
- User taps mic button to start recording
- Timer shows elapsed time
- Tap again to stop
- Best for: longer recordings (30s-5min)

**Pattern 3: Auto-Listen with Prompt (Siri, Google Assistant)**
- System prompts: "Tell me about your day"
- Automatically starts listening
- Detects silence to auto-stop
- Best for: guided/structured input

**Pattern 4: Voice Journaling (Rosebud, Reflection)**
- Guided prompts: "How was your day?" or "What took up most of your time?"
- Timer shows progress toward a target (e.g., "60 seconds")
- Transcription appears in real-time as user speaks
- Best for: reflective, open-ended input

### Recommended Pattern for Meldar

**Tap-to-Record with Guided Prompt + Progress Timer**

Why this fits:
- Meldar's voice memo is ~60 seconds, too long for hold-to-talk
- A guided prompt ("Tell us about your typical day — what apps do you use, what takes up your time?") reduces user anxiety
- A circular progress timer (0-60s) gives users a sense of how much to say
- Real-time transcription preview builds trust ("it understood me")

### Essential UX Elements

1. **Recording indicator**: Pulsing red dot + waveform animation. Users must know when they're being recorded.
2. **Timer**: Show seconds elapsed. Progress bar toward 60s target.
3. **Cancel button**: Always available. "Changed my mind" must be easy.
4. **Preview before submit**: Show transcript, let user re-record if misheard.
5. **Guided prompt**: "Just talk for a minute about your day. What apps do you open first? What notifications bug you? What eats your time?"
6. **Silence detection**: Auto-pause after 3s of silence, prompt "Keep going?" or auto-stop after 5s.

---

## 4. What Could Claude Extract from a 60-Second Voice Memo?

### Compared to Other Discovery Methods

| Signal | Screenshot | Voice Memo | Advantage |
|--------|-----------|------------|-----------|
| App names | Direct (e.g., "Instagram 2h") | Mentioned ("I scroll Instagram for ages") | Screenshot: precise data |
| Usage duration | Exact minutes | Approximate ("like 30 minutes") | Screenshot: precision |
| Emotional context | None | Rich ("it stresses me out", "I can't stop") | Voice: huge advantage |
| Motivation | None | Present ("I check it to calm down after work") | Voice: huge advantage |
| Relationships | None | Present ("my partner gets annoyed") | Voice: unique signal |
| Pain intensity | None | Tone + words ("it drives me crazy") | Voice: unique signal |
| Unconscious habits | If captured in data | Often revealed ("I don't even realize I'm doing it") | Voice: reveals hidden patterns |
| Social dynamics | None | Present ("all my friends use it so I have to") | Voice: unique signal |

### Example Extractions

**User says:** "I wake up and the first thing I do is check Instagram. I know I shouldn't but it's like 30 minutes gone just scrolling. Then I get ready and check my work email on my phone even before I leave the house, which stresses me out. At work I'm in Slack all day, there's like 200 notifications. After work I play this game Cup Heroes to decompress but then it's suddenly 11pm."

**Claude could extract:**

```json
{
  "pain_points": [
    {
      "app": "Instagram",
      "estimated_daily_minutes": 30,
      "timing": "first thing in morning",
      "emotion": "guilt, compulsion",
      "trigger": "habitual, upon waking",
      "quote": "I know I shouldn't but it's like 30 minutes gone"
    },
    {
      "app": "Work email (mobile)",
      "timing": "before leaving house",
      "emotion": "stress, anxiety",
      "trigger": "compulsive checking",
      "quote": "stresses me out"
    },
    {
      "app": "Slack",
      "estimated_daily_notifications": 200,
      "timing": "all day at work",
      "emotion": "overwhelmed",
      "trigger": "workplace requirement"
    },
    {
      "app": "Cup Heroes (game)",
      "timing": "after work until 11pm",
      "emotion": "escapism, loss of time",
      "trigger": "decompression after stressful day",
      "quote": "suddenly 11pm"
    }
  ],
  "patterns": [
    "Morning phone habit (Instagram + email before leaving)",
    "Stress-escape cycle (work stress → gaming)",
    "Notification overload (Slack)"
  ],
  "suggested_meldar_apps": [
    "Morning routine timer (delay Instagram by 15 min)",
    "Slack notification filter (batch non-urgent to hourly digest)",
    "Evening wind-down alarm (Cup Heroes reminder at 10pm)"
  ]
}
```

### Why Voice Is Richer Than Screenshots

Screenshots give you **what**. Voice gives you **what + why + how it feels**.

- "Instagram 2h 14m" (screenshot) vs. "I know I shouldn't but I can't stop scrolling Instagram every morning" (voice) — the voice version tells us this is a **compulsion** the user wants to break, not just a number
- The emotional weight ("stresses me out", "drives me crazy", "suddenly 11pm") lets Meldar **prioritize** which pain points to address first
- Relationships and social dynamics ("my partner gets annoyed", "all my friends use it") are invisible in screenshots but critical for solution design

---

## 5. Screen Recording as Input

### How It Would Work

User screen-records themselves scrolling through **Settings > Screen Time** on their iPhone (or Digital Wellbeing on Android), then uploads the video. Claude extracts all the data from the frames.

### Technical Approach

Claude cannot process video files directly. The pipeline:

1. User uploads video (MP4/WebM, typically 15-30 seconds)
2. Server extracts frames using FFmpeg (`ffmpeg -i input.mp4 -vf "fps=2" frame_%04d.jpg`)
3. Frames sent to Claude Vision API as images
4. Claude reads the Screen Time UI and extracts structured data

### Frame Sampling Strategy

- **Screen Time scrolling**: UI changes slowly. **1-2 fps is sufficient.**
- A 30-second video at 2 fps = 60 frames
- Each frame at 1092x1092 = ~1,590 tokens
- Total: 60 frames x 1,590 tokens = ~95,400 input tokens

### Cost Analysis

Using Claude Sonnet 4.6 ($3/MTok input, $15/MTok output):

| Scenario | Frames | Input Tokens | Output Tokens | Total Cost |
|----------|--------|-------------|---------------|------------|
| 15s video, 1 fps | 15 | ~24k | ~2k | ~$0.10 |
| 30s video, 1 fps | 30 | ~48k | ~3k | ~$0.19 |
| 30s video, 2 fps | 60 | ~95k | ~4k | ~$0.35 |
| 30s video, 0.5 fps | 15 | ~24k | ~2k | ~$0.10 |

**Recommendation:** 1 fps is the sweet spot. Most Screen Time data is visible for 2-3 seconds while scrolling. Cost: ~$0.10-0.19 per analysis.

### Comparison to Screenshot

| Method | User Effort | Data Richness | Cost |
|--------|------------|---------------|------|
| Single screenshot | 15 sec | One screen only | ~$0.007 |
| Screen recording (30s) | 30 sec | Full Screen Time data | ~$0.19 |
| Voice memo (60s) | 60 sec | Subjective + emotional | ~$0.01-0.02 |

### Technical Challenges

- **Video upload size**: 30s screen recording ≈ 5-15 MB (within typical upload limits)
- **Frame extraction**: Requires server-side FFmpeg (or client-side with ffmpeg.wasm)
- **UI recognition**: Claude Vision is good at reading UI text, but Screen Time layouts vary by iOS version and language
- **Android variation**: Digital Wellbeing UI is different per manufacturer (Samsung, Pixel, etc.)

---

## 6. Privacy Considerations

### Why Voice Is Uniquely Sensitive

Voice data is **biometric personal data** under GDPR Article 9. A voice recording can identify a person as uniquely as a fingerprint. This puts it in the highest sensitivity category alongside:
- Facial recognition data
- Fingerprints
- Health data

### GDPR Requirements for Voice Processing

| Requirement | How Meldar Should Handle It |
|-------------|---------------------------|
| **Lawful basis** | Explicit consent (Article 9(2)(a)). Not "legitimate interest" — must be explicit opt-in. |
| **Purpose limitation** | "We record your voice solely to transcribe it and extract time-use insights. We do not use it for identification, profiling, or advertising." |
| **Data minimization** | Transcribe immediately, delete audio immediately after. Never store raw audio. |
| **Right to erasure** | User can delete transcript at any time. Audio already deleted. |
| **Right to access** | User can view/download their transcript. |
| **Data protection impact assessment (DPIA)** | Required before launching voice features, given biometric data processing. |
| **Consent withdrawal** | User can withdraw consent; all derived data must be deletable. |

### Privacy-First Architecture

**Option A: Server-Side Transcription (Simpler)**
```
Browser records audio → Upload to Meldar server → Whisper API → Transcript → Claude API
                                                → Delete audio immediately after transcription
```

**Option B: Client-Side Transcription (Maximum Privacy)**
```
Browser records audio → Whisper.cpp (WASM, in-browser) → Transcript text only sent to server → Claude API
                        Audio never leaves the device
```

Option B is the gold standard for privacy. The Whisper WASM model is ~40 MB (one-time download), runs at roughly real-time speed on modern devices, and means **Meldar never touches the raw audio**.

### UX Trust Signals

1. **Recording indicator**: Browser shows mic icon; app shows pulsing red dot
2. **Explicit consent modal**: Before first recording: "Your voice will be transcribed to text. The audio recording will be [deleted immediately / never leave your device]. Only the text transcript is used."
3. **"Audio deleted" confirmation**: After transcription, show: "Audio recording deleted. Only text remains."
4. **No audio playback**: Never store audio for playback. Users should not be able to re-listen. This reinforces that audio is transient.
5. **Transcript review**: Show the transcript and let the user edit/redact before it's analyzed

### Meldar's Positioning Advantage

This aligns perfectly with Meldar's core message: **"Meldar doesn't watch you. You show Meldar."**

Voice input, done right, reinforces this:
- User chooses to speak
- Audio is transient (deleted or never sent)
- User reviews transcript before analysis
- User controls what gets shared

---

## 7. Competitive Landscape

### Voice-Enabled Discovery/Productivity Tools

| Product | Voice Use | Discovery? | Notes |
|---------|----------|-----------|-------|
| **Rosebud** | Voice journaling with AI analysis | Emotional patterns only | CBT/ACT-based. Raised $6M seed (2025). Uses GPT-4o for transcription. |
| **Reflection** | Voice + text journaling | Self-reflection | Focus on personal growth, not productivity/apps. |
| **Otter.ai** | Meeting transcription | No (meeting-focused) | Enterprise-focused. Not general voice-to-insight. |
| **Day One** | Voice memos in journal | No | Traditional journaling. No AI analysis of voice content. |
| **Notion AI** | No native voice | No | Text-focused. Could add voice but hasn't. |
| **Todoist** | Voice task input | No | Converts voice to tasks, not insights. |
| **Screenpipe** | Screen + audio capture | Yes (passive) | Open-source. Records everything continuously. Privacy nightmare for most users. |
| **Ellie (AI therapist)** | Voice conversations | Emotional only | Therapeutic, not productivity. |

### Gap in the Market

**No product combines voice input + time-use discovery + actionable app building.**

- Rosebud comes closest (voice → AI analysis) but focuses on emotional journaling, not "what's eating your time"
- Otter.ai has great voice tech but is meeting-focused
- Screenpipe captures everything passively — opposite of Meldar's consent-first approach

Meldar would be the first to use voice as a **discovery mechanism for time waste**, turning a 60-second voice memo into a personalized Time X-Ray.

---

## 8. Cost Model Comparison

### Per-User Discovery Session Cost

| Method | User Time | API Costs | Total Cost | Data Quality |
|--------|----------|-----------|------------|-------------|
| **Pick Your Pain quiz** | 15 sec | $0.00 | $0.00 | Low (self-reported, no data) |
| **Single screenshot** | 30 sec | ~$0.007 (Claude Vision) | ~$0.007 | Medium (one screen of data) |
| **Voice memo (60s)** | 60 sec | ~$0.006 (Whisper) + ~$0.005 (Claude text) | ~$0.011 | High (subjective + emotional) |
| **Voice memo (client-side STT)** | 60 sec | ~$0.005 (Claude text only) | ~$0.005 | High (same quality, cheaper) |
| **Screen recording (30s)** | 45 sec | ~$0.10-0.19 (Claude Vision, many frames) | ~$0.15 | Very High (full Screen Time data) |
| **Google Takeout upload** | 3 min + wait | ~$0.01-0.05 (parsing + Claude) | ~$0.03 | Very High (comprehensive history) |

### Key Insight

**Voice memo is the best cost/quality ratio in the entire funnel.**

- 4x cheaper than a single screenshot when using client-side STT
- 30x cheaper than screen recording
- Captures emotional and motivational data that no visual method can
- Only 60 seconds of user effort

### Monthly Cost Projection (at Scale)

| Users/Month | Voice Memos | STT Cost (Whisper) | Claude Cost | Total |
|-------------|------------|--------------------| ------------|-------|
| 100 | 100 | $0.60 | $0.50 | $1.10 |
| 1,000 | 1,000 | $6.00 | $5.00 | $11.00 |
| 10,000 | 10,000 | $60.00 | $50.00 | $110.00 |
| 100,000 | 100,000 | $600.00 | $500.00 | $1,100.00 |

Even at 100k users/month, voice discovery costs only ~$1,100/month. This is remarkably cheap.

---

## 9. Recommended Implementation Path

### Phase 1: MVP (Week 1-2)
1. Add "Tell Meldar about your day" button to discovery flow
2. Use MediaRecorder API for browser recording (60s max)
3. Server-side transcription via OpenAI Whisper API
4. Send transcript to Claude with extraction prompt
5. Display structured results (same UI as screenshot analysis)

### Phase 2: Privacy Enhancement (Week 3-4)
1. Add client-side Whisper.cpp WASM option ("Audio stays on your device")
2. Add transcript preview/edit before submission
3. Implement proper GDPR consent flow for voice
4. Add "Audio deleted" confirmation UI

### Phase 3: Richness (Month 2)
1. Guided prompts: "Tell me about your morning routine" → "What about after work?"
2. Multi-turn voice (ask follow-up questions based on first memo)
3. Combine voice insights with screenshot data for richer Time X-Ray
4. A/B test voice vs. screenshot conversion rates

### Phase 4: Screen Recording (Month 3)
1. Add screen recording upload for full Screen Time extraction
2. Server-side frame extraction with FFmpeg
3. Batch frame analysis with Claude Vision
4. Combine all discovery methods into unified Time X-Ray

---

## 10. Open Questions

1. **Language support**: Meldar targets Gen Z globally. Whisper supports 57 languages but accuracy varies. Should voice be English-only at launch?
2. **Accent handling**: Whisper handles accents well for major languages, but Finnish-accented English or code-switching (e.g., Finnish + English) may need testing.
3. **Client-side STT viability**: Whisper.cpp WASM works on desktop Chrome but may be too slow on older mobile devices. Need to benchmark.
4. **Voice + screenshot combo**: Could we prompt users to do both? "Upload your Screen Time screenshot AND tell us how you feel about it" — combining objective data with subjective context.
5. **Returning users**: Should voice memos be periodic? "Check in again next week" — building a longitudinal view of time use.

---

## Sources

- [Claude Vision Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/vision) — Anthropic official docs
- [Claude Models Overview](https://platform.claude.com/docs/en/docs/about-claude/models) — Model capabilities and pricing
- [MediaRecorder API on iOS Safari](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription) — Cross-browser implementation guide
- [MediaRecorder API | WebKit](https://webkit.org/blog/11353/mediarecorder-api/) — Safari support details
- [MediaRecorder API | Can I use](https://caniuse.com/mediarecorder) — Browser compatibility tables
- [Safari ALAC/PCM Codec Support](https://blog.addpipe.com/record-high-quality-audio-in-safari-with-alac-and-pcm-support-via-mediarecorder/) — Lossless recording in Safari
- [OpenAI Whisper API Pricing 2026](https://costgoat.com/pricing/openai-transcription) — STT cost comparison
- [Best Speech-to-Text APIs 2026](https://deepgram.com/learn/best-speech-to-text-apis-2026) — Deepgram comparison guide
- [Best STT APIs 2025 Pricing Comparison](https://vocafuse.com/blog/best-speech-to-text-api-comparison-2025/) — VocaFuse pricing breakdown
- [Claude AI Voice Mode 2026](https://weesperneonflow.ai/en/blog/2026-02-23-claude-ai-voice-mode-2026-features-vs-dedicated-dictation/) — Consumer voice mode details
- [Anthropic Voice Mode for Claude Code](https://winbuzzer.com/2026/03/04/anthropic-rolls-out-voice-mode-claude-code-xcxwbn/) — Claude Code voice launch
- [Anthropic Voice Mode Launch (TechCrunch)](https://techcrunch.com/2025/05/27/anthropic-launches-a-voice-mode-for-claude/) — Original voice mode announcement
- [AI Journaling Apps Compared 2026](https://www.reflection.app/blog/ai-journaling-apps-compared) — Rosebud, Reflection, Mindsera comparison
- [Best AI Journaling Apps 2026](https://www.aijournalapp.ai/blog/best-ai-journal-apps/) — Market overview
- [Rosebud AI Journal](https://www.rosebud.app/blog/ai-journaling-apps) — Voice journaling features
- [GDPR and Speech Datasets](https://waywithwords.net/resource/how-does-gdpr-apply-to-speech-datasets/) — Legal obligations
- [Biometric Data GDPR Compliance](https://gdprlocal.com/biometric-data-gdpr-compliance-made-simple/) — Biometric data rules
- [Voice Data Legal Obligations](https://waywithwords.net/resource/legal-obligations-collecting-voice-data/) — Collecting voice data legally
- [Voice AI Privacy Laws](https://blog.naitive.cloud/voice-ai-privacy-laws-what-businesses-need-to-know/) — Privacy law overview
- [VUI Design Best Practices](https://designlab.com/blog/voice-user-interface-design-best-practices) — Designlab
- [Voice UI Design Guide 2026](https://fuselabcreative.com/voice-user-interface-design-guide-2026/) — Fuselab Creative
- [FFmpeg Video Analysis Skill](https://github.com/fabriqaai/ffmpeg-analyse-video-skill) — Frame extraction for Claude
- [Screenpipe](https://github.com/screenpipe/screenpipe) — Screen + audio capture tool
