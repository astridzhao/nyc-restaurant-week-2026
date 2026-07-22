# NYC Restaurant Week Interactive Map

Static local Leaflet map for NYC Restaurant Week Summer 2026 restaurants.

## Run locally

From this directory:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Opening `index.html` directly with `file://` may fail because browsers often block
local JSON fetches.

## Files

- `index.html` — page shell and Leaflet imports
- `styles.css` — layout, marker styling, and responsive behavior
- `app.js` — JSON loading, map rendering, tier filtering, popups, and data-quality UI
- `restaurants.json` — source dataset

## Data expectations

`restaurants.json` should contain one record per source-list restaurant. Records
with `status: "placed"` and numeric `lat`/`lng` render as markers. Records with
missing coordinates stay in the dataset and appear in the “Needs placement” list.

Recommended restaurant shape:

```json
{
  "id": "stable-slug-or-source-id",
  "name": "Restaurant Name",
  "neighborhood": "Flatiron",
  "borough": "Manhattan",
  "address": "123 Example St, New York, NY",
  "lat": 40.0,
  "lng": -73.0,
  "cuisine": "Italian",
  "offers": [
    {
      "meal": "dinner",
      "price": 60,
      "courses": 3,
      "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "sunday_available": false,
      "menu_url": null,
      "source_url": "https://www.nyctourism.com/rw/"
    }
  ],
  "tier": "standard",
  "tier_source": null,
  "rating": null,
  "review_count": null,
  "geocode_source": null,
  "geocode_confidence": "verified",
  "source_url": "https://www.nyctourism.com/rw/",
  "last_verified": "2026-07-21",
  "reservation_url": null,
  "status": "placed",
  "notes": null
}
```

## Coverage notes

The current dataset is an empty scaffold. When populated, update this section with:

- source-list count
- placed count
- unplaced count
- needs-review count
- Manhattan south of 59th St source count and placed count
- any data sources used for Michelin, Bib Gourmand, critics’ picks, or ratings

Do not scrape Google Maps pages. If Google/Places ratings are unavailable, keep
`rating` and `review_count` null and avoid assigning `highly_rated` from guesses.
