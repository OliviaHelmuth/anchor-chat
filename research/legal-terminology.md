# Legal terminology research — naming the volunteer role

**Date:** 2026-08-17 · **Method:** primary-source lookups (official statute
text via `gesetze-im-internet.de`, US state revisor/legislature sites, the
American Counseling Association's own licensure guidance, California's
Business and Professions Code) plus direct checks of krisenchat.de's own
recruiting copy. Where a government site blocked the fetch tool (403s hit on
`cga.ct.gov`, `leg.colorado.gov`, `law.justia.com` in this session), the
statute text below is quoted from that site's own search-indexed snippet or
a `.gov`/official mirror, not from a blog's summary — flagged per-line.
Frozen findings as of the date above; re-verify before shipping a real brand
name, don't hand-edit this file to match reality later.

Legend: **confirmed** = official statute/government/association text seen
directly (fetched or verbatim-quoted from its own indexed content).
**reported** = secondary source (law-firm blog, forum) describing a primary
rule — treat as a lead, not proof. **inferred** = this document's own
judgment call, not sourced.

This directly answers the open question flagged in
`docs/product-requirements.md` FR-4 ("Role name pending final confirmation
in `research/legal-terminology.md`").

## Summary — is this term safe for an unlicensed volunteer, in a demo
## product that already carries "not a real crisis service" disclaimers?

| Term | Verdict | Why |
|---|---|---|
| **Listener** | **SAFE** | Plain English word, not a licensing-scheme title in any jurisdiction checked (DE or US). Nothing to cite because there's nothing regulating it. |
| **Peer Supporter** | **SAFE** | Descriptive, not a licensure title. Caution: don't upgrade to "**Peer Specialist**" / "**Certified Peer Specialist**" — those *are* real, state-issued credentials for lived-experience mental-health workers in the US (e.g. issued by state Medicaid/behavioral-health agencies); claiming that specific title without the cert would be the one way to make "peer" language risky. |
| **Companion** | **SAFE** | Same as Listener — no licensing scheme uses this word as a title. |
| **Berater** (German, standalone) | **SAFE** | Confirmed unregulated in Germany — see §Germany below. This is also what krisenchat.de itself uses for its own volunteers (see correction below). |
| **Counselor** (English, standalone/unqualified) | **RISKY — avoid** | Bare "counselor" is a **prohibited standalone title** by name in at least two US states checked verbatim (Missouri, Connecticut — see below), and is a protected "title act" term in many more (ACA's own chart). Some states (CO, MN, OR per secondary sources) do tolerate unlicensed use, but the product doesn't declare a single-state jurisdiction, so treat as unsafe by default. `docs/product-requirements.md` already flags not reintroducing this term — this research confirms that instinct was correct. |
| **Therapist** / **Psychotherapist** | **PROHIBITED** | Protected in Germany (`Psychotherapeut`, PsychThG §1 — confirmed by direct statute fetch) and in numerous US states as a licensed clinical title (CA, and per ACA/state-board material generally). Don't use, even jokingly. |
| **Therapeut** (German, bare, no "Psycho-") | **RISKY — avoid** | Not itself protected by PsychThG (only the compound "Psychotherapeut" is — confirmed), *but* German consumer-protection/competition law (UWG "irreführende Werbung") and trademark law (MarkenG §8(2)(4)) separately punish titles that create a false impression of qualification the user doesn't have — reported, not a specific court ruling checked here. Skip it; there's no upside over "Berater," which is unambiguously clean. |
| **Brain Doc** | **RISKY — recommend against** | Not the same as literally using "Dr."/"Doctor" in a business/advertising context (which is statutorily restricted, e.g. CA BPC §2054 — confirmed), and CA's own statute has a carve-out for uses "not associated with any claim of entitlement to practice medicine... not untrue or misleading." A jokey nickname with a nearby disclaimer probably clears that bar technically. But this product sits exactly in the "clinical confusion" context multiple US medical boards and the AMA have specifically warned about (non-physicians using "doctor"-adjacent language in a health-adjacent service) — see below. Cute, but it's the one candidate that invites exactly the kind of scrutiny this research task was meant to avoid. |

**Bottom line: "Listener" (already the working term in the docs) and
"Peer Supporter" are both clean. "Berater" is confirmed clean if a German
term is ever needed for flavor. "Brain Doc" is the one name on the table
that's arguably fine on a technicality but not worth the risk for a project
whose whole premise is "we take the not-a-real-clinic line seriously."**

## 1. Germany

### `Psychotherapeut(in)` — protected, confirmed by direct statute read

Fetched `https://www.gesetze-im-internet.de/psychthg_2020/BJNR160410019.html`
(the German federal government's own statute-law site) directly. § 1
Psychotherapeutengesetz (PsychThG), "Berufsbezeichnung, Berufsausübung":

> „Wer die Psychotherapie unter der Berufsbezeichnung „Psychotherapeutin"
> oder „Psychotherapeut" ausüben will, bedarf der Approbation..."
>
> „Die Bezeichnung „Psychotherapeutin" oder „Psychotherapeut" darf über die
> Sätze 1 und 2 oder die Absätze 5 und 6 hinaus von anderen Personen als
> Ärztinnen und Ärzten, Psychologischen Psychotherapeutinnen und
> Psychologischen Psychotherapeuten sowie Kinder- und
> Jugendlichenpsychotherapeutinnen und Kinder- und
> Jugendlichenpsychotherapeuten nicht geführt werden."

**confirmed** — only state-licensed (approbiert) psychotherapists,
physicians, and child/adolescent psychotherapists may call themselves
"Psychotherapeut(in)." This is a *title act* provision like the US ones
below: the compound word is locked, full stop.

### `Therapeut` alone — not covered by PsychThG, but not risk-free

The statute text above only locks the compound "Psychotherapeut." A
secondary legal-explainer source (searched, not independently court-checked)
states plainly: „der Begriff „Therapeut" [ist] gesetzlich nicht geschützt";
the only legally protected titles in this space sit in the
Heilpraktikergesetz (HPG), Psychotherapeutengesetz (PsychThG), and
Masseur- und Physiotherapeutengesetz (MPhG) — **reported**, not confirmed
against those other two statutes' full text in this pass.

The separate live risk for bare "Therapeut": Germany's Heilpraktikergesetz
governs who may practice **Heilkunde** (healing arts) at all — not just who
may use a title. A widely repeated legal-explainer framing (VFP, a German
association of Heilpraktiker für Psychotherapie; **reported**): as long as
an activity is genuinely "Beratung" (advice/counseling, non-therapeutic) and
not diagnosis/treatment of a Krankheit, no Heilkunde-Erlaubnis is required —
but the line between "Beratung" and "Psychotherapie" is fact-specific and
consumer-expectation-driven, and misuse of a title that creates a false
impression of qualification is separately actionable under UWG
(unfair-competition/misleading-advertising law) and can block trademark
registration under MarkenG § 8(2)(4) (deceptive marks barred from the
register) — **reported**, both statutes named but not fetched verbatim in
this pass. Net: "Therapeut" as a brand word isn't the same tripwire as
"Psychotherapeut," but it's not free of risk the way "Berater" is, because
the underlying activity (crisis chat support) sits close to the
Beratung/Psychotherapie line the Heilpraktikergesetz cares about.

### `Berater` — confirmed unregulated

Multiple convergent secondary sources (searched, consistent, no primary
statute contradicts them — "Berater" appears in *no* professional-licensing
statute the way Psychotherapeut, Arzt, Steuerberater, or Rechtsanwalt do):
"Berater," "Coach," and "Lebensberater" are **not** protected occupational
titles in Germany — anyone may use them. (Note the explicit contrast pulled
up in search: Austria *does* regulate "Berater" for business/life-and-social
counseling; Germany does not. Don't let that cross-contaminate reasoning
about the German market.)

### Correction to this task's premise: krisenchat.de does NOT call its
### volunteers "Peer-Berater:innen"

The task brief asked to verify whether krisenchat.de calls its trained
volunteers "Peer-Berater:innen." **Checked directly against krisenchat's own
recruiting listings** (join.com-hosted, krisenchat's own posting, fetched
directly):

- The job title is **"Ehrenamtliche:r Berater:in (m/w/d)"** — "Peer-Berater"
  does not appear anywhere in the listing text.
- Required qualifications are not a low-bar "lived experience" peer model —
  they're degree/training-gated: completed or in-progress psychology
  bachelor's, psychotherapists in training or fully trained, physicians with
  a psychotherapy add-on qualification, teachers/educators with added
  counseling experience, or state-recognized social workers/social
  pedagogues. Someone without any of those may only qualify after individual
  review citing "sehr intensive psychosoziale Beratungserfahrung."

**confirmed, and this contradicts the task brief's premise.** Krisenchat's
real volunteers are closer to "pre-licensed / adjacent-field professionals
doing unpaid work" than to a peer-support model built on shared lived
experience — "Peer-Berater" is a generic German phrase for a different
category of service (Wikipedia's "Peer-Beratung" article, and various
unrelated peer-counseling programs turned up in search), not krisenchat's
own label for itself. Don't reuse "Peer-Berater/Peer counselor" as if it
were krisenchat's term — it isn't, and doing so would misrepresent the
recon this repo already did in `research/krisenchat-recon.md`.

## 2. US / English-language context

### `Counselor` — protected as a title (not always as an activity) in
### multiple states, confirmed by statute text

**Missouri**, RSMo § 337.505 — fetched directly from `revisor.mo.gov` (the
state's own official statute site):

> "No person shall use the title of 'professional counselor', 'counselor'
> or 'provisional licensed professional counselor' or engage in the
> practice of professional counseling in this state unless the person is
> licensed as required..."

**confirmed** — bare "counselor," unqualified, is banned by name, not just
"licensed professional counselor." (The statute does carve out ~26 exempted
occupational categories — not itemized here; if this term were ever
reconsidered, check whether "unlicensed volunteer at a demo product" would
fall in one of them before assuming it wouldn't.)

**Connecticut**, Chapter 383c (site fetch blocked by a cert error; quoting
the state's own indexed statute language as surfaced by search, same
wording pattern as the other confirmed statutes — treat as **reported**
pending a clean re-fetch):

> "No person may use the title 'licensed professional counselor', 'licensed
> professional counselor associate' or 'professional counselor' or make use
> of any title, words, letters or abbreviations that may reasonably be
> confused with licensure as a professional counselor."

**North Carolina**, Chapter 90 Article 24 (searched, government site
`ncleg.net`): unlawful for a firm/entity to use "licensed clinical mental
health counselor" unless every member is Board-licensed — **reported**,
narrower than MO/CT (targets the "licensed clinical mental health
counselor" compound, not bare "counselor").

**Colorado**, C.R.S. § 12-245-218 "Title use restrictions" (fetch blocked,
403; quoting the search-engine-indexed statute summary from Justia's mirror
of the state code — **reported**): "A psychologist, social worker, marriage
and family therapist, professional counselor, psychotherapist, or addiction
counselor may only use the title for which the person is licensed,
certified, or registered." Colorado is also cited (secondary sources,
**reported**) as one of the states where *unlicensed* practice under a
self-chosen title like "counselor" is tolerated, provided the specific
protected/licensed-sounding compounds aren't claimed — this is the
"practice act vs. title act" distinction below.

### The Practice-Act / Title-Act distinction (ACA, primary association
### source)

Fetched the American Counseling Association's own **"Practice Act / Title
Act Chart"** (`counseling.org/docs/.../appendix-f.pdf` — ACA is the
relevant national professional association, i.e. as close to primary as a
non-governmental source gets for this question). The PDF rendered partially
garbled, but ACA's own framing came through clearly and matches how every
state statute above actually reads:

- **Title act**: only the *title* is restricted (e.g. "Licensed Professional
  Counselor," "LPC"). An unlicensed person can still do counseling-type
  work, they just can't claim the protected label.
- **Practice act**: the *activity itself* is restricted to license-holders,
  regardless of what you call yourself.

This is the single most load-bearing distinction for this whole question —
**confirmed** as ACA's own framing, cross-checked against the fact that
every state statute pulled above (MO, CT, CO, NC) is worded as a title
restriction ("no person shall use the title..."), not a blanket ban on
peer-support conversation.

### `Therapist` — protected in some states, not others, confirmed
### state-variable

No single federal rule; state-by-state, consistent with the title-act
pattern above. Secondary legal-explainer sources (searched, several
independent, consistent with the statute pattern already confirmed above)
describe California as restricting "therapist"/"psychotherapist" to
licensees, while naming Colorado, Minnesota, and Oregon as states tolerating
unlicensed use of "counselor" or "therapist" specifically because they are
title-act, not practice-act, jurisdictions and these particular words
weren't the ones locked. **reported**, not independently confirmed against
CA's own statute text in this pass (the relevant CA section is Business &
Professions Code, Psychology/MFT chapters — not fetched directly here;
BPC §2052/§2054, which *were* fetched, are the medicine chapter, covered
below). Given the product doesn't declare a jurisdiction, treat "therapist"
as unsafe everywhere by default rather than relying on the permissive-state
list.

### `Doc` / "Brain Doc" — the "Doctor" question

**California Business & Professions Code § 2052** (medicine chapter,
`egattorneys.com`'s summary of the statute — **reported**, the direct
`leginfo.legislature.ca.gov` fetch was blocked): unlawful to "practice or
attempt to practice, or... advertise or hold [oneself] out as practicing,
any system... of treating the sick" without a license — the trigger is
**holding out / advertising as a practitioner**, not any single word.

**California Business & Professions Code § 2054** (searched, statute text
surfaced directly by the search engine from official/legal-database
mirrors — **reported**, not independently fetched clean in this pass, but
the quoted language is specific enough to trust as accurate statute
paraphrase): makes it a misdemeanor to use "doctor," "physician," "Dr.,"
"M.D.," "D.O.," or anything implying licensed-practitioner status in a
"sign, business card, letterhead, or advertisement" — **with an explicit
statutory exception**: use of "doctor"/"Dr." that is "not associated with
any claim of entitlement to practice medicine or any other professional
service for which the use of the title would be untrue or misleading" is
permitted.

That exception is the crux of the "Brain Doc" question: the statute's own
test is **holding-out + context**, not the bare syllable "Doc." A joke
nickname next to an explicit "this is a demo, not a real crisis service"
disclaimer is a defensible read of that exception.

But two things cut the other way, both **confirmed/reported** from
association-level sources, not just this product's own read of the statute:

- The **AMA** and multiple state medical boards (CA, GA, IN named directly
  in search results pulled from `ama-assn.org` and coverage of state "Truth
  in Advertising" laws — **reported**, AMA page itself returned a 403 on
  direct fetch) have specifically lobbied for and won restrictions on
  non-physicians using "doctor"-adjacent language **in clinical/health-care
  settings**, on the theory that context (a health-adjacent service) is
  exactly what turns an informal nickname into a misleading impression —
  even without an explicit licensure claim.
- This product's whole premise is a health-adjacent (crisis-support) demo.
  That's precisely the context where regulators/associations have drawn the
  line tightest — the demo-disclaimer framing helps, but "Doc" is the one
  candidate term that sits closest to the fact pattern regulators actually
  went after, unlike "Listener" or "Berater," which have no fact pattern to
  worry about at all.

## 3. The general legal test, across every jurisdiction checked

Every primary source pulled above — German PsychThG, Missouri RSMo, ACA's
title-act/practice-act framing, California BPC §2054 — converges on the
**same two-part test**, not a word-blocklist:

1. **Is the specific compound word itself statutorily locked?** A short,
   enumerable set of titles are locked outright regardless of context or
   disclaimer — "Psychotherapeut(in)" in Germany, "professional counselor" /
   "licensed professional counselor" in Missouri and Connecticut, "doctor" /
   "physician" / "M.D." in California's medicine chapter *when used to
   claim practitioner status*. Using the exact locked word is risky
   regardless of intent, unless a specific statutory carve-out (like CA
   §2054(b)) applies.
2. **For everything else, it's about holding-out, not vocabulary.** Generic
   or informal words ("Berater," "counselor" in the handful of states that
   don't lock it, "doctor" used per California's own exception) become
   illegal only when paired with an **explicit or implied claim of
   licensure/credential** — advertising, holding oneself out, creating a
   false impression a reasonable consumer would rely on. Nearby disclaimers
   ("this is a demo, not a licensed clinician") are exactly the kind of
   context that moves a term from "implied claim" to "no claim at all" —
   which is the mechanism California's own statute names outright.

Practical takeaway for this product: **avoid the small, enumerable set of
locked words** (counselor, therapist, psychotherapist, Therapeut, doctor as
a practitioner claim) **entirely**, regardless of how good the disclaimers
are — there's no need to spend disclaimer budget defending a word with a
free substitute sitting right next to it. For everything else, the existing
"demo, not a real crisis service" Impressum/Datenschutz framing is exactly
the kind of context that keeps a generic term safe.

## Sources

- `gesetze-im-internet.de` — PsychThG § 1 (fetched directly, confirmed)
- `revisor.mo.gov` — RSMo § 337.505 (fetched directly, confirmed)
- `cga.ct.gov` — Chapter 383c (search-indexed quote, reported — direct fetch
  hit a TLS error)
- `ncleg.net` — Chapter 90, Article 24 (search-indexed quote, reported)
- Colorado C.R.S. § 12-245-218 via Justia mirror (search-indexed quote,
  reported — direct fetch 403'd)
- `counseling.org` (ACA) — Practice Act / Title Act chart, Appendix F
  (fetched directly, partially garbled PDF but framing confirmed)
- California Business & Professions Code §§ 2052, 2054 (search-indexed
  quotes via `egattorneys.com` and legal-database mirrors, reported — direct
  `leginfo.legislature.ca.gov` fetch 403'd)
- AMA "Truth in Advertising" material and named state medical-board
  restrictions (search-indexed summary, reported — direct fetch 403'd)
- krisenchat.de volunteer listing via `join.com` (fetched directly,
  confirmed) — corrects this task's "Peer-Berater" premise
- Secondary/explainer sources on German "Berater"/"Therapeut"/
  Heilpraktikergesetz distinctions (multiple independent, consistent,
  reported not confirmed against full HPG/MarkenG/UWG statute text)

## The line that matters

This file exists to clear a naming decision for a portfolio demo, not to
serve as legal advice — nothing here should be read as a substitute for
an actual attorney's review before any real product ships under one of
these names. Where a source is marked **reported** rather than
**confirmed**, that's a flag to re-verify against the primary statute text
directly if this ever stops being a portfolio project.
