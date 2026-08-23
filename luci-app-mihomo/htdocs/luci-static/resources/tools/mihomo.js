'use strict';
'require baseclass';
'require uci';
'require fs';
'require rpc';
'require request';

const callRCList = rpc.declare({
    object: 'rc',
    method: 'list',
    params: ['name'],
    expect: { '': {} }
});

const callRCInit = rpc.declare({
    object: 'rc',
    method: 'init',
    params: ['name', 'action'],
    expect: { '': {} }
});

const callFileWrite = rpc.declare({
    object: 'file',
    method: 'write',
    params: ['path', 'data', 'append', 'mode']
});

const callMihomoVersion = rpc.declare({
    object: 'luci.mihomo',
    method: 'version',
    expect: { '': {} }
});

const callMihomoProfile = rpc.declare({
    object: 'luci.mihomo',
    method: 'profile',
    params: ['defaults'],
    expect: { '': {} }
});

const callMihomoUpdateSubscription = rpc.declare({
    object: 'luci.mihomo',
    method: 'update_subscription',
    params: ['section_id'],
    expect: { '': {} }
});

const callMihomoAPI = rpc.declare({
    object: 'luci.mihomo',
    method: 'api',
    params: ['method', 'path', 'query', 'body'],
    expect: { '': {} }
});

const callMihomoGetIdentifiers = rpc.declare({
    object: 'luci.mihomo',
    method: 'get_identifiers',
    expect: { '': {} }
});

const callMihomoDebug = rpc.declare({
    object: 'luci.mihomo',
    method: 'debug',
    expect: { '': {} }
});

const callMihomoCheckUpdates = rpc.declare({
    object: 'luci.mihomo',
    method: 'check_updates',
    expect: { '': {} }
});

const callMihomoUpdateApp = rpc.declare({
    object: 'luci.mihomo',
    method: 'update_app',
    expect: { '': {} }
});

const callMihomoUpdateCore = rpc.declare({
    object: 'luci.mihomo',
    method: 'update_core',
    expect: { '': {} }
});

const homeDir = '/etc/mihomo';
const profilesDir = `${homeDir}/profiles`;
const subscriptionsDir = `${homeDir}/subscriptions`;
const mixinFilePath = `${homeDir}/mixin.yaml`;
const runDir = `${homeDir}/run`;
const runProfilePath = `${runDir}/config.yaml`;
const providersDir = `${runDir}/providers`;
const ruleProvidersDir = `${providersDir}/rule`;
const proxyProvidersDir = `${providersDir}/proxy`;
const logDir = `/var/log/mihomo`;
const appLogPath = `${logDir}/app.log`;
const coreLogPath = `${logDir}/core.log`;
const debugLogPath = `${logDir}/debug.log`;
const nftDir = `${homeDir}/nftables`;

return baseclass.extend({
    homeDir: homeDir,
    profilesDir: profilesDir,
    subscriptionsDir: subscriptionsDir,
    mixinFilePath: mixinFilePath,
    runDir: runDir,
    runProfilePath: runProfilePath,
    ruleProvidersDir: ruleProvidersDir,
    proxyProvidersDir: proxyProvidersDir,
    appLogPath: appLogPath,
    coreLogPath: coreLogPath,
    debugLogPath: debugLogPath,

    cssText: [
        '/* ===== Mihomo UI polish ===== */',
        '.mihomo-dash {',
        '    background: var(--secondary-bright-color, #ffffff);',
        '    border: 1px solid rgba(128, 128, 128, .28);',
        '    border-radius: 6px;',
        '    margin-bottom: 18px;',
        '    box-shadow: 0 1px 4px rgba(128, 128, 128, .12);',
        '}',
        '.mihomo-dash-head {',
        '    display: flex; align-items: center; gap: 8px;',
        '    padding: 12px 16px;',
        '    font-size: 15px; font-weight: 600;',
        '    color: var(--secondary-dark-color, #212322);',
        '    border-bottom: 1px solid rgba(128, 128, 128, .22);',
        '}',
        '.mihomo-dash-head .mihomo-logo { color: var(--main-bright-color, #00B5E2); font-size: 18px; }',
        '.mihomo-dash-grid {',
        '    display: grid;',
        '    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));',
        '    gap: 1px;',
        '    background: rgba(128, 128, 128, .22);',
        '}',
        '.mihomo-tile {',
        '    background: var(--secondary-bright-color, #ffffff);',
        '    padding: 14px 16px;',
        '    min-height: 62px;',
        '}',
        '.mihomo-tile-label {',
        '    font-size: 11px;',
        '    text-transform: uppercase;',
        '    letter-spacing: .06em;',
        '    opacity: .55;',
        '    margin-bottom: 8px;',
        '}',
        '.mihomo-tile-value {',
        '    font-size: 17px; font-weight: 600;',
        '    color: var(--secondary-dark-color, #212322);',
        '    word-break: break-all;',
        '    line-height: 1.35;',
        '}',
        '.mihomo-status { display: inline-flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; }',
        '.mihomo-dot { width: 11px; height: 11px; border-radius: 50%; flex: none; display: inline-block; }',
        '.mihomo-dot.up {',
        '    background: var(--success-color, #16a34a);',
        '    box-shadow: 0 0 0 4px rgba(92, 184, 92, .22);',
        '    animation: mihomo-pulse 2.2s ease-in-out infinite;',
        '}',
        '.mihomo-dot.down {',
        '    background: var(--danger-color, #dc2626);',
        '    box-shadow: 0 0 0 4px rgba(204, 17, 17, .15);',
        '}',
        '.mihomo-status .up-text { color: var(--success-color, #16a34a); }',
        '.mihomo-status .down-text { color: var(--danger-color, #dc2626); }',
        '@keyframes mihomo-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }',
        '.mihomo-dash-actions {',
        '    display: flex; flex-wrap: wrap; gap: 8px;',
        '    padding: 12px 16px;',
        '    border-top: 1px solid rgba(128, 128, 128, .22);',
        '}',
        '.mihomo-dash-actions .cbi-button { margin: 0; }',
        '/* ===== pink action buttons ===== */',
        '.mihomo-btn-pink {',
        '    background: #ec4899 !important;',
        '    border-color: #db2777 !important;',
        '    color: #ffffff !important;',
        '}',
        '.mihomo-btn-pink:hover {',
        '    background: #db2777 !important;',
        '    border-color: #be185d !important;',
        '}',
        '/* ===== version update tiles ===== */',
        '.mihomo-tile-line {',
        '    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;',
        '}',
        '.mihomo-tile-line .cbi-button { margin: 0; font-size: 12px; padding: 2px 10px; }',
        '.mihomo-tile-inline { display: inline-flex; align-items: center; gap: 8px; }',
        '.mihomo-update-badge {',
        '    font-size: 12px; font-weight: 700;',
        '    color: var(--warning-color, #cc8800);',
        '    background: rgba(204, 136, 0, .12);',
        '    padding: 2px 8px; border-radius: 10px;',
        '}',
        '.mihomo-update-ok { font-size: 12px; color: var(--success-color, #16a34a); }',
        '.mihomo-update-err { font-size: 12px; color: var(--danger-color, #dc2626); }',
        '/* ===== profile usage bar ===== */',
        '.mihomo-usage { min-width: 120px; }',
        '.mihomo-usage-text { font-size: 12px; }',
        '.mihomo-usage-track {',
        '    height: 5px; border-radius: 3px;',
        '    background: rgba(128, 128, 128, .25);',
        '    margin-top: 5px; overflow: hidden;',
        '}',
        '.mihomo-usage-fill {',
        '    height: 100%; border-radius: 3px;',
        '    background: var(--main-bright-color, #00B5E2);',
        '}',
        '.mihomo-usage-fill.warn { background: var(--warning-color, #cc8800); }',
        '.mihomo-usage-fill.over { background: var(--danger-color, #cc1111); }',
        '/* ===== log viewer ===== */',
        '.mihomo-logview { font-family: monospace; font-size: 12px; }'
    ].join('\n'),

    injectCSS: function () {
        if (this.cssInjected)
            return;

        this.cssInjected = true;

        if (document.getElementById('mihomo-style'))
            return;

        var style = document.createElement('style');
        style.type = 'text/css';
        style.id = 'mihomo-style';
        style.appendChild(document.createTextNode(this.cssText));
        document.head.appendChild(style);
    },

    parseSize: function (str) {
        if (str == null)
            return null;

        var m = String(str).trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)$/i);
        if (!m)
            return null;

        var units = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624 };
        return parseFloat(m[1]) * (units[m[2].toUpperCase()] || 1);
    },

    usagePercent: function (used, total) {
        var u = this.parseSize(used);
        var t = this.parseSize(total);

        if (u == null || t == null || t <= 0)
            return null;

        return Math.round(u / t * 1000) / 10;
    },

    status: async function () {
        return (await callRCList('mihomo'))?.mihomo?.running;
    },

    reload: function () {
        return callRCInit('mihomo', 'reload');
    },

    restart: function () {
        return callRCInit('mihomo', 'restart');
    },

    writefile: function (path, data, mode) {
        data = (data != null) ? String(data) : '';
        mode = (mode != null) ? mode : 0o644;

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const chunkSize = 8 * 1024;

        const bytes = encoder.encode(data);

        if (bytes.length <= chunkSize) {
            return callFileWrite(path, data, false, mode);
        }

        let promise = Promise.resolve();
        for(let offset = 0; offset < bytes.length; offset += chunkSize) {
            const chunkStart = offset;
            const chunkEnd = Math.min(offset + chunkSize, bytes.length);
            const isLastChunk = chunkEnd === bytes.length;
            const chunkBytes = bytes.slice(chunkStart, chunkEnd);
            const chunk = decoder.decode(chunkBytes, { stream: !isLastChunk });
            const append = offset > 0;
            promise = promise.then(() => callFileWrite(path, chunk, append, mode));
        }

        return promise;
    },

    version: function () {
        return callMihomoVersion();
    },

    profile: function (defaults) {
        return callMihomoProfile(defaults);
    },

    updateSubscription: function (section_id) {
        return callMihomoUpdateSubscription(section_id);
    },

    updateDashboard: function () {
        return callMihomoAPI('POST', '/upgrade/ui');
    },

    openDashboard: async function () {
        const profile = await callMihomoProfile({
            'external-ui-name': null,
            'external-controller': null,
            'external-controller-tls': null,
            'secret': null
        });
        const uiName = profile['external-ui-name'];
        const apiListen = profile['external-controller'];
        const apiTLSListen = profile['external-controller-tls'];
        const apiSecret = profile['secret'] ?? '';
        if (!apiListen && !apiTLSListen) {
            return Promise.reject('API has not been configured');
        }

        let protocol;
        let port;
        if (apiTLSListen) {
            protocol = 'https';
            port = apiTLSListen.substring(apiTLSListen.lastIndexOf(':') + 1);
        } else {
            protocol = 'http';
            port = apiListen.substring(apiListen.lastIndexOf(':') + 1);
        }

        const params = {
            host: window.location.hostname,
            hostname: window.location.hostname,
            port: port,
            secret: apiSecret
        };
        const query = new URLSearchParams(params).toString();
        let url;
        if (uiName) {
            url = `${protocol}://${window.location.hostname}:${port}/ui/${uiName}/?${query}`;
        } else {
            url = `${protocol}://${window.location.hostname}:${port}/ui/?${query}`;
        }

        setTimeout(function () { window.open(url, '_blank') }, 0);

        return Promise.resolve();
    },

    getIdentifiers: function () {
        return callMihomoGetIdentifiers();
    },

    listProfiles: function () {
        return L.resolveDefault(fs.list(this.profilesDir), []);
    },

    listRuleProviders: function () {
        return L.resolveDefault(fs.list(this.ruleProvidersDir), []);
    },

    listProxyProviders: function () {
        return L.resolveDefault(fs.list(this.proxyProvidersDir), []);
    },

    getAppLog: function () {
        return L.resolveDefault(fs.read_direct(this.appLogPath));
    },

    getCoreLog: function () {
        return L.resolveDefault(fs.read_direct(this.coreLogPath));
    },

    clearAppLog: function () {
        return this.writefile(this.appLogPath, '');
    },

    clearCoreLog: function () {
        return this.writefile(this.coreLogPath, '');
    },

    debug: function () {
        return callMihomoDebug();
    },

    checkUpdates: function () {
        return callMihomoCheckUpdates();
    },

    updateApp: function () {
        return callMihomoUpdateApp();
    },

    updateCore: function () {
        return callMihomoUpdateCore();
    },
})
