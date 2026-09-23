/* Contextual resource libraries, language packs and the font library. */
window.FW = window.FW || {};

(function (FW) {
  'use strict';

  /* ---- Research libraries, grouped so personas can surface the relevant set ---- */
  var LIBRARIES = {
    general: {
      label: 'General research',
      items: [
        { name: 'Google Scholar', url: 'https://scholar.google.com/scholar?q=', query: true, note: 'Peer-reviewed sources; check the citation count.' },
        { name: 'Wikipedia (for its footnotes)', url: 'https://en.wikipedia.org/w/index.php?search=', query: true, note: 'Never cite it — mine the references section.' },
        { name: 'Internet Archive', url: 'https://archive.org/search?query=', query: true, note: 'Dead links and older editions.' },
        { name: 'Wayback Machine', url: 'https://web.archive.org/web/*/', query: true, note: 'Archive a source before you cite it.' },
        { name: 'Our World in Data', url: 'https://ourworldindata.org/search?q=', query: true, note: 'Clean, citable charts with underlying data.' },
        { name: 'Pew Research', url: 'https://www.pewresearch.org/search/', query: true, note: 'Survey data with methodology published.' }
      ]
    },
    research: {
      label: 'Academic & archival',
      items: [
        { name: 'JSTOR', url: 'https://www.jstor.org/action/doBasicSearch?Query=', query: true, note: 'Humanities and social science archive.' },
        { name: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=', query: true, note: 'Biomedical literature.' },
        { name: 'arXiv', url: 'https://arxiv.org/abs/', query: false, note: 'Preprints — flag that they are not peer reviewed.' },
        { name: 'CORE (open access)', url: 'https://core.ac.uk/search?q=', query: true, note: 'Full-text open-access aggregator.' },
        { name: 'Semantic Scholar', url: 'https://www.semanticscholar.org/search?q=', query: true, note: 'Citation graph and influence scores.' },
        { name: 'DOAJ', url: 'https://doaj.org/search/articles?ref=homepage&q=', query: true, note: 'Vetted open-access journals.' },
        { name: 'Crossref (DOI lookup)', url: 'https://search.crossref.org/?q=', query: true, note: 'Resolve a DOI into full citation metadata.' }
      ]
    },
    archives: {
      label: 'Primary sources & archives',
      items: [
        { name: 'National Archives (US)', url: 'https://catalog.archives.gov/search?q=', query: true, note: 'Government records and photographs.' },
        { name: 'Library of Congress', url: 'https://www.loc.gov/search/?q=', query: true, note: 'Photos, manuscripts, newspapers.' },
        { name: 'Chronicling America', url: 'https://chroniclingamerica.loc.gov/search/pages/results/?andtext=', query: true, note: 'Historic US newspapers, full text.' },
        { name: 'Europeana', url: 'https://www.europeana.eu/en/search?query=', query: true, note: 'European cultural heritage collections.' },
        { name: 'HathiTrust', url: 'https://babel.hathitrust.org/cgi/ls?q1=', query: true, note: 'Digitised books, many full view.' },
        { name: 'Old Maps Online', url: 'https://www.oldmapsonline.org/#q=', query: true, note: 'Historical cartography.' }
      ]
    },
    finance: {
      label: 'Financial data & filings',
      items: [
        { name: 'SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=', query: true, note: 'Primary source for US filings — 10-K, 10-Q, 8-K.' },
        { name: 'FRED (St. Louis Fed)', url: 'https://fred.stlouisfed.org/searchresults?st=', query: true, note: 'Macro series with revision history and as-of dates.' },
        { name: 'BLS', url: 'https://www.bls.gov/search/query/results?cx=013738036195919377644%3A6ih0hfrgl50&q=', query: true, note: 'Employment, CPI, PPI releases.' },
        { name: 'BEA', url: 'https://www.bea.gov/search?search_api_fulltext=', query: true, note: 'GDP and national accounts.' },
        { name: 'World Bank Data', url: 'https://data.worldbank.org/?q=', query: true, note: 'Cross-country indicators.' },
        { name: 'IMF Data', url: 'https://www.imf.org/en/Search#q=', query: true, note: 'WEO projections and fiscal monitors.' },
        { name: 'Companies House (UK)', url: 'https://find-and-update.company-information.service.gov.uk/search?q=', query: true, note: 'UK company filings and officers.' }
      ]
    },
    data: {
      label: 'Open data & statistics',
      items: [
        { name: 'Data.gov', url: 'https://catalog.data.gov/dataset?q=', query: true, note: 'US federal datasets.' },
        { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat/search?p_auth=&text=', query: true, note: 'EU harmonised statistics.' },
        { name: 'OECD Data', url: 'https://data.oecd.org/searchresults/?q=', query: true, note: 'Comparable cross-country indicators.' },
        { name: 'UN Data', url: 'https://data.un.org/Search.aspx?q=', query: true, note: 'Global statistical series.' },
        { name: 'Census Bureau', url: 'https://data.census.gov/all?q=', query: true, note: 'Demographics down to tract level.' },
        { name: 'Google Dataset Search', url: 'https://datasetsearch.research.google.com/search?query=', query: true, note: 'Finds datasets across repositories.' }
      ]
    },
    business: {
      label: 'Business & market intel',
      items: [
        { name: 'Crunchbase', url: 'https://www.crunchbase.com/textsearch?q=', query: true, note: 'Funding, founders, acquisitions.' },
        { name: 'Statista', url: 'https://www.statista.com/search/?q=', query: true, note: 'Chase the original source it cites.' },
        { name: 'Harvard Business Review', url: 'https://hbr.org/search?term=', query: true, note: 'Frameworks and management research.' },
        { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/search?q=', query: true, note: 'Industry benchmarks — note the sample.' },
        { name: 'USPTO Patent Search', url: 'https://ppubs.uspto.gov/pubwebapp/#/?q=', query: true, note: 'What a company is actually building.' },
        { name: 'Glassdoor / job posts', url: 'https://www.glassdoor.com/Search/results.htm?keyword=', query: true, note: 'Hiring patterns reveal strategy.' }
      ]
    },
    technical: {
      label: 'Technical references',
      items: [
        { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/search?q=', query: true, note: 'Canonical web platform reference.' },
        { name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=', query: true, note: 'Check the date — answers rot.' },
        { name: 'IETF RFCs', url: 'https://www.rfc-editor.org/search/rfc_search_detail.php?title=', query: true, note: 'Protocol ground truth.' },
        { name: 'NIST publications', url: 'https://csrc.nist.gov/publications/search?keywords-lg=', query: true, note: 'Security and measurement standards.' },
        { name: 'Read the Docs', url: 'https://readthedocs.org/search/?q=', query: true, note: 'Library documentation, versioned.' }
      ]
    },
    seo: {
      label: 'Search & audience research',
      items: [
        { name: 'Google Trends', url: 'https://trends.google.com/trends/explore?q=', query: true, note: 'Seasonality and relative interest.' },
        { name: 'Answer-style questions', url: 'https://www.google.com/search?q=people+also+ask+', query: true, note: 'Mine “People also ask” for H2s.' },
        { name: 'Reddit search', url: 'https://www.reddit.com/search/?q=', query: true, note: 'How the audience phrases the problem.' },
        { name: 'Quora', url: 'https://www.quora.com/search?q=', query: true, note: 'Question phrasing and intent.' },
        { name: 'Wikipedia outline', url: 'https://en.wikipedia.org/w/index.php?search=', query: true, note: 'Borrow the subtopic taxonomy.' }
      ]
    },
    marketing: {
      label: 'Marketing & conversion',
      items: [
        { name: 'Swipe file — Really Good Emails', url: 'https://reallygoodemails.com/search?q=', query: true, note: 'Structure, not wording.' },
        { name: 'Land-book', url: 'https://land-book.com/?search=', query: true, note: 'Landing page patterns.' },
        { name: 'G2 reviews', url: 'https://www.g2.com/search?query=', query: true, note: 'Objections in the customer’s own words.' },
        { name: 'Trustpilot', url: 'https://www.trustpilot.com/search?query=', query: true, note: 'Complaint language to pre-empt.' }
      ]
    },
    craft: {
      label: 'Craft & style references',
      items: [
        { name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/', query: true, note: 'US spelling and usage authority.' },
        { name: 'Collins (UK)', url: 'https://www.collinsdictionary.com/dictionary/english/', query: true, note: 'UK spelling and usage.' },
        { name: 'Thesaurus.com', url: 'https://www.thesaurus.com/browse/', query: true, note: 'Check connotation before swapping.' },
        { name: 'Etymonline', url: 'https://www.etymonline.com/search?q=', query: true, note: 'Word history — useful for precision.' },
        { name: 'OneLook (reverse dictionary)', url: 'https://www.onelook.com/?w=', query: true, note: 'Find the word you mean from a description.' },
        { name: 'Rhymezone', url: 'https://www.rhymezone.com/r/rhyme.cgi?Word=', query: true, note: 'Sound patterning for headlines and verse.' },
        { name: 'TV Tropes', url: 'https://tvtropes.org/pmwiki/search_result.php?q=', query: true, note: 'Name the pattern so you can subvert it.' }
      ]
    },
    consumer: {
      label: 'Product & consumer testing',
      items: [
        { name: 'FCC / FTC filings', url: 'https://www.fcc.gov/search/#q=', query: true, note: 'Unreleased hardware shows up here first.' },
        { name: 'Consumer Reports', url: 'https://www.consumerreports.org/search/?query=', query: true, note: 'Independent test methodology.' },
        { name: 'iFixit teardowns', url: 'https://www.ifixit.com/Search?query=', query: true, note: 'Build quality and repairability evidence.' },
        { name: 'CPSC recalls', url: 'https://www.cpsc.gov/Recalls?search_api_views_fulltext=', query: true, note: 'Safety history you must disclose.' }
      ]
    },
    style: {
      label: 'Style guides & standards',
      items: [
        { name: 'AP Stylebook', url: 'https://www.apstylebook.com/search?q=', query: true, note: 'News and most commercial blogging.' },
        { name: 'Chicago Manual Q&A', url: 'https://www.chicagomanualofstyle.org/qanda/tools_search.html?search=', query: true, note: 'Books and long-form nonfiction.' },
        { name: 'APA Style', url: 'https://apastyle.apa.org/search?query=', query: true, note: 'Social sciences.' },
        { name: 'MLA Style Center', url: 'https://style.mla.org/?s=', query: true, note: 'Humanities.' },
        { name: 'Plain Language guidelines', url: 'https://www.plainlanguage.gov/search/?q=', query: true, note: 'Government and accessibility writing.' }
      ]
    },
    images: {
      label: 'Royalty-free image sources',
      items: [
        { name: 'Unsplash', url: 'https://unsplash.com/s/photos/', query: true, note: 'Unsplash License — free commercial use, no attribution required (credit is courteous).' },
        { name: 'Pexels', url: 'https://www.pexels.com/search/', query: true, note: 'Pexels License — free commercial use, no attribution required.' },
        { name: 'Pixabay', url: 'https://pixabay.com/images/search/', query: true, note: 'Pixabay Content License — free commercial use; no identifiable people in sensitive contexts.' },
        { name: 'Openverse', url: 'https://openverse.org/search/?q=', query: true, note: 'CC-licensed — check each item, most require attribution.' },
        { name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/w/index.php?search=', query: true, note: 'Mixed licences — read the file page before use.' },
        { name: 'NASA Image Library', url: 'https://images.nasa.gov/search?q=', query: true, note: 'Generally public domain; check for third-party content.' },
        { name: 'Smithsonian Open Access', url: 'https://www.si.edu/search/collection-images?edan_q=', query: true, note: 'CC0 collection — museum quality.' },
        { name: 'The Met Open Access', url: 'https://www.metmuseum.org/art/collection/search?q=', query: true, note: 'Public-domain artworks, high resolution.' },
        { name: 'Rawpixel public domain', url: 'https://www.rawpixel.com/search/', query: true, note: 'Restored vintage illustrations, CC0 section.' },
        { name: 'Public Domain Review', url: 'https://publicdomainreview.org/search/?q=', query: true, note: 'Curated public-domain visual essays.' }
      ]
    },
    verify: {
      label: 'Verification & fact-checking',
      items: [
        { name: 'Google exact-phrase search', url: 'https://www.google.com/search?q=', query: true, note: 'Wrap the phrase in quotes for exact matches.' },
        { name: 'Bing', url: 'https://www.bing.com/search?q=', query: true, note: 'Different index — catches what Google misses.' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', query: true, note: 'No personalisation skew.' },
        { name: 'Snopes', url: 'https://www.snopes.com/?s=', query: true, note: 'Claim provenance.' },
        { name: 'Retraction Watch', url: 'https://retractionwatch.com/?s=', query: true, note: 'Check before citing a study.' }
      ]
    }
  };

  /* ---- Language packs: spelling variants, punctuation conventions ---- */
  var LANGUAGES = [
    {
      code: 'en-US', label: 'English (United States)', dir: 'ltr',
      quotes: ['“', '”'], inner: ['‘', '’'], commaInQuotes: true,
      spelling: { colour: 'color', flavour: 'flavor', behaviour: 'behavior', organise: 'organize', organised: 'organized', recognise: 'recognize', analyse: 'analyze', centre: 'center', theatre: 'theater', licence: 'license', defence: 'defense', travelling: 'traveling', labelled: 'labeled', catalogue: 'catalog', programme: 'program', grey: 'gray', judgement: 'judgment', whilst: 'while', towards: 'toward' , aeroplane: 'airplane', amongst: 'among', analogue: 'analog', analysed: 'analyzed', analysing: 'analyzing', apologise: 'apologize', behavioural: 'behavioral', behaviours: 'behaviors', cancelled: 'canceled', cancelling: 'canceling', catalogues: 'catalogs', centred: 'centered', centres: 'centers', cheque: 'check', coloured: 'colored', colourful: 'colorful', colouring: 'coloring', colours: 'colors', counsellor: 'counselor', defences: 'defenses', emphasise: 'emphasize', emphasised: 'emphasized', enrol: 'enroll', favourite: 'favorite', favourites: 'favorites', flavoured: 'flavored', flavourful: 'flavorful', flavours: 'flavors', fulfil: 'fulfill', gruelling: 'grueling', harbour: 'harbor', harboured: 'harbored', harbours: 'harbors', honour: 'honor', honoured: 'honored', honours: 'honors', jewellery: 'jewelry', judgements: 'judgments', kerb: 'curb', kilometre: 'kilometer', kilometres: 'kilometers', labelling: 'labeling', labour: 'labor', laboured: 'labored', labours: 'labors', learnt: 'learned', licences: 'licenses', litre: 'liter', litres: 'liters', manoeuvre: 'maneuver', marvellous: 'marvelous', maximise: 'maximize', maximised: 'maximized', metre: 'meter', metres: 'meters', minimise: 'minimize', minimised: 'minimized', modelled: 'modeled', modelling: 'modeling', mould: 'mold', neighbour: 'neighbor', neighbourhood: 'neighborhood', neighbouring: 'neighboring', neighbours: 'neighbors', odour: 'odor', organisation: 'organization', organisations: 'organizations', organises: 'organizes', organising: 'organizing', plough: 'plow', practising: 'practicing', prioritise: 'prioritize', prioritised: 'prioritized', programmes: 'programs', realise: 'realize', realised: 'realized', realising: 'realizing', recognised: 'recognized', recognises: 'recognizes', recognising: 'recognizing', rigour: 'rigor', rumour: 'rumor', rumours: 'rumors', sceptical: 'skeptical', scepticism: 'skepticism', specialisation: 'specialization', specialise: 'specialize', specialised: 'specialized', specialising: 'specializing', speciality: 'specialty', travelled: 'traveled', traveller: 'traveler', travellers: 'travelers', tyre: 'tire', utilise: 'utilize', utilised: 'utilized', vigour: 'vigor', vocalisation: 'vocalization', vocalise: 'vocalize', favour: 'favor', favours: 'favors', favoured: 'favored', favouring: 'favoring', humour: 'humor', humours: 'humors', humoured: 'humored', humouring: 'humoring', vapour: 'vapor', vapours: 'vapors', valour: 'valor', candour: 'candor', endeavour: 'endeavor', endeavours: 'endeavors', endeavoured: 'endeavored', parlour: 'parlor', parlours: 'parlors', saviour: 'savior', saviours: 'saviors', splendour: 'splendor', tumour: 'tumor', tumours: 'tumors', armour: 'armor', armoured: 'armored', armoury: 'armory', demeanour: 'demeanor', savour: 'savor', savours: 'savors', savoured: 'savored', savouring: 'savoring', weaponise: 'weaponize', weaponised: 'weaponized', weaponising: 'weaponizing', summarise: 'summarize', summarised: 'summarized', summarising: 'summarizing', criticise: 'criticize', criticised: 'criticized', criticising: 'criticizing', categorise: 'categorize', categorised: 'categorized', contextualise: 'contextualize', contextualised: 'contextualized', editorialise: 'editorialize', editorialised: 'editorialized', memorise: 'memorize', memorised: 'memorized', normalise: 'normalize', normalised: 'normalized', visualise: 'visualize', visualised: 'visualized', visualising: 'visualizing', fibre: 'fiber', fibres: 'fibers', calibre: 'caliber', sombre: 'somber', spectre: 'specter', spectres: 'specters', offence: 'offense', offences: 'offenses', pretence: 'pretense', practise: 'practice', practised: 'practiced', fuelled: 'fueled', fuelling: 'fueling', draught: 'draft', storey: 'story', storeys: 'stories', aluminium: 'aluminum', smoulder: 'smolder', smouldering: 'smoldering' },
      notes: ['Serial comma varies by guide (AP omits, Chicago keeps).', 'Periods and commas go inside quotation marks.', 'Dates: month day, year.']
    },
    {
      code: 'en-GB', label: 'English (United Kingdom)', dir: 'ltr',
      quotes: ['‘', '’'], inner: ['“', '”'], commaInQuotes: false,
      spelling: { color: 'colour', flavor: 'flavour', behavior: 'behaviour', organize: 'organise', organized: 'organised', recognize: 'recognise', analyze: 'analyse', center: 'centre', theater: 'theatre', defense: 'defence', traveling: 'travelling', labeled: 'labelled', catalog: 'catalogue', gray: 'grey', math: 'maths' , airplane: 'aeroplane', analog: 'analogue', analyzed: 'analysed', analyzing: 'analysing', apologize: 'apologise', behavioral: 'behavioural', behaviors: 'behaviours', canceled: 'cancelled', canceling: 'cancelling', catalogs: 'catalogues', centered: 'centred', centers: 'centres', colored: 'coloured', colorful: 'colourful', coloring: 'colouring', colors: 'colours', counselor: 'counsellor', defenses: 'defences', emphasize: 'emphasise', emphasized: 'emphasised', enroll: 'enrol', favorite: 'favourite', favorites: 'favourites', flavored: 'flavoured', flavorful: 'flavourful', flavors: 'flavours', fulfill: 'fulfil', grueling: 'gruelling', harbor: 'harbour', harbored: 'harboured', harbors: 'harbours', honor: 'honour', honored: 'honoured', honors: 'honours', jewelry: 'jewellery', judgments: 'judgements', kilometer: 'kilometre', kilometers: 'kilometres', labeling: 'labelling', labor: 'labour', labored: 'laboured', labors: 'labours', licenses: 'licences', liter: 'litre', liters: 'litres', maneuver: 'manoeuvre', marvelous: 'marvellous', maximize: 'maximise', maximized: 'maximised', meters: 'metres', minimize: 'minimise', minimized: 'minimised', modeled: 'modelled', modeling: 'modelling', neighbor: 'neighbour', neighborhood: 'neighbourhood', neighboring: 'neighbouring', neighbors: 'neighbours', odor: 'odour', organization: 'organisation', organizations: 'organisations', organizes: 'organises', organizing: 'organising', plow: 'plough', practicing: 'practising', prioritize: 'prioritise', prioritized: 'prioritised', programs: 'programmes', realize: 'realise', realized: 'realised', realizing: 'realising', recognized: 'recognised', recognizes: 'recognises', recognizing: 'recognising', rigor: 'rigour', rumor: 'rumour', rumors: 'rumours', skeptical: 'sceptical', skepticism: 'scepticism', specialization: 'specialisation', specialize: 'specialise', specialized: 'specialised', specializing: 'specialising', traveled: 'travelled', traveler: 'traveller', travelers: 'travellers', utilize: 'utilise', utilized: 'utilised', vigor: 'vigour', vocalization: 'vocalisation', vocalize: 'vocalise', favor: 'favour', favors: 'favours', favored: 'favoured', favoring: 'favouring', humor: 'humour', humors: 'humours', humored: 'humoured', humoring: 'humouring', vapor: 'vapour', vapors: 'vapours', valor: 'valour', candor: 'candour', endeavor: 'endeavour', endeavors: 'endeavours', endeavored: 'endeavoured', parlor: 'parlour', parlors: 'parlours', savior: 'saviour', saviors: 'saviours', splendor: 'splendour', tumor: 'tumour', tumors: 'tumours', armor: 'armour', armored: 'armoured', armory: 'armoury', demeanor: 'demeanour', savor: 'savour', savors: 'savours', savored: 'savoured', savoring: 'savouring', weaponize: 'weaponise', weaponized: 'weaponised', weaponizing: 'weaponising', summarize: 'summarise', summarized: 'summarised', summarizing: 'summarising', criticize: 'criticise', criticized: 'criticised', criticizing: 'criticising', categorize: 'categorise', categorized: 'categorised', contextualize: 'contextualise', contextualized: 'contextualised', editorialize: 'editorialise', editorialized: 'editorialised', memorize: 'memorise', memorized: 'memorised', normalize: 'normalise', normalized: 'normalised', visualize: 'visualise', visualized: 'visualised', visualizing: 'visualising', fiber: 'fibre', fibers: 'fibres', caliber: 'calibre', somber: 'sombre', specter: 'spectre', specters: 'spectres', offense: 'offence', offenses: 'offences', pretense: 'pretence', fueled: 'fuelled', fueling: 'fuelling', aluminum: 'aluminium', smolder: 'smoulder', smoldering: 'smouldering' },
      notes: ['Punctuation sits outside quotation marks unless part of the quote.', 'Single quotes for speech in most house styles.', 'Dates: day month year.']
    },
    { code: 'en-AU', label: 'English (Australia)', dir: 'ltr', quotes: ['‘', '’'], inner: ['“', '”'], commaInQuotes: false, spelling: { color: 'colour', organize: 'organise', center: 'centre', program: 'program' }, notes: ['Follows UK spelling with -ise endings.', 'Uses the Australian Government Style Manual.'] },
    { code: 'en-CA', label: 'English (Canada)', dir: 'ltr', quotes: ['“', '”'], inner: ['‘', '’'], commaInQuotes: true, spelling: { color: 'colour', center: 'centre', analyse: 'analyze' }, notes: ['Hybrid: British -our, American -ize.'] },
    { code: 'es', label: 'Español', dir: 'ltr', quotes: ['«', '»'], inner: ['“', '”'], commaInQuotes: false, spelling: {}, notes: ['Opening ¿ and ¡ are required.', 'Angular quotes preferred in formal prose.', 'Decimal comma, thousands point.'] },
    { code: 'fr', label: 'Français', dir: 'ltr', quotes: ['« ', ' »'], inner: ['“', '”'], commaInQuotes: false, spelling: {}, notes: ['Non-breaking space before ; : ! ?', 'Guillemets with inner spacing.', 'Decimal comma.'] },
    { code: 'de', label: 'Deutsch', dir: 'ltr', quotes: ['„', '“'], inner: ['‚', '‘'], commaInQuotes: false, spelling: {}, notes: ['All nouns capitalised.', 'Low-high quotation marks.', 'Comma before subordinate clauses is mandatory.'] },
    { code: 'pt', label: 'Português', dir: 'ltr', quotes: ['“', '”'], inner: ['‘', '’'], commaInQuotes: false, spelling: {}, notes: ['Brazilian and European orthography differ — pick one.'] },
    { code: 'it', label: 'Italiano', dir: 'ltr', quotes: ['«', '»'], inner: ['“', '”'], commaInQuotes: false, spelling: {}, notes: ['Avoid the serial comma.'] },
    { code: 'nl', label: 'Nederlands', dir: 'ltr', quotes: ['‘', '’'], inner: ['“', '”'], commaInQuotes: false, spelling: {}, notes: [] },
    { code: 'pl', label: 'Polski', dir: 'ltr', quotes: ['„', '”'], inner: ['«', '»'], commaInQuotes: false, spelling: {}, notes: [] },
    { code: 'sv', label: 'Svenska', dir: 'ltr', quotes: ['”', '”'], inner: ['’', '’'], commaInQuotes: false, spelling: {}, notes: [] },
    { code: 'ar', label: 'العربية', dir: 'rtl', quotes: ['«', '»'], inner: ['“', '”'], commaInQuotes: false, spelling: {}, notes: ['Right-to-left; the editor switches direction automatically.', 'Arabic comma ، and question mark ؟.'] },
    { code: 'he', label: 'עברית', dir: 'rtl', quotes: ['"', '"'], inner: ["'", "'"], commaInQuotes: false, spelling: {}, notes: ['Right-to-left layout.'] },
    { code: 'hi', label: 'हिन्दी', dir: 'ltr', quotes: ['“', '”'], inner: ['‘', '’'], commaInQuotes: false, spelling: {}, notes: ['Danda (।) may end sentences.'] },
    { code: 'ja', label: '日本語', dir: 'ltr', quotes: ['「', '」'], inner: ['『', '』'], commaInQuotes: false, spelling: {}, notes: ['No spaces between words; 。 and 、 as terminators.'] },
    { code: 'zh', label: '中文', dir: 'ltr', quotes: ['“', '”'], inner: ['‘', '’'], commaInQuotes: false, spelling: {}, notes: ['Full-width punctuation.'] },
    { code: 'ko', label: '한국어', dir: 'ltr', quotes: ['“', '”'], inner: ['‘', '’'], commaInQuotes: false, spelling: {}, notes: [] },
    { code: 'ru', label: 'Русский', dir: 'ltr', quotes: ['«', '»'], inner: ['„', '“'], commaInQuotes: false, spelling: {}, notes: ['Angular quotes; dash used where English uses a colon.'] },
    { code: 'tr', label: 'Türkçe', dir: 'ltr', quotes: ['“', '”'], inner: ['‘', '’'], commaInQuotes: false, spelling: {}, notes: [] }
  ];

  /* ---- Font library. Every stack ends in a system fallback so it works offline. ---- */
  var FONTS = [
    { id: 'literata', label: 'Literata (book serif)', stack: '"Literata", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', category: 'Serif', use: 'Long-form nonfiction and fiction manuscripts.' },
    { id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif', category: 'Serif', use: 'Blog body copy; excellent on screen.' },
    { id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif', category: 'Serif', use: 'Academic submissions and legal work.' },
    { id: 'garamond', label: 'Garamond', stack: 'Garamond, "EB Garamond", "Apple Garamond", Georgia, serif', category: 'Serif', use: 'Print-feel book pages.' },
    { id: 'baskerville', label: 'Baskerville', stack: 'Baskerville, "Libre Baskerville", "Times New Roman", serif', category: 'Serif', use: 'Essays and literary features.' },
    { id: 'cambria', label: 'Cambria', stack: 'Cambria, Georgia, serif', category: 'Serif', use: 'Word-compatible reports.' },
    { id: 'inter', label: 'Inter / System UI', stack: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', category: 'Sans', use: 'Web copy, UX writing, documentation.' },
    { id: 'calibri', label: 'Calibri', stack: 'Calibri, Carlito, "Segoe UI", sans-serif', category: 'Sans', use: 'Word-native deliverables; many client portals mandate it by name.' },
    { id: 'helvetica', label: 'Helvetica / Arial', stack: 'Helvetica, Arial, sans-serif', category: 'Sans', use: 'Neutral corporate deliverables.' },
    { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif', category: 'Sans', use: 'Maximum on-screen legibility.' },
    { id: 'tahoma', label: 'Tahoma', stack: 'Tahoma, Verdana, sans-serif', category: 'Sans', use: 'Dense UI-adjacent copy.' },
    { id: 'trebuchet', label: 'Trebuchet MS', stack: '"Trebuchet MS", Tahoma, sans-serif', category: 'Sans', use: 'Friendly marketing pages.' },
    { id: 'courier', label: 'Courier New (manuscript)', stack: '"Courier New", Courier, monospace', category: 'Mono', use: 'Screenplays and standard manuscript format.' },
    { id: 'mono', label: 'System Mono', stack: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace', category: 'Mono', use: 'Technical docs and code-adjacent writing.' },
    { id: 'atkinson', label: 'Atkinson Hyperlegible', stack: '"Atkinson Hyperlegible", Verdana, sans-serif', category: 'Accessible', use: 'Low-vision readers; distinguishes similar glyphs.' },
    { id: 'opendyslexic', label: 'OpenDyslexic', stack: '"OpenDyslexic", "Comic Sans MS", Verdana, sans-serif', category: 'Accessible', use: 'Weighted baselines for dyslexic readers.' },
    { id: 'brush', label: 'Display / Brush', stack: '"Brush Script MT", "Segoe Script", cursive', category: 'Display', use: 'Pull quotes and generated cover images only.' },
    { id: 'impact', label: 'Impact (headlines)', stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', category: 'Display', use: 'Social graphics and heavy headlines.' }
  ];

  /* ---- Manuscript / deliverable presets ---- */
  var PRESETS = [
    { id: 'web', label: 'Web article', font: 'georgia', size: 19, line: 1.7, width: 720, align: 'left' },
    { id: 'manuscript', label: 'Standard manuscript', font: 'courier', size: 16, line: 2, width: 700, align: 'left' },
    { id: 'academic', label: 'Academic paper', font: 'times', size: 16, line: 2, width: 760, align: 'left' },
    { id: 'report', label: 'Business report', font: 'cambria', size: 16, line: 1.5, width: 780, align: 'left' },
    { id: 'book', label: 'Book page', font: 'literata', size: 18, line: 1.75, width: 640, align: 'justify' },
    { id: 'script', label: 'Screenplay', font: 'courier', size: 16, line: 1.4, width: 620, align: 'left' },
    { id: 'accessible', label: 'High legibility', font: 'atkinson', size: 20, line: 1.9, width: 700, align: 'left' }
  ];

  /* ---- Image licence reference ---- */
  var LICENCES = [
    { id: 'cc0', name: 'CC0 / Public Domain', commercial: true, attribution: false, note: 'No rights reserved. Safest option for client work.' },
    { id: 'unsplash', name: 'Unsplash License', commercial: true, attribution: false, note: 'Free to use; cannot be sold unmodified or used to build a competing service.' },
    { id: 'pexels', name: 'Pexels License', commercial: true, attribution: false, note: 'Free to use; identifiable people cannot be shown in a bad light.' },
    { id: 'ccby', name: 'CC BY', commercial: true, attribution: true, note: 'Attribution required: title, author, source, licence.' },
    { id: 'ccbysa', name: 'CC BY-SA', commercial: true, attribution: true, note: 'Attribution plus share-alike — derivatives inherit the licence. Check client tolerance.' },
    { id: 'ccbync', name: 'CC BY-NC', commercial: false, attribution: true, note: 'Non-commercial only. Do not use in paid client work.' },
    { id: 'editorial', name: 'Editorial use only', commercial: false, attribution: true, note: 'News and commentary only; never advertising.' }
  ];

  FW.resources = {
    LIBRARIES: LIBRARIES, LANGUAGES: LANGUAGES, FONTS: FONTS, PRESETS: PRESETS, LICENCES: LICENCES,
    language: function (code) {
      for (var i = 0; i < LANGUAGES.length; i++) if (LANGUAGES[i].code === code) return LANGUAGES[i];
      return LANGUAGES[0];
    },
    font: function (id) {
      for (var i = 0; i < FONTS.length; i++) if (FONTS[i].id === id) return FONTS[i];
      return FONTS[1];
    }
  };
})(window.FW);
