# NYC Restaurant Week Interactive Map — Design

## Purpose
An interactive map of NYC Restaurant Week (Summer 2026, July 20–Aug 16) participating
restaurants. Hovering a pin shows the offer (2-course lunch / 3-course dinner at
$30, $45, or $60). Pin color/size signals recommendation tier, so Michelin-starred
and highly-rated restaurants stand out from the rest of the ~607 participants.

## Source event facts (verified via WebFetch/WebSearch, 2026-07-20)
- Event: NYC Restaurant Week Summer 2026, July 20 – August 16, 2026
- ~607 participating restaurants, five boroughs, 70+ neighborhoods, 45+ cuisines
- Prix-fixe tiers: $30, $45, $60 — 2-course lunch / 3-course dinner
- Available Mon–Fri; Sundays optional per restaurant; **no Saturdays**
- Beverages, gratuities, taxes not included unless a restaurant states otherwise
- Master list lives at nyctourism.com/rw, powered by OpenTable

## Output
A static local web app deliverable (not a Claude Artifact — Artifacts' CSP blocks
external map tile requests, so the map would render blank). The app is local, but
not fully offline unless Leaflet assets are vendored and map tiles are pre-cached;
by default it requires internet access for OpenStreetMap tiles.

- `restaurant-week-map/index.html` — Leaflet.js map over OpenStreetMap tiles
- `restaurant-week-map/restaurants.json` — all source restaurants, including
  unplaced or incomplete records flagged with status fields
- `restaurant-week-map/README.md` — how to open it, data coverage/caveats, refresh steps

Recommended local open path:

```sh
cd restaurant-week-map
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Direct `file://...` opening may work in some
browsers, but can fail when the page fetches `restaurants.json`.

## Data model (per restaurant)
```json
{
  "id": "stable-slug-or-source-id",
  "name": "string",
  "neighborhood": "string",
  "borough": "Manhattan | Brooklyn | Queens | Bronx | Staten Island",
  "address": "string",
  "lat": "number | null",
  "lng": "number | null",
  "cuisine": "string",
  "offers": [
    {
      "meal": "lunch | dinner",
      "price": 30,
      "courses": 2,
      "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "sunday_available": false,
      "menu_url": "string | null",
      "source_url": "string"
    }
  ],
  "tier": "michelin_star | bib_gourmand_or_critics_pick | highly_rated | standard",
  "tier_source": "string (e.g. 'Michelin Guide 2026', 'Google Maps 4.6★ (312 reviews)')",
  "rating": "number | null",
  "review_count": "number | null",
  "geocode_source": "string | null",
  "geocode_confidence": "verified | matched | approximate | failed",
  "source_url": "string",
  "last_verified": "YYYY-MM-DD",
  "reservation_url": "string | null",
  "status": "placed | unplaced | needs_review",
  "notes": "string | null"
}
```

## Data acquisition plan
1. **Full list (607, all boroughs):** scrape/derive from nyctourism.com/rw
   (OpenTable-powered listing) — name, address, cuisine, meal/price offer(s),
   reservation/menu URL, and source URL.
2. **Manhattan south of 59th St (Central Park's southern edge): guaranteed complete.**
   Every restaurant in this zone gets a verified geocoded coordinate. This is the
   explicit focus area for the recommendation highlighting. Treat "south of 59th St"
   as restaurants whose verified point or street address is below 59th Street; edge
   cases are marked `needs_review` and documented.
3. **Everywhere else (other boroughs + Manhattan north of 59th St): best-effort.**
   Same enrichment pipeline, run without the completeness guarantee. Any restaurant
   that can't be geocoded or matched is logged and reported in the README's coverage
   section — never silently dropped from the count.
4. **Recommendation tier enrichment**, in priority order:
   - Michelin Guide stars → `michelin_star`
   - Michelin Bib Gourmand → `bib_gourmand_or_critics_pick`
   - Editorial critics' picks for this Restaurant Week cycle (Forbes, Downtown
     Alliance, Michelin's own RW guide, etc.) → `bib_gourmand_or_critics_pick`
   - For everything not covered above: Google Maps / Places rating. 4.5★+ and
     at least 100 reviews → `highly_rated`
   - Everyone else → "standard"
5. **Rating source constraints:** prefer the Google Places API or a manually captured
   source. Do not scrape Google Maps pages. If ratings are unavailable or quota/API
   access is not configured, leave `rating`/`review_count` null and do not assign
   `highly_rated` from guessed data.

## Coverage acceptance criteria
- `restaurants.json` contains one record per source-list restaurant; the README
  reports the source-list count and the number of placed, unplaced, and
  needs-review records.
- Manhattan south of 59th St has a reconciled source count, placed count, and manual
  review count. Any unplaced records in this zone are called out individually.
- Map markers are rendered only for records with `status: "placed"` and non-null
  `lat`/`lng`.
- No restaurant is dropped silently. Unplaced restaurants stay in `restaurants.json`
  with `status: "unplaced"` and a note explaining the failure.

## Recommendation tiers → map styling
| Tier | Color | Pin size | Meaning |
|---|---|---|---|
| michelin_star | red/gold | largest | Michelin-starred |
| bib_gourmand_or_critics_pick | orange | large | Bib Gourmand or editorial "best of RW" pick |
| highly_rated | green | medium | Google Maps / Places 4.5★+ with 100+ reviews |
| standard | grey | small | Participating, no elevated signal found |

## Interaction
- **Hover a pin:** tooltip with name, cuisine, available offer(s), tier badge
- **Click a pin:** popup with address + reservation link (OpenTable/direct site)
- **Legend:** always visible, explains tier colors
- **Filter checkboxes:** toggle tiers on/off (e.g. "show only Michelin + Bib Gourmand")
- No default geographic filtering — full map loads, but Manhattan-below-Central-Park
  markers are the most reliably placed and enriched

## Error handling / honesty about data quality
- Restaurants that can't be geocoded are excluded from rendered map markers but kept
  in `restaurants.json`, counted, and listed in the README ("N of 607 restaurants
  could not be placed — reasons: ...")
- Tier assignment for the "everywhere else" zone is best-effort; the README notes
  that Google-rating-based tiering was not manually verified restaurant-by-restaurant
- No fabricated data: if an offer price or address can't be confirmed, the
  restaurant is flagged rather than guessed

## Out of scope
- No booking/reservation flow — links out to OpenTable/restaurant sites only
- No user accounts, saved favorites, or backend/server component
- No mobile-specific redesign (should be usable on mobile via responsive Leaflet
  defaults, but not a primary target)
- Not tied to the CLAUDE.md master's-application workflow — this is a personal
  side project living in this repo at the user's request
