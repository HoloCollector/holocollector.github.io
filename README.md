# Farhan's Card Shop

A small static website for a student-run Pokémon trading card shop in Dubai. Visitors browse listings, add cards to a cart saved in the browser, and send the order by WhatsApp or email. No payment is taken on the site.

The site is meant to be published at [https://farhanvakil13-sys.github.io/card-shop/](https://farhanvakil13-sys.github.io/card-shop/). To preview locally, open `index.html` in a browser.

## GitHub Pages

Pages is not turned on yet. In the repo, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**, then re-run the "Deploy static content to Pages" workflow. The workflow in `.github/workflows/pages.yml` uploads the files at the repo root and deploys them.

To serve `main` directly instead, choose **Deploy from a branch**, branch **main**, folder **/ (root)**. That uses `.nojekyll` so Pages does not run Jekyll. Disable the Actions workflow if you use the branch source, or each push will fail the deploy job.

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

The cards in the file now are examples. Replace them with real stock before taking orders.

Shop name, WhatsApp number, and email are in the `SHOP` object in the same file. Update the shop name in `index.html` as well (the `<title>` and any element with `data-shop-name`). The WhatsApp value is digits only, in international format, with no `+` and no leading `0`.

## Files

- `index.html` — page structure
- `style.css` — layout and colors
- `script.js` — shop settings, the `PRODUCTS` list, cart, and checkout
- `.nojekyll` — tells GitHub Pages to serve the files as-is
