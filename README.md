# HoloCollector

A small static website for a student-run Pokémon trading card shop in Dubai. Visitors browse listings, add cards to a cart saved in the browser, and send the order by WhatsApp. No payment is taken on the site.

The live site is [https://holocollector.github.io/](https://holocollector.github.io/). To preview locally, open `index.html` in a browser.

## GitHub Pages

Source is **GitHub Actions**. A push to `main` runs `.github/workflows/pages.yml`, which uploads the files at the repo root and deploys them. `.nojekyll` is included so Pages does not run Jekyll.

## Edit the card list

All listings live in the `PRODUCTS` array near the top of `script.js`.

To add a card, copy one `{ ... }` block, paste it below the last card (keep the comma between blocks), and change the values:

- `id` — unique short code, no spaces (for example `"pika-02"`)
- `name` — card name shown on the site
- `set` — the set or expansion it comes from
- `number` — card number in the set (`""` if unknown)
- `tcgId` — optional Pokémon TCG API id, like `"swsh9-79"`. Find it by opening `https://api.pokemontcg.io/v2/cards?q=name:lucario` and copying the `id` of the right card. If you leave it out, the updater tries the set name plus the card number.
- `variant` — optional: `"holofoil"`, `"reverseHolofoil"`, or `"normal"`. Leave it out to use holofoil, then reverse holofoil, then normal.
- `autoPrice` — set to `false` to keep the `price` you typed. Leave it out to use the daily market price.
- `type` — one of: Fire, Water, Grass, Electric, Psychic, Dark, Dragon, Fighting, Normal
- `condition` — Mint, Near Mint, Lightly Played, or Played. Mint and Near Mint are full price, Lightly Played is 85%, Played is 70%.
- `price` — backup price in AED (a number only). Used when `autoPrice` is `false`, or if the market lookup fails.
- `stock` — how many you have (`0` shows “Sold out”)
- `emoji` — placeholder picture (any emoji)
- `rare` — `true` to show a RARE badge, otherwise `false`

To remove a card, delete its `{ ... }` block.

`PRODUCTS` starts empty, with one commented sample line that shows the format. Uncomment that line or copy it, then edit the values, before taking orders. There is no example stock on the site.

Each day the site sets a card's price to the market price plus 10%, in whole AED. TCGplayer market prices (US dollars) are used first. If a card has none, Cardmarket's euro trend price is converted to dollars. Dollars become dirhams at 3.6725. Collectr does not offer a public price API, so prices come from the free Pokémon TCG API instead. The percentages and the 10% profit sit at the top of `scripts/update-prices.mjs`. A small "Prices updated" note on the shop shows the date. If the price API is down, the last saved price (or the typed `price`) stays.

Shop name, WhatsApp number, and email are in the `SHOP` object in the same file. Update the shop name in `index.html` as well (the `<title>` and any element with `data-shop-name`). The WhatsApp value is digits only, in international format, with no `+` and no leading `0`.

Leave `SHOP.email` as `""` until you have a real address. While it is empty, the site hides email ordering and any email contact link. Set it to that address to show them again. Do not put a placeholder address there.

## Files

- `index.html` — page structure
- `style.css` — layout and colors
- `script.js` — shop settings, the `PRODUCTS` list, cart, and checkout
- `prices.json` — latest market prices (rewritten when the site is published)
- `scripts/update-prices.mjs` — fetches those prices
- `.nojekyll` — tells GitHub Pages to serve the files as-is
