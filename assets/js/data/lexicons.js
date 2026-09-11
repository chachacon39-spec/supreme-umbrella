/* Language data: synonyms, confusables, clichés, transitions, rule tables. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';

  /* ---- Synonym bank used by the paraphraser (register-tagged) ---- */
  var SYNONYMS = {
    important: { neutral: ['significant', 'notable', 'key'], formal: ['salient', 'material', 'consequential'], simple: ['big', 'major'], creative: ['weighty', 'pivotal'] },
    big: { neutral: ['large', 'sizeable'], formal: ['substantial', 'considerable'], simple: ['huge'], creative: ['sprawling', 'towering'] },
    small: { neutral: ['minor', 'modest'], formal: ['marginal', 'negligible'], simple: ['tiny'], creative: ['slight', 'pocket-sized'] },
    good: { neutral: ['strong', 'solid'], formal: ['favourable', 'advantageous'], simple: ['great'], creative: ['handsome', 'well-made'] },
    bad: { neutral: ['poor', 'weak'], formal: ['unfavourable', 'deficient'], simple: ['awful'], creative: ['dismal', 'ragged'] },
    show: { neutral: ['demonstrate', 'reveal'], formal: ['indicate', 'evidence'], simple: ['prove'], creative: ['lay bare', 'expose'] },
    use: { neutral: ['apply', 'employ'], formal: ['utilise', 'deploy'], simple: ['work with'], creative: ['press into service'] },
    help: { neutral: ['support', 'assist'], formal: ['facilitate', 'enable'], simple: ['aid'], creative: ['shore up'] },
    make: { neutral: ['create', 'build'], formal: ['produce', 'generate'], simple: ['put together'], creative: ['fashion', 'forge'] },
    get: { neutral: ['obtain', 'receive'], formal: ['acquire', 'secure'], simple: ['pick up'], creative: ['come by'] },
    start: { neutral: ['begin', 'launch'], formal: ['commence', 'initiate'], simple: ['kick off'], creative: ['set in motion'] },
    end: { neutral: ['finish', 'conclude'], formal: ['terminate', 'cease'], simple: ['stop'], creative: ['draw to a close'] },
    change: { neutral: ['shift', 'alter'], formal: ['modify', 'revise'], simple: ['switch'], creative: ['reshape', 'redraw'] },
    increase: { neutral: ['rise', 'grow'], formal: ['escalate', 'appreciate'], simple: ['go up'], creative: ['climb', 'swell'] },
    decrease: { neutral: ['fall', 'decline'], formal: ['diminish', 'contract'], simple: ['drop'], creative: ['ebb', 'shrink'] },
    problem: { neutral: ['issue', 'difficulty'], formal: ['impediment', 'constraint'], simple: ['trouble'], creative: ['snag', 'sticking point'] },
    idea: { neutral: ['concept', 'notion'], formal: ['proposition', 'premise'], simple: ['thought'], creative: ['germ', 'spark'] },
    people: { neutral: ['individuals', 'readers'], formal: ['participants', 'stakeholders'], simple: ['folks'], creative: ['souls'] },
    company: { neutral: ['business', 'firm'], formal: ['organisation', 'enterprise'], simple: ['outfit'], creative: ['house'] },
    money: { neutral: ['funds', 'capital'], formal: ['financial resources', 'expenditure'], simple: ['cash'], creative: ['coin'] },
    result: { neutral: ['outcome', 'effect'], formal: ['consequence', 'upshot'], simple: ['payoff'], creative: ['yield'] },
    think: { neutral: ['believe', 'consider'], formal: ['contend', 'maintain'], simple: ['reckon'], creative: ['suspect'] },
    say: { neutral: ['state', 'note'], formal: ['assert', 'observe'], simple: ['tell'], creative: ['offer', 'venture'] },
    fast: { neutral: ['quick', 'rapid'], formal: ['expeditious', 'accelerated'], simple: ['speedy'], creative: ['headlong'] },
    slow: { neutral: ['gradual', 'unhurried'], formal: ['protracted', 'sluggish'], simple: ['laggy'], creative: ['glacial'] },
    hard: { neutral: ['difficult', 'demanding'], formal: ['arduous', 'exacting'], simple: ['tough'], creative: ['punishing'] },
    easy: { neutral: ['straightforward', 'simple'], formal: ['uncomplicated', 'accessible'], simple: ['no trouble'], creative: ['frictionless'] },
    new: { neutral: ['recent', 'fresh'], formal: ['novel', 'emergent'], simple: ['brand new'], creative: ['unworn'] },
    old: { neutral: ['established', 'long-standing'], formal: ['legacy', 'antecedent'], simple: ['ancient'], creative: ['weathered'] },
    many: { neutral: ['numerous', 'several'], formal: ['a considerable number of', 'multiple'], simple: ['lots of'], creative: ['no end of'] },
    interesting: { neutral: ['notable', 'striking'], formal: ['noteworthy', 'compelling'], simple: ['cool'], creative: ['arresting'] },
    difficult: { neutral: ['challenging', 'tricky'], formal: ['onerous', 'complex'], simple: ['hard'], creative: ['thorny'] },
    improve: { neutral: ['strengthen', 'refine'], formal: ['enhance', 'optimise'], simple: ['fix up'], creative: ['sharpen'] },
    reduce: { neutral: ['cut', 'lower'], formal: ['curtail', 'mitigate'], simple: ['bring down'], creative: ['pare back'] },
    understand: { neutral: ['grasp', 'follow'], formal: ['comprehend', 'appreciate'], simple: ['get'], creative: ['see through'] },
    explain: { neutral: ['describe', 'outline'], formal: ['elucidate', 'set out'], simple: ['spell out'], creative: ['unpack'] },
    find: { neutral: ['identify', 'locate'], formal: ['ascertain', 'determine'], simple: ['spot'], creative: ['turn up'] },
    need: { neutral: ['require', 'call for'], formal: ['necessitate'], simple: ['have to'], creative: ['depend on'] },
    buy: { neutral: ['purchase', 'acquire'], formal: ['procure', 'invest in'], simple: ['pick up'], creative: ['lay hands on'] },
    customer: { neutral: ['client', 'buyer'], formal: ['purchaser', 'account'], simple: ['shopper'], creative: ['patron'] },
  };

  /* ---- Phrase-level rewrites (wordiness → concision) ---- */
  var WORDY = [
    ['in order to', 'to'], ['in order for', 'for'], ['due to the fact that', 'because'],
    ['owing to the fact that', 'because'], ['for the reason that', 'because'],
    ['in spite of the fact that', 'although'], ['despite the fact that', 'although'],
    ['in the event that', 'if'], ['in the near future', 'soon'], ['at this point in time', 'now'],
    ['at the present time', 'now'], ['on a daily basis', 'daily'], ['on a regular basis', 'regularly'],
    ['a large number of', 'many'], ['a majority of', 'most'], ['a small number of', 'a few'],
    ['the vast majority of', 'most'], ['has the ability to', 'can'], ['is able to', 'can'],
    ['are able to', 'can'], ['make a decision', 'decide'], ['take into consideration', 'consider'],
    ['come to the conclusion', 'conclude'], ['give consideration to', 'consider'],
    ['is of the opinion that', 'believes'], ['it is important to note that', ''],
    ['it should be noted that', ''], ['it is worth noting that', ''],
    ['there is no doubt that', 'undoubtedly'], ['in the process of', ''],
    ['with regard to', 'about'], ['with respect to', 'about'], ['in relation to', 'about'],
    ['in terms of', 'for'], ['as a matter of fact', 'in fact'], ['for all intents and purposes', 'effectively'],
    ['each and every', 'every'], ['first and foremost', 'first'], ['null and void', 'void'],
    ['few in number', 'few'], ['completely eliminate', 'eliminate'], ['absolutely essential', 'essential'],
    ['end result', 'result'], ['past history', 'history'], ['future plans', 'plans'],
    ['advance planning', 'planning'], ['close proximity', 'near'], ['basic fundamentals', 'fundamentals'],
    ['unexpected surprise', 'surprise'], ['personal opinion', 'opinion'], ['final outcome', 'outcome'],
    ['in a timely manner', 'promptly'], ['prior to', 'before'], ['subsequent to', 'after'],
    ['in the amount of', 'for'], ['during the course of', 'during'], ['until such time as', 'until'],
    ['is going to', 'will'], ['the reason why is that', 'because'], ['in a manner that is', ''],
    ['a sufficient amount of', 'enough'], ['at all times', 'always'], ['in many cases', 'often'],
    ['in some cases', 'sometimes'], ['the question as to whether', 'whether']
  ];

  /* ---- Filler / hedge / weasel ---- */
  var FILLERS = ['very', 'really', 'quite', 'rather', 'just', 'actually', 'basically', 'literally',
    'simply', 'truly', 'totally', 'definitely', 'certainly', 'absolutely', 'extremely', 'incredibly',
    'somewhat', 'fairly', 'pretty much', 'sort of', 'kind of', 'a bit', 'that said', 'you know'];

  var HEDGES = ['maybe', 'perhaps', 'possibly', 'arguably', 'seemingly', 'somewhat', 'I think',
    'I believe', 'it seems', 'it could be argued', 'more or less', 'in a way', 'to some extent'];

  var WEASEL = ['many experts', 'studies show', 'research suggests', 'it is widely believed',
    'some people say', 'critics argue', 'sources say', 'it is often said', 'most agree',
    'up to', 'as much as', 'helps to', 'may help'];

  /* ---- Clichés ---- */
  var CLICHES = ['at the end of the day', 'think outside the box', 'low-hanging fruit',
    'move the needle', 'circle back', 'boil the ocean', 'in today’s fast-paced world',
    "in today's fast-paced world", 'the tip of the iceberg', 'a double-edged sword',
    'needle in a haystack', 'when all is said and done', 'last but not least',
    'each and every one', 'time will tell', 'only time will tell', 'the fact of the matter is',
    'it goes without saying', 'needless to say', 'avid reader', 'nestled in the heart of',
    'a hidden gem', 'game changer', 'game-changer', 'paradigm shift', 'push the envelope',
    'raise the bar', 'take it to the next level', 'win-win', 'best of both worlds',
    'perfect storm', 'tried and true', 'few and far between', 'par for the course',
    'back to the drawing board', 'the bottom line is', 'unlock the power', 'delve into',
    'in the realm of', 'navigate the complexities', 'a testament to', 'stand the test of time',
    'leaves no stone unturned', 'sea change', 'quantum leap', 'hit the ground running',
    'seamlessly integrate', 'ever-evolving landscape', 'in an era where', 'the world of'];

  /* ---- Commonly confused pairs; handled with context tests in the analyzer ---- */
  var CONFUSABLES = [
    { a: 'their', b: 'there', note: '“their” = possession, “there” = place, “they’re” = they are.' },
    { a: 'your', b: "you're", note: '“your” = possession, “you’re” = you are.' },
    { a: 'its', b: "it's", note: '“its” = possession, “it’s” = it is / it has.' },
    { a: 'affect', b: 'effect', note: '“affect” is usually the verb, “effect” the noun.' },
    { a: 'then', b: 'than', note: '“than” compares, “then” sequences.' },
    { a: 'lose', b: 'loose', note: '“lose” = misplace, “loose” = not tight.' },
    { a: 'complement', b: 'compliment', note: '“complement” completes, “compliment” praises.' },
    { a: 'principal', b: 'principle', note: '“principal” = main/head, “principle” = rule.' },
    { a: 'ensure', b: 'insure', note: '“ensure” = make certain, “insure” = indemnify.' },
    { a: 'discreet', b: 'discrete', note: '“discreet” = tactful, “discrete” = separate.' },
    { a: 'elicit', b: 'illicit', note: '“elicit” = draw out, “illicit” = unlawful.' },
    { a: 'led', b: 'lead', note: 'Past tense of “lead” is “led”.' },
    { a: 'everyday', b: 'every day', note: '“everyday” = ordinary (adj), “every day” = each day.' },
    { a: 'into', b: 'in to', note: '“into” = motion, “in to” = separate words after a verb.' },
    { a: 'farther', b: 'further', note: '“farther” = distance, “further” = degree.' },
    { a: 'fewer', b: 'less', note: '“fewer” for countable, “less” for uncountable.' },
    { a: 'who', b: 'whom', note: '“who” = subject, “whom” = object.' },
    { a: 'comprise', b: 'compose', note: 'The whole comprises the parts; the parts compose the whole.' },
    { a: 'peak', b: 'pique', note: '“pique” interest; “peak” is a summit.' },
    { a: 'accept', b: 'except', note: '“accept” = receive, “except” = excluding.' },
    { a: 'advice', b: 'advise', note: '“advice” = noun, “advise” = verb.' },
    { a: 'cite', b: 'site', note: '“cite” = reference, “site” = place.' },
    { a: 'stationary', b: 'stationery', note: '“stationary” = still, “stationery” = paper.' },
    { a: 'bare', b: 'bear', note: '“bear with me”, not “bare with me”.' }
  ];

  /* ---- Irregular past participles for passive-voice detection ---- */
  var PARTICIPLES = ['been', 'given', 'taken', 'made', 'done', 'seen', 'known', 'shown', 'written',
    'held', 'told', 'found', 'built', 'sold', 'sent', 'kept', 'left', 'paid', 'put', 'read', 'run',
    'said', 'set', 'brought', 'bought', 'caught', 'taught', 'thought', 'chosen', 'driven', 'eaten',
    'fallen', 'forgotten', 'hidden', 'proven', 'spoken', 'stolen', 'broken', 'begun', 'drawn',
    'grown', 'thrown', 'worn', 'won', 'understood', 'lost', 'met', 'led', 'felt', 'meant', 'heard'];

  var BE_FORMS = ['is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', "isn't", "aren't", "wasn't", "weren't"];

  /* ---- Transitions, grouped by function ---- */
  var TRANSITIONS = {
    'Addition': ['also', 'moreover', 'in addition', 'furthermore', 'what is more', 'beyond that', 'equally', 'similarly'],
    'Contrast': ['but', 'yet', 'however', 'still', 'even so', 'on the other hand', 'by contrast', 'that said', 'and yet', 'conversely'],
    'Cause': ['because', 'since', 'as', 'given that', 'for that reason', 'which is why'],
    'Effect': ['so', 'therefore', 'as a result', 'consequently', 'which means', 'the upshot is'],
    'Sequence': ['first', 'next', 'then', 'after that', 'meanwhile', 'eventually', 'finally', 'once that is done'],
    'Example': ['for example', 'for instance', 'take', 'consider', 'to see why', 'say'],
    'Emphasis': ['above all', 'more importantly', 'crucially', 'the point is', 'note that'],
    'Concession': ['admittedly', 'granted', 'to be fair', 'of course', 'it is true that', 'while'],
    'Summary': ['in short', 'put simply', 'the short version', 'all told', 'taken together', 'on balance'],
    'Time': ['before', 'after', 'until', 'by then', 'since then', 'at the time', 'within a year']
  };

  /* ---- Power / sensory / emotion words for the word bank ---- */
  var WORD_BANK = {
    'Power verbs': ['sharpen', 'dismantle', 'anchor', 'unravel', 'compound', 'accelerate', 'undercut', 'expose', 'reframe', 'consolidate', 'fracture', 'engineer', 'trace', 'surface', 'reconcile', 'displace'],
    'Precision nouns': ['threshold', 'margin', 'cadence', 'constraint', 'premise', 'trade-off', 'signal', 'baseline', 'lever', 'residue', 'apparatus', 'inflection'],
    'Sensory — sight': ['glare', 'shadowed', 'washed-out', 'flickering', 'stark', 'burnished', 'mottled', 'luminous'],
    'Sensory — sound': ['clatter', 'hum', 'rasp', 'muffled', 'thrum', 'shrill', 'creak', 'hush'],
    'Sensory — touch': ['grit', 'tacky', 'brittle', 'slick', 'coarse', 'clammy', 'taut', 'worn smooth'],
    'Sensory — smell/taste': ['acrid', 'yeasty', 'metallic', 'briny', 'cloying', 'smoky', 'sour', 'peppery'],
    'Emotion (show, don’t tell)': ['jaw set', 'hands still', 'eyes flat', 'a beat too long', 'breath held', 'chair pushed back', 'laugh half a second late'],
    'Business impact': ['margin', 'run-rate', 'payback period', 'churn', 'utilisation', 'throughput', 'cycle time', 'unit economics'],
    'Finance precision': ['basis points', 'year over year', 'as of', 'trailing twelve months', 'net of fees', 'seasonally adjusted', 'nominal', 'real terms'],
    'Hedges (use sparingly)': ['suggests', 'indicates', 'appears to', 'is consistent with', 'on the available evidence']
  };

  /* ---- Headline formulas for the idea generator ---- */
  var HEADLINE_FORMULAS = [
    'How to {TOPIC} When {OBSTACLE}',
    '{NUMBER} Ways to {TOPIC} That Actually Hold Up',
    'The {TOPIC} Checklist for {AUDIENCE}',
    'Why {TOPIC} Fails (And What Works Instead)',
    'What {AUDIENCE} Get Wrong About {TOPIC}',
    '{TOPIC}: A Field Guide for {AUDIENCE}',
    'The Quiet Cost of Ignoring {TOPIC}',
    'Before You {TOPIC}, Read This',
    '{TOPIC} Without the {OBSTACLE}',
    'I Spent {NUMBER} Months on {TOPIC}. Here Is the Short Version.'
  ];

  /* ---- Style-guide rule packs ---- */
  var STYLE_GUIDES = {
    ap: {
      name: 'AP Style',
      rules: [
        { id: 'ap-oxford', test: /,\s+and\s+/g, message: 'AP style omits the serial (Oxford) comma in simple series.', severity: 'style' },
        { id: 'ap-percent', test: /\bpercent\b/gi, message: 'AP uses “percent” spelled out — you are consistent here.', severity: 'ok' }
      ],
      notes: ['Numbers one through nine spelled out; 10 and above as figures.', 'Use “percent”, not “%”, in body copy.', 'No serial comma in simple lists.', 'Titles capitalised before a name, lowercase after.']
    },
    chicago: {
      name: 'Chicago Manual',
      rules: [],
      notes: ['Use the serial comma.', 'Spell out numbers zero through one hundred.', 'Notes-bibliography or author-date, chosen once and kept.', 'Titles in headline capitalisation.']
    },
    apa: {
      name: 'APA 7',
      rules: [],
      notes: ['Serial comma required.', 'Numbers 10 and above as numerals.', 'Author–date in-text citations.', 'Sentence case for article titles in the reference list.']
    },
    house: {
      name: 'House / client guide',
      rules: [],
      notes: ['Paste the client’s guide into the brief — the analyzer will pull constraints out of it.']
    }
  };

  /* ---- Reading-level bands ---- */
  var GRADE_BANDS = [
    { max: 6, label: 'Very easy', note: 'Reads like a children’s magazine.' },
    { max: 8, label: 'Easy', note: 'Ideal for consumer blogs and marketing copy.' },
    { max: 10, label: 'Standard', note: 'Newspaper register — safe for most audiences.' },
    { max: 12, label: 'Fairly hard', note: 'Trade press and business readers.' },
    { max: 14, label: 'Hard', note: 'Specialist or academic readers only.' },
    { max: 99, label: 'Very hard', note: 'Dense. Consider splitting sentences.' }
  ];

  FW.lex = {
    SYNONYMS: SYNONYMS, WORDY: WORDY, FILLERS: FILLERS, HEDGES: HEDGES, WEASEL: WEASEL,
    CLICHES: CLICHES, CONFUSABLES: CONFUSABLES, PARTICIPLES: PARTICIPLES, BE_FORMS: BE_FORMS,
    TRANSITIONS: TRANSITIONS, WORD_BANK: WORD_BANK, HEADLINE_FORMULAS: HEADLINE_FORMULAS,
    STYLE_GUIDES: STYLE_GUIDES, GRADE_BANDS: GRADE_BANDS
  };
})(window.FW);
