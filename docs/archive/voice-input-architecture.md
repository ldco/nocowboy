# NoCowboy Voice Input — Architecture Plan

## Hard Constraint (non-negotiable)

**Never pay for any external service.** Speech-to-text must run locally and free.
Everything else (native TUI embedding, Windows support) is a "better, later" upgrade — not a blocker.

## Decision

Use **local Whisper (`whisper.cpp`)** as the speech-to-text engine for all phases.
It is free, offline, GPU-accelerated, and never requires an API key or subscription.
Cloud ASR is explicitly out of scope (it violates the hard constraint).

Reference products surveyed:
- **MiMo-Code** (OpenCode fork, like NoCowboy): embedded `/voice`, streaming, but cloud ASR → paid. Reuse its *architecture shape*, not its engine.
- **OSTT** (github.com/kristoferlund/ostt): standalone tool, provider-agnostic, supports **local Whisper** and **OpenCode** harnesses → free path, zero fork code.

## Phased Plan

### Phase 1 — Free voice now (zero fork code)
- Install **OSTT** and configure a **local Whisper model** (no cloud provider).
- Run OSTT in **daemon mode** so the model stays warm (instant transcription).
- Bind a global hotkey: record → transcribe locally → **paste into NoCowboy's prompt**.
- Outcome: working, free, offline voice input on Linux today. No changes to the NoCowboy fork.

### Phase 2 — Native TUI embedding (better UX, later)
- Add a NoCowboy-native `/voice` command using the **same local engine**.
- Pipeline: capture → VAD segmentation → local Whisper → **incremental insert** into the prompt buffer.
- Keep the engine **swappable** behind an interface (default: local whisper.cpp).

### Phase 3 — Windows support (reach, later)
- Bundle per-OS capture + whisper.cpp binaries; handle PATH and `windowsHide` per the CLI Windows spawn rule.

Same free local engine across all phases — later phases are pure UX/reach upgrades, never a cost change.

## Target Architecture (Phase 2, embedded)

```
mic
 │  (1) capture
 ▼
ffmpeg  ── dshow (Win) / alsa|pulse (Linux) / avfoundation (macOS)
 │  raw PCM
 ▼
VAD (Silero or TEN VAD, local)  ── (2) segment on pauses
 │  speech segments
 ▼
whisper.cpp (local, GPU: CUDA/Vulkan/Metal, CPU fallback)  ── (3) speech→text, FREE
 │  text
 ▼
TUI prompt buffer  ── (4) incremental insert ( /voice + hotkey )
```

### Components

| Stage | Component | Cost | Cross-platform |
|---|---|---|---|
| Capture | ffmpeg (bundled) | free | Win/Linux/macOS |
| Segment | Silero VAD or TEN VAD | free | OS-agnostic |
| STT | whisper.cpp (bundled binary + model) | free | Win/Linux/macOS |
| Insert | NoCowboy TUI `/voice` command | free | inherits TUI |

### Engine abstraction (keeps the hard constraint enforceable)

```
interface SttEngine {
  start(): segments stream
  transcribe(segment): text
}
default: LocalWhisper (whisper.cpp)   // free, offline
// any cloud engine is intentionally NOT implemented
```

## Will it work? (decision table)

| Context | Works? | Why |
|---|---|---|
| Linux + NVIDIA (current box) | ✅ | whisper.cpp CUDA; ffmpeg alsa/pulse |
| Linux CPU-only | ✅ | whisper.cpp CPU fallback (slower) |
| macOS | ✅ | whisper.cpp Metal; avfoundation |
| Windows + NVIDIA | ✅ (Phase 3) | whisper.cpp CUDA/Vulkan; ffmpeg dshow; needs per-OS bundling |
| Offline / air-gapped | ✅ | fully local, no network |
| Paid service required | ❌ by design | engine is local-only |

## ISO 25010 Quick Evaluation

- Functional suitability: ✅ dictation covered; voice-commands optional later
- Reliability: ✅ no network dependency
- Performance: ✅ daemon/warm model = low latency; ⚠️ CPU-only is slow
- Usability: ⚠️ Phase 1 paste UX < Phase 2 incremental insert
- Security/Privacy: ✅ audio never leaves the machine
- Compatibility: ✅ Linux/macOS now; Windows Phase 3
- Maintainability: ✅ Phase 1 zero fork code; Phase 2 isolated behind engine interface
- Portability: ⚠️ per-OS binary bundling is the main work

## Edge Cases to Handle (Phase 2)

- No mic / mic busy → clear error, no crash
- Silence / no speech → no empty insert
- Very long utterance → segment streaming, bounded memory
- Model not downloaded → first-run download prompt (local file, not a service)
- GPU unavailable → automatic CPU fallback with a notice
- Hotkey conflict → configurable binding

## Verification Checklist

- [ ] Phase 1: OSTT transcribes locally with **no API key set** and **network disabled**
- [ ] Transcribed text lands in NoCowboy's prompt
- [ ] Daemon mode: second utterance starts without reload
- [ ] Confirm `$0` cost: no provider credentials anywhere in config
- [ ] Phase 2: `/voice` inserts incrementally; engine interface defaults to local Whisper
- [ ] Phase 2: cloud engine is absent (constraint enforced in code, not just config)
- [ ] Phase 3: Windows capture + whisper.cpp run with `windowsHide`

## Migration / Rollback

- Phase 1 is additive and external — rollback = stop using OSTT (nothing in the fork changes).
- Phase 2 lives behind a `/voice` command + feature flag — disable the flag to revert.
- No data migration; recordings/models are local files, safe to delete.
