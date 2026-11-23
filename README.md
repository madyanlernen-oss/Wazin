# Wazan (وزان) — AI Life Governance Platform

## 1. About Wazan / عن وزان

- **Problem (English):** Individuals struggle with burnout, chaotic priorities, and hyper-focusing on one life aspect (such as career or finances) while neglecting physical, family, mental, and spiritual well-being.
- **Solution (English):** Wazan is an Arabic AI-driven life balance platform featuring 8 specialized domain advisors and an integration coordinator agent that builds an interactive Life Wheel and translates holistic self-awareness into actionable habits in Eisenhower Matrix Quadrant 2 (Important & Not Urgent).

- **المشكلة (بالعربية):** يعاني الأفراد من الاحتراق النفسي، وتشتت الأولويات، والتركيز المفرط على جانب حياتي واحد (كالعمل أو المال) على حساب الصحة والأسرة والسكينة النفسية.
- **الحل (بالعربية):** منصة "وزّان" هي منظومة حوكمة وإرشاد استراتيجي للحياة باللغة العربية تضم 8 مستشارين متخصصين بالذكاء الاصطناعي ومنسقاً تكاملياً لبناء عجلة الحياة التفاعلية وتحويل الوعي الذاتي إلى عادات عملية مستدامة في المربع الثاني بمصفوفة أيزنهاور (مهم وغير عاجل).

---

## 2. Quick Start / التشغيل السريع

### Requirements
- Node.js (v18+) or Bun runtime
- npm, pnpm, or bun

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Open .env and insert your GEMINI_API_KEY

# 3. Start development server (serves API & Vite frontend on port 3000)
npm run dev

# Or build for production and start
npm run build
npm start
```

### Scripts (from `package.json`)
- `npm run dev`: Runs `tsx server.ts` (starts the Express API server and Vite middleware).
- `npm run build`: Runs `vite build` (compiles frontend assets to `dist/`).
- `npm run start`: Runs `tsx server.ts` in production mode.
- `npm run preview`: Runs `vite preview`.
- `npm run lint`: Runs `tsc --noEmit` to verify TypeScript types.
- `npm run tunnel`: Runs `cloudflared tunnel --protocol http2 --url http://127.0.0.1:3000` to expose port 3000 externally.
- `npm run clean`: Runs `rm -rf dist server.js`.

**Default Server Port:** `3000` (`http://localhost:3000` or `http://127.0.0.1:3000`).

---

## 3. Environment Variables / المتغيرات البيئية

All variables used in `server.ts`:

| Variable | Required? | Default / Example | Purpose in `server.ts` |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Required** for AI | `""` | API key for Google Gemini accessed via the `@google/genai` SDK (`server.ts:95, 1679`). |
| `GEMINI_MODEL` | Optional | `""` | Preferred Gemini model name. If set and does not contain `'2.5'`, it is injected into the model candidate priority list (`server.ts:1684, 2360, 2530, 2699`). |
| `GROQ_API_KEY` | Optional | `""` | API key for Groq backup provider, called only when Gemini attempts fail (`server.ts:1999`). |
| `GROQ_MODEL` | Optional | `llama-3.3-70b-versatile` | Model name used for Groq backup calls (`server.ts:2001`). |
| `ALLOWED_ORIGINS` | Optional | `""` | Comma-separated list of allowed CORS origins. If unset, defaults to `DEFAULT_ALLOWED_ORIGINS` (`localhost`, `127.0.0.1`, Render origin) (`server.ts:33-34`). |
| `PORT` | Optional | `3000` | HTTP port on which the Express application listens (`server.ts:15`). |
| `NODE_ENV` | Optional | `""` | When set to `production`, `server.ts` serves compiled files from `dist/`; otherwise, Vite dev middleware is mounted (`server.ts:2801`). |

---

## 4. Where AI is Used / مواضع توظيف الذكاء الاصطناعي

Wazan implements a multi-tier resilience pipeline in `server.ts`:

### 1. Primary AI Provider: Google Gemini via `@google/genai`
- Invokes the official `@google/genai` SDK with strict JSON schema enforcement (`responseMimeType: 'application/json'`, `responseSchema: { type: Type.OBJECT, ... }`).
- Candidate models are attempted in this exact order (`server.ts:1687-1697`):
  1. `gemini-flash-lite-latest`
  2. `validUserModel` (value of `process.env.GEMINI_MODEL`, if set and does not include `'2.5'`)
  3. `gemini-flash-latest`
  4. `gemini-2.0-flash`
  5. `gemini-2.0-flash-lite`

### 2. Backup AI Provider: Groq API
- Triggered **only** when Gemini calls fail or timeout, and **only** if `GROQ_API_KEY` is present in the environment (`server.ts:1999-2187`).
- Target model: `process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'`.
- Configured with `response_format: { type: "json_object" }`.

### 3. Last-Resort Fallback: Local Rule-Based Engine (No AI)
- Triggered **only** when both Gemini and Groq fail or when offline (`server.ts:2195-2212`).
- Uses `generateLocalAgentResponse` to parse keywords, length, and context, generating deterministic empathetic Arabic responses without external API calls.
- Every chat response returned by `server.ts` explicitly includes a `"source"` field:
  - `"source": "gemini"`
  - `"source": "groq"`
  - `"source": "local-fallback"` (displayed to users as a `رد احتياطي` badge in `src/screens/AdvisorChatScreen.tsx:814`).

### 4. Advisor Personas Loaded from `Agents/*.md`
System prompts for each of the 8 domain advisors are read directly from markdown files in `Agents/` (`server.ts:1341-1351`):
- `Agents/01-financial.md`: أ. كمال المالي (Financial Independence & Budgeting)
- `Agents/02-health.md`: د. ريان الصحي (Physical Health, Sleep & Nutrition)
- `Agents/03-spiritual.md`: د. سفيان الروحي (Spiritual Serenity & Inner Peace)
- `Agents/04-career.md`: م. طارق المهني (Career Growth & Focus)
- `Agents/05-personal.md`: د. ليلى الذاتية (Self-Awareness & Resilience)
- `Agents/06-learning.md`: بروفيسور زياد المعرفي (Continuous Learning & Critical Thinking)
- `Agents/07-family.md`: د. مريم الأسرية (Family Bonding & Communication)
- `Agents/08-social.md`: أ. سامي الاجتماعي (Social Intelligence & Meaningful Relationships)
- Plus coordinator files: `Agents/09-aggregator.md`, `Agents/10-advisor.md`, `Agents/11-goals-agent.md`.

### 5. API Endpoints under `/api/gemini/*`
- `POST /api/gemini/advisor-chat` (`server.ts:1133`): Handles 8-station clinical assessments and free-form advisor consultations. Dynamically injects persona directives, context history, thinking modes (`quick`, `balanced`, `deep`), self-harm safety protocol overrides, and returns JSON scores (1-10), advice, strengths, challenges, and action steps.
- `POST /api/gemini/director-summary` (`server.ts:2293`): Synthesizes holistic evaluations from Coordinator Agent Eng. Moataz (`م. معتز التكاملي`) across the 8 life dimensions, computing the overall diagnosis, critical bottleneck (`عنق الزجاجة الحياتي`), keystone habit (`العادة المحورية`), and 30-day roadmap.
- `POST /api/gemini/area-deepdive` (`server.ts:2471`): Generates deep strategic analysis for a single selected life dimension based on user evaluation and historical answers.
- `POST /api/gemini/eisenhower-suggestions` (`server.ts:2592`): Analyzes weak life areas and coordinator reports to generate action items for the Eisenhower Matrix (focusing on Quadrant 2: Important & Not Urgent).

---

## 5. Demo Account / الحساب التجريبي

- **Demo Email:** `demo@wazan.com`
- **Demo Password:** `123456`
- **Architecture Notice:**
  - This is a hackathon prototype application.
  - The demo credentials are hardcoded demo checks in client-side authentication code (`src/screens/AuthScreen.tsx:143-165`).
  - There is **no persistent backend database**. All user profiles, life wheel evaluation scores, chat history, and Eisenhower matrix tasks are stored exclusively in the browser's `localStorage` under the `wazan_*` key namespace (`src/utils/storage.ts`).

---

## 6. Tools and Open-Source Libraries / الأدوات والمكتبات

Directly from `package.json`:

### Dependencies
- `@google/genai` (^3.1.0): Official Google Gen AI SDK for Gemini models.
- `@tailwindcss/vite` (^4.3.3): Vite integration for Tailwind CSS v4.
- `@vitejs/plugin-react` (^6.1.1): React support for Vite.
- `canvas-confetti` (^1.9.4) & `@types/canvas-confetti` (^1.9.0): Celebration milestone particle effects.
- `dotenv` (^17.2.3): Environment variable loader.
- `express` (^4.21.2): Backend HTTP server.
- `express-rate-limit` (^8.7.5): IP rate limiting middleware on API routes.
- `lucide-react` (^0.546.0): UI vector icon set.
- `react` (^19.0.1) & `react-dom` (^19.0.1): Core UI library (React 19).
- `tailwindcss` (^4.3.3): Utility-first CSS styling framework.
- `tsx` (^4.21.0): TypeScript execution engine for Node.js.
- `typescript` (^7.0.2): TypeScript language tooling.
- `vite` (^8.3.0): Frontend bundler and development server.

### Dev Dependencies
- `@types/express` (^4.17.21)
- `@types/node` (^22.14.0)
- `@types/react` (^19.3.0)
- `@types/react-dom` (^19.3.0)
- `esbuild` (^0.25.0)
- `pptxgenjs` (^4.0.1)

---

## 7. Known Limitations / القيود الحالية

1. **Client-Side Authentication (Prototype):** User login, signup, and demo verification operate locally in the browser (`src/screens/AuthScreen.tsx`). No backend authentication service or JWT session management is currently deployed.
2. **No Cloud Synchronization:** Because data resides in `localStorage`, clearing browser cache deletes all evaluations and goals. Multi-device account synchronization is not implemented in this prototype.
3. **Monolithic Backend (`server.ts`):** The server is housed in a single file (~2,800 lines) handling routing, prompt assembly, rate limits, SDK invocations, fallback responses, and static SPA asset serving without modular controllers.

---

## 8. Product Requirements Document (PRD)

For in-depth specifications, architectural diagrams, user journeys, acceptance criteria, and clinical safety protocols, refer to:
- [PRD.md](PRD.md)
- [SOP.md](SOP.md)
