# Quill & Ledger

A freelance writer's desk that runs entirely in the browser. No build step, no
server, no account, no network calls — open `index.html` and it works, on a
plane or in a café with bad wifi. Everything you write is stored in that
browser's local storage and never leaves the machine.

```
git clone <this repo>
cd supreme-umbrella
open index.html          # macOS — or double-click it, or:
python3 -m http.server 8000   # then visit http://localhost:8000
```

---

## What it does

### 1. The assignment board

Drag-and-drop columns — **Inbox → Analysed → Drafting → Editing → Client review
→ Delivered**. Each card carries the client, the deadline (with an overdue
warning), the word target against your live word count, and the writer persona
handling it. Cards reorder within a column and move between columns by dragging.

### 2. Brief analysis

Paste a client brief — however messy — and it is read for:

| Extracted | Example the parser handles |
|---|---|
| Word count | `1,200-1,500 words`, `at least 800`, `approx. 2000`, `no more than 600` |
| Deadline | `due March 14, 2026`, `2026-03-14`, `3/14/2026`, `deadline: next Friday` |
| Keywords | `Primary keyword: …`, `SEO terms: …`, quoted focus phrases |
| Audience, tone, point of view | `Audience: …`, `Tone: friendly, authoritative`, `write in second person` |
| Required structure | H2 counts, FAQ, CTA, tables, bullets, images, quotes, link and source counts |
| Deliverables | meta description, headline options |
| Citation style | APA / MLA / Chicago / Harvard / IEEE / Vancouver / AP |
| Reading level | `reading level: grade 8`, `plain English` |
| Instructions & prohibitions | every bulleted or imperative line, split into *must* and *must not* |
| Banned terms | `do not use…`, `avoid…`, `never say…` |

It then reports a **specification confidence score** and a list of **gaps to
raise with the client** — a missing deadline or an unstated audience is a
scope-creep risk, and it says so before you start writing.

### 3. Three approaches to every task

For one brief you get three fully specified, genuinely different ways to write
it — not three rewordings. Each comes with:

- an **angle** and a one-line summary of the approach
- a **voice specification** (person, tense, reading grade, sentence-length
  target, contractions) reconciled against what the brief demands
- a **written opening line** in that voice
- three **headline options**
- a **section-by-section structure** with a per-section word budget derived from
  your word target, and any section the brief requires folded in automatically
- **craft devices** to use, **house rules** to follow, **terms to never use**
- a **fit score** explaining why this approach suits *this* brief
- the **risks** of taking it ("needs a real testing period", "client must
  approve named metrics", "deadline is 2 days out and this needs research time")

Pick one and it scaffolds the outline straight into the editor.

### 4. Twelve writer personas

Blog Writer · Review Writer · Financial Writer · Business Writer · Non-Fiction
Writer · Fiction Storyteller · Technical Writer · Copywriter · News Journalist ·
Academic/Research Writer · Ghostwriter · Script & Video Writer

Each has its own voice model, structural templates, prohibitions and research
libraries. The financial writer will not let a conclusion read as investment
advice; the fiction storyteller flags *suddenly*, *very* and *she felt that*;
the technical writer flags *simply* and *just*. The analyser suggests a persona
from the brief, and you can override it.

### 5. Live checking

Underlines appear as you type — red for errors, amber for warnings, blue dotted
for suggestions — with a filterable list, one-click fixes, **Fix all** for
repeated problems, and per-issue ignore.

- **Grammar** — a/an, subject–verb agreement, its/it's, your/you're,
  their/there/they're, then/than, where/were, could of, double negatives,
  fewer/less, amount/number, comma splices, sentence-initial lowercase
- **Punctuation** — missing or stray spaces, duplicated marks, unbalanced
  quotes and brackets, missing terminal punctuation, decade apostrophes,
  hyphen-as-dash, introductory commas, serial comma per style guide, questions
  ending in a full stop, locale quotation conventions
- **Structure** — repeated words and phrases, duplicate sentences, repeated
  sentence openers, long sentences, dense paragraphs, passive voice, adverb
  pile-ups, expletive openings ("there is…"), and stretches with no transitions
- **Style** — 65 wordy constructions with concise replacements, 50 clichés,
  fillers, hedges, weasel attribution, buried verbs, persona prohibitions, and
  anything the brief explicitly banned
- **Spelling** — common typos plus locale variants for 20 languages
- **Inclusive language** — with a suggested alternative and the reason

### 6. Brief compliance, scored live

The left panel checks your actual draft against the brief, line by line: word
count with how many you are short, whether each keyword has appeared and how
often, whether banned terms are clear, subheading counts, FAQ and CTA and table
presence, link and source counts, reading level against target, point-of-view
markers, plus outline progress against your chosen structure. Anything a
machine should not judge is marked for manual sign-off rather than faked.

### 7. Working tools

- **Summariser** — extractive, so it selects your strongest sentences rather
  than inventing new ones. Paragraph summary, key points, one-line TL;DR, or a
  paragraph-by-paragraph outline, with an adjustable compression ratio and a
  meta-description trimmer.
- **Paraphraser** — six registers (standard, formal, plain English, creative,
  concise, expand) with phrase-level rewrites, register-aware synonyms, clause
  reordering and sentence splitting. Shows a word-level diff of what changed
  and why, and can replace your selection in place.
- **Originality check** — offline. Compares your draft against source material
  you paste in, against every other draft in your workspace (self-plagiarism is
  a real freelance risk), and against itself, using 5-gram shingling. Reports a
  similarity percentage, highlights the matching passages in your draft, flags
  stock phrasing, and builds exact-phrase search links for your most
  distinctive sentences so you can check the live web yourself. It says plainly
  that it cannot search the web.
- **Citation generator** — APA 7, MLA 9, Chicago (both systems), Harvard, IEEE
  and Vancouver, across 11 source types. Pre-fills from a pasted URL or DOI,
  generates in-text forms and a sorted reference list, and inserts either into
  the draft.
- **Image generator** — real generative SVG, made locally, so the output is
  yours with no licence to track: nine background patterns, ten palettes, six
  layouts (title card, pull quote, stat callout, chapter divider, cover mock,
  background) and eight sizes from OG card to book cover. Download SVG or PNG,
  or insert into the draft. Alongside it, a royalty-free finder covering ten
  libraries with their licence terms, and an attribution builder that warns you
  when a licence is not cleared for commercial client work.
- **Readability** — Flesch, Flesch–Kincaid, Gunning Fog, SMOG and ARI, averaged
  into a grade with a plain-language reading, plus sentence-length variance
  ("your rhythm reads as monotonous"), passive and adverb percentages, reading
  and speaking time, and keyword density.

### 8. Backup safety

Everything lives in this browser's `localStorage`. There is no server, which is
the point — but it also means nothing else is keeping a copy, and clearing site
data would take paid client work with it.

So the app tracks it rather than leaving you to remember. A **Backup** button in
the top bar writes the whole workspace — every assignment, draft, version
history, citation and snippet — to a single JSON file, and shows a coloured dot
for the current state. When unbacked work piles up, a banner says exactly what
is at stake: *"1,020 words across 2 assignments exist only in this browser."*

The nudge is driven by **work at risk, not elapsed time** — someone who hasn't
opened the app in a month has nothing new to lose, while someone who wrote 3,000
words this morning has a great deal. It appears when there are 400+ words and no
backup yet, after 7 days with 250+ new words, or after a single long writing
session. Below those thresholds it stays silent. You can snooze it for three
days or switch it off entirely, and the button remains either way.

Importing a backup restores everything and resets the clock.

### 9. Version history

Every draft keeps a rolling set of restore points. One is taken automatically
after roughly 90 seconds of active writing (a throttle, not an idle timer — so
a long uninterrupted session is still captured), on `Ctrl/⌘ + S`, and
immediately **before** anything that rewrites the draft: replacing the outline,
inserting a reference list or an image, applying a paraphrase to a selection,
or running a bulk *Fix all*. Entries are labelled with what happened and how
many words changed, so the list reads as a history rather than a row of
timestamps. Restoring is itself undoable — the draft you had is pushed onto the
history first.

History is bounded by both entry count and bytes, because `localStorage` is a
single shared budget for the whole workspace. Under storage pressure the app
sheds old versions in escalating steps and, if it comes to it, drops history
entirely: a draft that fails to save is lost work, whereas a lost restore point
is an inconvenience. It tells you when this happens rather than failing
silently.

### 10. Typography and export

Seventeen typefaces across serif, sans, mono, accessible (Atkinson
Hyperlegible, OpenDyslexic) and display, with seven deliverable presets
(web article, standard manuscript, academic paper, business report, book page,
screenplay, high legibility). Size, line height, page width, letter spacing and
alignment are all adjustable, with a focus mode that hides both side panels.

Export to **Word (.docx)** — a genuine OOXML package written from scratch, with
heading styles, lists and tables — **PDF** via the print dialog, **HTML**
(standalone, dark-mode aware), **Markdown**, **plain text**, and **email**
(mailto or inline-styled email-safe HTML). Plus a delivery note that assembles
word count, reading level, keyword usage, compliance summary and sources into
one block to paste to the client, and a full JSON workspace backup.

### 11. Reference desk

Fourteen research libraries — academic, archival, financial filings, open data,
business intelligence, technical, search and audience research, marketing,
craft, consumer testing, style guides, verification — each pre-loaded with your
assignment's topic and prioritised for the active persona. Plus 20 language
packs, four style guides, the type library, a word bank (power verbs, sensory
vocabulary, show-don't-tell, transitions grouped by function, headline
formulas, commonly confused pairs), and saved snippets for client voice sheets
and boilerplate.

---

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Ctrl/⌘ + Shift + B / E / R` | Board / Studio / Reference |
| `Ctrl/⌘ + Shift + N`, or `n` | New assignment |
| `Ctrl/⌘ + Shift + D` | Toggle dark mode |
| `Ctrl/⌘ + S` | Save a version to history |
| `Ctrl/⌘ + B / I / U` | Bold / italic / underline |
| `Ctrl/⌘ + Shift + 1/2/3` | Heading level |
| `Ctrl/⌘ + 0` | Back to body text |
| `Ctrl/⌘ + K` | Insert a link |

---

## Tests

```
npm install        # Playwright only — the app itself still has no dependencies
npm test           # 324 assertions, about a minute
```

Three suites, run in order of how fast they fail:

| Suite | Runs in | Covers |
|---|---|---|
| `tests/engines.test.js` | ~0.1s, no browser | Brief parsing, the three-approach generator, the writing checker, summariser, paraphraser, originality, citations, generated artwork, utilities |
| `tests/app.test.js` | ~20s, Chromium | The path a writer actually takes: create, analyse, drag, draft, check, fix, cite, illustrate, export — plus persistence and a 400px viewport |
| `tests/history.test.js` | ~45s, Chromium | Version snapshots, milestone restore points, the storage budget, and behaviour when `localStorage` runs out |
| `tests/backup.test.js` | ~10s, Chromium | When the backup nudge fires and when it stays quiet, snoozing, and restoring a backup into an empty browser profile |

The suites are written against behaviour rather than implementation, and every
assertion reports the value it actually saw, so a CI failure is diagnosable
without reproducing it locally. `tests/harness.js` is about 90 lines; there is
no test framework.

They have teeth: reverting the snapshot throttle to its old debounce, the
reading-level parser to its old regex, citation insertion to `execCommand`, or
the backup at-risk logic each makes the relevant suite fail on the specific
assertion written for it.

They also avoid asserting on incidental quantities. Task ids are random, so the
scaffolded draft differs between runs — an assertion about *total* issue counts
is unstable by construction. Assertions target text the test itself writes.

CI runs the same `npm test` on every pull request (`.github/workflows/test.yml`).

## Architecture

Plain ES5-compatible JavaScript under a single `FW` namespace, loaded as
classic scripts so it runs from `file://` with no bundler, no dependencies and
no network requests.

```
index.html
package.json          Playwright dev dependency and the test scripts
tests/                harness, engine tests, app tests, history tests
assets/css/
  base.css            design tokens, reset, primitives, light + dark themes
  app.css             layout: board, studio, panels, print styles
assets/js/
  util.js             DOM helpers, text segmentation, seeded RNG, storage, downloads
  data/
    personas.js       12 writer personas × 3 style variants each
    lexicons.js       synonyms, wordy phrases, clichés, fillers, transitions,
                      confusables, word bank, style-guide rules
    resources.js      14 research libraries, 20 languages, 17 fonts, licences
  core/
    store.js          state, persistence, pub/sub, import/export
    brief.js          brief → structured, checkable requirements
    styles.js         brief + persona → three specified approaches
    analyzer.js       grammar/punctuation/structure/style checking + readability
    summarize.js      extractive summarisation
    paraphrase.js     six-register rewriting + word-level diff
    originality.js    n-gram shingling, overlap spans, verification links
    citations.js      seven citation styles × 11 source types
    imagegen.js       generative SVG + PNG rasterising + royalty-free sourcing
    export.js         ZIP writer, DOCX/OOXML, Markdown, HTML, email
  ui/
    kit.js            toasts, modals, form primitives
    backup.js         backup status, the nudge banner, export and restore
    board.js          drag-and-drop board, task dialog, approach cards
    editor.js         contenteditable studio, highlighting, compliance panel
    tools.js          tools / citations / images / export panes
    resources.js      reference desk
  app.js              boot, routing, shortcuts
```

Issue highlighting uses the CSS Custom Highlight API, which never touches the
DOM you are typing into; where it is unavailable the issue list and jump-to
still work.

### Browser support

Chromium 105+, Safari 17.2+, Firefox 140+ for highlighting. Everything else
works further back.

---

## What it does not do

It does not write for you. The three approaches are specifications and
structures, not finished prose — the opening lines are there to be rewritten.

The originality checker cannot search the web. It compares your draft against
material you give it and hands you search links for everything else; treating
its "no significant overlap" as clearance would be a mistake.

The paraphraser is rule-based. It will occasionally choose a synonym whose
connotation is wrong, which is why it shows you every change it made.

Every automated suggestion is a prompt to look again, not a verdict.

## Your data

Assignments, drafts, version history, citations and snippets live in this
browser's `localStorage` on this device. Clearing site data deletes them, and
nothing else holds a copy.

The **Backup** button in the top bar writes the lot to one JSON file, and the
app will tell you when unbacked work is accumulating rather than leaving you to
remember. Take it up on that — a backup restores into a completely fresh
browser, which is tested on every run.
