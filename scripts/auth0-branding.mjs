// Dresses the Auth0 Universal Login page in Pinlog's paper-and-pencil palette (docs/AUTH.md).
// Run by `pnpm auth0:brand`; `--dry-run` prints what would change without writing.
//
// This is the whole branding config: edit PALETTE or COPY and re-run to reapply, on this tenant or a
// teammate's. Deliberately asset-free — Auth0 fetches logos/fonts from the public internet, and a demo
// running on localhost has nowhere to serve them from, so the look comes from colour and shape alone.
import { execFileSync } from 'node:child_process';

const DRY_RUN = process.argv.includes('--dry-run');

/** Straight from apps/web/src/app/globals.css — keep the two in step. */
const PALETTE = {
  paper: '#f6f2e8',
  card: '#fffcf5',
  ink: '#48443e',
  muted: '#787268',
  line: '#cfc7b8',
  accent: '#796790',
  onAccent: '#ffffff',
  error: '#b4544d',
  success: '#5f8464',
};

/** The tenant runs the combined `login` prompt (not identifier-first) on an email-only database connection. */
const COPY = {
  login: {
    login: {
      pageTitle: 'Sign in to Pinlog',
      title: 'Welcome back, traveller',
      description: 'Sign in to pick up where you left off.',
      buttonText: 'Open my shelf',
      separatorText: 'or',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      forgotPasswordText: 'Forgotten your password?',
      signupActionText: 'Somewhere new?',
      signupActionLinkText: 'Start a shelf',
    },
  },
  signup: {
    signup: {
      pageTitle: 'Start a Pinlog shelf',
      title: 'Start your travel shelf',
      description: 'A few pins, a few photos — and a little film at the end.',
      buttonText: 'Make my shelf',
      separatorText: 'or',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      loginActionText: 'Been here before?',
      loginActionLinkText: 'Open your shelf',
    },
  },
};

const die = (msg) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

/** `auth0 api <method> <path>`. Returns parsed JSON, or null when the call failed. */
function api(method, path, body) {
  const args = ['api', method, path];
  if (body !== undefined) args.push('--data', JSON.stringify(body));
  try {
    const out = execFileSync('auth0', args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // The CLI prefixes an "Agent mode on" notice outside a TTY; take the JSON that follows it.
    const start = out.search(/[[{]/);
    return start === -1 ? {} : JSON.parse(out.slice(start));
  } catch (err) {
    if (err.code === 'ENOENT') die('Auth0 CLI not found. Install it with `brew install auth0`.');
    return null;
  }
}

// --- contrast, so a palette tweak can never quietly make the page unreadable ---------------------
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function checkContrast() {
  const pairs = [
    ['button label on button', PALETTE.onAccent, PALETTE.accent],
    ['body text on widget', PALETTE.ink, PALETTE.card],
    ['placeholder on widget', PALETTE.muted, PALETTE.card],
  ];
  let worst = Infinity;
  for (const [what, fg, bg] of pairs) {
    const ratio = contrast(fg, bg);
    worst = Math.min(worst, ratio);
    console.log(`  ${ratio >= 4.5 ? '✓' : '!'} ${what.padEnd(24)} ${ratio.toFixed(2)}:1`);
  }
  if (worst < 4.5) {
    console.log(
      '\n  ! Below the WCAG AA threshold of 4.5:1. Applying anyway — your palette, your call.',
    );
  }
}

/** Auth0 rejects partial theme writes, so every section is spelled out here. */
function theme() {
  return {
    displayName: 'Pinlog',
    colors: {
      primary_button: PALETTE.accent,
      primary_button_label: PALETTE.onAccent,
      secondary_button_border: PALETTE.line,
      secondary_button_label: PALETTE.ink,
      base_focus_color: PALETTE.accent,
      base_hover_color: PALETTE.accent,
      links_focused_components: PALETTE.accent,
      header: PALETTE.ink,
      body_text: PALETTE.ink,
      widget_background: PALETTE.card,
      widget_border: PALETTE.line,
      input_labels_placeholders: PALETTE.muted,
      input_filled_text: PALETTE.ink,
      input_border: PALETTE.line,
      input_background: PALETTE.card,
      icons: PALETTE.muted,
      error: PALETTE.error,
      success: PALETTE.success,
    },
    fonts: {
      // Auth0 fetches fonts over the public internet; a localhost demo has nowhere to host one, so
      // the widget uses the system stack rather than Patrick Hand. See docs/AUTH.md.
      font_url: '',
      links_style: 'normal',
      reference_text_size: 16,
      title: { size: 140, bold: true },
      subtitle: { size: 90, bold: false },
      body_text: { size: 90, bold: false },
      buttons_text: { size: 100, bold: true },
      input_labels: { size: 100, bold: false },
      links: { size: 90, bold: false },
    },
    borders: {
      // Soft corners echo the notebook cards on the shelf.
      button_border_weight: 1,
      buttons_style: 'rounded',
      button_border_radius: 8,
      input_border_weight: 1,
      inputs_style: 'rounded',
      input_border_radius: 8,
      widget_corner_radius: 12,
      widget_border_weight: 1,
      show_widget_shadow: true,
    },
    widget: {
      // "none" rather than an empty logo_url: Auth0 falls back to its own blue mark when the URL is
      // blank, and the PWA icon is a dark navy tile that fights the cream widget. The headline leads instead.
      logo_position: 'none',
      logo_url: '',
      logo_height: 52,
      header_text_alignment: 'center',
      social_buttons_layout: 'bottom',
    },
    page_background: {
      background_color: PALETTE.paper,
      background_image_url: '',
      page_layout: 'center',
    },
  };
}

// --- run ----------------------------------------------------------------------------------------
const tenants = api('get', 'tenants/settings');
if (!tenants) die('Not signed in to Auth0. Run `auth0 login`, then retry.');

// `auth0 tenants list` is a CLI-side concept, not a Management API route.
let active;
try {
  const out = execFileSync('auth0', ['tenants', 'list', '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(out.slice(out.search(/[[{]/)));
  active = (Array.isArray(parsed) ? parsed : []).find((t) => t.active);
} catch {
  /* fall back to the friendly name below */
}
console.log(`\nTenant: ${active?.name ?? tenants.friendly_name ?? '(active CLI tenant)'}`);

if (tenants.flags?.universal_login === false) {
  die('This tenant is on Classic Login; a theme will not show. Enable Universal Login first.');
}

console.log('\nContrast (WCAG AA needs 4.5:1):');
checkContrast();

if (DRY_RUN) {
  console.log('\n--dry-run: nothing written. Theme and copy that would be applied:\n');
  console.log(JSON.stringify({ theme: theme(), copy: COPY }, null, 2));
  process.exit(0);
}

// 1. Theme. A tenant that has never been branded has no default theme, so create rather than update.
const existing = api('get', 'branding/themes/default');
const written = existing?.themeId
  ? api('patch', `branding/themes/${existing.themeId}`, theme())
  : api('post', 'branding/themes', theme());
console.log(
  written?.themeId
    ? `\n✓ Theme ${existing?.themeId ? 'updated' : 'created'} (${written.themeId})`
    : '\n✗ Theme write failed — see the error above.',
);

// 2. Tenant-level colours, which also reach any screen still rendered by Classic.
const branding = api('patch', 'branding', {
  colors: { primary: PALETTE.accent, page_background: PALETTE.paper },
});
console.log(branding ? '✓ Tenant branding colours set' : '✗ Tenant branding write failed');

// 3. Screen copy. PUT replaces everything for a prompt, so merge onto what is already there.
for (const [prompt, screens] of Object.entries(COPY)) {
  const current = api('get', `prompts/${prompt}/custom-text/en`) ?? {};
  const merged = { ...current };
  for (const [screen, text] of Object.entries(screens)) {
    merged[screen] = { ...(current[screen] ?? {}), ...text };
  }
  const ok = api('put', `prompts/${prompt}/custom-text/en`, merged);
  console.log(ok ? `✓ Copy applied to "${prompt}"` : `✗ Copy failed for "${prompt}"`);
}

console.log('\nSee it: open http://localhost:3000 and press Sign in.\n');
