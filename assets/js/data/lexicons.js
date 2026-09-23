/* Language data: synonyms, confusables, clichés, transitions, rule tables. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';

  /* ---- Synonym bank used by the paraphraser (register-tagged) ---- */
  /* Register-tagged synonyms. A substitution engine is only as good as the
     odds that a listed word actually appears, so this favours words that turn
     up in ordinary prose over interesting rare ones. */
  var SYNONYMS = {
    /* verbs */
    show: { pos: 'verb', neutral: ['demonstrate', 'reveal'], formal: ['indicate', 'evidence'], simple: ['prove'], creative: ['lay bare'] },
    use: { pos: 'verb', neutral: ['apply', 'employ'], formal: ['utilise', 'deploy'], simple: ['work with'], creative: ['press into service'] },
    help: { pos: 'verb', neutral: ['support', 'assist'], formal: ['facilitate', 'enable'], simple: ['aid'], creative: ['shore up'] },
    make: { pos: 'verb', neutral: ['create', 'build'], formal: ['produce', 'generate'], simple: ['put together'], creative: ['fashion'] },
    get: { pos: 'verb', neutral: ['obtain', 'receive'], formal: ['acquire', 'secure'], simple: ['pick up'], creative: ['come by'] },
    start: { pos: 'verb', neutral: ['begin', 'launch'], formal: ['commence', 'initiate'], simple: ['kick off'], creative: ['set in motion'] },
    end: { pos: 'verb', neutral: ['finish', 'conclude'], formal: ['terminate', 'cease'], simple: ['stop'], creative: ['draw to a close'] },
    change: { pos: 'verb', neutral: ['shift', 'alter'], formal: ['modify', 'revise'], simple: ['switch'], creative: ['reshape'] },
    increase: { pos: 'verb', neutral: ['rise', 'grow'], formal: ['escalate'], simple: ['go up'], creative: ['climb'] },
    decrease: { pos: 'verb', neutral: ['fall', 'decline'], formal: ['diminish', 'contract'], simple: ['drop'], creative: ['ebb'] },
    /* "consider" is left out: it does not take a bare that-clause, so "I think
       Kibale is a victim of its own popularity" came back as "I consider
       Kibale is…". The others all take one. */
    think: { pos: 'verb', neutral: ['believe', 'feel'], formal: ['contend', 'maintain'], simple: ['reckon'], creative: ['suspect'] },
    say: { pos: 'verb', neutral: ['state', 'note'], formal: ['assert', 'observe'], simple: ['tell'], creative: ['venture'] },
    improve: { pos: 'verb', neutral: ['strengthen', 'refine'], formal: ['enhance'], simple: ['fix up'], creative: ['sharpen'] },
    reduce: { pos: 'verb', neutral: ['cut', 'lower'], formal: ['curtail', 'mitigate'], simple: ['bring down'], creative: ['pare back'] },
    understand: { pos: 'verb', neutral: ['grasp', 'follow'], formal: ['comprehend', 'appreciate'], simple: ['get'], creative: ['see through'] },
    explain: { pos: 'verb', neutral: ['describe', 'outline'], formal: ['elucidate', 'set out'], simple: ['spell out'], creative: ['unpack'] },
    find: { pos: 'verb', neutral: ['identify', 'locate'], formal: ['ascertain', 'determine'], simple: ['spot'], creative: ['turn up'] },
    need: { pos: 'verb', neutral: ['require', 'call for'], formal: ['necessitate'], simple: ['have to'], creative: ['depend on'] },
    buy: { pos: 'verb', neutral: ['purchase'], formal: ['procure', 'invest in'], simple: ['pick up'], creative: ['lay hands on'] },
    consider: { pos: 'verb', neutral: ['weigh', 'assess'], formal: ['evaluate', 'contemplate'], simple: ['think about'], creative: ['turn over'] },
    include: { pos: 'verb', neutral: ['cover', 'contain'], formal: ['comprise', 'encompass'], simple: ['take in'], creative: ['gather up'] },
    allow: { pos: 'verb', neutral: ['let', 'permit'], formal: ['authorise', 'sanction'], simple: ['let'], creative: ['leave room for'] },
    keep: { pos: 'verb', neutral: ['retain', 'hold'], formal: ['preserve', 'maintain'], simple: ['hang on to'], creative: ['hold fast to'] },
    give: { pos: 'verb', neutral: ['provide', 'offer'], formal: ['furnish', 'supply'], simple: ['hand over'], creative: ['extend'] },
    take: { pos: 'verb', neutral: ['accept', 'adopt'], formal: ['assume', 'undertake'], simple: ['grab'], creative: ['shoulder'] },
    become: { pos: 'verb', neutral: ['grow', 'turn'], formal: ['prove'], simple: ['get'], creative: ['ripen into'] },
    affect: { pos: 'verb', neutral: ['influence', 'shape'], formal: ['impact upon'], simple: ['change'], creative: ['colour'] },
    cause: { pos: 'verb', neutral: ['produce', 'trigger'], formal: ['precipitate', 'engender'], simple: ['lead to'], creative: ['set off'] },
    avoid: { pos: 'verb', neutral: ['prevent', 'sidestep'], formal: ['preclude', 'forestall'], simple: ['stay away from'], creative: ['duck'] },
    expect: { pos: 'verb', neutral: ['anticipate', 'predict'], formal: ['project', 'foresee'], simple: ['reckon on'], creative: ['bank on'] },
    build: { pos: 'verb', neutral: ['construct', 'assemble'], formal: ['establish', 'develop'], simple: ['put up'], creative: ['raise'] },
    check: { pos: 'verb', neutral: ['verify', 'review'], formal: ['validate', 'examine'], simple: ['look at'], creative: ['probe'] },
    choose: { pos: 'verb', neutral: ['select', 'pick'], formal: ['elect', 'opt for'], simple: ['go with'], creative: ['settle on'] },
    handle: { pos: 'verb', neutral: ['manage', 'address'], formal: ['administer'], simple: ['deal with'], creative: ['field'] },
    solve: { pos: 'verb', neutral: ['resolve', 'settle'], formal: ['remedy'], simple: ['sort out'], creative: ['untangle'] },
    learn: { pos: 'verb', neutral: ['discover', 'pick up'], formal: ['ascertain'], simple: ['find out'], creative: ['come to know'] },
    work: { pos: 'verb', neutral: ['function', 'operate'], formal: ['perform'], simple: ['run'], creative: ['hold up'] },
    rely: { pos: 'verb', neutral: ['depend', 'count'], formal: ['be contingent'], simple: ['lean'], creative: ['hang'] },
    reach: { pos: 'verb', neutral: ['attain', 'arrive at'], formal: ['achieve'], simple: ['get to'], creative: ['come to'] },
    remain: { pos: 'verb', neutral: ['stay', 'continue'], formal: ['persist'], simple: ['stay'], creative: ['linger'] },
    receive: { pos: 'verb', neutral: ['get', 'collect'], formal: ['obtain'], simple: ['get'], creative: ['take in'] },
    examine: { pos: 'verb', neutral: ['study', 'inspect'], formal: ['scrutinise', 'interrogate'], simple: ['look at'], creative: ['sift'] },
    establish: { pos: 'verb', neutral: ['set up', 'found'], formal: ['institute'], simple: ['start'], creative: ['plant'] },
    determine: { pos: 'verb', neutral: ['decide', 'settle'], formal: ['establish'], simple: ['work out'], creative: ['pin down'] },
    suggest: { pos: 'verb', neutral: ['propose', 'imply'], formal: ['posit', 'intimate'], simple: ['hint'], creative: ['point to'] },
    recommend: { pos: 'verb', neutral: ['advise', 'propose'], formal: ['counsel', 'advocate'], simple: ['say you should'], creative: ['press for'] },
    continue: { pos: 'verb', neutral: ['carry on', 'persist'], formal: ['proceed'], simple: ['keep going'], creative: ['press on'] },
    provide: { pos: 'verb', neutral: ['offer', 'supply'], formal: ['furnish', 'afford'], simple: ['give'], creative: ['hand'] },
    require: { pos: 'verb', neutral: ['need', 'demand'], formal: ['necessitate', 'mandate'], simple: ['need'], creative: ['call for'] },
    produce: { pos: 'verb', neutral: ['make', 'yield'], formal: ['generate'], simple: ['turn out'], creative: ['throw off'] },

    /* nouns */
    problem: { pos: 'noun', neutral: ['issue', 'difficulty'], formal: ['impediment', 'constraint'], simple: ['trouble'], creative: ['snag'] },
    idea: { pos: 'noun', neutral: ['concept', 'notion'], formal: ['proposition', 'premise'], simple: ['thought'], creative: ['spark'] },
    people: { pos: 'noun', neutral: ['individuals', 'readers'], formal: ['participants'], simple: ['folks'], creative: ['souls'] },
    company: { pos: 'noun', neutral: ['business', 'firm'], formal: ['organisation', 'enterprise'], simple: ['outfit'], creative: ['house'] },
    money: { pos: 'noun', neutral: ['funds', 'capital'], formal: ['financial resources'], simple: ['cash'], creative: ['coin'] },
    result: { pos: 'noun', neutral: ['outcome', 'effect'], formal: ['consequence'], simple: ['payoff'], creative: ['yield'] },
    customer: { pos: 'noun', neutral: ['client', 'buyer'], formal: ['purchaser'], simple: ['shopper'], creative: ['patron'] },
    way: { pos: 'noun', neutral: ['method', 'approach'], formal: ['means', 'mechanism'], simple: ['route'], creative: ['path'] },
    time: { pos: 'noun', neutral: ['period', 'span'], formal: ['duration', 'interval'], simple: ['while'], creative: ['stretch'] },
    part: { pos: 'noun', neutral: ['portion', 'element'], formal: ['component', 'constituent'], simple: ['bit'], creative: ['piece'] },
    thing: { pos: 'noun', neutral: ['factor', 'element'], formal: ['consideration'], simple: ['bit'], creative: ['matter'] },
    cost: { pos: 'noun', neutral: ['price', 'expense'], formal: ['expenditure', 'outlay'], simple: ['price'], creative: ['bill'] },
    benefit: { pos: 'noun', neutral: ['advantage', 'gain'], formal: ['upside'], simple: ['plus'], creative: ['dividend'] },
    risk: { pos: 'noun', neutral: ['danger', 'exposure'], formal: ['hazard', 'liability'], simple: ['chance of trouble'], creative: ['gamble'] },
    reason: { pos: 'noun', neutral: ['cause', 'basis'], formal: ['rationale', 'grounds'], creative: ['root'] },
    goal: { pos: 'noun', neutral: ['aim', 'target'], formal: ['objective'], simple: ['point'], creative: ['destination'] },
    plan: { pos: 'noun', neutral: ['strategy', 'scheme'], formal: ['programme'], simple: ['idea'], creative: ['blueprint'] },
    example: { pos: 'noun', neutral: ['instance', 'case'], formal: ['illustration'], simple: ['case'], creative: ['specimen'] },
    number: { pos: 'noun', neutral: ['figure', 'count'], formal: ['quantity'], simple: ['amount'], creative: ['tally'] },
    detail: { pos: 'noun', neutral: ['specific', 'particular'], formal: ['particular'], simple: ['point'], creative: ['grain'] },
    team: { pos: 'noun', neutral: ['group', 'unit'], formal: ['department'], simple: ['crew'], creative: ['outfit'] },
    market: { pos: 'noun', neutral: ['sector', 'trade'], formal: ['marketplace'], simple: ['trade'], creative: ['field'] },
    study: { pos: 'noun', neutral: ['research', 'analysis'], formal: ['investigation'], simple: ['research'], creative: ['inquiry'] },
    effect: { pos: 'noun', neutral: ['impact', 'influence'], formal: ['consequence'], simple: ['result'], creative: ['imprint'] },
    value: { pos: 'noun', neutral: ['worth', 'merit'], formal: ['significance'], simple: ['worth'], creative: ['weight'] },
    process: { pos: 'noun', neutral: ['procedure', 'method'], formal: ['mechanism'], simple: ['steps'], creative: ['machinery'] },
    period: { pos: 'noun', neutral: ['span', 'window'], formal: ['interval'], simple: ['time'], creative: ['stretch'] },
    amount: { pos: 'noun', neutral: ['quantity', 'volume'], formal: ['magnitude'], simple: ['how much'], creative: ['measure'] },
    /* "rate" is dropped. It names a proportion (a success rate, a conversion
       rate) and a speed (at a rapid rate) and a price (an hourly rate), and
       nothing here can tell which is meant: "the success rate stands at around
       ninety per cent" came back as "the success speed", "success tempo" and
       "success pace", and a freelancer's hourly rate would go the same way.
       A word this ambiguous is safer left alone than guessed at. */

    /* adjectives */
    important: { pos: 'adj', neutral: ['significant', 'notable'], formal: ['salient', 'material'], simple: ['big'], creative: ['weighty'] },
    big: { pos: 'adj', neutral: ['large', 'sizeable'], formal: ['substantial', 'considerable'], simple: ['huge'], creative: ['sprawling'] },
    small: { pos: 'adj', neutral: ['minor', 'modest'], formal: ['marginal', 'negligible'], simple: ['tiny'], creative: ['slight'] },
    good: { pos: 'adj', neutral: ['strong', 'solid'], formal: ['favourable'], simple: ['great'], creative: ['handsome'] },
    bad: { pos: 'adj', neutral: ['poor', 'weak'], formal: ['unfavourable', 'deficient'], simple: ['awful'], creative: ['dismal'] },
    fast: { pos: 'adj', neutral: ['quick', 'rapid'], formal: ['expeditious'], simple: ['speedy'], creative: ['headlong'] },
    slow: { pos: 'adj', neutral: ['gradual', 'unhurried'], formal: ['protracted'], simple: ['laggy'], creative: ['glacial'] },
    hard: { pos: 'adj', neutral: ['difficult', 'demanding'], formal: ['arduous', 'exacting'], simple: ['tough'], creative: ['punishing'] },
    easy: { pos: 'adj', neutral: ['straightforward', 'simple'], formal: ['uncomplicated'], simple: ['no trouble'], creative: ['frictionless'] },
    new: { pos: 'adj', neutral: ['recent', 'fresh'], formal: ['novel', 'emergent'], simple: ['brand new'], creative: ['unworn'] },
    old: { pos: 'adj', neutral: ['established', 'long-standing'], formal: ['legacy'], simple: ['ancient'], creative: ['weathered'] },
    many: { pos: 'adj', neutral: ['numerous', 'several'], formal: ['multiple'], simple: ['lots of'], creative: ['no end of'] },
    interesting: { pos: 'adj', neutral: ['notable', 'striking'], formal: ['noteworthy'], simple: ['cool'], creative: ['arresting'] },
    difficult: { pos: 'adj', neutral: ['challenging', 'tricky'], formal: ['onerous', 'complex'], simple: ['hard'], creative: ['thorny'] },
    cheap: { pos: 'adj', neutral: ['inexpensive', 'affordable'], formal: ['economical'], simple: ['cheap'], creative: ['modest'] },
    expensive: { pos: 'adj', neutral: ['costly', 'pricey'], formal: ['prohibitive'], simple: ['dear'], creative: ['steep'] },
    common: { pos: 'adj', neutral: ['widespread', 'frequent'], formal: ['prevalent'], simple: ['usual'], creative: ['everyday'] },
    clear: { pos: 'adj', neutral: ['obvious', 'plain'], formal: ['unambiguous', 'evident'], simple: ['plain'], creative: ['stark'] },
    useful: { pos: 'adj', neutral: ['helpful', 'practical'], formal: ['beneficial'], simple: ['handy'], creative: ['serviceable'] },
    likely: { pos: 'adj', neutral: ['probable', 'expected'], formal: ['plausible'], simple: ['odds are'], creative: ['on the cards'] },
    recent: { pos: 'adj', neutral: ['latest', 'current'], formal: ['contemporary'], simple: ['new'], creative: ['fresh'] },
    typical: { pos: 'adj', neutral: ['usual', 'standard'], formal: ['representative'], simple: ['normal'], creative: ['stock'] },
    main: { pos: 'adj', neutral: ['primary', 'chief'], formal: ['principal', 'foremost'], simple: ['biggest'], creative: ['headline'] },
    possible: { pos: 'adj', neutral: ['feasible', 'achievable'], formal: ['viable'], simple: ['doable'], creative: ['within reach'] },
    whole: { pos: 'adj', neutral: ['entire', 'complete'], formal: ['aggregate'], simple: ['all of the'], creative: ['undivided'] },
    real: { pos: 'adj', neutral: ['genuine', 'actual'], formal: ['authentic'], simple: ['true'], creative: ['honest'] },
    sure: { pos: 'adj', neutral: ['certain', 'confident'], formal: ['assured'], simple: ['positive'], creative: ['settled'] },
    high: { pos: 'adj', neutral: ['elevated', 'steep'], formal: ['considerable'], simple: ['big'], creative: ['towering'] },
    low: { pos: 'adj', neutral: ['reduced', 'modest'], formal: ['depressed'], simple: ['small'], creative: ['shallow'] },
    strong: { pos: 'adj', neutral: ['powerful', 'robust'], formal: ['substantial'], simple: ['tough'], creative: ['sinewy'] },
    weak: { pos: 'adj', neutral: ['limited', 'slight'], formal: ['tenuous'], simple: ['poor'], creative: ['brittle'] },

    /* connectives that are safe to vary mid-sentence */
    however: { pos: 'adv', conjunctive: true, neutral: ['but', 'though'], formal: ['nevertheless', 'that said'], simple: ['still'], creative: ['and yet'] },
    therefore: { pos: 'adv', conjunctive: true, neutral: ['so', 'as a result'], formal: ['consequently', 'accordingly'], simple: ['so'], creative: ['which means'] },
    often: { pos: 'adv', neutral: ['frequently', 'regularly'], formal: ['commonly'], simple: ['a lot'], creative: ['time and again'] },
    usually: { pos: 'adv', neutral: ['typically', 'generally'], formal: ['ordinarily'], simple: ['most of the time'], creative: ['as a rule'] },
    also: { pos: 'adv', conjunctive: true, neutral: ['as well', 'too'], formal: ['in addition', 'further'], simple: ['plus'], creative: ['on top of that'] }
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

  /* Past participle -> simple past, so a passive clause can be turned active:
     "was written by the team" -> "the team wrote". Regular verbs need no entry
     because their participle and past tense are identical. */
  var PARTICIPLE_TO_PAST = {
    written: 'wrote', given: 'gave', taken: 'took', seen: 'saw', known: 'knew',
    shown: 'showed', done: 'did', made: 'made', held: 'held', told: 'told',
    found: 'found', built: 'built', sold: 'sold', sent: 'sent', kept: 'kept',
    left: 'left', paid: 'paid', put: 'put', read: 'read', run: 'ran',
    said: 'said', set: 'set', brought: 'brought', bought: 'bought',
    caught: 'caught', taught: 'taught', thought: 'thought', chosen: 'chose',
    driven: 'drove', eaten: 'ate', fallen: 'fell', forgotten: 'forgot',
    hidden: 'hid', proven: 'proved', spoken: 'spoke', stolen: 'stole',
    broken: 'broke', begun: 'began', drawn: 'drew', grown: 'grew',
    thrown: 'threw', worn: 'wore', won: 'won', understood: 'understood',
    lost: 'lost', met: 'met', led: 'led', felt: 'felt', meant: 'meant',
    heard: 'heard', sung: 'sang', drunk: 'drank', flown: 'flew',
    forgiven: 'forgave', frozen: 'froze', ridden: 'rode', risen: 'rose',
    shaken: 'shook', spent: 'spent', struck: 'struck', woken: 'woke'
  };

  /* Buried verbs: a noun doing a verb's job, with the verb to restore. */
  var NOMINALISATIONS = [
    [/\b(make|makes|made|making)\s+(?:a|an|the)\s+decision\s+(?:about|on|regarding)\b/gi, 'decide'],
    [/\b(make|makes|made|making)\s+(?:a|an|the)\s+decision\b/gi, 'decide'],
    [/\b(provide|provides|provided|providing)\s+(?:a|an|the)?\s*protection\s+(?:for|to)\b/gi, 'protect'],
    [/\b(provide|provides|provided|providing)\s+(?:an|the)?\s*(?:improvement|improvements)\s+(?:in|to)\b/gi, 'improve'],
    [/\b(carry|carries|carried|carrying)\s+out\s+(?:an|a|the)?\s*(?:analysis|assessment|review)\s+of\b/gi, 'analyse'],
    [/\b(conduct|conducts|conducted|conducting)\s+(?:an|a|the)?\s*(?:investigation|inquiry)\s+into\b/gi, 'investigate'],
    [/\b(give|gives|gave|giving)\s+(?:consideration|thought)\s+to\b/gi, 'consider'],
    [/\b(reach|reaches|reached|reaching)\s+(?:a|the)\s+conclusion\b/gi, 'conclude'],
    [/\b(perform|performs|performed|performing)\s+(?:an|a|the)?\s*(?:evaluation|assessment)\s+of\b/gi, 'evaluate'],
    [/\b(undertake|undertakes|undertook|undertaking)\s+(?:a|an|the)?\s*review\s+of\b/gi, 'review'],
    [/\bthe\s+implementation\s+of\b/gi, 'implementing'],
    [/\bthe\s+introduction\s+of\b/gi, 'introducing'],
    [/\bthe\s+application\s+of\b/gi, 'applying'],
    [/\bthe\s+creation\s+of\b/gi, 'creating'],
    [/\bthe\s+completion\s+of\b/gi, 'completing'],
    [/\bthe\s+expansion\s+of\b/gi, 'expanding'],
    [/\bthe\s+reduction\s+(?:of|in)\b/gi, 'reducing'],
    [/\bthe\s+(?:utilisation|utilization)\s+of\b/gi, 'using'],
    [/\bis\s+(?:an|a)\s+indication\s+(?:of|that)\b/gi, 'indicates'],
    [/\bhas\s+(?:an|the)\s+effect\s+(?:of|on)\b/gi, 'affects']
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
    '{TOPIC} Without {OBSTACLE}',
    /* Every formula here has to read correctly with a noun-phrase topic, which
       is what briefs actually state. Anything needing a verb went. */
    '{TOPIC}: What the Evidence Actually Shows',
    '{TOPIC}, Explained Without the Hype',
    'What Changes About {TOPIC} in {YEAR}',
    'The Short, Honest Guide to {TOPIC}',
    'The Case for Taking {TOPIC} Seriously'
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
    STYLE_GUIDES: STYLE_GUIDES, GRADE_BANDS: GRADE_BANDS,
    PARTICIPLE_TO_PAST: PARTICIPLE_TO_PAST, NOMINALISATIONS: NOMINALISATIONS
  };
})(window.FW);
