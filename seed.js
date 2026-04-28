require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const Page = require('./models/Page');
const Menu = require('./models/Menu');
const Settings = require('./models/Settings');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nodecms';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // ── Admin User ───────────────────────────────────────
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (!existingAdmin) {
    const admin = new User({
      username: 'admin',
      email: 'admin@nodecms.local',
      password: 'admin123',
      role: 'admin',
      displayName: 'Admin',
      bio: 'Site administrator'
    });
    await admin.save();
    console.log('✓ Admin user created (admin / admin123)');
  } else {
    console.log('• Admin user already exists');
  }

  const admin = await User.findOne({ username: 'admin' });

  // ── Settings ─────────────────────────────────────────
  await Settings.set('siteTitle', 'NodeCMS');
  await Settings.set('siteTagline', 'A lightweight content management system');
  await Settings.set('activeTheme', 'default');
  await Settings.set('footerText', `© ${new Date().getFullYear()} NodeCMS. All rights reserved.`);
  await Settings.set('postsPerPage', 10);
  console.log('✓ Default settings created');

  // ── Sample Posts ──────────────────────────────────────
  const postCount = await Post.countDocuments();
  if (postCount === 0) {
    await Post.create([
      {
        title: 'Welcome to NodeCMS',
        slug: 'welcome-to-nodecms',
        content: `<h2>Hello World!</h2>
<p>Welcome to <strong>NodeCMS</strong> — a lightweight, fast, and flexible content management system built with Node.js, Express, EJS, and MongoDB.</p>
<h3>Why NodeCMS?</h3>
<p>Unlike heavyweight CMS platforms, NodeCMS gives you everything you need without the bloat. It's designed for developers who want full control over their content and design.</p>
<blockquote>Simple things should be simple, complex things should be possible.</blockquote>
<h3>Key Features</h3>
<ul>
<li>JSON-based theming — change your entire site design by editing theme.json</li>
<li>Quill rich text editor for beautiful content creation</li>
<li>Media library with drag-and-drop uploads</li>
<li>SEO-friendly URLs and meta fields</li>
<li>Responsive out of the box</li>
</ul>
<p>Head to the <a href="/admin">admin panel</a> to start creating content!</p>`,
        excerpt: 'Welcome to NodeCMS — a lightweight CMS built with Node.js, Express, EJS, and MongoDB. Fast, flexible, and fully themeable with JSON.',
        status: 'published',
        author: admin._id,
        categories: ['Announcements'],
        tags: ['nodejs', 'cms', 'open-source'],
        publishedAt: new Date()
      },
      {
        title: 'Getting Started with Theme Customization',
        slug: 'getting-started-theme-customization',
        content: `<h2>Your Site, Your Style</h2>
<p>NodeCMS uses a <code>theme.json</code> file to control every visual aspect of your site. No PHP, no template hacking — just clean JSON.</p>
<h3>How It Works</h3>
<p>Navigate to <strong>Theme</strong> in the admin panel. You'll see a visual editor for colors and typography, plus a raw JSON editor for full control.</p>
<h3>What You Can Customize</h3>
<p>Colors, fonts, layout structure, sidebar position, component visibility, widgets, social links, and custom CSS/JS — all from one file.</p>
<pre><code>{
  "colors": {
    "primary": "#2563eb",
    "background": "#ffffff",
    "text": "#0f172a"
  }
}</code></pre>
<p>Change the primary color, save, and watch your entire site update instantly.</p>`,
        excerpt: 'Learn how to customize your NodeCMS site using the powerful theme.json configuration system.',
        status: 'published',
        author: admin._id,
        categories: ['Tutorials'],
        tags: ['themes', 'customization', 'design'],
        publishedAt: new Date(Date.now() - 86400000)
      }
    ]);
    console.log('✓ Sample posts created');
  }

  // ── Sample Page ───────────────────────────────────────
  const pageCount = await Page.countDocuments();
  if (pageCount === 0) {
    await Page.create({
      title: 'About',
      slug: 'about',
      content: `<h2>About NodeCMS</h2>
<p>NodeCMS is a lightweight, self-hosted content management system designed for developers who want full control without the overhead of WordPress.</p>
<p>Built with Node.js, Express, EJS templates, and MongoDB, it offers a clean admin interface, flexible theming through JSON configuration, and a modern publishing experience.</p>`,
      status: 'published',
      template: 'default',
      author: admin._id
    });
    console.log('✓ Sample page created');
  }

  // ── Menu ──────────────────────────────────────────────
  const menuCount = await Menu.countDocuments();
  if (menuCount === 0) {
    await Menu.create([
      {
        name: 'Primary',
        location: 'primary',
        items: [
          { label: 'Home', url: '/', target: '_self', order: 0 },
          { label: 'About', url: '/about', target: '_self', order: 1 }
        ]
      },
      {
        name: 'Footer',
        location: 'footer',
        items: [
          { label: 'Home', url: '/', target: '_self', order: 0 },
          { label: 'About', url: '/about', target: '_self', order: 1 }
        ]
      }
    ]);
    console.log('✓ Default menus created');
  }

  console.log('\n✅ Seed complete!\n');
  console.log('  Login:    http://localhost:3000/admin');
  console.log('  Username: admin');
  console.log('  Password: admin123\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
