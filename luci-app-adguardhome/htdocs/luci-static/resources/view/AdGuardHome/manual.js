'use strict';
'require fs';
'require uci';
'require ui';
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

function loadCSS(url) {
	document.head.appendChild(E('link', { 'rel': 'stylesheet', 'href': url }));
	return Promise.resolve();
}

function loadScripts(urls) {
	return urls.reduce(function(promise, url) {
		return promise.then(function() { return loadScript(url); });
	}, Promise.resolve());
}

function insertAfter(newNode, refNode) {
	refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
}

/*
 * Reproduces `gen_template_config()` from manual.lua / the controller's
 * `get_template_config()` action: reads the system nameservers and substitutes
 * the `#bootstrap_dns` / `#upstream_dns` markers in the shipped template.
 */
async function genTemplateConfig() {
	var d = '';
	var file = '/tmp/resolv.conf.d/resolv.conf.auto';

	if (!(await fileExists(file)))
		file = '/tmp/resolv.conf.auto';

	try {
		var resolv = await fs.read(file);
		resolv.split('\n').forEach(function(line) {
			var m = line.match(/^[^#]*nameserver\s+(\S+)$/);
			if (m)
				d += '  - ' + m[1] + '\n';
		});
	} catch (err) {}

	var tmpl = await fs.read('/usr/share/AdGuardHome/AdGuardHome_template.yaml');
	var lines = tmpl.split('\n');
	var out = [];

	for (var i = 0; i < lines.length; i++) {
		if (lines[i] == '#bootstrap_dns' || lines[i] == '#upstream_dns')
			out.push(d.replace(/\n$/, ''));
		else
			out.push(lines[i]);
	}

	return out.join('\n');
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('AdGuardHome'),
			loadCSS(L.resource('codemirror/lib/codemirror.css')),
			loadCSS(L.resource('codemirror/theme/dracula.css')),
			loadCSS(L.resource('codemirror/addon/fold/foldgutter.css')),
			loadScripts([
				L.resource('codemirror/lib/codemirror.js'),
				L.resource('codemirror/mode/yaml/yaml.js'),
				L.resource('codemirror/addon/fold/foldcode.js'),
				L.resource('codemirror/addon/fold/foldgutter.js'),
				L.resource('codemirror/addon/fold/indent-fold.js')
			])
		]);
	},

	render: function() {
		var configpath = uci.get('AdGuardHome', 'AdGuardHome', 'configpath') || '/etc/AdGuardHome.yaml';
		var binpath = uci.get('AdGuardHome', 'AdGuardHome', 'binpath') || '/usr/bin/AdGuardHome';

		function loadConfig() {
			return fs.read('/tmp/AdGuardHometmpconfig.yaml').catch(function() {
				return fs.read(configpath).catch(function() {
					return genTemplateConfig();
				});
			});
		}

		var m = new form.Map('AdGuardHome');

		var s = m.section(form.NamedSection, 'AdGuardHome', 'AdGuardHome');

		var o = s.option(form.TextValue, 'escconf');
		o.rows = 66;
		o.wrap = 'off';
		o.rmempty = true;
		o.load = function() { return loadConfig(); };

		o.write = function(section_id, value) {
			var norm = String(value).replace(/\r\n/g, '\n');

			return fs.write('/tmp/AdGuardHometmpconfig.yaml', norm).then(function() {
				function saveConfig() {
					return sh('mv "$1" "$2"', ['/tmp/AdGuardHometmpconfig.yaml', configpath])
						.then(function() {
							return fs.exec('/etc/init.d/AdGuardHome', ['reload']);
						});
				}

				return fileExists(binpath).then(function(exists) {
					if (!exists)
						return saveConfig();

					return sh('"$1" -c /tmp/AdGuardHometmpconfig.yaml --check-config 2> /tmp/AdGuardHometest.log', [binpath])
						.then(function(res) {
							if (res.code !== 0) {
								return fs.read('/tmp/AdGuardHometest.log').then(function(log) {
									throw new Error(log || 'config check failed');
								});
							}
							return saveConfig();
						});
				});
			});
		};

		o.remove = function() {
			return fs.write(configpath, '');
		};

		return m.render().then(function(node) {
			/*
			 * CodeMirror must be initialized only after the form node has
			 * been attached to the document. Doing it here (inside the
			 * m.render() promise) is too early: the container is not yet
			 * measurable, which renders as a black/empty panel until the
			 * user clicks into it. Defer via requestAnimationFrame and force
			 * a refresh once initialized.
			 */
			window.requestAnimationFrame(function() {
				var uiel = o.getUIElement('AdGuardHome');
				var ta = uiel ? uiel.node.firstElementChild : null;

				if (!ta || !window.CodeMirror)
					return;

				var editor = window.CodeMirror.fromTextArea(ta, {
					mode: 'text/yaml',
					styleActiveLine: true,
					lineNumbers: true,
					theme: 'dracula',
					lineWrapping: true,
					foldGutter: true,
					gutters: [ 'CodeMirror-linenumbers', 'CodeMirror-foldgutter' ],
					matchBrackets: true
				});

				editor.setSize('100%', '70vh');
				editor.on('change', function() { editor.save(); });
				window.addEventListener('resize', function() { editor.refresh(); });
				editor.refresh();

				function useTemplate() {
					genTemplateConfig().then(function(content) {
						editor.setValue(content);
						editor.save();
					});
				}

				function reloadConfig() {
					fs.remove('/tmp/AdGuardHometmpconfig.yaml').then(function() {
						location.reload();
					});
				}

				var container = ta.parentNode;

				fileExists('/tmp/AdGuardHometmpconfig.yaml').then(function(hasTmp) {
					var nodes = [];
					if (hasTmp) {
						nodes.push(E('button', {
							'id': 'apply_update_button',
							'class': 'btn cbi-button cbi-button-apply',
							'click': reloadConfig
						}, [ _('Reload Config') ]));
					}
					nodes.push(E('button', {
						'id': 'template_button',
						'class': 'btn cbi-button cbi-button-apply',
						'click': useTemplate
					}, [ _('Use template') ]));

					if (container)
						insertAfter(E('div', {}, nodes), container);
				});

				// Display a previous config-check error, if any.
				fileExists('/tmp/AdGuardHometmpconfig.yaml').then(function(hasTmp) {
					if (!hasTmp)
						return;
					return fs.read('/tmp/AdGuardHometest.log').then(function(log) {
						if (log && log.trim() != '' && container) {
							insertAfter(E('div', { 'class': 'cbi-section' }, [
								E('textarea', {
									'class': 'cbi-input-textarea',
									'rows': '5',
									'readonly': 'readonly'
								}, log)
							]), container);
						}
					}).catch(function() {});
				});

				fileExists(binpath).then(function(exists) {
					if (!exists && container) {
						insertAfter(E('div', { 'class': 'cbi-value-description' },
							_('WARNING!!! no bin found apply config will not be test')), container);
					}
				});
			});

			return node;
		});
	}
});
