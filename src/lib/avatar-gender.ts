// A deliberately humble Arabic given-name → likely-gender guess.
// Not grammar law: suffix + lexicon evidence with an honest `unknown` answer.
// The corpus that measures it is tests/unit/fixtures/{male,female,ambiguous}-names.json
// and the accuracy floors are asserted in tests/unit/avatar-gender.test.ts.

export type NameGender = "female" | "male" | "unknown";

/**
 * Normalise for *this* file only. The canonical `shared/normalize.ts` folds ة→ه and ى→ي
 * for search keys; that would erase the strongest female marker here, so we keep ة/ى
 * distinct, strip tashkeel/tatweel, fold alef variants to ا, and fold the South-Asian
 * ta marbuta forms (ۃ U+06C3, ہ U+06BE) onto ة/ه. Hamza on the line (ء) survives.
 */
function normalise(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, "") // tashkeel U+064B–U+0652, superscript alef U+0670, tatweel U+0640
    .replace(/[ۃ]/g, "ة")
    .replace(/[ہ]/g, "ه")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/\s+/g, " ")
    .trim();
}

const ARABIC = /[\u0600-\u06ff]/;

/**
 * Construct prefixes: `مطبخ سلمى`, `مطعم كريم`, `كيك منى` — the first word is the shop,
 * not a person. Stripped while the leading token is one of these and a token remains.
 * Entries are in normalised form (no أ/إ/آ). Reviewers: disagree with a line, not a rule.
 */
const CONSTRUCT_PREFIXES: readonly string[] = [
  "مطبخ", // kitchen of
  "مطابخ", // kitchens of
  "مطعم", // restaurant of
  "مطاعم", // restaurants of
  "ماكولات", // مأكولات, foods of
  "اكلات", // foods of (plain spelling)
  "حلويات", // sweets of
  "كيك", // cake of
  "بيت", // house of
  "دار", // house of, e.g. دار الضيافة
  "منتجات", // products of
];

/**
 * Kinship compounds. `أم محمد` / `ام محمد` = "mother of Muhammad" — the marker itself,
 * not the following name, carries the gender: female. `أبو/ابو/اب/بو` = "father of":
 * male. Only honoured when a name token follows it; a lone "ام" is not evidence.
 */
const UMM_MARKERS: readonly string[] = ["ام"];
const ABU_MARKERS: readonly string[] = ["ابو", "اب", "بو"];

/**
 * Names whose spelling would fool a suffix rule, or too common to leave to chance.
 * These are the exceptions the suffix ladder below is not allowed to overrule —
 * the lexicon is checked first, by name, and a reviewer may delete any single line.
 */
const MALE_LEXICON: readonly string[] = [
  // Too common to leave to the seeded draw — these are the faces the owner reported
  // wrong (كريم under a hijab), and every one is unambiguously male.
  "محمد",
  "احمد", // أحمد normalises here
  "ابراهيم", // إبراهيم
  "يوسف",
  "خالد",
  "محمود",
  "حسام",
  "كريم",
  "مصطفى", // ends in ى, male
  "موسى", // ends in ى, male
  "علي", // ends in ى, male
  "يحيى", // ends in ى, male
  "فتحي", // ends in ي, male
  "شوقي", // ends in ي, male
  "صبري", // ends in ي, male
  "زكي", // ends in ي, male
  "مجدي", // ends in ي, male
  "وجدي", // ends in ي, male
  "رامي", // ends in ي, male
  "شادي", // ends in ي, male
  "ولي", // ends in ي, male
  "عيسي", // موسى's cousin-trap: ends in ي, male
  "حسني", // ends in ي, male
  "هاني", // ends in ي, male
  "مهدي", // ends in ي, male
  "هادي", // ends in ي, male
  "رشدي", // ends in ي, male
  "متولي", // ends in ي, male
  "مرسي", // ends in ي, male
  "ناجي", // ends in ي, male
  "نظمي", // ends in ي, male
  "مرتضى", // ends in ى, male
  "ضياء", // ends in اء, male
  "علاء", // ends in اء, male
  "بهاء", // ends in اء, male
  "اسامة", // ends in ة (and the Egyptian spelling أسامه ends in ه), male
  "اسامه", // ends in ه, male
  "حمادة", // Egyptian male nickname ends in ة
  "حماده", // same, Egyptian ه spelling
  "حمزة", // ends in ة, male
  "طه", // ends in ه, male
  "عبدالله", // ends in ه, male
  "عبدالرحمن", // عبد-compounds are single written tokens in Egypt
];

const FEMALE_LEXICON: readonly string[] = [
  "مريم", // ends in م, female
  "زينب", // ends in ب, female
  "سعاد", // ends in د, female
  "ناهد", // ends in د, female
  "ايمان", // ends in ن, female
  "حنان", // ends in ن, female
  "جيهان", // ends in ن, female
  "امل", // أمل, ends in ل, female (lexicons are in normalised form: أ folds to ا)
  "امال", // آمال, same
  "نوال", // ends in ل, female
  "ملك", // ends in ك, female
  "صباح", // ends in ح, female
  "سماح", // ends in ح, female
  "سحر", // ends in ر, female
  "هاجر", // ends in ر, female
  "عفاف", // ends in ف, female
  "سهير", // ends in ر, female
  "ميرفت", // ends in ت, female
  "مي", // two letters, female
];

/**
 * Names genuinely used for both — `نور` is the owner's example. Answering `unknown`
 * is the *correct* answer here, and the seeded draw decides the face. Kept as a set
 * so a future suffix rule cannot silently claim one of them.
 */
const AMBIGUOUS: readonly string[] = [
  "نور",
  "ريان",
  "كنان",
  "سلام",
  "وعد",
  "اباء", // إباء folds to this; used for both
  "شمس",
  "تقى", // ى-final but used for both
  "قمر",
  "يسر",
];

export type NameGenderGuess = {
  gender: NameGender;
  /** The token the verdict was taken on — documented so a reviewer can disagree with it. */
  token: string;
  reason:
    | "empty"
    | "non-arabic"
    | "not-a-given-name"
    | "male-lexicon"
    | "female-lexicon"
    | "ambiguous"
    | "no-signal"
    | "umm-compound"
    | "abu-compound"
    | "suffix-ta-marbuta"
    | "suffix-alef-hamza"
    | "suffix-alef-maksura"
    | "suffix-ya"
    | "suffix-heh";
};

/** The single most informative word: is the token female, male, or unknowable? */
export function analyseName(displayName: string): NameGenderGuess {
  let tokens = normalise(displayName).split(" ").filter(Boolean);
  if (tokens.length === 0) return { gender: "unknown", token: "", reason: "empty" };

  // Strip construct prefixes only while something remains to evaluate.
  while (tokens.length > 1 && CONSTRUCT_PREFIXES.includes(tokens[0] as string)) {
    tokens = tokens.slice(1);
  }

  // Kinship compound: the marker itself is the evidence.
  const head = tokens[0] as string;
  if (tokens.length > 1 && UMM_MARKERS.includes(head)) {
    return { gender: "female", token: head, reason: "umm-compound" };
  }
  if (tokens.length > 1 && ABU_MARKERS.includes(head)) {
    return { gender: "male", token: head, reason: "abu-compound" };
  }

  const token = head;
  if (!ARABIC.test(token)) return { gender: "unknown", token, reason: "non-arabic" };
  // A definite article on the remaining word ("الضيافة") marks a shop noun, not a name.
  if (token.startsWith("ال") && token.length > 3) {
    return { gender: "unknown", token, reason: "not-a-given-name" };
  }

  // Final ى and ي are the same sound and both keyboards are in the wild: on the
  // line for a name like على, off it for هاني. Lexicon lookups accept either.
  const finalYa = token.endsWith("ى") || token.endsWith("ي");
  const stem = token.slice(0, -1);
  const variants = finalYa ? [token, `${stem}ي`, `${stem}ى`] : [token];
  const known = (list: readonly string[]) => variants.some((v) => list.includes(v));

  if (known(MALE_LEXICON)) return { gender: "male", token, reason: "male-lexicon" };
  if (known(FEMALE_LEXICON)) {
    return { gender: "female", token, reason: "female-lexicon" };
  }
  if (known(AMBIGUOUS)) return { gender: "unknown", token, reason: "ambiguous" };

  // Suffix ladder, strongest evidence first. The `ت`-initial pattern the owner listed
  // is deliberately NOT implemented: توفيق, تامر and طارق make it cost more false
  // femaleness than it earns signal — recorded here so the omission stays visible.
  if (token.endsWith("ة") && token.length >= 3) {
    return { gender: "female", token, reason: "suffix-ta-marbuta" };
  }
  if (token.endsWith("اء")) return { gender: "female", token, reason: "suffix-alef-hamza" };
  if (token.endsWith("ى")) return { gender: "female", token, reason: "suffix-alef-maksura" };
  if (token.endsWith("ي") && token.length >= 3) {
    return { gender: "female", token, reason: "suffix-ya" };
  }
  if (token.endsWith("ه") && token.length >= 3) {
    // Egyptian orthography writes final ة as ه: مروه = مروة.
    return { gender: "female", token, reason: "suffix-heh" };
  }
  return { gender: "unknown", token, reason: "no-signal" };
}

/**
 * The heuristic by its chosen name. `female | male | unknown` — three values, never two:
 * an unguessable name must fall back to the seeded draw, not to a default gender.
 */
export function isItLikelyFemaleName(displayName: string): NameGender {
  return analyseName(displayName).gender;
}
