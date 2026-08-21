'use strict';
'require fs';
'require uci';
'require ui';
'require dom';
'require poll';
'require view';

function sh(cmd, args) {
	return fs.exec('/bin/sh', ['-c', cmd, '_'].concat(args || []));
}

function fileExists(path) {
	return sh('[ -e "$1" ]', [path]).then(function(res) {
		return res.code === 0;
	}).catch(function() { return false; });
}

function p(s) {
	return s < 10 ? '0' + s : s;
}

function line_tolocal(str) {
	var strt = [];
	str.trim().split('\n').forEach(function(v, i) {
		var dt = new Date(v.substring(0, 19) + ' UTC');
		if (dt != 'Invalid Date') {
			strt[i] = dt.getFullYear() + '/' + p(dt.getMonth() + 1) + '/' + p(dt.getDate()) + ' ' +
				p(dt.getHours()) + ':' + p(dt.getMinutes()) + ':' + p(dt.getSeconds()) + v.substring(19);
		}
		else {
			strt[i] = v;
		}
	});
	return strt;
}

function line_toUTC(str) {
	var strt = [];
	str.trim().split('\n').forEach(function(v, i) {
		var dt = new Date(v.substring(0, 19));
		if (dt != 'Invalid Date') {
			strt[i] = dt.getUTCFullYear() + '/' + p(dt.getUTCMonth() + 1) + '/' + p(dt.getUTCDate()) + ' ' +
				p(dt.getUTCHours()) + ':' + p(dt.getUTCMinutes()) + ':' + p(dt.getUTCSeconds()) + v.substring(19);
		}
		else {
			strt[i] = v;
		}
	});
	return strt;
}

return view.extend({
	load: function() {
		return uci.load('AdGuardHome');
	},

	render: function() {
		var logfile = uci.get('AdGuardHome', 'AdGuardHome', 'logfile') || '';
		var timereplace = (logfile != 'syslog' && logfile != '');
		var pollcheck = (logfile != '');

		var logPos = 0;
		var isLogReverse = true;
		var isUtc2Local = timereplace;

		var ta = E('textarea', {
			'id': 'cbid.logview.1.conf',
			'class': 'cbi-input-textarea',
			'style': 'width: 100%;display:inline',
			'rows': '32',
			'cols': '60',
			'readonly': 'readonly'
		});

		var reverseCb = E('input', {
			'type': 'checkbox',
			'name': 'NAME',
			'value': 'reverse',
			'style': 'vertical-align:middle;height:auto',
			'checked': 'checked'
		});

		function reverselog() {
			ta.value = ta.value.split('\n').reverse().join('\n');
			isLogReverse = !isLogReverse;
		}

		function chlogtime() {
			if (isUtc2Local) {
				ta.value = line_toUTC(ta.value).join('\n');
				isUtc2Local = false;
			}
			else {
				ta.value = line_tolocal(ta.value).join('\n');
				isUtc2Local = true;
			}
		}

		function createAndDownloadFile(fileName, content) {
			var aTag = document.createElement('a');
			var blob = new Blob([content]);
			aTag.download = fileName;
			aTag.href = URL.createObjectURL(blob);
			aTag.click();
			URL.revokeObjectURL(blob);
		}

		function downloadLog() {
			var dt = new Date();
			var timestamp = (dt.getMonth() + 1) + '-' + dt.getDate() + '-' + dt.getHours() + '_' + dt.getMinutes();
			createAndDownloadFile('AdGuardHome' + timestamp + '.log', ta.value);
		}

		function delLog() {
			var target = (logfile == 'syslog') ? '/tmp/AdGuardHometmp.log' : logfile;
			fs.write(target, '').then(function() {
				ta.value = '';
			});
		}

		function pollOnce() {
			var target = logfile;
			var pre = Promise.resolve();

			if (logfile == 'syslog') {
				target = '/tmp/AdGuardHometmp.log';
				pre = fileExists('/var/run/AdGuardHomesyslog').then(function(exists) {
					var start = exists
						? Promise.resolve()
						: sh('(/usr/share/AdGuardHome/getsyslog.sh &); sleep 1;');

					return start.then(function() {
						return fs.write('/var/run/AdGuardHomesyslog', '1');
					});
				});
			}

			return pre.then(function() {
				return sh('tail -c +' + (logPos + 1) + ' "$1"', [target]);
			}).then(function(res) {
				var data = res.stdout || '';
				if (data == '')
					return;

				logPos += data.length;

				if (isUtc2Local) {
					var lines = line_toUTC(data);
					if (isLogReverse)
						ta.value = lines.reverse().join('\n') + ta.value;
					else
						ta.value += lines.join('\n');
					ta.value = line_tolocal(ta.value).join('\n');
				}
				else {
					if (isLogReverse)
						ta.value = data.split('\n').reverse().join('\n') + ta.value;
					else
						ta.value += data;
				}
			}).catch(function() {});
		}

		reverseCb.addEventListener('click', reverselog);

		var localCb = null;
		var headerNodes = [ reverseCb, _('reverse') ];

		if (timereplace) {
			localCb = E('input', {
				'type': 'checkbox',
				'name': 'NAME',
				'value': 'localtime',
				'style': 'vertical-align:middle;height:auto',
				'checked': 'checked'
			});
			localCb.addEventListener('click', chlogtime);
			headerNodes.push(localCb, _('localtime'), E('br'));
		}

		var delBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'id': 'apply_update_button'
		}, [ _('dellog') ]);
		delBtn.addEventListener('click', delLog);

		var dlBtn = E('button', {
			'class': 'btn cbi-button cbi-button-apply',
			'style': 'display:inline'
		}, [ _('download log') ]);
		dlBtn.addEventListener('click', downloadLog);

		if (pollcheck) {
			pollOnce();
			poll.add(L.bind(pollOnce, this), 3);
		}
		else {
			ta.value = _('Please add log path in config to enable log');
		}

		return E('fieldset', { 'class': 'cbi-section' }, [
			E('div', {}, headerNodes.concat([ ta ])),
			delBtn,
			dlBtn
		]);
	}
});
