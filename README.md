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
- `type` — one of: Fire, Water, Grass, Electric, Psychic, Dark, Dragon, Normal
- `condition` — Mint, Near Mint, Lightly Played, or Played
- `price` — price in AED (a number only, no currency text)
- `stock` — how many you have (`0` shows “Sold out”)
- `emoji` — placeholder picture (any emoji)
- `rare` — `true` to show a RARE badge, otherwise `false`

To remove a card, delete its `{ ... }` block.

`PRODUCTS` starts empty, with one commented sample line that shows the format. Uncomment that line or copy it, then edit the values, before taking orders. There is no example stock on the site.

Shop name, WhatsApp number, and email are in the `SHOP` object in the same file. Update the shop name in `index.html` as well (the `<title>` and any element with `data-shop-name`). The WhatsApp value is digits only, in international format, with no `+` and no leading `0`.

Leave `SHOP.email` as `""` until you have a real address. While it is empty, the site hides email ordering and any email contact link. Set it to that address to show them again. Do not put a placeholder address there.

## Files

- `index.html` — page structure
- `style.css` — layout and colors
- `script.js` — shop settings, the `PRODUCTS` list, cart, and checkout
- `.nojekyll` — tells GitHub Pages to serve the files as-is
