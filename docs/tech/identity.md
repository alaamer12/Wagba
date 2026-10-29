# Wagba — Identity

> How a person is identified publicly: the handle people can share, and the avatar they are seen by. Fields live in [data-model.md](schema-reference.md#1-users--auth-collection); the screens that collect them are in [../product/screens.md](../product/screens.md#5-profile-setup).

Two public identity pieces, both derived, both stable:

- **Handle** — a unique, URL-safe ASCII name derived from the display name.
- **Avatar** — an SVG generated from the handle, unless the user uploads a photo.

Neither is a login credential. The private `username` (`dev_k3m9xq`) stays invisible; see [architecture.md#identity](architecture.md#identity).

## Handle

### Pipeline

```
display name → normalise → per-letter map → lowercase → keep [a-z0-9]
             → truncate to 20 → append 3 random digits → unique index check
```

1. **Normalise.** Strip tashkeel and tatweel, fold alef variants (أ إ آ ٱ → ا), fold ة → ه, ى → ي, fold Arabic-Indic digits to Latin.
2. **Map letters** using the Egyptian-phonetic table below.
3. **Lowercase**, then drop anything outside `[a-z0-9]`. Spaces vanish.
4. **Truncate** to 20 characters.
5. **Append three random digits**, retrying with four then five on a uniqueness collision. Random, not sequential — a number must not reveal signup order or that someone else already had the name.
6. **Check the unique index**; a collision retries with a fresh number, never with a variant of the name.

`محمد احمد` → `mhmdahmd` → `mhmdahmd482`.

### Mapping table

Egyptian pronunciation, which is what makes the handle recognisable to its owner. Letters may collide — ز ذ ظ all become `z` — and the numeric suffix is what absorbs the resulting duplicates. That collision tolerance is deliberate, not an oversight.

|               |             |             |           |
| ------------- | ----------- | ----------- | --------- |
| ا أ آ ء → `a` | إ → `e`     | ب → `b`     | ت ط → `t` |
| ث س ص → `s`   | ج → `g`     | ح ه ة → `h` | خ → `kh`  |
| د ض → `d`     | ذ ز ظ → `z` | ر → `r`     | ش → `sh`  |
| ع → `a`       | غ → `gh`    | ف → `f`     | ق ك → `k` |
| ل → `l`       | م → `m`     | ن → `n`     | و → `w`   |
| ي ى → `y`     |             |             |           |

Latin letters pass through lowercased. Anything else is dropped.

### Rules

- **Length** 3–24 characters including the digits.
- **Starts with a letter**, never a digit.
- **Charset** `a-z0-9` only — no hyphens, no underscores, decided so a handle is always a single speakable token.
- **Reserved**, rejected even if free: `admin`, `wagba`, `support`, `api`, `www`, `login`, `help`, `about`, `terms`, `privacy`.
- **Shown once, editable once, then frozen.** Profile Setup displays the generated handle with an edit field and a warning that it cannot be changed later. After saving, the field is disabled everywhere. Freezing matters because the handle is what a shared link contains.
- **Rejection.** If the display name yields fewer than three letters and no digits — an emoji-only or punctuation-only name — the form refuses it and asks for a name in letters, rather than inventing a handle the user never saw.

### Why not Franco digits

`m7md` and `3omar` are how Egyptians type, but a permanent public handle is a different artefact from a chat message: it gets said aloud, searched, and pasted into links. Franco also has no standard — the same name yields different digits per writer — so two users with identical display names could land on visibly unrelated handles. Recorded in [../decisions.md](../decisions.md#the-handle-is-transliterated-not-franco).

## Avatar

### Assembly

An inline SVG composed at render time from a fixed part set. Nothing is stored and nothing is uploaded:

```
seed  = fnv1a32("v1:" + handle)
rng   = mulberry32(seed)
skin  = parts.skin[floor(rng() * parts.skin.length)]
hair  = parts.hair[floor(rng() * parts.hair.length)]
...
```

One `rng()` call per axis, in a fixed order, so the same handle always produces the same face on every device and every install.

**The `v1:` prefix is load-bearing.** Changing the part set without bumping it silently rewrites the faces of every existing user. Bump the version only when a deliberate identity reset is acceptable.

### Axes (v1)

| Axis        | Variants  | Notes                                          |
| ----------- | --------- | ---------------------------------------------- |
| Skin        | 5 tones   | Neutral range, not a hierarchy                 |
| Hair        | 7         | Short, wavy, curly, long, bun, **hijab**, bald |
| Facial hair | 3         | None, stubble, beard                           |
| Glasses     | 3         | None, round, square                            |
| Shirt       | 6 colours | From the palette, plus two accent hues         |
| Backdrop    | 5 colours | Warm cream, mint, sky, peach, lavender         |

Hair and facial hair are independent axes, so a hijab never overlaps a beard: the assembly rule clears facial hair when the hijab part is selected.

### No selector

There is no avatar picker and no shuffle. The face is a function of the handle, full stop. A user who dislikes theirs uploads a photo — that path already exists and overrides the generated SVG everywhere, with the generated art as the fallback if the photo is later removed.

This is a deliberate trade: every extra control is another screen to build, test, and localise, and the upload path already covers the case the selector would serve.

### Accessibility

The SVG carries a generated `aria-label` naming the visible parts, in the user's locale, so a screen reader describes the avatar rather than announcing "image". The label is built from the same part indices, never hand-written.

### Art source

The part set is modularised from the supplied character in `avatar.html` — the original defines the construction: 610×610 box, flat fills with two gradient washes, strokes around 2.5–5 units, no outlines on the face. Variants are built to that grammar so the set stays one visual family. Until the full set lands, the generator runs against whatever part set exists; missing axes fall back to the source character's values.
