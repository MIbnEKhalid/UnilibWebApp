/**
 * Bot & Crawler Protection Middleware
 * 1. Blocks malicious automated vulnerability scanners, brute-force scrapers, and abusive bots.
 * 2. Identifies legitimate social media preview crawlers (Discord, Twitter, Facebook, etc.).
 */

const MALICIOUS_BOT_REGEX = new RegExp([
    'sqlmap', 'nikto', 'masscan', 'zgrab', 'gobuster', 'dirbuster', 'nmap',
    'wprecon', 'acunetix', 'nessus', 'openvas', 'semrushbot', 'ahrefsbot',
    'mj12bot', 'dotbot', 'petalbot', 'bytespider', 'zoominfobot', 'megaindex',
    'blexbot', 'censys', 'shodan', 'leakix', 'scrapy', 'python-urllib', 'httpclient'
].join('|'), 'i');

const SOCIAL_BOT_REGEX = new RegExp([
    'facebookexternalhit', 'twitterbot', 'discordbot', 'telegrambot',
    'slackbot', 'whatsapp', 'linkedinbot', 'applebot', 'pinterestbot',
    'redditbot', 'skypeuripreview', 'vkshare', 'w3c_validator', 'googlebot',
    'bingbot', 'yandexbot', 'duckduckbot', 'baiduspider'
].join('|'), 'i');

export function botProtectionMiddleware(req, res, next) {
    const userAgent = (req.headers['user-agent'] || '').trim();

    if (!userAgent && req.path.startsWith('/api')) {
        return res.status(403).json({ success: false, error: 'Access denied: Valid User-Agent required.' });
    }

    if (MALICIOUS_BOT_REGEX.test(userAgent)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied: Automated security scanners and unauthorized crawlers are prohibited.'
        });
    }

    req.isSocialBot = SOCIAL_BOT_REGEX.test(userAgent);
    next();
}

export function isSocialBot(userAgent = '') {
    return SOCIAL_BOT_REGEX.test(userAgent);
}

export default {
    botProtectionMiddleware,
    isSocialBot
};
