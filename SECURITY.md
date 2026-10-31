# Security Policy & Hardening Guidelines

GatherWise AI is architected with strict, defense-in-depth security principles.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Controls & Protections

### 1. Zero Client-Side Secrets
- All Gemini GenAI API credentials (`GEMINI_API_KEY`) and upstream API calls are executed strictly server-side (`server.ts`).
- No private API keys or operational tokens are exposed in client builds or bundle assets.

### 2. HTTP Security Headers
The server enforces comprehensive security headers on all responses:
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload`
- **X-Content-Type-Options**: `nosniff` (prevents MIME confusion attacks)
- **X-Frame-Options**: `SAMEORIGIN` (prevents malicious clickjacking)
- **X-XSS-Protection**: `1; mode=block`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Restricted hardware access (`camera=(), microphone=(), geolocation=()`)
- **Content-Security-Policy (CSP)**: Strict resource origin validation

### 3. Input Sanitization & XSS Defense
- All input strings submitted to API endpoints (`title`, `speaker`, `dietaryNotes`, `specialRequests`, `instruction`) are cleaned via `sanitizeInput()` in `src/utils/validation.ts`.
- Strips script and style tags, raw HTML tags, `javascript:` pseudo-protocols, and invisible non-printable ASCII control characters.
- Strict payload size limits (2MB JSON limit) prevent payload flood attacks.

### 4. Sliding-Window Rate Limiting & Resource Protection
- Sliding-window rate limiters protect generation endpoints from abuse and brute-force flooding.
- Background memory garbage collection automatically prunes expired IP records every 2 minutes, preventing denial-of-service memory exhaustion.
- Bounded LRU/TTL cache caps at 200 items to protect V8 heap memory.

### 5. Reporting a Vulnerability
To report a security vulnerability or concern, please email `saifankhalfe001@gmail.com` with reproducible steps and technical details. Security reports are reviewed promptly.
