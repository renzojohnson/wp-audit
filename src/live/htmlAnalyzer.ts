import { LiveAuditResult, LiveFinding } from '../types';
import { FetchResult } from './urlFetcher';

export function analyzeHtml(url: string, result: FetchResult): LiveAuditResult {
    const findings: LiveFinding[] = [];
    const html = result.body;

    const scriptTags = html.match(/<script[^>]*src=[^>]*>/gi) ?? [];
    const styleTags = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? [];
    const imgTags = html.match(/<img[^>]*>/gi) ?? [];
    const fontUrls = html.match(/url\([^)]*\.(?:woff2?|ttf|eot|otf)/gi) ?? [];

    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headHtml = headMatch ? headMatch[1] : '';
    const headScripts = headHtml.match(/<script[^>]*src=[^>]*>/gi) ?? [];
    const renderBlocking = headScripts.filter(tag =>
        !tag.includes('defer') && !tag.includes('async')
    );

    // WPL001: Render-blocking scripts
    if (renderBlocking.length > 0) {
        findings.push({
            ruleId: 'WPL001',
            severity: 'warning',
            title: 'Render-blocking scripts in <head>',
            detail: `${renderBlocking.length} script(s) in <head> without defer/async:\n${renderBlocking.map(s => {
                const src = s.match(/src=["']([^"']+)["']/);
                return src ? `  - ${src[1]}` : '  - (inline)';
            }).join('\n')}`,
        });
    }

    // WPL002: Security headers
    const secHeaders: { name: string; key: string }[] = [
        { name: 'Strict-Transport-Security', key: 'strict-transport-security' },
        { name: 'X-Content-Type-Options', key: 'x-content-type-options' },
        { name: 'X-Frame-Options', key: 'x-frame-options' },
    ];
    const missingHeaders = secHeaders.filter(h => !result.headers[h.key]);
    if (missingHeaders.length > 0) {
        findings.push({
            ruleId: 'WPL002',
            severity: 'warning',
            title: 'Missing security headers',
            detail: `Missing: ${missingHeaders.map(h => h.name).join(', ')}`,
        });
    }

    // WPL003: WordPress version exposed
    const generatorMatch = html.match(/<meta\s+name=["']generator["']\s+content=["']WordPress\s+([^"']+)["']/i);
    if (generatorMatch) {
        findings.push({
            ruleId: 'WPL003',
            severity: 'warning',
            title: 'WordPress version exposed',
            detail: `<meta name="generator"> exposes WordPress ${generatorMatch[1]}. Remove with remove_action('wp_head', 'wp_generator').`,
        });
    }

    // WPL004: jQuery Migrate loaded
    const jqMigrate = html.match(/jquery-migrate/i);
    if (jqMigrate) {
        findings.push({
            ruleId: 'WPL004',
            severity: 'warning',
            title: 'jQuery Migrate loaded',
            detail: 'jQuery Migrate is a compatibility layer for legacy jQuery code. Remove it if not needed.',
        });
    }

    // WPL005: DOM node count estimate
    const tagCount = (html.match(/<[a-z][^>]*>/gi) ?? []).length;
    if (tagCount > 1500) {
        findings.push({
            ruleId: 'WPL005',
            severity: 'info',
            title: 'Large DOM size',
            detail: `Estimated ${tagCount} DOM nodes (recommended < 1500). Large DOMs slow rendering and increase memory.`,
        });
    }

    // WPL006: Images without width/height
    const imgsNoDimensions = imgTags.filter(tag =>
        !tag.includes('width=') || !tag.includes('height=')
    );
    if (imgsNoDimensions.length > 0) {
        findings.push({
            ruleId: 'WPL006',
            severity: 'warning',
            title: 'Images without dimensions',
            detail: `${imgsNoDimensions.length} image(s) missing width/height attributes (causes CLS).`,
        });
    }

    // WPL007: Cache-Control header
    if (!result.headers['cache-control']) {
        findings.push({
            ruleId: 'WPL007',
            severity: 'warning',
            title: 'Missing Cache-Control header',
            detail: 'Response has no Cache-Control header. Add caching headers for better performance.',
        });
    }

    // WPL008: Total request count
    const totalRequests = scriptTags.length + styleTags.length + imgTags.length;
    findings.push({
        ruleId: 'WPL008',
        severity: totalRequests > 50 ? 'warning' : 'info',
        title: 'HTTP request count',
        detail: `${totalRequests} resources detected: ${scriptTags.length} scripts, ${styleTags.length} styles, ${imgTags.length} images.`,
    });

    return {
        url,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        headers: result.headers,
        findings,
        stats: {
            domNodes: tagCount,
            scripts: scriptTags.length,
            styles: styleTags.length,
            images: imgTags.length,
            fonts: fontUrls.length,
            renderBlockingScripts: renderBlocking.length,
            totalSize: Buffer.byteLength(html, 'utf8'),
        },
    };
}
