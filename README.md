# Skandha (MEAN)

The site, drawn by Angular, and its own server in Node.js (Express, MongoDB), exported from
UniversalIDE.

```sh
npm install
npm run build
ADMIN_KEY=choose-a-long-secret npm start     # http://localhost:3000
```

Node.js 22.13 or later. Or with Docker: `docker build -t site . && docker run -p 3000:3000 -e ADMIN_KEY=… -v site-data:/data site`.

## Layout

- `client/`: the site as a Angular project; `npm run build` builds it into `site/`.
- `site/`: the site's pages, styles, pictures and exact copies, served as they are.
- `src/app.ts`: the server: the site, `POST /api/forms/:id`, `POST /api/views`, `/api/admin/…`; `src/server.ts` runs it.
- `src/rules.ts`: the checks on messages and page views; `src/store.ts`: the database.

## The database

Messages and counters are kept in MongoDB. Set `DATABASE_URL` to its address
(`mongodb+srv://user:password@cluster.example.net/site`; `MONGODB_URI`, as the Vercel MongoDB Atlas integration sets it, works too).
The server creates what it needs on first use. Without it the site is served and forms answer
that the database isn't set up.

## Vercel

The project deploys to Vercel as it is: `vercel.json` builds it, Vercel serves `site/` with
the server's headers, and every other address runs the server as one function (`api/index.js`). Set `DATABASE_URL` (or connect MongoDB
Atlas from the Vercel Marketplace) and `ADMIN_KEY` in the project's environment variables.

## Messages and statistics

Forms on the site that send to you post to `/api/forms/<form id>`; the messages are kept in the
database (the newest 2,000). Page views are counted a day per page, with the sites visitors came
from; nothing about the visitors themselves is kept. Read them with the admin key:

```sh
curl -H "Authorization: Bearer $ADMIN_KEY" http://localhost:3000/api/admin/messages
curl -H "Authorization: Bearer $ADMIN_KEY" "http://localhost:3000/api/admin/stats?days=30"
curl -X DELETE -H "Authorization: Bearer $ADMIN_KEY" http://localhost:3000/api/admin/messages/<id>
```

| Setting | |
|---|---|
| `PORT` | where it listens |
| `DATA_DIR` | the folder for the database (`site.sqlite`) |
| `ADMIN_KEY` | lets you read messages and statistics; without it those addresses answer 404 |
| `TRUST_PROXY=1` | behind a proxy: a visitor's address (for the sending limits only) is the first in `X-Forwarded-For` |

`server.json` holds the site's forms, pages and rules; `site/` is the site itself. Both are
written by UniversalIDE: export again to update them.
