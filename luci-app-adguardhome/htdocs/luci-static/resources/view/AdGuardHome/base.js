'use strict';
'require fs';
'require uci';
'require ui';
'require dom';
'require poll';
'require form';
'require view';

function sh(cmd, args) {
	return fs.exec('/bin/sh', ['-c', cmd, '_'].concat(args || []));
}

function fileExists(path) {
	return sh('[ -e "$1" ]', [path]).then(function(res) {
		return res.code === 0;
	}).catch(function() { return false; });
}

function loadScript(url) {
	return new Promise(function(resolve, reject) {
		var s = E('script', { 'src': url });
		s.addEventListener('load', resolve);
		s.addEventListener('error', reject);
		document.head.appendChild(s);
	});
}

/*
 * Collects the core/binary/configuration information needed to render the
 * page, faithfully reproducing the logic previously done server-side in
 * `luasrc/model/cbi/AdGuardHome/base.lua` (version detection, redirect port
 * detection and gfwlist presence detection).
 */
async function getCoreInfo() {
	var binpath = uci.get('AdGuardHome', 'AdGuardHome', 'binpath') || '/usr/bin/AdGuardHome';
	var configpath = uci.get('AdGuardHome', 'AdGuardHome', 'configpath') || '/etc/AdGuardHome.yaml';
	var httpport = uci.get('AdGuardHome', 'AdGuardHome', 'httpport') || '3000';
	var workdir = uci.get('AdGuardHome', 'AdGuardHome', 'workdir') || '/etc/AdGuardHome';
	var logfile = uci.get('AdGuardHome', 'AdGuardHome', 'logfile') || '';

	var e = '';

	var configExists = await fileExists(configpath);
	if (!configExists)
		e += ' ' + _('no config');

	var binExists = await fileExists(binpath);
	var version = '';

	if (!binExists) {
		e += ' ' + _('no core');
	}
	else {
		version = uci.get('AdGuardHome', 'AdGuardHome', 'version') || '';
		var binmtime = uci.get('AdGuardHome', 'AdGuardHome', 'binmtime') || '0';
		var testtime = 0;

		try {
			testtime = parseInt((await sh('stat -c %Y "$1"', [binpath])).stdout.trim(), 10) || 0;
		} catch (err) {}

		if (String(testtime) != String(binmtime) || version == '') {
			try {
				var res = await sh('"$1" --version 2>&1', [binpath]);
				var m = (res.stdout || '').match(/version\s+([^,\n]+)/);
				version = m ? m[1].trim() : '';
			} catch (err) {}
			if (version == '')
				version = 'core error';

			uci.set('AdGuardHome', 'AdGuardHome', 'version', version);
			uci.set('AdGuardHome', 'AdGuardHome', 'binmtime', String(testtime));
			await uci.save();
		}

		e = version + e;
	}

	var dnsPort = '?';
	var gfwAdded = 'Not added';
	var gfwipsetAdded = 'Not added';

	if (configExists) {
		try {
			var cfg = (await sh('cat "$1"', [configpath])).stdout || '';
			var dm = cfg.match(/^dns:\s*$/m);
			if (dm) {
				var pm = cfg.slice(dm.index).match(/^\s*port:\s*(\S+)/m);
				if (pm)
					dnsPort = pm[1];
			}
			if (cfg.indexOf('programadd') >= 0)
				gfwAdded = 'Added';
			if (cfg.indexOf('ipset.txt') >= 0)
				gfwipsetAdded = 'Added';
		} catch (err) {}
	}

	return {
		binpath: binpath,
		configpath: configpath,
		httpport: httpport,
		workdir: workdir,
		logfile: logfile,
		versionStr: e.trim(),
		binExists: binExists,
		configExists: configExists,
		dnsPort: dnsPort,
		gfwAdded: gfwAdded,
		gfwipsetAdded: gfwipsetAdded
	};
}

/*
 * "Upgrade Core" widget: reproduces the behaviour of
 * `luasrc/view/AdGuardHome/AdGuardHome_check.htm`.
 */
var UpdateCore = form.DummyValue.extend({
	renderWidget: function(section_id, option_index, cfgvalue) {
		var info = this.info;
		var logPos = 0;
		var isLogReverse = false;
		var pollFn = null;
		var stopPolling = function() {
			if (pollFn) {
				poll.remove(pollFn);
				pollFn = null;
			}
		};

		var updateBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'id': 'apply_update_button'
		}, [ _('Update core version') ]);

		var forceBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'id': 'apply_forceupdate_button',
			'style': 'display:none'
		}, [ _('Force update') ]);

		var ta = E('textarea', {
			'id': 'cbid.logview.1.conf',
			'class': 'cbi-input-textarea',
			'style': 'width: 100%;display:block',
			'rows': '5',
			'cols': '60',
			'readonly': 'readonly'
		});

		var reverseCb = E('input', {
			'type': 'checkbox',
			'id': 'reversetag',
			'value': 'reverse',
			'style': 'vertical-align:middle;height:auto'
		});

		var logView = E('div', { 'id': 'logview', 'style': 'display:none' }, [
			reverseCb, _('reverse'), ta
		]);

		function reverselog() {
			ta.value = ta.value.split('\n').reverse().join('\n');
			isLogReverse = !isLogReverse;
		}

		reverseCb.addEventListener('click', reverselog);

		function pollCheck() {
			logView.style.display = 'block';

			stopPolling();
			pollFn = L.bind(function() {
				sh('tail -c +' + (logPos + 1) + ' "$1"', ['/tmp/AdGuardHome_update.log'])
					.then(function(res) {
						var data = res.stdout || '';
						if (data == '') {
							return fileExists('/var/run/update_core').then(function(exists) {
								if (!exists) {
									stopPolling();
									updateBtn.disabled = false;
									updateBtn.textContent = _('Updated');
								}
							});
						}

						logPos += new TextEncoder().encode(data).length;

						if (isLogReverse)
							ta.value = data.split('\n').reverse().join('\n') + ta.value;
						else
							ta.value += data;
					})
					.catch(function() {});
			}, this);

			poll.add(pollFn, 3);
		}

		function applyUpdate() {
			logPos = 0;
			updateBtn.disabled = true;
			updateBtn.textContent = _('Check...');
			forceBtn.style.display = 'inline';

			/* fire-and-forget: 后台启动脚本后立即开始轮询，不要
			 * .then(pollCheck) 等待 fs.exec 回包 —— fs.exec 会等
			 * stdout/stderr 管道 EOF，后台子进程若继承管道会导致
			 * 回包延迟/挂起，进度框就不显示、一直卡在检测中 */
			sh('sh /usr/share/AdGuardHome/update_core.sh >/tmp/AdGuardHome_update.log 2>&1 &')
				.catch(function() {});
			pollCheck();
		}

		function applyForceUpdate() {
			logPos = 0;
			updateBtn.disabled = true;
			updateBtn.textContent = _('Check...');
			forceBtn.style.display = 'inline';

			sh('kill $(pgrep /usr/share/AdGuardHome/update_core.sh) ; sh /usr/share/AdGuardHome/update_core.sh force >/tmp/AdGuardHome_update.log 2>&1 &')
				.catch(function() {});
			pollCheck();
		}

		updateBtn.addEventListener('click', applyUpdate);
		forceBtn.addEventListener('click', applyForceUpdate);

		var nodes = [ updateBtn, forceBtn ];

		if (info && !info.configExists) {
			nodes.push(E('button', {
				'class': 'btn cbi-button cbi-button-apply',
				'id': 'to_configpage',
				'click': function() {
					location.href = L.url('admin', 'services', 'adguardhome', 'manual');
				}
			}, [ _('Fast config') ]));
		}

		nodes.push(logView);

		// Resume polling when an update is already in progress on page load.
		Promise.all([
			fileExists('/var/run/update_core'),
			fileExists('/var/run/update_core_error')
		]).then(function(res) {
			if (res[0] || res[1]) {
				updateBtn.disabled = true;
				updateBtn.textContent = _('Check...');
				forceBtn.style.display = 'inline';
				pollCheck();
			}
		});

		return E('div', {}, nodes);
	}
});

/*
 * "Change management password" widget: reproduces the behaviour of
 * `luasrc/view/AdGuardHome/AdGuardHome_chpass.htm` (bcrypt password hashing).
 */
var ChpassValue = form.Value.extend({
	/* 不回显 UCI 中残留的旧哈希:密码输入框始终从空白开始,
	 * 与其它 LuCI 应用的密码框行为一致 */
	cfgvalue: function(section_id) {
		return '';
	},

	renderWidget: function(section_id, option_index, cfgvalue) {
		var self = this;
		var input = form.Value.prototype.renderWidget.apply(this, arguments);

		var btn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'id': 'cbid.AdGuardHome.AdGuardHome.applychpass'
		}, [ _('Load culculate model') ]);

		btn.addEventListener('click', function(ev) {
			var b = ev.currentTarget;
			b.disabled = true;
			b.textContent = _('loading...');

			if (typeof window.TwinBcrypt === 'undefined') {
				return loadScript(L.resource('twin-bcrypt.min.js')).then(function() {
					b.textContent = _('Culculate');
					b.disabled = false;
				}).catch(function() {
					b.textContent = _('Load culculate model');
					b.disabled = false;
				});
			}

			var lv = self.getUIElement(section_id);
			var value = lv ? lv.getValue() : '';

			if (value != '') {
				window.TwinBcrypt.hash(value, function(hash) {
					var el = self.getUIElement(section_id);
					if (el)
						el.setValue(hash);
					b.textContent = _('Please save/apply');
				});
			}
			else {
				b.textContent = _('is empty');
				b.disabled = false;
			}
		});

		return E('div', {}, [ input, ' ', btn ]);
	}
});

/*
 * Shared path validation helpers (reproduce base.lua's write-time validation).
 */
function stripTrailingSlash(value) {
	return String(value || '').replace(/\/$/, '');
}

function pathNotDirValidator(what) {
	return function(section_id, value) {
		var self = this;
		return sh('if [ -d "$1" ]; then rmdir "$1" 2>/dev/null; [ -d "$1" ] && echo ISDIR; fi', [value])
			.then(function(res) {
				if ((res.stdout || '').indexOf('ISDIR') >= 0)
					throw 'error!' + what + ' is a dir';
				return form.Value.prototype.write.call(self, section_id, value);
			});
	};
}

function pathNotFileValidator(what) {
	return function(section_id, value) {
		var self = this;
		return sh('if [ -f "$1" ]; then echo ISFILE; fi', [value])
			.then(function(res) {
				if ((res.stdout || '').indexOf('ISFILE') >= 0)
					throw 'error!' + what + ' is a file';
				return form.Value.prototype.write.call(self, section_id, stripTrailingSlash(value));
			});
	};
}

return view.extend({
	load: function() {
		return uci.load('AdGuardHome').then(function() {
			return getCoreInfo();
		});
	},

	render: function(info) {
		var m, s, o;

		m = new form.Map('AdGuardHome', _('AdGuard Home'),
			_('Free and open source, powerful network-wide ads & trackers blocking DNS server.'));

		/* ---- status banner (SimpleSection template) ---- */
		var statusP = E('p', { 'id': 'AdGuardHome_status' },
			E('em', _('Collecting data...')));

		function buildStatus(running) {
			if (running) {
				var url = window.location.protocol.toLowerCase() + '//' +
					window.location.hostname + ':' + info.httpport;
				return E([
					E('em', [ E('b', { 'style': 'color:green' }, 'AdGuardHome ' + _('RUNNING')) ]),
					E('em', [ ' ', E('b', { 'style': 'color:green' }, _('Redirected')), ' ' ]),
					E('input', {
						'class': 'cbi-button cbi-button-reload',
						'type': 'button',
						'value': '  ' + _('Open Web Interface'),
						'click': function() { window.open(url); }
					})
				]);
			}

			return E([
				E('em', [ E('b', { 'style': 'color:red' }, 'AdGuardHome ' + _('NOT RUNNING')) ]),
				E('em', [ E('b', { 'style': 'color:red' }, _('Not redirect')) ])
			]);
		}

		poll.add(L.bind(function() {
			sh('pgrep "$1" >/dev/null', [info.binpath]).then(function(res) {
				dom.content(statusP, buildStatus(res.code === 0));
			}).catch(function() {
				dom.content(statusP, buildStatus(false));
			});
		}, this), 3);

		/* ---- settings section (tabs) ---- */
		s = m.section(form.NamedSection, 'AdGuardHome', 'AdGuardHome');

		s.tab('basic', _('Main Config'));
		s.tab('core', _('Core Config'));
		s.tab('other', _('Other Config'));

		/* Main Config */
		o = s.taboption('basic', form.Flag, 'enabled', _('Enable'));
		o.default = '0';
		o.rmempty = false;

		o = s.taboption('basic', form.Value, 'httpport', _('Browser management port'));
		o.placeholder = '3000';
		o.default = '3000';
		o.datatype = 'port';
		o.rmempty = false;

		o = s.taboption('basic', form.ListValue, 'core_version', _('Core Version'));
		o.value('latest', _('Latest Version'));
		o.value('beta', _('Beta Version'));
		o.default = 'latest';

		o = s.taboption('basic', UpdateCore, 'restart', _('Upgrade Core'));
		o.info = info;
		o.description = _('Current core version:') +
			'<strong><font id="updateversion" color="green">' + info.versionStr + ' </font></strong>';

		o = s.taboption('basic', form.ListValue, 'redirect',
			info.dnsPort + ' ' + _('Redirect'), _('AdGuardHome redirect mode'));
		o.value('none', _('none'));
		o.value('dnsmasq-upstream', _('Run as dnsmasq upstream server'));
		o.value('redirect', _('Redirect 53 port to AdGuardHome'));
		o.value('exchange', _('Use port 53 replace dnsmasq'));
		o.default = 'none';
		o.rmempty = true;

		o = s.taboption('basic', ChpassValue, 'hashpass', _('Change management password'),
			_('Press load culculate model and culculate finally save/apply'));
		o.default = '';
		o.datatype = 'string';
		o.rmempty = true;

		o = s.taboption('basic', form.Flag, 'waitonboot', _('Start up only when the network is normal'));
		o.default = '1';
		o.rmempty = false;

		/* Core Config */
		o = s.taboption('core', form.Value, 'binpath', _('Bin Path'),
			_('AdGuardHome Bin path if no bin will auto download'));
		o.default = '/usr/bin/AdGuardHome';
		o.datatype = 'string';
		o.rmempty = false;
		o.write = pathNotDirValidator('bin path');

		o = s.taboption('core', form.ListValue, 'upxflag', _('use upx to compress bin after download'),
			_('bin use less space,but may have compatibility issues'));
		o.value('', _('none'));
		o.value('-1', _('compress faster'));
		o.value('-9', _('compress better'));
		o.value('--best', _('compress best(can be slow for big files)'));
		o.value('--brute', _('try all available compression methods & filters [slow]'));
		o.value('--ultra-brute', _('try even more compression variants [very slow]'));
		o.default = '';
		o.rmempty = true;

		o = s.taboption('core', form.Value, 'configpath', _('Config Path'), _('AdGuardHome config path'));
		o.default = '/etc/AdGuardHome.yaml';
		o.datatype = 'string';
		o.rmempty = false;
		o.write = pathNotDirValidator('config path');

		o = s.taboption('core', form.Value, 'workdir', _('Work dir'),
			_('AdGuardHome work dir include rules,audit log and database'));
		o.default = '/etc/AdGuardHome';
		o.datatype = 'string';
		o.rmempty = false;
		o.write = pathNotFileValidator('work dir');

		o = s.taboption('core', form.Value, 'logfile', _('Runtime log file'),
			_('AdGuardHome runtime Log file if \'syslog\': write to system log;if empty no log'));
		o.datatype = 'string';
		o.rmempty = true;
		o.write = pathNotDirValidator('log file');

		o = s.taboption('core', form.Flag, 'verbose', _('Verbose log'));
		o.default = '0';
		o.rmempty = true;

		/* Other Config */
		o = s.taboption('other', form.DynamicList, 'upprotect', _('Keep files when system upgrade'));
		o.value('$binpath', _('core bin'));
		o.value('$configpath', _('config file'));
		o.value('$logfile', _('log file'));
		o.value('$workdir/data/sessions.db', _('sessions.db'));
		o.value('$workdir/data/stats.db', _('stats.db'));
		o.value('$workdir/data/querylog.json', _('querylog.json'));
		o.value('$workdir/data/filters', _('filters'));
		o.rmempty = true;

		var backupfile = s.taboption('other', form.MultiValue, 'backupfile',
			_('Backup workdir files when shutdown'), _('Will be restore when workdir/data is empty'));
		backupfile.value('filters', 'filters');
		backupfile.value('stats.db', 'stats.db');
		backupfile.value('querylog.json', 'querylog.json');
		backupfile.value('sessions.db', 'sessions.db');

		var backupwdpath = s.taboption('other', form.Value, 'backupwdpath', _('Backup workdir path'));
		backupwdpath.default = '/etc/AdGuardHome';
		backupwdpath.datatype = 'string';
		backupwdpath.rmempty = false;
		backupwdpath.write = pathNotFileValidator('backup dir');

		['filters', 'stats.db', 'querylog.json', 'sessions.db'].forEach(function(name) {
			backupwdpath.depends('backupfile', name);
		});

		// Dynamically discover additional workdir/data candidates.
		fs.list(info.workdir + '/data').then(function(entries) {
			for (var i = 0; i < entries.length; i++) {
				var name = entries[i].name;
				if (['filters', 'stats.db', 'querylog.json', 'sessions.db'].indexOf(name) >= 0)
					continue;
				backupfile.value(name, name);
				backupwdpath.depends('backupfile', name);
			}
		}).catch(function() {});

		o = s.taboption('other', form.MultiValue, 'crontab', _('Crontab task'),
			_('Please change time and args in crontab'));
		o.value('autohost', _('Auto update ipv6 hosts and restart AdGuardHome'));
		o.value('autogfw', _('Auto update gfwlist and restart AdGuardHome'));
		o.value('autogfwipset', _('Auto update ipset list and restart AdGuardHome'));

		/* GFWList buttons */
		o = s.taboption('other', form.Button, 'gfwdel', _('Del gfwlist'), _(info.gfwAdded));
		o.inputtitle = _('Del');
		o.write = function() {};
		o.remove = function() {};
		o.onclick = function(ev) {
			ev.preventDefault();
			sh('sh /usr/share/AdGuardHome/gfw2adg.sh del 2>&1').then(function() {
				location.href = L.url('admin', 'services', 'adguardhome', 'base');
			});
			return false;
		};

		o = s.taboption('other', form.Button, 'gfwadd', _('Add gfwlist'), _(info.gfwAdded));
		o.inputtitle = _('Add');
		o.write = function() {};
		o.remove = function() {};
		o.onclick = function(ev) {
			ev.preventDefault();
			sh('sh /usr/share/AdGuardHome/gfw2adg.sh 2>&1').then(function() {
				location.href = L.url('admin', 'services', 'adguardhome', 'base');
			});
			return false;
		};

		o = s.taboption('other', form.Button, 'gfwipsetdel',
			_('Del gfwlist') + ' ' + _('(ipset only)'), _(info.gfwipsetAdded));
		o.inputtitle = _('Del');
		o.write = function() {};
		o.remove = function() {};
		o.onclick = function(ev) {
			ev.preventDefault();
			sh('sh /usr/share/AdGuardHome/gfwipset2adg.sh del 2>&1').then(function() {
				location.href = L.url('admin', 'services', 'adguardhome', 'base');
			});
			return false;
		};

		o = s.taboption('other', form.Button, 'gfwipsetadd',
			_('Add gfwlist') + ' ' + _('(ipset only)'),
			_(info.gfwipsetAdded) + ' ' + _('will set to name gfwlist'));
		o.inputtitle = _('Add');
		o.write = function() {};
		o.remove = function() {};
		o.onclick = function(ev) {
			ev.preventDefault();
			sh('sh /usr/share/AdGuardHome/gfwipset2adg.sh 2>&1').then(function() {
				location.href = L.url('admin', 'services', 'adguardhome', 'base');
			});
			return false;
		};

		o = s.taboption('other', form.Value, 'gfwupstream', _('Gfwlist upstream dns server'),
			_('Gfwlist domain upstream dns service') + _(info.gfwAdded));
		o.default = 'tcp://208.67.220.220:5353';
		o.datatype = 'string';
		o.rmempty = false;

		return m.render().then(function(node) {
			return E([
				E('fieldset', { 'class': 'cbi-section' }, statusP),
				node
			]);
		});
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).then(function() {
			ui.changes.apply(mode == '0');

			/* 原版 base.lua 的 m.on_commit 会在 UCI commit 后显式
			 * reload（io.popen "/etc/init.d/AdGuardHome reload &"）。
			 * 必须保留显式 reload：rpcd uci apply 只向 procd 发
			 * config.change 事件，而 procd 的 reload trigger 只对
			 * "已注册到 procd"的服务生效 —— 服务从未启动 / 更新内核
			 * 时被 stop / 停用过时，procd 里没有该服务，config.change
			 * 不会触发 reload，只依赖 trigger 会导致启用后不启动。
			 *
			 * 不能用固定 setTimeout：rpcd apply 是异步的，UCI 可能
			 * 尚未提交，reload 会读到旧的 enabled 值，把刚启动的
			 * 服务又停掉。改为轮询 UCI 直到 enabled 变成表单目标值
			 * （即 rpcd 提交完成）再 reload。 */
			var target = uci.get('AdGuardHome', 'AdGuardHome', 'enabled');
			var tries = 0;

			(function poll() {
				tries++;
				uci.load('AdGuardHome').then(function() {
					var cur = uci.get('AdGuardHome', 'AdGuardHome', 'enabled');
					if (cur === target || tries >= 20) {
						fs.exec('/etc/init.d/AdGuardHome', ['reload']).catch(function() {});
					}
					else {
						window.setTimeout(poll, 500);
					}
				}).catch(function() {
					window.setTimeout(poll, 500);
				});
			})();
		});
	}
});
