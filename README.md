# Iepen Fryske Stavering for Word

A Word add-in that checks **Frisian (Frysk) spelling** in Microsoft Word,
including Word for Mac, which has no Frisian spell checker of its own.

- **Squiggles in the text:** red for words that aren't in the word list, blue
  for words that have a preferred spelling (*achterbân* → *efterbân*). Click one
  to pick a suggestion.
- **Side panel:** lists every issue with suggestions, and lets you ignore a
  word or add it to your own list.
- **Checks as you type.** It only checks text marked as Frisian, so Dutch and
  English stay with Word's own spell checker.
- **Private:** everything runs inside Word on your own computer. Your text is
  never sent anywhere.

It uses the official word list (*Foarkarswurdlist*, 2015 spelling).

## Install

Go to the project website, **https://iappyx.github.io/iepen-fryske-stavering/**, and
follow the four steps. You download one small file, put it in Word's add-in
folder, and restart Word.

## Requirements

- **Word for Mac 16.85 or newer with a Microsoft 365 subscription** for the
  squiggles in the text. This is a Microsoft requirement for this feature.
- **Marking text as Frisian** needs a recent Word desktop version (API set
  WordApiDesktop 1.3). Without it, the add-in checks all text and the marking
  buttons are hidden. Word on the web doesn't support it.
- **Other Word versions** get the side panel without squiggles. It also works in
  Word for Windows and Word on the web.

## Hosting your own copy

You only need this if you want to run your own copy instead of using the
website above. Word add-ins are small web pages, so the files need to be
hosted on the internet; GitHub Pages does that for free. The website's
download button automatically creates an add-in file for the address it's
served from.

1. **Put the files on GitHub.** Create a repository called `iepen-fryske-stavering` and
   upload everything in this folder.
2. **Turn on GitHub Pages.** In the repository go to **Settings → Pages**, set
   *Source* to **Deploy from a branch**, and choose branch `main` and folder
   `/ (root)`. After about a minute your add-in is live at
   `https://YOURNAME.github.io/iepen-fryske-stavering/`.
3. **Install it** by following the steps on your new
   `https://YOURNAME.github.io/iepen-fryske-stavering/` page.

If you prefer Terminal, `tools/make_manifest.sh` creates the add-in file
and `tools/install_in_word.sh` copies it into Word. On recent macOS versions,
Terminal may not be allowed into Word's folder; use Finder then, as the
website describes.

## Word for Windows

Word for Windows has no folder like the Mac's `wef` folder, so the website's
steps don't apply there. Instead, `tools/install_windows.ps1` downloads the
add-in file into your own AppData folder and registers it with Word. It needs
no administrator rights. Run it in PowerShell from this folder:

```
powershell -ExecutionPolicy Bypass -File tools\install_windows.ps1
```

Then restart Word. To remove it, run the same command with `-Uninstall`
at the end. For your own copy, add `-Url https://YOURNAME.github.io/iepen-fryske-stavering/`.

After an update, if Word still shows the old version, tick **File → Options →
Trust Center → Trust Center Settings → Trusted Add-in Catalogs → Next time
Office starts, clear all previously-started web add-ins cache** and restart
Word. Or quit Word and delete the contents of
`%LOCALAPPDATA%\Microsoft\Office\16.0\Wef`. That folder is only a cache;
clearing it doesn't uninstall the add-in, which stays registered by the script.

This uses the registry key that Microsoft's own tools use to load add-ins for
testing (`HKEY_CURRENT_USER\SOFTWARE\Microsoft\Office\16.0\Wef\Developer`).
It works for everyday use, but it isn't an official distribution route. For an
organisation, the Microsoft 365 admin center is the official one.

## Using it

Open the panel with **Home → Iepen Fryske Stavering**. It checks the document right
away and again whenever you pause typing.

**Mark your Frisian text first.** The add-in only checks text marked as Frisian.
Select the text and click **Seleksje as Frysk**, or **Hiel dokumint as Frysk**
for the whole document. Word stores the language with the text, like bold or
italics, so it stays in the document.

- **Why this works:** Word has no Frisian dictionary from Microsoft (on Mac or
  Windows), so it leaves Frisian-marked text alone. Its Dutch or English spell
  check no longer competes with the add-in there.
- **Mixed paragraphs:** you can mark a single sentence or word. Only the
  Frisian parts of a paragraph are checked.
- **Unmarking:** select the text, choose **Tools → Language** and pick the
  right language. Frisian isn't in that list on the Mac, but other languages
  are.
- **New text** takes over the language of the text around it. Pasted text
  keeps its own language, so mark it again if needed.
- If you change the language through Word's menu, the panel picks up the change
  as soon as you click or move the cursor in the text.
- Older versions of this add-in could switch off Word's own check ("Do not
  check spelling or grammar"). Marking text as Frisian switches that back on.
  You can also untick it under **Tools → Language**.

| | Meaning |
|---|---|
| Red squiggle | Not in the word list (*Net yn ’e wurdlist*) |
| Blue squiggle | Correct word, but not the preferred form (*Net de foarkarsfoarm*) |

- **Suggestions:** click a squiggle to see up to three suggestions (a Word
  limit). The panel shows up to five.
- **Negearje:** ignores the word until you close the document.
- **Taheakje:** adds the word to your personal list, which is kept between
  sessions.

## Updating the word list

The word list is in `dict/`. To rebuild it from the Fryske Akademy's current
download:

```
bash tools/update_dictionary.sh
```

Commit the changed files and GitHub Pages will serve the new list.

## How it was tested

- **Spell checker:** `speller.js` is a JavaScript implementation of the Hunspell
  rules this word list uses. It was compared with the real Hunspell engine on
  349,737 test lines: every word form, capitalisation variants, 25,000
  misspellings and real Frisian sentences. The two agree on 99.998% of lines.
- **Add-in:** tested against a simulated Word document (squiggles, popup
  actions, replacing, ignoring, the personal list, and switching squiggles
  off). It still needs a first run in real Word.

## License

Made by **iappyx**.

- **The add-in code** is © 2026 iappyx, released under the [MIT License](LICENSE).
- **The word list in `dict/`** is © Fryske Akademy and licensed under the
  [GNU GPL v3](dict/gpl.txt); see [dict/README.txt](dict/README.txt). It was
  converted from Latin-1 to UTF-8; the words themselves are unchanged.

This project is not affiliated with or endorsed by the Fryske Akademy or
Microsoft.
