# NodeCMS

A lightweight, self-hosted WordPress alternative built with **Node.js**, **Express**, **EJS**, and **MongoDB**.

Theme your entire site by editing a single `theme.json` file — no PHP, no template hacking.

---

## Features

- **JSON-based theming** — Colors, fonts, layout, widgets, and component visibility all controlled via `theme.json`
- **Rich text editor** — Quill-powered content creation with image embedding
- **Posts & Pages** — Full CRUD with categories, tags, slugs, and SEO fields
- **Media library** — Drag-and-drop uploads with inline image picker
- **Menu manager** — Visual menu builder for header, footer, and sidebar navigation
- **Theme editor** — Visual color picker + raw JSON editor in the admin panel
- **SEO ready** — Meta titles, descriptions, and clean URL slugs on every post/page
- **Responsive** — Mobile-friendly admin panel and frontend theme
- **User roles** — Admin, Editor, and Author roles with middleware-based access control
- **Sidebar widgets** — Search, recent posts, categories, and tags — all configurable in theme.json
- **Session auth** — Secure bcrypt passwords with MongoDB-backed sessions

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MongoDB** running locally or a MongoDB Atlas connection string

### Installation

```bash
# Clone or copy the project
cd nodecms

# Install dependencies
npm install

# Create your environment config
cp .env.example .env
# Edit .env with your MongoDB URI and session secret

# Seed the database (creates admin user + sample content)
npm run seed

# Start the server
npm start
```

### Default Login

```
URL:      http://localhost:3000/admin
Username: admin
Password: admin123
```

> **Change the default password immediately after first login.**

---

## Project Structure

```
nodecms/
├── server.js                 # Express app entry point
├── seed.js                   # Database seeder
├── package.json
├── .env.example
│
├── config/                   # (future) additional config files
│
├── models/
│   ├── User.js               # User model with bcrypt auth
│   ├── Post.js               # Blog posts with SEO, categories, tags
│   ├── Page.js               # Static pages with templates
│   ├── Media.js              # Uploaded file metadata
│   ├── Menu.js               # Navigation menus by location
│   └── Settings.js           # Key-value site settings
│
├── routes/
│   ├── admin.js              # Login, logout, dashboard
│   ├── posts.js              # Post CRUD
│   ├── pages.js              # Page CRUD
│   ├── media.js              # File uploads & media library
│   ├── menus.js              # Menu management
│   ├── theme.js              # Theme editor & switching
│   ├── settings.js           # Site settings
│   └── frontend.js           # Public-facing routes (home, post, page, search, archive)
│
├── middleware/
│   ├── themeEngine.js        # Loads theme.json, site settings, menus into every request
│   ├── auth.js               # requireAuth, requireAdmin, requireEditor
│   ├── flash.js              # Flash message middleware
│   └── upload.js             # Multer config for file uploads
│
├── views/
│   ├── partials/
│   │   ├── admin-header.ejs  # Admin layout top (sidebar + nav)
│   │   └── admin-footer.ejs  # Admin layout bottom
│   │
│   ├── admin/
│   │   ├── login.ejs
│   │   ├── dashboard.ejs
│   │   ├── error.ejs
│   │   ├── posts/
│   │   │   ├── index.ejs     # Post listing with filters
│   │   │   └── edit.ejs      # Post editor with Quill + media picker
│   │   ├── pages/
│   │   │   ├── index.ejs
│   │   │   └── edit.ejs
│   │   ├── media/
│   │   │   └── index.ejs     # Media library grid
│   │   ├── menus/
│   │   │   └── index.ejs     # Menu builder
│   │   ├── theme/
│   │   │   └── index.ejs     # Visual + raw JSON theme editor
│   │   └── settings/
│   │       └── index.ejs
│   │
│   └── themes/
│       └── default/
│           ├── home.ejs      # Homepage with post grid
│           ├── single.ejs    # Single post view
│           ├── page.ejs      # Static page view
│           ├── search.ejs    # Search results
│           ├── archive.ejs   # Category/tag archive
│           ├── 404.ejs
│           ├── error.ejs
│           └── partials/
│               ├── header.ejs  # Site header with nav
│               ├── sidebar.ejs # Widget-driven sidebar
│               └── footer.ejs  # Site footer
│
└── public/
    ├── css/
    │   ├── admin.css         # Admin panel styles
    │   └── theme.css         # Frontend styles (uses CSS vars from theme.json)
    ├── js/                   # (future) frontend scripts
    ├── uploads/              # User-uploaded files
    └── themes/
        └── default/
            └── theme.json    # THE theme configuration file
```

---

## Theme System — How It Works

The `theme.json` file is the core of NodeCMS theming. The theme engine middleware (`themeEngine.js`) reads this file on every request and injects its values as CSS custom properties and EJS template variables.

### theme.json Sections

| Section        | Controls                                                    |
|----------------|-------------------------------------------------------------|
| `colors`       | Primary, secondary, accent, background, text, header, footer |
| `typography`   | Heading font, body font, mono font, base size, line height  |
| `layout`       | Max width, sidebar position/width, header style, border radius |
| `hero`         | Homepage hero section (enable/disable, style, height)       |
| `components`   | Toggle visibility: author, date, tags, related posts, search, etc. |
| `widgets`      | Sidebar and footer widget configuration                     |
| `social`       | Social media profile URLs                                   |
| `custom`       | Custom CSS, JS, head scripts, body scripts                  |

### Example: Change Your Color Scheme

Edit `public/themes/default/theme.json` or use the admin Theme Editor:

```json
{
  "colors": {
    "primary": "#059669",
    "primaryHover": "#047857",
    "headerBg": "#064e3b",
    "background": "#f0fdf4"
  }
}
```

Save → your entire site updates instantly.

### Creating a New Theme

1. Copy `public/themes/default/` to `public/themes/mytheme/`
2. Edit `mytheme/theme.json` with your design
3. Go to Admin → Theme → Activate "mytheme"
4. Optionally create matching EJS templates in `views/themes/mytheme/`

---

## API Endpoints

### Media API

- `GET /admin/media/api/list` — Returns JSON array of uploaded images (used by the media picker in the editor)

### Theme API

- `POST /admin/theme/update-section` — Update a specific theme.json section via AJAX
  - Body: `{ "section": "colors", "data": "{...}" }`

---

## Environment Variables

| Variable         | Default                                | Description              |
|------------------|----------------------------------------|--------------------------|
| `PORT`           | `3000`                                 | Server port              |
| `MONGODB_URI`    | `mongodb://localhost:27017/nodecms`    | MongoDB connection string |
| `SESSION_SECRET` | `nodecms-secret`                       | Session encryption key   |
| `SITE_URL`       | `http://localhost:3000`                | Public site URL          |
| `NODE_ENV`       | `development`                          | Environment mode         |

---

## Extending NodeCMS

### Adding a Widget Type

1. Add the widget config to `theme.json` → `widgets.sidebar[]`
2. Add rendering logic in `views/themes/default/partials/sidebar.ejs`

### Adding a Page Template

1. Add the template option in `views/admin/pages/edit.ejs` (the select dropdown)
2. Create corresponding logic in `routes/frontend.js`
3. Optionally create a new EJS file for the template

### Plugin-like Hooks

Use Express middleware in `server.js` to add functionality:

```javascript
// Example: Add view counter middleware
app.use(async (req, res, next) => {
  if (req.path.startsWith('/post/')) {
    // Track page view
  }
  next();
});
```

---

## Roadmap

- [ ] Comment system
- [ ] User profile management in admin
- [ ] Scheduled post publishing (cron)
- [ ] REST API for headless usage
- [ ] Image resizing/thumbnails
- [ ] Import/export content
- [ ] Multi-language support
- [ ] Plugin system with hooks

---

## License

MIT
