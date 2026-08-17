'use strict';
'require baseclass';
'require fs';
'require rpc';
'require uci';

var callGetUnixtime = rpc.declare({
	object: 'luci',
	method: 'getUnixtime',
	expect: { result: 0 }
});

var callLuciVersion = rpc.declare({
	object: 'luci',
	method: 'getVersion'
});

var callSystemBoard = rpc.declare({
	object: 'system',
	method: 'board'
});

var callSystemInfo = rpc.declare({
	object: 'system',
	method: 'info'
});

var callCPUBench = rpc.declare({
	object: 'luci',
	method: 'getCPUBench'
});

var callCPUInfo = rpc.declare({
	object: 'luci',
	method: 'getCPUInfo'
});

var callCPUUsage = rpc.declare({
	object: 'luci',
	method: 'getCPUUsage'
});

var callTempInfo = rpc.declare({
	object: 'luci',
	method: 'getTempInfo'
});

return baseclass.extend({
	title: _('System'),

	load: function() {
		return Promise.all([
			L.resolveDefault(callSystemBoard(), {}),
			L.resolveDefault(callSystemInfo(), {}),
			L.resolveDefault(callCPUBench(), {}),
			L.resolveDefault(callCPUInfo(), {}),
			L.resolveDefault(callCPUUsage(), {}),
			L.resolveDefault(callTempInfo(), {}),
			L.resolveDefault(callLuciVersion(), { revision: _('unknown version'), branch: 'LuCI' }),
			L.resolveDefault(callGetUnixtime(), 0),
			uci.load('system')
		]);
	},

	render: function(data) {
			var style = E('style', {}, `
				.support-btn {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					height: 28px;
					padding: 0 12px;
					border-radius: 6px;
					background: rgba(64, 158, 255, .85);
					color: #fff !important;
					font-size: 13px;
					text-decoration: none !important;
					transition: all .2s ease;
					box-shadow: 0 2px 6px rgba(0, 0, 0, .15);
					backdrop-filter: blur(6px);
				}

				.support-btn:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 14px rgba(0, 0, 0, .25);
					opacity: .9;
				}

				.support-btn:active {
					transform: scale(.92);
				}

				.support-btn:nth-child(2) {
					background: rgba(103, 194, 58, .85);
				}

				.support-btn:nth-child(3) {
					background: rgba(230, 162, 60, .85);
				}
		`	);
			document.head.appendChild(style);

		var boardinfo   = data[0],
		    systeminfo  = data[1],
		    cpubench    = data[2],
		    cpuinfo     = data[3],
		    cpuusage    = data[4],
		    tempinfo    = data[5],
		    luciversion = data[6],
		    unixtime    = data[7];

		luciversion = luciversion.branch + ' ' + luciversion.revision;

		var datestr = null;

		if (unixtime) {
			var date = new Date(unixtime * 1000),
				zn = uci.get('system', '@system[0]', 'zonename')?.replaceAll(' ', '_') || 'UTC',
				ts = uci.get('system', '@system[0]', 'clock_timestyle') || 0,
				hc = uci.get('system', '@system[0]', 'clock_hourcycle') || 0;

			datestr = new Intl.DateTimeFormat(undefined, {
				dateStyle: 'medium',
				timeStyle: (ts == 0) ? 'long' : 'full',
				hourCycle: (hc == 0) ? undefined : hc,
				timeZone: zn
			}).format(date);
		}

		var fields = [
			_('Hostname'),         boardinfo.hostname,
			_('Model'),            boardinfo.model + cpubench.cpubench,
			_('Architecture'),     cpuinfo.cpuinfo,
			_('Target Platform'),  (L.isObject(boardinfo.release) ? boardinfo.release.target : ''),
			_('Firmware Version'), (L.isObject(boardinfo.release) ? boardinfo.release.description + ' / ' : '') + (luciversion || ''),
			_('Kernel Version'),   boardinfo.kernel,
			_('Local Time'),       datestr,
			_('Uptime'),           systeminfo.uptime ? '%t'.format(systeminfo.uptime) : null,
			_('Load Average'),     Array.isArray(systeminfo.load) ? '%.2f, %.2f, %.2f'.format(
				systeminfo.load[0] / 65535.0,
				systeminfo.load[1] / 65535.0,
				systeminfo.load[2] / 65535.0
			) : null,
			_('CPU usage'),    cpuusage.cpuusage,
			_('Help & Feedback'),  E('div', { 'style': 'display:flex;gap:8px;align-items:center;' }, [
				E('a', { 'href': 'https://github.com/MinimaxFlora/Firmware-Build', 'target': '_blank', 'class': 'support-btn' }, _('Project Website')),
				E('a', { 'href': 'https://github.com/MinimaxFlora/Firmware-Build/issues', 'target': '_blank', 'class': 'support-btn' }, _('Issue Feedback')),
				E('a', { 'href': 'https://pay.kejizero.xyz', 'target': '_blank', 'class': 'support-btn' }, _('Donation Address'))
			])
		];

		if (tempinfo.tempinfo) {
			fields.splice(6, 0, _('Temperature'));
			fields.splice(7, 0, tempinfo.tempinfo);
		}

		var table = E('table', { 'class': 'table' });

		for (var i = 0; i < fields.length; i += 2) {
			table.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left', 'width': '33%' }, [ fields[i] ]),
				E('td', { 'class': 'td left' }, [ (fields[i + 1] != null) ? fields[i + 1] : '?' ])
			]));
		}

		return table;
	}
});
