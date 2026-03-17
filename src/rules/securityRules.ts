import { Rule } from '../types';

export const SECURITY_RULES: Rule[] = [
    {
        id: 'WPS001',
        severity: 'error',
        category: 'security',
        scope: 'static',
        title: 'Unsanitized user input',
        description: 'Direct use of $_GET, $_POST, or $_REQUEST without sanitization. Use sanitize_text_field(), absint(), or wp_kses().',
        pattern: /\$_(?:GET|POST|REQUEST)\s*\[\s*['"][^'"]+['"]\s*\]/g,
        exclude: /sanitize_|esc_|absint|intval|wp_kses|wp_unslash/,
        fix: {
            label: 'Wrap with sanitize_text_field()',
            replacement: (match, line) => {
                const varMatch = match[0];
                return line.replace(varMatch, `sanitize_text_field(${varMatch})`);
            },
        },
    },
    {
        id: 'WPS002',
        severity: 'error',
        category: 'security',
        scope: 'static',
        title: 'SQL query without prepare()',
        description: '$wpdb methods without $wpdb->prepare() are vulnerable to SQL injection.',
        pattern: /\$wpdb\s*->\s*(?:query|get_results|get_var|get_row|get_col)\s*\(\s*(?!\$wpdb\s*->\s*prepare)/g,
    },
    {
        id: 'WPS003',
        severity: 'error',
        category: 'security',
        scope: 'static',
        title: 'eval() used',
        description: 'eval() executes arbitrary code and is a critical security risk. Remove it.',
        pattern: /\beval\s*\(/g,
    },
    {
        id: 'WPS004',
        severity: 'error',
        category: 'security',
        scope: 'static',
        title: 'extract() used',
        description: 'extract() creates variables from array keys, risking variable injection. Use explicit variable assignment.',
        pattern: /\bextract\s*\(/g,
    },
    {
        id: 'WPS005',
        severity: 'info',
        category: 'security',
        scope: 'static',
        title: 'REST route — verify permission_callback',
        description: 'REST API routes must have a permission_callback. Verify this call includes one in its arguments array.',
        pattern: /register_rest_route\s*\(/g,
        exclude: /permission_callback/,
        multiLineExclude: true,
    },
    {
        id: 'WPS006',
        severity: 'info',
        category: 'security',
        scope: 'static',
        title: 'REST route — verify sanitize_callback',
        description: 'REST API route arguments should have sanitize_callback to validate input. Verify this call includes one.',
        pattern: /register_rest_route\s*\(/g,
        exclude: /sanitize_callback/,
        multiLineExclude: true,
    },
    {
        id: 'WPS007',
        severity: 'info',
        category: 'security',
        scope: 'static',
        title: 'Legacy admin-ajax usage',
        description: 'admin-ajax.php is the legacy AJAX handler. Consider using the REST API for new endpoints.',
        pattern: /\bwp_ajax_(?:nopriv_)?|admin-ajax\.php/g,
    },
    {
        id: 'WPS008',
        severity: 'error',
        category: 'security',
        scope: 'static',
        title: 'unserialize() used',
        description: 'unserialize() with untrusted data enables PHP object injection. Use json_decode() / json_encode() instead.',
        pattern: /\bunserialize\s*\(/g,
        exclude: /maybe_unserialize/,
    },
    {
        id: 'WPS009',
        severity: 'warning',
        category: 'security',
        scope: 'static',
        title: 'file_get_contents with user input',
        description: 'file_get_contents() with user-controlled paths risks SSRF or path traversal.',
        pattern: /file_get_contents\s*\([^)]*\$_(?:GET|POST|REQUEST)/g,
    },
    {
        id: 'WPS010',
        severity: 'error',
        category: 'security',
        scope: 'static',
        title: 'Unescaped output (XSS risk)',
        description: 'echo/print with user input without esc_html(), esc_attr(), or wp_kses() is an XSS vulnerability.',
        pattern: /(?:echo|print)\s+.*\$_(?:GET|POST|REQUEST)\s*\[/g,
        exclude: /esc_html|esc_attr|esc_url|wp_kses|intval|absint/,
        fix: {
            label: 'Wrap with esc_html()',
            replacement: (match, line) => {
                const inputMatch = line.match(/\$_(?:GET|POST|REQUEST)\s*\[\s*['"][^'"]+['"]\s*\]/);
                if (inputMatch) {
                    return line.replace(inputMatch[0], `esc_html(${inputMatch[0]})`);
                }
                return line;
            },
        },
    },
];
