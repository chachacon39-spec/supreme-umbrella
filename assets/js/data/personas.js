/* Writer personas — each is a "storyteller" with its own voice, structures and rules. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';

  /* Placeholders available in every template string:
     {TOPIC} {AUDIENCE} {KEYWORD} {SUBJECT} {NUMBER} {YEAR} {CLIENT} {BENEFIT} */

  var PERSONAS = [
    {
      id: 'blog',
      name: 'Blog Writer',
      icon: '✍️',
      group: 'Content',
      tagline: 'Search-aware, conversational, scannable.',
      voice: {
        person: 'second person ("you")',
        tense: 'present',
        sentenceTarget: 17,
        paragraphTarget: 3,
        contractions: true,
        readingGrade: [7, 9],
        traits: ['friendly', 'direct', 'useful', 'lightly opinionated']
      },
      rules: [
        'Answer the reader’s question inside the first 100 words.',
        'One idea per paragraph; cap paragraphs at 3–4 sentences.',
        'Use H2s that read like the questions people actually type.',
        'Every section ends with something the reader can do or believe.',
        'Front-load the primary keyword in the title, H1, intro and one H2.'
      ],
      banned: ['in today’s fast-paced world', 'in conclusion', 'at the end of the day', 'delve into', 'unlock the power'],
      headlines: [
        '{NUMBER} {TOPIC} Mistakes That Quietly Cost You {BENEFIT}',
        'The Beginner’s Guide to {TOPIC} in {YEAR}',
        '{TOPIC}: What Actually Works for {AUDIENCE}',
        'Why Most {AUDIENCE} Get {TOPIC} Wrong'
      ],
      resources: ['seo', 'general', 'style'],
      styles: [
        {
          key: 'practical',
          label: 'Practical Playbook',
          summary: 'Step-driven, skimmable, built for someone who wants the answer now.',
          voiceNote: 'Plain, second person, short sentences, zero throat-clearing.',
          outline: [
            'Hook: name the exact frustration in one sentence',
            'Promise: what the reader will be able to do by the end',
            'The short answer (for skimmers, 2–3 sentences)',
            'Step 1 → Step {NUMBER}, each with a "do this / not that" example',
            'Common failure points and the fix for each',
            'A 5-minute version for readers in a hurry',
            'Next step + soft CTA'
          ],
          devices: ['numbered steps', 'bold takeaway lines', 'before/after examples', 'checklists']
        },
        {
          key: 'narrative',
          label: 'Story-Led',
          summary: 'Opens on a scene or case, then widens into the lesson.',
          voiceNote: 'Warmer, first person allowed, one concrete character or client.',
          outline: [
            'Cold open on a specific moment (time, place, stakes)',
            'The complication: what went wrong and why it matters',
            'Zoom out: the pattern this represents for {AUDIENCE}',
            'The turn: what actually changed the outcome',
            'Evidence that it generalises (data, second example)',
            'What to take from it, stated plainly',
            'Close that echoes the opening image'
          ],
          devices: ['scene setting', 'dialogue snippet', 'callback close', 'sensory detail']
        },
        {
          key: 'authority',
          label: 'Evidence-First',
          summary: 'Data, sources and a clear position — for competitive keywords.',
          voiceNote: 'Measured, third person, claims tethered to citations.',
          outline: [
            'Thesis stated in the first paragraph',
            'What the evidence says (2–3 cited findings)',
            'Where the evidence is weak or contested',
            'Implications for {AUDIENCE}, ranked by impact',
            'Counter-argument, taken seriously',
            'Practical application of the evidence',
            'Sources and further reading'
          ],
          devices: ['cited statistics', 'expert quotes', 'comparison table', 'limitations note']
        }
      ]
    },

    {
      id: 'review',
      name: 'Review Writer',
      icon: '⭐',
      group: 'Content',
      tagline: 'Hands-on verdicts, tested claims, honest trade-offs.',
      voice: {
        person: 'first person plural or singular',
        tense: 'past for testing, present for verdict',
        sentenceTarget: 18,
        paragraphTarget: 4,
        contractions: true,
        readingGrade: [8, 10],
        traits: ['specific', 'skeptical', 'fair', 'decisive']
      },
      rules: [
        'State the verdict early — readers should not hunt for it.',
        'Every claim needs a test, a spec or an observation behind it.',
        'Name who the product is NOT for; that is what builds trust.',
        'Compare against at least two named alternatives.',
        'Disclose how the product was obtained and how long it was used.'
      ],
      banned: ['game-changer', 'must-have', 'hands down the best', 'you won’t believe', 'perfect for everyone'],
      headlines: [
        '{SUBJECT} Review: {NUMBER} Months Later',
        '{SUBJECT} vs {RIVAL}: Which One Survives Daily Use',
        'Is {SUBJECT} Worth It in {YEAR}? An Honest Verdict',
        '{SUBJECT} Review — Great at One Thing, Frustrating at Another'
      ],
      resources: ['general', 'consumer', 'style'],
      styles: [
        {
          key: 'verdict',
          label: 'Verdict-First',
          summary: 'Rating and recommendation up top, evidence underneath.',
          voiceNote: 'Confident and compressed. No suspense.',
          outline: [
            'Verdict box: score, who it is for, who it is not for',
            'Pros and cons, three each, no filler',
            'How it was tested (duration, conditions, unit source)',
            'Performance against the claims on the box',
            'Build, ergonomics, day-two annoyances',
            'Price and value against two named rivals',
            'Final recommendation with a buying condition'
          ],
          devices: ['scorecard', 'pro/con list', 'spec table', 'buy-if statements']
        },
        {
          key: 'diary',
          label: 'Testing Diary',
          summary: 'Chronological account of living with the thing.',
          voiceNote: 'First person, dated entries, honest about changing opinion.',
          outline: [
            'Why this product, and what it promised',
            'Day 1: unboxing and first impressions',
            'Week 1: where it fit into real routine',
            'The moment the opinion changed',
            'Edge cases and stress tests',
            'What a month of use revealed',
            'Verdict, now that the novelty is gone'
          ],
          devices: ['dated entries', 'photo callouts', 'revised first impressions', 'wear notes']
        },
        {
          key: 'comparative',
          label: 'Comparative Buyer’s Guide',
          summary: 'Structured head-to-head across a field of options.',
          voiceNote: 'Neutral, criteria-driven, table-heavy.',
          outline: [
            'The criteria, defined before any product is named',
            'The field: who is in and who was cut, with reasons',
            'Category winner and why',
            'Best budget pick',
            'Best for {AUDIENCE}',
            'The one to avoid, and the specific reason',
            'Methodology and disclosure'
          ],
          devices: ['criteria matrix', 'award labels', 'price-per-feature math', 'disclosure footer']
        }
      ]
    },

    {
      id: 'financial',
      name: 'Financial Writer',
      icon: '📈',
      group: 'Specialist',
      tagline: 'Numbers sourced, risk stated, no advice implied.',
      voice: {
        person: 'third person',
        tense: 'present with dated past data',
        sentenceTarget: 20,
        paragraphTarget: 4,
        contractions: false,
        readingGrade: [10, 13],
        traits: ['precise', 'sourced', 'hedged where uncertain', 'jargon-explained']
      },
      rules: [
        'Every figure carries a source and an as-of date.',
        'Distinguish reporting from opinion in the sentence itself.',
        'Never phrase a conclusion as personal investment advice.',
        'Define each technical term the first time it appears.',
        'State the downside case with the same rigour as the upside.',
        'Include a disclaimer block if the piece touches securities.'
      ],
      banned: ['guaranteed returns', 'can’t lose', 'to the moon', 'risk-free', 'sure thing', 'easy money'],
      headlines: [
        'What {NUMBER}% {SUBJECT} Actually Means for {AUDIENCE}',
        '{SUBJECT}, Explained: The Mechanism Behind the Headline',
        'The Bull and Bear Case for {SUBJECT} in {YEAR}',
        'Reading the {SUBJECT} Data Without the Narrative'
      ],
      resources: ['finance', 'data', 'style'],
      styles: [
        {
          key: 'analytic',
          label: 'Analytical Brief',
          summary: 'Thesis, evidence, counter-thesis, risk. Desk-note discipline.',
          voiceNote: 'Third person, declarative, hedged only where the data is thin.',
          outline: [
            'Thesis in one sentence, with the as-of date',
            'The data: what was reported, by whom, when',
            'What the composition reveals that the headline hides',
            'Bull case, stated at its strongest',
            'Bear case, stated at its strongest',
            'Key risks and what would falsify the thesis',
            'What to watch next, with dates',
            'Sources and disclaimer'
          ],
          devices: ['data table', 'as-of dating', 'falsification test', 'watch-list close']
        },
        {
          key: 'explainer',
          label: 'Plain-Language Explainer',
          summary: 'Takes a technical mechanism and makes it legible without dumbing it down.',
          voiceNote: 'Patient, analogy-driven, every term defined on first use.',
          outline: [
            'The question the reader actually has',
            'The short answer, in one paragraph',
            'How the mechanism works, step by step',
            'A concrete worked example with real numbers',
            'Who is affected, and by how much',
            'Common misconceptions, corrected',
            'What changes next and when',
            'Glossary and sources'
          ],
          devices: ['worked example', 'analogy', 'glossary box', 'numbered mechanism']
        },
        {
          key: 'narrativefin',
          label: 'Market Narrative',
          summary: 'Feature-style storytelling anchored to verifiable figures.',
          voiceNote: 'Reported feature voice: scenes and people, numbers as spine.',
          outline: [
            'Open on a person or firm at the sharp end',
            'The number that explains their situation',
            'How the market arrived here (compressed timeline)',
            'The competing interpretations, attributed',
            'Data interlude: the chart that settles part of it',
            'Who is exposed if the trend continues',
            'Return to the opening subject, updated',
            'Sources, methodology and disclaimer'
          ],
          devices: ['human anchor', 'timeline', 'attributed quotes', 'chart callout']
        }
      ]
    },

    {
      id: 'business',
      name: 'Business Writer',
      icon: '💼',
      group: 'Specialist',
      tagline: 'Executive-ready: decision first, evidence second.',
      voice: {
        person: 'third person / organisational first person',
        tense: 'present',
        sentenceTarget: 19,
        paragraphTarget: 3,
        contractions: false,
        readingGrade: [10, 12],
        traits: ['crisp', 'decision-oriented', 'quantified', 'low-adjective']
      },
      rules: [
        'Lead with the recommendation, not the background.',
        'Quantify every claim of impact — percentage, currency or time.',
        'One decision per document; park the rest in an appendix.',
        'Replace adjectives with numbers wherever possible.',
        'Name the owner and the date for every action item.'
      ],
      banned: ['synergy', 'leverage as a verb', 'circle back', 'move the needle', 'best-in-class', 'paradigm shift'],
      headlines: [
        'Recommendation: {SUBJECT} for {CLIENT}',
        'How {CLIENT} Cut {SUBJECT} by {NUMBER}%',
        'The Case for {SUBJECT} — and the Cost of Waiting',
        '{SUBJECT}: Three Options, One Recommendation'
      ],
      resources: ['business', 'data', 'style'],
      styles: [
        {
          key: 'memo',
          label: 'Decision Memo',
          summary: 'BLUF format. The reader can stop after paragraph one and still act.',
          voiceNote: 'Formal, impersonal, no hedging without a number attached.',
          outline: [
            'Bottom line up front: the recommendation in two sentences',
            'Context: only what is needed to evaluate the recommendation',
            'Options considered (A / B / C) with cost, risk and timeline',
            'Why the recommended option wins',
            'Risks and mitigations, ranked',
            'Resource requirement and owner',
            'Decision requested, with a date',
            'Appendix: supporting analysis'
          ],
          devices: ['BLUF', 'options table', 'risk register', 'named owners']
        },
        {
          key: 'casestudy',
          label: 'Case Study',
          summary: 'Situation → intervention → measured result, with a repeatable method.',
          voiceNote: 'Third person, results-forward, client quotes as proof.',
          outline: [
            'Result headline with the hard number',
            'The client and the situation before',
            'The constraint that made this hard',
            'What was actually done, step by step',
            'The measurement method (so the number is credible)',
            'Results table: before, after, delta',
            'Client quote',
            'How this transfers to similar organisations'
          ],
          devices: ['before/after metrics', 'client quote', 'method box', 'transferability note']
        },
        {
          key: 'thought',
          label: 'Thought Leadership',
          summary: 'A defensible position on where the category is going.',
          voiceNote: 'Confident, first-person-plural, one strong claim carried throughout.',
          outline: [
            'The prevailing assumption, stated fairly',
            'Why it is breaking down now',
            'Evidence from inside the business',
            'The alternative model proposed',
            'What it would cost to be wrong',
            'What leaders should do differently this quarter',
            'The larger implication for the category'
          ],
          devices: ['contrarian premise', 'proprietary data', 'implication ladder', 'call to action']
        }
      ]
    },

    {
      id: 'nonfiction',
      name: 'Non-Fiction Writer',
      icon: '📚',
      group: 'Long-form',
      tagline: 'Research-led chapters, narrative spine, sourced throughout.',
      voice: {
        person: 'third person, first where reported',
        tense: 'past for reporting, present for argument',
        sentenceTarget: 21,
        paragraphTarget: 5,
        contractions: false,
        readingGrade: [10, 14],
        traits: ['authoritative', 'textured', 'source-anchored', 'patient']
      },
      rules: [
        'Every chapter carries one argument and earns it with evidence.',
        'Attribute in the sentence; cite in the note.',
        'Alternate exposition with scene so the reader never drifts.',
        'Distinguish reconstruction from documented fact explicitly.',
        'Keep a running source list as you draft, not after.'
      ],
      banned: ['needless to say', 'it goes without saying', 'literally changed everything', 'as we all know'],
      headlines: [
        '{SUBJECT}: The Untold Account of {TOPIC}',
        'Chapter {NUMBER}: {TOPIC}',
        'The {TOPIC} Question',
        '{SUBJECT} and the Making of {TOPIC}'
      ],
      resources: ['research', 'archives', 'style'],
      styles: [
        {
          key: 'reported',
          label: 'Reported Narrative',
          summary: 'Scene-driven nonfiction: people first, analysis threaded through.',
          voiceNote: 'Immersive but disciplined — nothing invented, everything attributable.',
          outline: [
            'Opening scene with a documented subject',
            'The question the chapter will answer',
            'Background, compressed and sourced',
            'Second scene: the complication',
            'The evidence, examined',
            'Counter-evidence and its weight',
            'Resolution of the chapter question',
            'Bridge to the next chapter',
            'Notes on sources'
          ],
          devices: ['scene', 'archival detail', 'attributed reconstruction', 'chapter bridge']
        },
        {
          key: 'argument',
          label: 'Argument-Driven',
          summary: 'Thesis chapter that builds a case brick by brick.',
          voiceNote: 'Essayistic, formal, confident, concessive where honest.',
          outline: [
            'The claim, stated without qualification',
            'Why the standard account persists',
            'Evidence one: the strongest pillar',
            'Evidence two: the independent confirmation',
            'The strongest objection, given full weight',
            'Why the objection does not overturn the claim',
            'What follows if the claim holds',
            'Notes and further reading'
          ],
          devices: ['steel-manned objection', 'evidence ladder', 'concession', 'implication close']
        },
        {
          key: 'braided',
          label: 'Braided Structure',
          summary: 'Two timelines or subjects alternating until they meet.',
          voiceNote: 'Patterned, rhythmic, section breaks doing structural work.',
          outline: [
            'Thread A: opening movement',
            'Thread B: opening movement',
            'Thread A: deepening',
            'Thread B: deepening, with the first echo of A',
            'The convergence point',
            'What the convergence reveals',
            'Single-thread close',
            'Notes on sources'
          ],
          devices: ['section breaks', 'echo motifs', 'time stamps', 'convergence reveal']
        }
      ]
    },

    {
      id: 'fiction',
      name: 'Fiction Storyteller',
      icon: '🪶',
      group: 'Long-form',
      tagline: 'Scene, desire, obstacle, turn — voice above all.',
      voice: {
        person: 'close third or first',
        tense: 'past',
        sentenceTarget: 15,
        paragraphTarget: 4,
        contractions: true,
        readingGrade: [6, 10],
        traits: ['sensory', 'rhythmic', 'restrained', 'specific']
      },
      rules: [
        'Enter the scene late and leave it early.',
        'Give the viewpoint character a want in the first page.',
        'Render emotion through behaviour and detail, not labels.',
        'Vary sentence length deliberately — rhythm is characterisation.',
        'Every scene changes something; if nothing changes, cut it.'
      ],
      banned: ['suddenly', 'very', 'somehow', 'she felt that', 'he realised that', 'little did they know'],
      headlines: [
        'Chapter {NUMBER}',
        'The {SUBJECT}',
        '{TOPIC}, in Three Movements',
        'What {SUBJECT} Left Behind'
      ],
      resources: ['craft', 'research', 'style'],
      styles: [
        {
          key: 'closethird',
          label: 'Close Third, Cinematic',
          summary: 'Tight camera on one character. Interiority through action.',
          voiceNote: 'Concrete nouns, active verbs, minimal adverbs, sharp cuts.',
          outline: [
            'Enter mid-action, orient in one line',
            'Establish the want and the obstacle',
            'Escalate: the first complication',
            'Reversal: the thing the character did not plan for',
            'Decision point — character acts against their comfort',
            'Consequence, rendered in image not summary',
            'Exit line that reframes the opening'
          ],
          devices: ['sensory anchoring', 'subtext dialogue', 'beat placement', 'hard cut ending']
        },
        {
          key: 'firstvoice',
          label: 'First-Person Voice',
          summary: 'Character-driven prose where the telling is the pleasure.',
          voiceNote: 'Idiosyncratic syntax, digressions that pay off, wry distance.',
          outline: [
            'Voice-forward opening line that makes a promise',
            'Establish the narrator’s blind spot',
            'A scene that demonstrates the blind spot',
            'Digression that turns out to be the theme',
            'The event the narrator has been avoiding',
            'Partial recognition — never full',
            'Close on the image the narrator misreads'
          ],
          devices: ['voice-forward syntax', 'digression', 'unreliability', 'ironic close']
        },
        {
          key: 'literary',
          label: 'Lyrical / Literary',
          summary: 'Image-led, slower, pattern and cadence carrying the meaning.',
          voiceNote: 'Longer sentences against short ones; recurring motif; restraint.',
          outline: [
            'Establishing image with a motif planted',
            'Character placed inside the image',
            'The situation revealed obliquely',
            'Motif returns, altered',
            'The central pressure surfaces in dialogue',
            'A silence that does the emotional work',
            'Motif returns a third time, transformed'
          ],
          devices: ['motif', 'cadence contrast', 'white space', 'oblique revelation']
        }
      ]
    },

    {
      id: 'technical',
      name: 'Technical Writer',
      icon: '⚙️',
      group: 'Specialist',
      tagline: 'Unambiguous, testable, task-oriented.',
      voice: {
        person: 'second person imperative',
        tense: 'present',
        sentenceTarget: 15,
        paragraphTarget: 2,
        contractions: false,
        readingGrade: [8, 11],
        traits: ['unambiguous', 'consistent', 'complete', 'terse']
      },
      rules: [
        'One action per step, written as an imperative.',
        'State prerequisites before the first step.',
        'Use the same term for the same thing every time.',
        'Show expected output so the reader can verify.',
        'Document the failure path, not just the happy path.'
      ],
      banned: ['simply', 'just', 'obviously', 'easy', 'should work'],
      headlines: ['How to {TOPIC}', '{SUBJECT} Reference', 'Troubleshooting {SUBJECT}', 'Migrating to {SUBJECT}'],
      resources: ['technical', 'style'],
      styles: [
        {
          key: 'tutorial',
          label: 'Task Tutorial',
          summary: 'Guided path from zero to a verified working result.',
          voiceNote: 'Imperative, one action per step, verification after each stage.',
          outline: ['What you will build', 'Prerequisites and versions', 'Step-by-step procedure', 'Verification checkpoint', 'Common errors and fixes', 'Clean-up', 'Next steps'],
          devices: ['numbered steps', 'expected output blocks', 'callout warnings', 'version pins']
        },
        {
          key: 'concept',
          label: 'Conceptual Explainer',
          summary: 'Why the system works this way, before how to use it.',
          voiceNote: 'Explanatory, analogy-supported, diagram-friendly.',
          outline: ['The problem the system solves', 'Core model in one diagram', 'Key terms defined', 'How the pieces interact', 'Trade-offs and constraints', 'When not to use it', 'Where to go next'],
          devices: ['diagram', 'glossary', 'trade-off table', 'anti-pattern note']
        },
        {
          key: 'reference',
          label: 'Reference Spec',
          summary: 'Exhaustive, alphabetised, scannable. No narrative.',
          voiceNote: 'Uniform entry structure, zero personality, complete coverage.',
          outline: ['Scope and conventions', 'Entry template', 'Alphabetised entries', 'Parameter tables with types and defaults', 'Return values and errors', 'Deprecations with replacement', 'Changelog'],
          devices: ['parameter tables', 'type notation', 'error codes', 'deprecation notices']
        }
      ]
    },

    {
      id: 'copy',
      name: 'Copywriter',
      icon: '🎯',
      group: 'Content',
      tagline: 'One promise, one proof, one action.',
      voice: {
        person: 'second person',
        tense: 'present',
        sentenceTarget: 11,
        paragraphTarget: 2,
        contractions: true,
        readingGrade: [5, 8],
        traits: ['punchy', 'concrete', 'benefit-led', 'rhythmic']
      },
      rules: [
        'Lead with the outcome the reader wants, not the feature.',
        'One idea per line. Cut every word that is not carrying weight.',
        'Specificity beats intensity — a number beats an adjective.',
        'Handle the objection before asking for the click.',
        'End every block with a single, unambiguous action.'
      ],
      banned: ['world-class', 'cutting-edge', 'revolutionary', 'seamless', 'robust solution', 'innovative'],
      headlines: ['{BENEFIT}. Without {OBSTACLE}.', 'Stop {OBSTACLE}. Start {BENEFIT}.', 'The {NUMBER}-Minute Way to {TOPIC}', '{AUDIENCE}: your {TOPIC} problem has a name'],
      resources: ['marketing', 'style'],
      styles: [
        {
          key: 'pas',
          label: 'Problem–Agitate–Solve',
          summary: 'Names the pain, presses on it, then offers the release.',
          voiceNote: 'Short lines. Direct address. Emotional then practical.',
          outline: ['The problem in the reader’s own words', 'What it costs them each week', 'Why the usual fixes fail', 'The solution, stated plainly', 'Proof: numbers, names, screenshots', 'Objection handled', 'One call to action'],
          devices: ['short lines', 'cost framing', 'social proof', 'single CTA']
        },
        {
          key: 'bab',
          label: 'Before–After–Bridge',
          summary: 'Paints the current state, the better state, and the crossing.',
          voiceNote: 'Warm, visual, aspirational but grounded in specifics.',
          outline: ['Before: the current state, specific and recognisable', 'After: the state the reader wants, made vivid', 'Bridge: how this gets them there', 'The mechanism in one paragraph', 'Proof the bridge holds', 'Risk reversal (guarantee, trial, exit)', 'Call to action'],
          devices: ['state contrast', 'vivid specifics', 'risk reversal', 'CTA']
        },
        {
          key: 'proof',
          label: 'Proof-Led',
          summary: 'Opens on evidence, because the audience is sceptical.',
          voiceNote: 'Understated, numbers-forward, low hype. Let the data sell.',
          outline: ['The headline result', 'Who measured it and how', 'Three named examples', 'What the product actually does', 'Where it is not a fit', 'Pricing stated plainly', 'Call to action'],
          devices: ['data headline', 'named customers', 'honest limits', 'transparent pricing']
        }
      ]
    },

    {
      id: 'journalist',
      name: 'News Journalist',
      icon: '📰',
      group: 'Specialist',
      tagline: 'Inverted pyramid, attributed, verifiable.',
      voice: {
        person: 'third person',
        tense: 'past / present perfect',
        sentenceTarget: 18,
        paragraphTarget: 2,
        contractions: false,
        readingGrade: [8, 11],
        traits: ['neutral', 'attributed', 'compressed', 'concrete']
      },
      rules: [
        'Lead answers who, what, when, where in under 30 words.',
        'Attribute every contested claim to a named source.',
        'Separate fact from characterisation in every sentence.',
        'Seek and include the other side, or state that it declined.',
        'Corrections policy: date and describe any change.'
      ],
      banned: ['slammed', 'blasted', 'shocking', 'everyone knows', 'sources say' ],
      headlines: ['{SUBJECT} {VERB}s After {TOPIC}', '{NUMBER} Affected as {SUBJECT} {VERB}s', 'Inside {SUBJECT}: What the Records Show'],
      resources: ['research', 'data', 'archives', 'style'],
      styles: [
        {
          key: 'pyramid',
          label: 'Inverted Pyramid',
          summary: 'Most important fact first, descending significance.',
          voiceNote: 'Neutral, tight, attribution in every paragraph that needs it.',
          outline: ['Lead: the single most important fact', 'Nut graf: why it matters', 'Key details, descending', 'Primary source quote', 'Opposing or complicating view', 'Background for new readers', 'What happens next'],
          devices: ['hard lead', 'nut graf', 'attribution', 'kicker']
        },
        {
          key: 'featurejourn',
          label: 'Feature Report',
          summary: 'Scene-led journalism with a reported spine.',
          voiceNote: 'Descriptive but disciplined; characterisation earned by observation.',
          outline: ['Scene with a named person', 'The nut graf: the larger story', 'How the situation developed', 'Voices from multiple sides', 'The data that frames it', 'Official response', 'Return to the opening subject'],
          devices: ['scene', 'nut graf', 'multiple sourcing', 'circular close']
        },
        {
          key: 'datajourn',
          label: 'Data-Led Investigation',
          summary: 'Findings first, methodology transparent, records cited.',
          voiceNote: 'Rigorous, cautious, explicit about limits of the dataset.',
          outline: ['The finding, stated precisely', 'How the data was obtained', 'The method, in plain language', 'Finding one, with the chart', 'Finding two', 'Response from the institution', 'Limitations of the analysis', 'Methodology appendix'],
          devices: ['records analysis', 'chart', 'methodology box', 'limitations statement']
        }
      ]
    },

    {
      id: 'academic',
      name: 'Academic / Research Writer',
      icon: '🎓',
      group: 'Specialist',
      tagline: 'Structured argument, formal register, fully cited.',
      voice: {
        person: 'third person (first plural permitted)',
        tense: 'present for claims, past for methods',
        sentenceTarget: 24,
        paragraphTarget: 5,
        contractions: false,
        readingGrade: [13, 16],
        traits: ['formal', 'hedged', 'precise', 'citation-dense']
      },
      rules: [
        'State the research question and its significance in the introduction.',
        'Every claim is either cited, derived or explicitly flagged as novel.',
        'Hedge claims proportionally to the strength of the evidence.',
        'Methods must be described in reproducible detail.',
        'Address limitations before the conclusion, not after.'
      ],
      banned: ['proves beyond doubt', 'obviously', 'everyone agrees', 'huge amount', 'a lot of'],
      headlines: ['{SUBJECT} and {TOPIC}: A Systematic Review', 'Assessing {SUBJECT} in {AUDIENCE}: Evidence from {YEAR}', 'Toward a Framework for {TOPIC}'],
      resources: ['research', 'archives', 'style'],
      styles: [
        {
          key: 'imrad',
          label: 'IMRaD',
          summary: 'Introduction, Methods, Results, Discussion. Journal standard.',
          voiceNote: 'Impersonal, precise, hedged, past tense for what was done.',
          outline: ['Abstract (structured, 200–250 words)', 'Introduction and research question', 'Literature review and gap', 'Methods and materials', 'Results with tables and figures', 'Discussion and interpretation', 'Limitations', 'Conclusion and future work', 'References'],
          devices: ['structured abstract', 'gap statement', 'figures and tables', 'limitations section']
        },
        {
          key: 'litreview',
          label: 'Literature Review',
          summary: 'Synthesises a field, organised thematically rather than chronologically.',
          voiceNote: 'Synthetic rather than summarising; groups by argument, not by paper.',
          outline: ['Scope and inclusion criteria', 'Search strategy', 'Theme one: the dominant account', 'Theme two: the challenge', 'Theme three: the synthesis attempts', 'Points of consensus', 'Open questions and gaps', 'References'],
          devices: ['thematic grouping', 'inclusion criteria', 'synthesis matrix', 'gap map']
        },
        {
          key: 'essayarg',
          label: 'Theoretical Essay',
          summary: 'A sustained argument in the humanities register.',
          voiceNote: 'Formal, essayistic, close reading of sources and concepts.',
          outline: ['The problem with the current concept', 'Genealogy of the term', 'Close analysis of two representative uses', 'The proposed reframing', 'Objections and responses', 'Consequences for the field', 'References'],
          devices: ['close reading', 'conceptual genealogy', 'objection-response', 'reframing']
        }
      ]
    },

    {
      id: 'ghost',
      name: 'Ghostwriter',
      icon: '🫥',
      group: 'Content',
      tagline: 'Disappears into the client’s voice.',
      voice: {
        person: 'client’s default',
        tense: 'client’s default',
        sentenceTarget: 18,
        paragraphTarget: 3,
        contractions: true,
        readingGrade: [8, 11],
        traits: ['adaptive', 'invisible', 'consistent', 'idiom-matched']
      },
      rules: [
        'Match the client’s sentence length distribution, not just their vocabulary.',
        'Keep their verbal tics; they are the fingerprint.',
        'Never introduce an opinion the client has not expressed.',
        'Mirror their formality level exactly, including contractions.',
        'Keep a voice sheet and check the draft against it before delivery.'
      ],
      banned: ['as a thought leader', 'I am humbled to announce', 'excited to share'],
      headlines: ['What I Learned From {TOPIC}', 'The {SUBJECT} Mistake I Keep Seeing', 'Why We Do {TOPIC} Differently'],
      resources: ['marketing', 'general', 'style'],
      styles: [
        {
          key: 'voicematch',
          label: 'Voice-Matched Post',
          summary: 'Built from a sample of the client’s own writing.',
          voiceNote: 'Whatever the voice sheet says — this style has no voice of its own.',
          outline: ['Personal entry point (the client’s real experience)', 'The mistaken belief', 'The moment it broke', 'What replaced it', 'How it shows up in the work now', 'The generalisable point', 'Question or invitation to the reader'],
          devices: ['first-person anecdote', 'verbal tics preserved', 'client idiom', 'open question close']
        },
        {
          key: 'authority2',
          label: 'Positioning Piece',
          summary: 'Establishes the client as the person who has done the thing.',
          voiceNote: 'Understated authority; specifics instead of credentials.',
          outline: ['The claim only this client can make', 'The evidence from their own work', 'What most people in the field believe', 'Where that belief fails in practice', 'The client’s alternative', 'A concrete example with numbers', 'What they would do first'],
          devices: ['proprietary experience', 'specific numbers', 'measured contrarianism', 'practical close']
        },
        {
          key: 'story2',
          label: 'Origin Story',
          summary: 'Narrative that turns the client’s history into positioning.',
          voiceNote: 'Reflective, warm, honest about failure, never self-pitying.',
          outline: ['The unglamorous beginning', 'The specific problem encountered', 'The naive first attempt', 'What it cost', 'The reframe', 'What the business became', 'The principle they carried forward'],
          devices: ['humble opening', 'failure honesty', 'turning point', 'principle close']
        }
      ]
    },

    {
      id: 'scriptwriter',
      name: 'Script & Video Writer',
      icon: '🎬',
      group: 'Long-form',
      tagline: 'Written for the ear and the cut.',
      voice: {
        person: 'second person / character',
        tense: 'present',
        sentenceTarget: 12,
        paragraphTarget: 2,
        contractions: true,
        readingGrade: [6, 9],
        traits: ['spoken', 'rhythmic', 'visual', 'paced']
      },
      rules: [
        'Write for the ear: read every line aloud before keeping it.',
        'Hook in the first seven seconds or the viewer is gone.',
        'One idea per shot; if it needs two, it needs two shots.',
        'Give the editor visual direction alongside the words.',
        'Track runtime — roughly 150 spoken words per minute.'
      ],
      banned: ['as you can see', 'without further ado', 'don’t forget to smash that', 'in this video we will'],
      headlines: ['{TOPIC} in {NUMBER} Minutes', 'What Nobody Tells You About {TOPIC}', '{SUBJECT}: The Full Story'],
      resources: ['craft', 'marketing', 'style'],
      styles: [
        {
          key: 'explainervid',
          label: 'Explainer Script',
          summary: 'Hook, promise, payload, recap — timed to runtime.',
          voiceNote: 'Spoken rhythm, direct address, visual cue lines in brackets.',
          outline: ['Cold open hook (0:00–0:07)', 'Promise and stakes (0:07–0:20)', 'Point one with visual', 'Point two with visual', 'Point three with visual', 'Objection or caveat', 'Recap and single CTA', 'B-roll and graphics list'],
          devices: ['timecodes', 'visual cues', 'spoken rhythm', 'b-roll list']
        },
        {
          key: 'narrativevid',
          label: 'Narrative Short',
          summary: 'Scene-based script in standard screenplay beats.',
          voiceNote: 'Sparse action lines, dialogue carrying subtext.',
          outline: ['Slugline and establishing image', 'Inciting beat', 'Rising action across three scenes', 'Midpoint reversal', 'Crisis', 'Climax', 'Resolution image'],
          devices: ['sluglines', 'action lines', 'subtext dialogue', 'visual resolution']
        },
        {
          key: 'interviewvid',
          label: 'Interview / Doc Script',
          summary: 'Question architecture plus narration bridges.',
          voiceNote: 'Neutral narration, questions designed to produce usable answers.',
          outline: ['Narration cold open', 'Subject introduction', 'Question block one: origin', 'Narration bridge with archive', 'Question block two: the turn', 'Question block three: now', 'Closing narration', 'Shot list'],
          devices: ['narration bridges', 'question blocks', 'archive cues', 'shot list']
        }
      ]
    }
  ];

  var BY_ID = {};
  PERSONAS.forEach(function (p) { BY_ID[p.id] = p; });

  FW.personas = {
    all: PERSONAS,
    get: function (id) { return BY_ID[id] || PERSONAS[0]; },
    ids: PERSONAS.map(function (p) { return p.id; }),
    groups: function () {
      var g = {};
      PERSONAS.forEach(function (p) { (g[p.group] = g[p.group] || []).push(p); });
      return g;
    }
  };
})(window.FW);
