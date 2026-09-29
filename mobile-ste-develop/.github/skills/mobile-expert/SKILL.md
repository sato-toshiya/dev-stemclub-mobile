---
name: mobile-expert
description: 'Master mobile engineering skill with Bluetooth/BLE-first guidance and React Native-first defaults. Covers React Native, Flutter, JavaScript, TypeScript, Dart, Kotlin, Java, Swift, Objective-C for cross-platform features, native bridges, BLE flows, performance fixes, architecture choices, and production debugging.'
argument-hint: 'Task + platform + constraints (example: debug RN BLE reconnect flow on Android)'
user-invocable: true
disable-model-invocation: false
---

# Mobile Expert

Expert-level workflow for mobile implementation and troubleshooting across React Native, Flutter, and native iOS/Android, with BLE implementation and debugging as the primary focus.

## When To Use
- Building a new mobile feature and choosing between React Native, Flutter, or native implementation.
- Implementing or debugging Bluetooth/BLE: scan, connect, handshake, auth, OTA, reconnect.
- Designing or fixing JS/native bridge behavior (TurboModules, platform events, threading).
- Improving startup time, runtime performance, memory, or battery behavior.
- Diagnosing release-only bugs on iOS/Android.

## Coverage
- Cross-platform: React Native, Flutter, JavaScript/TypeScript, Dart.
- Native Android: Kotlin, Java.
- Native iOS: Swift, Objective-C/Objective-C++.
- Bluetooth/BLE: GATT lifecycle, security, retries, device-specific edge cases.

## Defaults
- Priority area: Bluetooth/BLE implementation and debugging.
- Default stack recommendation: React Native first, then native modules where needed.
- Language interpretation: "switch" means Swift unless explicitly stated otherwise.

## Decision Path
1. Clarify outcome and constraints.
2. Select implementation path.
3. Implement with platform-safe patterns.
4. Validate with logs, tests, and real-device checks.
5. Harden for release.

## Procedure

### 1. Clarify Outcome And Constraints
Capture:
- Target platforms: iOS, Android, or both.
- Runtime: React Native, Flutter, native, or mixed.
- Non-functional constraints: latency, battery, offline, security, deadline.
- Device constraints: BLE chipset/device model, OS versions, background behavior.

Completion check:
- Problem statement and success metrics are explicit.

### 2. Choose The Implementation Layer
Use this decision logic:
- Default to React Native for shared UI/business logic and fast delivery.
- Use Flutter when requested explicitly or when existing team assets are Flutter-heavy.
- Use native Kotlin/Java/Swift/Objective-C when low-level APIs, lifecycle control, or performance guarantees are required.
- Use bridge layer when JS UI must control native capability (BLE, camera, sensors, cryptography).

Completion check:
- A clear rationale exists for chosen layer and fallback path.

### 3. Implement Safely
For React Native:
- Keep business logic in feature modules and predictable state management.
- Isolate native calls in bridge/service wrappers.
- Ensure listener setup/teardown is deterministic.

For Flutter:
- Keep platform channels thin.
- Centralize state and side effects.
- Gate platform-specific behavior by OS capability checks.

For native modules:
- Kotlin/Java: ensure thread-safe callbacks and lifecycle cleanup.
- Swift/Objective-C: enforce main-thread UI updates and retain-cycle safety.
- Bridge contracts: define event payload schemas and error codes.

Completion check:
- Interfaces are typed, errors are mapped, and lifecycle cleanup exists.

### 4. Bluetooth/BLE Implementation Checklist
1. Permission and adapter state gate.
2. Scan strategy (balanced vs low latency) with timeout.
3. Deterministic connect sequence.
4. Service/characteristic discovery validation.
5. Handshake/auth (if protocol requires).
6. Command queue with retry/backoff and idempotency.
7. Disconnect/reconnect policy with reason codes.
8. Telemetry and failure logs for field debugging.

BLE quality checks:
- Works on at least one real iOS device and one real Android device.
- Handles intermittent disconnects without app restart.
- Handles background/foreground transitions safely.
- Fails with actionable error messages, not generic timeouts.

### 5. Performance And Reliability Pass
- Measure startup, interaction latency, memory, and battery impact.
- Remove unnecessary renders/rebuilds.
- Batch and debounce BLE/network operations where safe.
- Add guardrails for race conditions and stale callbacks.

Completion check:
- Measurable regression-free behavior in target flows.

### 6. Release Readiness
- Verify environment flags and build variants.
- Run lint/tests and targeted device tests.
- Validate crash/analytics logging around modified flows.
- Confirm rollback plan if release risk is high.

Completion check:
- Release checklist signed off with known risks documented.

## Output Format For Requests
When invoked, produce:
1. Recommended layer choice and rationale.
2. Step-by-step implementation plan.
3. Platform-specific risks and mitigations.
4. Minimal validation matrix (devices, OS versions, scenarios).
5. If debugging: likely root causes ranked by probability.

## Example Prompts
- `/mobile-expert add BLE reconnect with exponential backoff for React Native on Android`
- `/mobile-expert decide RN vs native iOS for background Bluetooth sync`
- `/mobile-expert optimize Flutter scan screen battery usage`
- `/mobile-expert debug random disconnect after GATT discovery`

## Notes
- "switch" in requests is interpreted as "Swift" unless the user specifies Nintendo Switch platform development.
- Prioritize real-device validation for any BLE conclusion.
