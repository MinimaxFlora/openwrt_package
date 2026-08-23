'use strict';
'require form';
'require view';
'require uci';
'require fs';
'require poll';
'require tools.mihomo as mihomo';

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('mihomo'),
            mihomo.getAppLog(),
            mihomo.getCoreLog()
        ]);
    },
    render: function (data) {
        mihomo.injectCSS();

        const appLog = data[1];
        const coreLog = data[2];

        let m, s, o, appLogOption, coreLogOption;

        m = new form.Map('mihomo', _('Mihomo'), _('Logs'));

        s = m.section(form.NamedSection, 'log', 'log', _('Log'));

        s.tab('log_config', '🗂️ ' + _('Log Config'));

        o = s.taboption('log_config', form.Flag, 'clear_at_stop', _('Clear At Stop'));
        o.rmempty = false;

        o = s.taboption('log_config', form.Flag, 'scheduled_clear', _('Scheduled Clear'));
        o.rmempty = false;

        o = s.taboption('log_config', form.Value, 'scheduled_clear_cron', _('Scheduled Clear Cron'));
        o.retain = true;
        o.rmempty = false;
        o.depends('scheduled_clear', '1');

        o = s.taboption('log_config', form.Value, 'scheduled_clear_size_limit', _('Scheduled Clear Size Limit'));
        o.retain = true;
        o.rmempty = false;
        o.datatype = 'uinteger';
        o.depends('scheduled_clear', '1');

        o = s.taboption('log_config', form.ListValue, 'scheduled_clear_size_limit_unit', _('Scheduled Clear Size Limit Unit'));
        o.retain = true;
        o.rmempty = false;
        o.depends('scheduled_clear', '1');
        o.value('KB', 'KB');
        o.value('MB', 'MB');
        o.value('GB', 'GB');

        s.tab('app_log', '📋 ' + _('App Log'));

        o = s.taboption('app_log', form.Button, 'clear_app_log');
        o.inputstyle = 'negative';
        o.inputtitle = _('Clear Log');
        o.onclick = function (_, section_id) {
            m.lookupOption('_app_log', section_id)[0].getUIElement(section_id).setValue('');
            return mihomo.clearAppLog();
        };

        o = s.taboption('app_log', form.TextValue, '_app_log');
        appLogOption = o;
        o.rows = 25;
        o.wrap = false;
        o.load = function (section_id) {
            return appLog;
        };
        o.write = function (section_id, formvalue) {
            return true;
        };
        poll.add(L.bind(function () {
            const option = this;
            return L.resolveDefault(mihomo.getAppLog()).then(function (log) {
                option.getUIElement('log').setValue(log);
            });
        }, appLogOption));

        o = s.taboption('app_log', form.Button, 'scroll_app_log_to_bottom');
        o.inputtitle = _('Scroll To Bottom');
        o.onclick = function (_, section_id) {
            const element = m.lookupOption('_app_log', section_id)[0].getUIElement(section_id).node.firstChild;
            element.scrollTop = element.scrollHeight;
        };

        s.tab('core_log', '🧠 ' + _('Core Log'));

        o = s.taboption('core_log', form.Button, 'clear_core_log');
        o.inputstyle = 'negative';
        o.inputtitle = _('Clear Log');
        o.onclick = function (_, section_id) {
            m.lookupOption('_core_log', section_id)[0].getUIElement(section_id).setValue('');
            return mihomo.clearCoreLog();
        };

        o = s.taboption('core_log', form.TextValue, '_core_log');
        coreLogOption = o;
        o.rows = 25;
        o.wrap = false;
        o.load = function (section_id) {
            return coreLog;
        };
        o.write = function (section_id, formvalue) {
            return true;
        };
        poll.add(L.bind(function () {
            const option = this;
            return L.resolveDefault(mihomo.getCoreLog()).then(function (log) {
                option.getUIElement('log').setValue(log);
            });
        }, coreLogOption));

        o = s.taboption('core_log', form.Button, 'scroll_core_log_to_bottom');
        o.inputtitle = _('Scroll To Bottom');
        o.onclick = function (_, section_id) {
            const element = m.lookupOption('_core_log', section_id)[0].getUIElement(section_id).node.firstChild;
            element.scrollTop = element.scrollHeight;
        };

        s.tab('debug_log', '🐛 ' + _('Debug Log'));

        o = s.taboption('debug_log', form.Button, '_generate_download_debug_log');
        o.inputstyle = 'negative';
        o.inputtitle = _('Generate & Download');
        o.onclick = function () {
            return mihomo.debug().then(function () {
                fs.read_direct(mihomo.debugLogPath, 'blob').then(function (data) {
                    // create url
                    const url = window.URL.createObjectURL(data, { type: 'text/markdown' });
                    // create link
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'debug.log';
                    // append to body
                    document.body.appendChild(link);
                    // download
                    link.click();
                    // remove from body
                    document.body.removeChild(link);
                    // revoke url
                    window.URL.revokeObjectURL(url);
                });
            });
        };

        return m.render().then(function (node) {
            setTimeout(function () {
                const appLogEl = appLogOption.getUIElement('log');
                const coreLogEl = coreLogOption.getUIElement('log');

                if (appLogEl)
                    appLogEl.style.fontFamily = 'monospace';

                if (coreLogEl)
                    coreLogEl.style.fontFamily = 'monospace';
            }, 0);

            return node;
        });
    }
});
