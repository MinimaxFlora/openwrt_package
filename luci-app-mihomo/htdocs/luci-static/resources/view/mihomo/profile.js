'use strict';
'require form';
'require view';
'require uci';
'require tools.mihomo as mihomo';

const UsedValue = form.Value.extend({
    renderWidget: function (section_id, option_index, cfgvalue) {
        cfgvalue = (cfgvalue != null) ? cfgvalue : '';

        const total = uci.get('mihomo', section_id, 'total');
        const pct = mihomo.usagePercent(cfgvalue, total);

        const label = E('span', { class: 'mihomo-usage-text' }, cfgvalue || '-');

        if (pct == null)
            return label;

        const fillClass = (pct > 100) ? 'over' : (pct > 80) ? 'warn' : '';

        return E('div', { class: 'mihomo-usage' }, [
            label,
            E('div', { class: 'mihomo-usage-track' }, [
                E('div', { class: 'mihomo-usage-fill ' + fillClass, style: 'width:' + Math.min(100, pct) + '%' })
            ])
        ]);
    }
});

return view.extend({
    load: function () {
        return Promise.all([
            uci.load('mihomo')
        ]);
    },
    render: function (data) {
        mihomo.injectCSS();

        let m, s, o;

        m = new form.Map('mihomo', _('Mihomo'), _('Profiles & Subscriptions'));

        s = m.section(form.NamedSection, 'config', 'config', _('Profile'));

        o = s.option(form.FileUpload, '_upload_profile', _('Upload Profile'));
        o.browser = true;
        o.enable_download = true;
        o.root_directory = mihomo.profilesDir;
        o.write = function (section_id, formvalue) {
            return true;
        };

        s = m.section(form.GridSection, 'subscription', _('Subscription'));
        s.addremove = true;
        s.anonymous = true;
        s.sortable = true;
        s.modaltitle = _('Edit Subscription');

        o = s.option(form.Value, 'name', _('Subscription Name'));
        o.rmempty = false;

        o = s.option(UsedValue, 'used', _('Used'));
        o.modalonly = false;
        o.optional = true;
        o.readonly = true;

        o = s.option(form.Value, 'total', _('Total'));
        o.modalonly = false;
        o.optional = true;
        o.readonly = true;

        o = s.option(form.Value, 'expire', _('Expire At'));
        o.modalonly = false;
        o.optional = true;
        o.readonly = true;

        o = s.option(form.Value, 'update', _('Update At'));
        o.modalonly = false;
        o.optional = true;
        o.readonly = true;

        o = s.option(form.Button, 'update_subscription');
        o.editable = true;
        o.inputstyle = 'positive';
        o.inputtitle = _('Update');
        o.modalonly = false;
        o.onclick = function (_, section_id) {
            return mihomo.updateSubscription(section_id);
        };

        o = s.option(form.Value, 'info_url', _('Subscription Info Url'));
        o.modalonly = true;

        o = s.option(form.Value, 'url', _('Subscription Url'));
        o.modalonly = true;
        o.rmempty = false;

        o = s.option(form.Value, 'user_agent', _('User Agent'));
        o.default = 'clash.meta';
        o.modalonly = true;
        o.rmempty = false;
        o.value('clash');
        o.value('clash.meta');
        o.value('mihomo');

        o = s.option(form.ListValue, 'prefer', _('Prefer'));
        o.default = 'remote';
        o.modalonly = true;
        o.rmempty = false;
        o.value('remote', _('Remote'));
        o.value('local', _('Local'));

        return m.render();
    }
});
