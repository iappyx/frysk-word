# Store listing — Iepen Fryske Stavering

Texts and settings for the Microsoft Marketplace submission in Partner Center.
Listing language: **English (en-US)**, the only locale in the manifest.

## Name

```
Iepen Fryske Stavering
```

Same as `DisplayName` in the manifest (Microsoft requires this). 22 characters.

## Publisher

`iappyx`. Must match `ProviderName` in the manifest.

## Summary

Maximum 100 characters, 70 recommended; don't repeat the name.

```
Check Frisian spelling in Word with the official word list (Foarkarswurdlist).
```

(78 characters)

## Description

HTML is allowed. Partner Center has no preview, so check it in a browser first.

```html
<p>Write Frisian (Frysk) without spelling mistakes in Microsoft Word. Iepen Fryske Stavering checks your text with the <b>Foarkarswurdlist</b>, the official word list for the 2015 spelling.</p>

<p>Word has no built-in spell checker for Frisian, on Mac or Windows. This free add-in fills that gap.</p>

<p><b>What it does</b></p>
<ul>
<li><b>Squiggles in your text:</b> red for words that aren't in the word list, blue for correct words that have a preferred form (for example <i>achterbân</i> → <i>efterbân</i>). Click a squiggle to choose a suggestion.</li>
<li><b>Side panel:</b> an overview of every word to check, with suggestions you can apply with one click.</li>
<li><b>Checks as you type</b>, so new mistakes show up right away.</li>
<li><b>Your own words:</b> ignore a word for now, or add names and specialist terms to your personal word list.</li>
<li><b>Works with mixed documents:</b> mark your Frisian text with one click, for a selection or the whole document. Word then stops checking that text as Dutch or English, and Dutch or English text stays with Word's own spell checker.</li>
</ul>

<p><b>Private by design</b><br>
All checking happens inside Word on your own device. Your text is never sent anywhere, and the add-in collects no personal data.</p>

<p><b>Who is it for?</b><br>
Anyone who writes Frisian: pupils, students and teachers, local and provincial government, journalists, writers, organisations in Fryslân, and everyone who wants to write their own language correctly.</p>

<p><b>Good to know</b></p>
<ul>
<li>Free and open source. No account, subscription or purchase needed.</li>
<li>Squiggles in the text need a recent version of Word (on Mac: 16.85 or newer with Microsoft 365). Other versions show the side panel with all suggestions.</li>
<li>In Word on the web, text can't be marked by language, so all text is checked.</li>
<li>Word list © Fryske Akademy, GNU GPL v3. This add-in is an independent project, not affiliated with or endorsed by the Fryske Akademy or Microsoft.</li>
</ul>
```

## Search keywords

If the field takes only a few, use them in this order.

```
Frisian, Frysk, spelling, spell checker, stavering, Foarkarswurdlist, West Frisian, Fryslân, staveringshifker
```

## Categories (1–3)

Pick from Partner Center's list; suggested, depending on what's offered:

1. **Productivity**
2. **Education**
3. A writing- or content-related category, if available

Industries: none (optional; the add-in isn't specific to an industry).

## Legal and support links

| Field | Link |
|---|---|
| End User License Agreement (EULA) link | https://iappyx.github.io/iepen-fryske-stavering/terms.html |
| Privacy policy link | https://iappyx.github.io/iepen-fryske-stavering/privacy.html |
| Support document link | https://iappyx.github.io/iepen-fryske-stavering/support.html |

Don't choose Microsoft's *Standard Contract*: that can't be undone after publishing, and the add-in has its own terms.

## Product setup

- Listed in the Apple Store? **No**
- Uses Microsoft Entra ID / single sign-on? **No**
- Requires additional purchases? **No**
- Lead management CRM: **not needed**

## Notes for certification

```
No account, sign-in, licence key or purchase is needed. The add-in collects no data.

Test steps (Word for Mac or Windows, Microsoft 365):
1. Open a new document and type or paste:
   Us achterbân hat in soad fragen oer it hus oan 'e dyk.
   Moarn geane wy mei de hiele famylje nei it strân.
2. Open the add-in: Home > Iepen Fryske Stavering.
3. The panel explains that nothing is marked as Frisian yet. Click "Hiel dokumint as Frysk" (mark whole document as Frisian).
4. Expected: "achterbân" gets a blue squiggle (preferred form "efterbân") and "hus" a red squiggle (suggestions include "hûs"). The second sentence is correct and gets no squiggles. The panel lists both words with suggestions.
5. Click a suggestion in the panel, or click a squiggle and pick a suggestion: the word is replaced.
6. "Negearje" ignores a word for the session; "Taheakje" adds it to a personal word list stored on the device.
7. Optional: select one sentence and click "Seleksje as Frysk" to mark only that part; unmarked text (e.g. Dutch or English) is not checked by the add-in.

Platform notes:
- The panel's interface is in Frisian, as the add-in is for Frisian writers. Button meanings are given above.
- Squiggles in the text need WordApi 1.7/1.8 (for example Word for Mac 16.85+ with Microsoft 365). On older versions the panel still lists all words with suggestions.
- Word on the web doesn't support reading or setting the text language (WordApiDesktop 1.3), so there the marking buttons are hidden and all text is checked.
```

## Screenshots

At least one is required: **1366 × 768 px, at most 1024 KB**, PNG. Microsoft advises one point per image, with a short caption, and no personal information.

Suggested set:

1. **Panel with suggestions:** Word with the sample text and the panel showing both words and their suggestions. *Caption:* "Every word to check, with suggestions."
2. **Squiggles in the text:** a close-up of the red and blue squiggles with the pop-up open. *Caption:* "Red: not in the word list. Blue: a preferred form."
3. **Marking Frisian text:** the marking buttons, in a document with Frisian and Dutch text. *Caption:* "Mark your Frisian text; Dutch and English stay with Word."
4. Optional: **one-click replacement**, after choosing a suggestion.

## Logo

Partner Center asks for a logo image for the listing. It should be the same icon as in the manifest (`assets/icon-64.png`). Check the size Partner Center asks for when uploading; a larger version can be made from the same design.
