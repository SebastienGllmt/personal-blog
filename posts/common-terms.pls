<?xml version="1.0" encoding="UTF-8"?>
<!--
  Shared cross-post pronunciation lexicon. The generator merges this with
  each post's inline <script type="application/pls+xml"> block(s) and
  hands the combined lexicon to the TTS provider. Entries here apply to
  every post; post-specific terms go inline in the post itself.
  PLS spec: https://www.w3.org/TR/pronunciation-lexicon/

  Use <alias>: a respelling read through the engine's normal voice. Spell it
  out as UNAMBIGUOUS English words — "shah two fifty six", not "sha …" ("sha"
  was read "shay") and not hyphen shorthand. The bar is high: the respelling
  itself must have one obvious reading (see methodology.md, "Representing word
  pronunciation").

  Do NOT rely on <phoneme> (IPA): the local MOSS model does not interpret it —
  it reads the wrapping slashes literally as "slash". IPA support appears to be
  a flagship/larger-MOSS feature. The parser still reads <phoneme> and the
  pipeline can emit it to a genuinely IPA-capable engine, but MOSS today is not
  one, so every entry MUST carry a working <alias>.

  How adapters use this:
    - `moss` SUBSTITUTES matched graphemes with their pronunciation before
      synthesis (generate/pronunciation.ts), so MOSS honors these entries
      even though it has no native PLS API.
    - `say` ignores PLS entirely (macOS has no support) and warns at startup.
-->
<lexicon version="1.0"
         xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
         xml:lang="en-US">
  <!-- "shah" (a real word, /ʃɑː/), not "sha" — MOSS read "sha" as "shay". -->
  <lexeme>
    <grapheme>SHA-256</grapheme>
    <grapheme>SHA256</grapheme>
    <grapheme>sha-256</grapheme>
    <grapheme>sha256</grapheme>
    <alias>shah two fifty six</alias>
  </lexeme>
  <!-- RIPEMD-160. Two lessons baked into "ripe M D one sixty":
       1. Acronym letters → STANDALONE CAPITALS ("M", "D"), not lowercase
          letter-words ("em", "dee"). Capitals get spelled correctly AND don't
          blend: lowercase "ripe em" was read "rape em" (the capital "M" breaks
          that merge), and "dee" was read "dey" while "D" reads "dee".
       2. Don't fight a misread with punctuation — "ripe, em" / "ripe. em" did
          fix the vowel but added an awkward pause; the capitals fix it cleanly.
       Moved here from the post's inline lexicon so its alias iterates cheaply
       (common-terms is excluded from the cache key → re-roll only the affected
       segments, no full-post re-render). -->
  <lexeme>
    <grapheme>RIPEMD-160</grapheme>
    <grapheme>RIPEMD160</grapheme>
    <grapheme>ripemd-160</grapheme>
    <grapheme>ripemd160</grapheme>
    <alias>ripe M D one sixty</alias>
  </lexeme>
  <!-- Moved out of the offer-files post's inline lexicon so the aliases iterate
       cheaply (common-terms is excluded from the audio cache key → only the
       affected segments re-roll, no full-post re-render). Aliases are UNAMBIGUOUS
       English respellings; acronyms use STANDALONE CAPITALS so the engine spells
       the letters rather than blending them. -->
  <lexeme><grapheme>zSwap</grapheme><grapheme>ZSwap</grapheme><grapheme>zswap</grapheme><alias>zee swap</alias></lexeme>
  <lexeme><grapheme>zSwaps</grapheme><grapheme>ZSwaps</grapheme><grapheme>zswaps</grapheme><alias>zee swaps</alias></lexeme>
  <lexeme><grapheme>Celestia</grapheme><alias>Celesteeah</alias></lexeme>
  <lexeme><grapheme>bech32</grapheme><grapheme>Bech32</grapheme><alias>beck thirty two</alias></lexeme>
  <lexeme><grapheme>bech32m</grapheme><grapheme>Bech32m</grapheme><alias>beck thirty two M</alias></lexeme>
  <lexeme><grapheme>TIA</grapheme><alias>Tia</alias></lexeme>
  <lexeme><grapheme>UTXO</grapheme><alias>U T X O</alias></lexeme>
  <lexeme><grapheme>UTXOs</grapheme><alias>U T X Ohs</alias></lexeme>
  <lexeme><grapheme>Chia</grapheme><alias>Cheeah</alias></lexeme>
  <lexeme><grapheme>XCH</grapheme><alias>X C H</alias></lexeme>
  <lexeme><grapheme>dexie</grapheme><alias>dex ee</alias></lexeme>
  <lexeme><grapheme>USDC</grapheme><grapheme>wUSDC.b</grapheme><alias>U S D C</alias></lexeme>
  <lexeme><grapheme>DEX</grapheme><alias>decks</alias></lexeme>
  <lexeme><grapheme>dApp</grapheme><alias>dee app</alias></lexeme>
  <lexeme><grapheme>dApps</grapheme><alias>dee apps</alias></lexeme>
  <lexeme><grapheme>Merkle</grapheme><alias>mur kull</alias></lexeme>
  <lexeme><grapheme>P2P</grapheme><alias>peer to peer</alias></lexeme>
  <lexeme><grapheme>L2</grapheme><alias>layer two</alias></lexeme>
  <lexeme><grapheme>L1</grapheme><alias>layer one</alias></lexeme>
  <lexeme><grapheme>TEE</grapheme><alias>T E E</alias></lexeme>
  <lexeme><grapheme>Ligero</grapheme><alias>Lee Gear Oh</alias></lexeme>
  <lexeme><grapheme>SNARK</grapheme><grapheme>SNARKs</grapheme><alias>snark</alias></lexeme>
  <lexeme><grapheme>MPC</grapheme><alias>M P C</alias></lexeme>
  <lexeme><grapheme>FHE</grapheme><alias>F H E</alias></lexeme>
  <lexeme><grapheme>DA</grapheme><alias>D A</alias></lexeme>
  <lexeme><grapheme>EigenDA</grapheme><alias>eigen D A</alias></lexeme>
  <lexeme><grapheme>MEV</grapheme><alias>M E V</alias></lexeme>
  <lexeme><grapheme>BFT</grapheme><alias>B F T</alias></lexeme>
  <lexeme><grapheme>BLS</grapheme><alias>B L S</alias></lexeme>
  <lexeme><grapheme>zkVM</grapheme><alias>zee kei V M</alias></lexeme>
</lexicon>
