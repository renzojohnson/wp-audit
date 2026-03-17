# WP Audit - WordPress Performance & Security Linter

Static analysis and live URL scanning for WordPress themes and plugins. Catches performance antipatterns, security vulnerabilities, and generates scored HTML reports with quick fixes — all inside VS Code.

## WordPress Static Analysis

Open any PHP file and run **WP Audit: Scan Current File** or scan your entire workspace. Issues appear as editor diagnostics (squiggly underlines) with quick-fix suggestions.

WP Audit includes 20 built-in rules covering both performance and security, each with a unique rule ID (WPA/WPS prefix) for easy reference.

## WordPress Performance Checks

WP Audit detects common performance antipatterns in WordPress themes and plugins:

- **Scripts in `<head>`** — flags `wp_enqueue_script()` calls missing `in_footer: true`
- **Exposed WordPress version** — version strings in asset URLs leak your WP version
- **`query_posts()` usage** — should be `WP_Query` or `get_posts()` to avoid global pollution
- **`get_posts()` without limit** — missing `numberposts` or `posts_per_page` can load thousands of rows
- **jQuery dependencies** — identifies scripts depending on jQuery when vanilla JS would work
- **Inline CSS/JS** — catches inline styles and scripts that should be enqueued
- **Images without lazy loading** — `<img>` tags missing `loading="lazy"`
- **Mixed content** — HTTP URLs that should be HTTPS

## WordPress Security Vulnerability Detection

WP Audit catches the most common security issues in WordPress PHP code:

- **Unsanitized user input** — `$_GET`, `$_POST`, `$_REQUEST` used without `sanitize_text_field()`, `absint()`, or `wp_unslash()`
- **SQL injection** — `$wpdb->query()`, `get_results()`, `get_var()`, `get_row()`, `get_col()` without `$wpdb->prepare()`
- **`eval()` and `extract()`** — dangerous functions that should never appear in production WordPress code
- **Missing REST callbacks** — `register_rest_route()` without `permission_callback` or `sanitize_callback`
- **Unsafe `unserialize()`** — `unserialize()` with untrusted data (use `maybe_unserialize()` instead)
- **XSS vulnerabilities** — unescaped output missing `esc_html()`, `esc_attr()`, `wp_kses()`

## Live WordPress URL Scanning

Run **WP Audit: Scan Live URL** to analyze any WordPress site without access to its source code:

- **Render-blocking scripts** — scripts loaded in `<head>` that delay page rendering
- **Missing security headers** — HSTS, X-Content-Type-Options, X-Frame-Options
- **WordPress version exposed** — meta generator tag leaking WP version
- **jQuery Migrate** — legacy compatibility script that adds unnecessary weight
- **DOM node count** — excessive DOM size that impacts rendering performance
- **Images without dimensions** — missing `width`/`height` attributes causing CLS (Cumulative Layout Shift)
- **Cache-Control headers** — missing or misconfigured caching
- **HTTP request count** — total number of external requests

## HTML Audit Report with Scoring

Run **WP Audit: Show Report** for a visual audit report:

- **Score (0-100)** — overall health score based on all findings
- **Summary badges** — error, warning, and info counts at a glance
- **Live URL stats** — response time, DOM nodes, script count, image count
- **Findings table** — every issue with file location, rule ID, severity, and description

## Quick Fixes for WordPress Code

Click the lightbulb on flagged lines to auto-fix common issues:

| Issue | Quick Fix |
|-------|-----------|
| Scripts in `<head>` | Adds `in_footer: true` parameter |
| `query_posts()` | Replaces with `new WP_Query()` |
| HTTP URLs | Upgrades to `https://` |
| Unsanitized input | Wraps with `sanitize_text_field()` |
| Unescaped output | Wraps with `esc_html()` |

## Commands

| Command | Description |
|---------|-------------|
| `WP Audit: Scan Current File` | Scan the active PHP file |
| `WP Audit: Scan Workspace` | Scan all PHP files in workspace |
| `WP Audit: Scan Live URL` | Fetch and analyze a WordPress URL |
| `WP Audit: Show Report` | Open HTML report panel |
| `WP Audit: Clear All Diagnostics` | Clear all audit results |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `wpAudit.scanOnSave` | `false` | Auto-scan PHP files on save |
| `wpAudit.enablePerformanceRules` | `true` | Enable performance rules |
| `wpAudit.enableSecurityRules` | `true` | Enable security rules |
| `wpAudit.ignorePaths` | `["vendor/**", "node_modules/**", "wp-admin/**", "wp-includes/**"]` | Paths to exclude |

## Works Alongside Your Existing Tools

WP Audit complements — not replaces — your existing PHP tooling:

- **PHPCS with WordPress Coding Standards** — PHPCS enforces code style, WP Audit catches runtime performance and security issues that PHPCS doesn't flag
- **Intelephense / PHP IntelliSense** — no overlap, different concerns entirely
- **PHPStan** — PHPStan catches type errors, WP Audit catches WordPress-specific antipatterns

## Known Limitations

- **String literals:** Matches inside PHP string literals may produce false positives. This is a known limitation of regex-based scanning.
- **Multi-line calls:** Some rules may not catch function calls where arguments span multiple lines.

## Learn More

- [Full documentation](https://renzojohnson.com/contributions/wp-audit)
- [WordPress Performance Best Practices](https://developer.wordpress.org/advanced-administration/performance/)
- [WordPress Security Best Practices](https://developer.wordpress.org/advanced-administration/security/)
- [Report an issue](https://renzojohnson.com/contact)

## License

MIT
