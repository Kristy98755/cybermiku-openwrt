'use strict';

function ttydUrl() {
	return (location.protocol === 'https:' ? 'https://' : 'http://') + location.host + ':7681';
}

var CMK = {
	token: null,
	pollInterval: 5000,
	currentTab: 'status',
	currentSub: 'overview',
	data: {},

	init: function() {
		var self = this;
		var app = document.getElementById('app');
		if (!app) return;
		this.token = window.CMK_SID || null;
		if (!this.token) {
			window.location.href = '/cgi-bin/luci/admin/cybermiku';
			return;
		}
		this.renderShell(app);
		this.bindNav();
		this.handleHash();
		window.addEventListener('hashchange', function() { self.handleHash(); });
	},

	handleHash: function() {
		var h = (location.hash || '#status-overview').replace('#', '').split('-');
		this.currentTab = h[0] || 'status';
		this.currentSub = h[1] || 'overview';
		this.navigate(this.currentTab, this.currentSub);
	},

	rpc: function(obj, method, params) {
		var id = 1;
		var msg = {
			jsonrpc: '2.0',
			id: id,
			method: 'call',
			params: [this.token, obj, method, params || {}]
		};
		return fetch('/cgi-bin/luci/admin/ubus', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(msg)
		}).then(function(r) {
			if (r.status === 403 || r.status === 401) {
				window.location.href = '/cgi-bin/luci/admin/cybermiku';
				return Promise.reject('SESSION_EXPIRED');
			}
			if (!r.ok) return Promise.reject('HTTP_' + r.status);
			return r.json();
		}).then(function(r) {
			if (r.error) return Promise.reject(r.error);
			if (r.result && r.result[0] !== 0) return Promise.reject('ubus error ' + r.result[0]);
			return r.result ? r.result[1] : r.result;
		});
	},

	uci: function(config, action, params) {
		var self = this;
		return this.rpc('uci', action, Object.assign({ config: config }, params || {})).then(function(data) {
			if (action === 'get' && data && typeof data === 'object' && data.values && typeof data.values === 'object')
				return data.values;
			return data;
		});
	},

	renderShell: function(app) {
		app.innerHTML = [
			'<div class="cmk-header">',
			'  <div class="cmk-header-row">',
			'    <span class="cmk-brand-name">CyberMiku</span>',
			'    <button class="cmk-nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00ffff" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>',
			'    <ul class="cmk-nav" id="main-nav">',
			'      <li data-tab="status" class="active"><a href="#status-overview">STATUS</a>',
			'        <div class="cmk-dropdown" data-submenu="status">',
			'          <a href="#status-overview">OVERVIEW</a>',
			'          <a href="#status-realtime">REALTIME</a>',
			'          <a href="#status-connections">CONNECTIONS</a>',
			'          <a href="#status-processes">PROCESSES</a>',
			'          <a href="#status-logs">LOGS</a>',
			'        </div></li>',
			'      <li data-tab="network"><a href="#network-interfaces">NETWORK</a>',
			'        <div class="cmk-dropdown" data-submenu="network">',
			'          <a href="#network-interfaces">INTERFACES</a>',
			'          <a href="#network-firewall">FIREWALL</a>',
			'          <a href="#network-dhcp">DHCP/DNS</a>',
			'          <a href="#network-clients">CLIENTS</a>',
			'          <a href="#network-routes">ROUTES</a>',
			'          <a href="#network-diag">DIAGNOSTICS</a>',
			'        </div></li>',
			'      <li data-tab="wireless"><a href="#wireless-overview">WIRELESS</a>',
			'        <div class="cmk-dropdown" data-submenu="wireless">',
			'          <a href="#wireless-overview">OVERVIEW</a>',
			'          <a href="#wireless-clients">CLIENTS</a>',
			'          <a href="#wireless-scan">SCAN</a>',
			'          <a href="#wireless-repeater">REPEATER</a>',
			'          <a href="#wireless-config">CONFIG</a>',
			'        </div></li>',
			'      <li data-tab="services"><a href="#services-init">SERVICES</a>',
			'        <div class="cmk-dropdown" data-submenu="services">',
			'          <a href="#services-init">INIT SCRIPTS</a>',
			'          <a href="#services-packages">PACKAGES</a>',
			'          <a href="#services-startup">STARTUP</a>',
			'        </div></li>',
			'      <li data-tab="system"><a href="#system-info">SYSTEM</a>',
			'        <div class="cmk-dropdown" data-submenu="system">',
			'          <a href="#system-info">INFO</a>',
			'          <a href="/cgi-bin/luci/admin/system/admin" data-stock="1">PASSWORD</a>',
			'          <a href="#system-leds">LEDS</a>',
			'          <a href="#system-cron">CRON</a>',
			'          <a href="#system-backup">FLASH</a>',
			'          <a href="#system-shell">SHELL</a>',
			'        </div></li>',
			'      <li data-tab="diagnostics"><a href="#diagnostics-ping">DIAG</a>',
			'        <div class="cmk-dropdown" data-submenu="diagnostics">',
			'          <a href="#diagnostics-ping">PING</a>',
			'          <a href="#diagnostics-nslookup">NSLOOKUP</a>',
			'          <a href="#diagnostics-traceroute">TRACEROUTE</a>',
			'        </div></li>',
			'    </ul>',
			'    <div class="cmk-nav-right">',
			'      <div class="cmk-status-dot"></div>',
			'      <span class="cmk-status-text" id="clock">--:--:--</span>',
			'      <a href="/cgi-bin/luci/admin/cybermiku/logout" class="cmk-logout">LOG OUT</a>',
			'    </div>',
			'  </div>',
			'</div>',
			'<div class="cmk-main" id="content">',
			'  <div class="cmk-loading">INITIALIZING</div>',
			'</div>'
		].join('\n');
		var self = this;
		setInterval(function() {
			var el = document.getElementById('clock');
			if (el) {
				var n = new Date();
				el.textContent = String(n.getHours()).padStart(2,'0') + ':' +
					String(n.getMinutes()).padStart(2,'0') + ':' +
					String(n.getSeconds()).padStart(2,'0');
			}
		}, 1000);
	},

	bindNav: function() {
		var self = this;
		function closeMobileMenu() {
			var hdr = document.querySelector('.cmk-header');
			if (hdr) hdr.classList.remove('nav-open');
			var lis = document.querySelectorAll('#main-nav li[data-tab]');
			for (var i = 0; i < lis.length; i++) lis[i].classList.remove('open');
		}
		var nav = document.getElementById('main-nav');
		if (nav) {
			nav.addEventListener('click', function(e) {
				var a = e.target.closest('a');
				if (!a) return;
				var href = a.getAttribute('href');
				if (!href || href.charAt(0) !== '#') return;
				var li = a.parentElement;
				if (li && li.tagName === 'LI' && li.getAttribute('data-tab') && window.innerWidth <= 900) {
					e.preventDefault();
					var isOpen = li.classList.contains('open');
					var siblings = nav.querySelectorAll('li[data-tab]');
					for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('open');
					if (!isOpen) li.classList.add('open');
					return;
				}
				e.preventDefault();
				location.hash = href.slice(1);
				if (a.closest('.cmk-dropdown')) closeMobileMenu();
			});
		}
		var toggle = document.getElementById('nav-toggle');
		if (toggle) {
			toggle.addEventListener('click', function() {
				var hdr = document.querySelector('.cmk-header');
				if (hdr) hdr.classList.toggle('nav-open');
				var expanded = toggle.getAttribute('aria-expanded') === 'true';
				toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
			});
		}
		document.addEventListener('click', function(e) {
			if (e.target.closest && e.target.closest('.cmk-header')) return;
			closeMobileMenu();
		});
		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') closeMobileMenu();
		});
	},

	navigate: function(tab, sub) {
		this.currentTab = tab;
		this.currentSub = sub;
		var nav = document.getElementById('main-nav');
		if (nav) {
			var items = nav.querySelectorAll('li[data-tab]');
			for (var i = 0; i < items.length; i++) {
				items[i].classList.toggle('active', items[i].getAttribute('data-tab') === tab);
			}
			var links = nav.querySelectorAll('.cmk-dropdown a');
			for (var j = 0; j < links.length; j++) {
				var href = links[j].getAttribute('href') || '';
				var target = tab + '-' + sub;
				links[j].classList.toggle('active', href === '#' + target);
			}
		}
		this.renderPage(tab, sub);
	},

	renderSubNav: function() {},

	renderPage: function(tab, sub) {
		var c = document.getElementById('content');
		if (!c) return;
		c.innerHTML = '<div class="cmk-loading">LOADING</div>';
		var self = this;
		clearInterval(self._pollTimer);
		clearTimeout(self._repTimer);
		switch (tab) {
			case 'status': self.renderStatus(c, sub); break;
			case 'network': self.renderNetwork(c, sub); break;
			case 'wireless': self.renderWireless(c, sub); break;
			case 'services': self.renderServices(c, sub); break;
			case 'system': self.renderSystem(c, sub); break;
			case 'diagnostics': self.renderDiagnostics(c, sub); break;
			default: c.innerHTML = '<div class="cmk-loading">NOT FOUND</div>';
		}
	},

	setError: function(c, e) {
		var msg = (typeof e === 'string') ? e : (e && e.message) ? e.message : 'UNKNOWN ERROR';
		c.innerHTML = '<div class="cmk-alert cmk-alert-warn">ERROR: ' + this.esc(msg) +
			' <a href="javascript:location.reload()">RETRY</a></div>';
	},

	setPoll: function(fn, ms) {
		var self = this;
		clearInterval(this._pollTimer);
		fn();
		this._pollTimer = setInterval(fn, ms || this.pollInterval);
	},

	// ============================================================
	// STATUS PAGES
	// ============================================================

	renderStatus: function(c, sub) {
		var self = this;
		switch (sub) {
			case 'overview': self.statusOverview(c); break;
			case 'realtime': self.statusRealtime(c); break;
			case 'connections': self.statusConnections(c); break;
			case 'processes': self.statusProcesses(c); break;
			case 'logs': self.statusLogs(c); break;
			default: self.statusOverview(c);
		}
	},

	statusOverview: function(c) {
		var self = this;
		self.setPoll(function() {
		Promise.all([
			self.rpc('system', 'board'),
			self.rpc('system', 'info'),
			self.rpc('network.interface', 'dump'),
			self.rpc('luci-rpc', 'getDHCPLeases'),
			self.rpc('network.wireless', 'status', {}).catch(function() { return {}; })
		]).then(function(r) {
			var board = r[0], sys = r[1], net = r[2], dhcp = r[3], wifiStat = r[4] || {};
				var mem = sys.memory || {};
				var memTotal = mem.total || 1;
				var memAvail = mem.available || mem.free || 0;
				var memUsed = memTotal - memAvail;
				var memPct = Math.round((memUsed / memTotal) * 100);

				var disk = sys.root || {};
				var diskTotal = disk.total || 1;
				var diskUsed = disk.used || 0;
				var diskPct = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

				var uptime = sys.uptime || 0;
				var days = Math.floor(uptime / 86400);
				var hours = Math.floor((uptime % 86400) / 3600);
				var mins = Math.floor((uptime % 3600) / 60);
				var uptimeStr = days + 'd ' + hours + 'h ' + mins + 'm';

				var load = sys.load || [0, 0, 0];
				var ifaces = (net && net.interface) || [];
				var wan = null, wifiUp = false, lanIP = '';
				for (var i = 0; i < ifaces.length; i++) {
					var ifc = ifaces[i];
					if (ifc.l3_device && ifc.l3_device.indexOf('eth') === 0 && ifc.proto) wan = ifc;
					if (ifc.l3_device && (ifc.l3_device.indexOf('wlan') === 0 || ifc.l3_device.indexOf('phy') === 0) && ifc.up) wifiUp = true;
					if (ifc.interface === 'lan' && ifc['ipv4-address'] && ifc['ipv4-address'][0]) {
						lanIP = ifc['ipv4-address'][0].address;
					}
				}
				if (!wifiUp && wifiStat) {
					for (var rn in wifiStat) {
						if (wifiStat[rn] && wifiStat[rn].up) { wifiUp = true; break; }
					}
				}
				var wanIP = wan && wan['ipv4-address'] && wan['ipv4-address'][0] ? wan['ipv4-address'][0].address : 'N/A';
				var leases = (dhcp && dhcp.dhcp_leases) || [];

				var h = '';
				h += '<div class="cmk-panel"><div class="cmk-panel-title">SYSTEM</div>';

				var h = '';
				h += '<div class="cmk-panel"><div class="cmk-panel-title">SYSTEM</div>';
				h += '<div class="cmk-grid">';
				h += self.statCard('HOSTNAME', board.hostname || '?');
				h += self.statCard('MODEL', (board.model || board.board_name || '?').split(' ').slice(-2).join(' '));
				h += self.statCard('UPTIME', uptimeStr);
				h += self.statCard('LOAD', load[0].toFixed(2));
				h += '</div></div>';

				h += '<div class="cmk-panel"><div class="cmk-panel-title">NETWORK</div>';
				h += '<div class="cmk-grid">';
				h += self.statCard('LAN IP', lanIP || '192.168.1.1');
				h += self.statCard('WAN IP', wanIP);
				h += self.statCard('WAN', wan && wan.up ? 'CONNECTED' : 'DOWN', wan && wan.up ? 'cmk-val-up' : 'cmk-val-down');
				h += self.statCard('WIFI', wifiUp ? 'ACTIVE' : 'INACTIVE', wifiUp ? 'cmk-val-up' : 'cmk-val-down');
				h += '</div></div>';

				h += '<div class="cmk-panel"><div class="cmk-panel-title">MEMORY</div>';
				h += '<div class="cmk-grid">';
				h += self.statCard('TOTAL', self.fmtBytes(memTotal));
				h += self.statCard('USED', self.fmtBytes(memUsed));
				h += self.statCard('AVAILABLE', self.fmtBytes(memAvail));
				h += self.statCard('USAGE', memPct + '%');
				h += '</div>';
				h += '<div class="cmk-bar-wrap"><div class="cmk-bar" style="width:' + memPct + '%"></div></div></div>';

				if (diskTotal > 0) {
					h += '<div class="cmk-panel"><div class="cmk-panel-title">STORAGE</div>';
					h += '<div class="cmk-grid">';
					h += self.statCard('TOTAL', self.fmtBytes(diskTotal));
					h += self.statCard('USED', self.fmtBytes(diskUsed));
					h += self.statCard('FREE', self.fmtBytes(diskTotal - diskUsed));
					h += self.statCard('USAGE', diskPct + '%');
					h += '</div>';
					h += '<div class="cmk-bar-wrap"><div class="cmk-bar" style="width:' + diskPct + '%"></div></div></div>';
				}

				if (leases.length > 0) {
					h += '<div class="cmk-panel"><div class="cmk-panel-title">DHCP LEASES (' + leases.length + ')</div>';
					h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
					h += '<th>HOSTNAME</th><th>IP</th><th>MAC</th><th>LEASE</th>';
					h += '</tr></thead><tbody>';
					for (var j = 0; j < leases.length; j++) {
						var l = leases[j];
						var rem = l.lease_time || 0;
						var lrh = Math.floor(rem / 3600);
						var lrm = Math.floor((rem % 3600) / 60);
						h += '<tr><td>' + self.esc(l.hostname || '?') + '</td>';
						h += '<td>' + self.esc(l.ipaddr || '?') + '</td>';
						h += '<td>' + self.esc(l.macaddr || '?') + '</td>';
						h += '<td>' + lrh + 'h ' + lrm + 'm</td></tr>';
					}
					h += '</tbody></table></div></div>';
				}

				h += '<div class="cmk-panel"><div class="cmk-panel-title">INTERFACES (' + ifaces.length + ')</div>';
				h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
				h += '<th>NAME</th><th>PROTO</th><th>IP</th><th>DEVICE</th><th>STATUS</th>';
				h += '</tr></thead><tbody>';
				for (var k = 0; k < ifaces.length; k++) {
					var ifc2 = ifaces[k];
					var ip = ifc2['ipv4-address'] && ifc2['ipv4-address'][0] ? ifc2['ipv4-address'][0].address : 'N/A';
					h += '<tr><td>' + self.esc(ifc2.interface || '?') + '</td>';
					h += '<td>' + self.esc(ifc2.proto || 'none') + '</td>';
					h += '<td>' + self.esc(ip) + '</td>';
					h += '<td>' + self.esc(ifc2.l3_device || '-') + '</td>';
					h += '<td class="' + (ifc2.up ? 'cmk-val-up' : 'cmk-val-down') + '">' + (ifc2.up ? 'UP' : 'DOWN') + '</td></tr>';
				}
				h += '</tbody></table></div></div>';

				c.innerHTML = h;
			}).catch(function(e) { self.setError(c, e); });
		}, 5000);
	},

	statusRealtime: function(c) {
		var self = this;
		var prevNet = null;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">REALTIME MONITORING</div>' +
			'<div class="cmk-grid cols-2">' +
			'<div class="cmk-stat" id="rt-cpu"><div class="cmk-stat-label">CPU USAGE</div><div class="cmk-stat-value" id="rt-cpu-val">--</div>' +
			'<div class="cmk-bar-wrap"><div class="cmk-bar" id="rt-cpu-bar" style="width:0"></div></div></div>' +
			'<div class="cmk-stat" id="rt-load"><div class="cmk-stat-label">LOAD AVG</div><div class="cmk-stat-value" id="rt-load-val">--</div></div>' +
			'</div></div>' +
			'<div class="cmk-panel"><div class="cmk-panel-title">NETWORK TRAFFIC</div>' +
			'<div class="cmk-table-wrap"><table class="cmk-table" id="rt-net-table"><thead><tr>' +
			'<th>INTERFACE</th><th>RX</th><th>TX</th><th>RX/s</th><th>TX/s</th>' +
			'</tr></thead><tbody id="rt-net-body"></tbody></table></div></div>' +
			'<div class="cmk-panel"><div class="cmk-panel-title">WIRELESS CLIENTS</div>' +
			'<div id="rt-wifi-clients"><div class="cmk-loading">SCANNING</div></div></div>';

		self.setPoll(function() {
			Promise.all([
				self.rpc('system', 'info'),
				self.rpc('luci-rpc', 'getNetworkDevices')
			]).then(function(r) {
				var sys = r[0], devs = r[1];
				var load = sys.load || [0, 0, 0];
				var cpuPct = Math.min(100, Math.round(load[0] * 100 / 1));

				var cpuVal = document.getElementById('rt-cpu-val');
				var cpuBar = document.getElementById('rt-cpu-bar');
				var loadVal = document.getElementById('rt-load-val');
				if (cpuVal) cpuVal.textContent = cpuPct + '%';
				if (cpuBar) cpuBar.style.width = cpuPct + '%';
				if (loadVal) loadVal.textContent = load[0].toFixed(2);

				var curNet = {};
				if (devs) {
					for (var name in devs) {
						var d = devs[name];
						if (d.stats && d.stats.rx_bytes !== undefined) {
							curNet[name] = { rx: d.stats.rx_bytes, tx: d.stats.tx_bytes };
						}
					}
				}

				var tbody = document.getElementById('rt-net-body');
				if (tbody) {
					var rows = '';
					for (var n in curNet) {
						var c2 = curNet[n];
						var p = prevNet && prevNet[n] ? prevNet[n] : null;
						var rxDelta = p ? c2.rx - p.rx : 0;
						var txDelta = p ? c2.tx - p.tx : 0;
						rows += '<tr><td>' + self.esc(n) + '</td>';
						rows += '<td>' + self.fmtBytes(c2.rx) + '</td>';
						rows += '<td>' + self.fmtBytes(c2.tx) + '</td>';
						rows += '<td>' + self.fmtBytes(rxDelta) + '/s</td>';
						rows += '<td>' + self.fmtBytes(txDelta) + '/s</td></tr>';
					}
					tbody.innerHTML = rows || '<tr><td colspan="5">No data</td></tr>';
				}
				prevNet = curNet;

				return self.rpc('network.wireless', 'status');
			}).then(function(wifi) {
				var el = document.getElementById('rt-wifi-clients');
				if (!el) return;
				if (!wifi) { el.innerHTML = '<div class="cmk-loading">NO WIFI</div>'; return; }
				var html = '<table class="cmk-table"><thead><tr><th>IFACE</th><th>SSID</th><th>CHANNEL</th><th>STATUS</th></tr></thead><tbody>';
				for (var rn in wifi) {
					var radio = wifi[rn];
					if (!radio || !radio.interfaces) continue;
					var ch = (radio.config && radio.config.channel) || '?';
					for (var i = 0; i < radio.interfaces.length; i++) {
						var w = radio.interfaces[i];
						var cfg = w.config || {};
						html += '<tr><td>' + self.esc(w.ifname || '?') + '</td>';
						html += '<td>' + self.esc(cfg.ssid || '?') + '</td>';
						html += '<td>' + ch + '</td>';
						html += '<td class="' + (radio.up ? 'cmk-val-up' : 'cmk-val-down') + '">' + (radio.up ? 'UP' : 'DOWN') + '</td></tr>';
					}
				}
				html += '</tbody></table>';
				el.innerHTML = html;
			}).catch(function(e) {
				var el2 = document.getElementById('rt-wifi-clients');
				if (el2) el2.innerHTML = '<div class="cmk-alert cmk-alert-warn">' + self.esc(String(e)) + '</div>';
			});
		}, 3000);
	},

	statusConnections: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">ACTIVE CONNECTIONS</div><div id="conn-list"><div class="cmk-loading">LOADING</div></div></div>';
		self.setPoll(function() {
			self.rpc('luci', 'getConntrackList').then(function(data) {
				var el = document.getElementById('conn-list');
				if (!el) return;
				var conns = data && data.result ? data.result : (Array.isArray(data) ? data : []);
				if (!conns.length) { el.innerHTML = '<div class="cmk-loading">NO CONNECTIONS</div>'; return; }
				var shown = conns.slice(0, 200);
				var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
				h += '<th>PROTO</th><th>SRC</th><th>DST</th><th>SPORT</th><th>DPORT</th><th>BYTES</th><th>STATE</th>';
				h += '</tr></thead><tbody>';
				for (var i = 0; i < shown.length; i++) {
					var cn = shown[i];
					h += '<tr>';
					h += '<td>' + self.esc(cn.layer4 || cn.protocol || '?') + '</td>';
					h += '<td>' + self.esc(cn.src || '?') + '</td>';
					h += '<td>' + self.esc(cn.dst || '?') + '</td>';
					h += '<td>' + self.esc(String(cn.sport || '?')) + '</td>';
					h += '<td>' + self.esc(String(cn.dport || '?')) + '</td>';
					h += '<td>' + self.fmtBytes(parseInt(cn.bytes) || 0) + '</td>';
					h += '<td>' + self.esc(cn.state || '?') + '</td>';
					h += '</tr>';
				}
				h += '</tbody></table></div>';
				if (conns.length > 200) h += '<div style="text-align:center;color:var(--text-dim);padding:10px">Showing 200 of ' + conns.length + '</div>';
				el.innerHTML = h;
			}).catch(function(e) { self.setError(c, e); });
		}, 5000);
	},

	statusProcesses: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">RUNNING PROCESSES</div><div id="proc-list"><div class="cmk-loading">LOADING</div></div></div>';
		self.setPoll(function() {
			self.rpc('luci', 'getProcessList').then(function(data) {
				var el = document.getElementById('proc-list');
				if (!el) return;
				var procs = data && data.result ? data.result : (Array.isArray(data) ? data : []);
				if (!procs.length) { el.innerHTML = '<div class="cmk-loading">NO DATA</div>'; return; }
				var sorted = procs.sort(function(a, b) { return parseFloat(b['%CPU'] || 0) - parseFloat(a['%CPU'] || 0); });
				var shown = sorted.slice(0, 100);
				var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
				h += '<th>PID</th><th>USER</th><th>CPU%</th><th>MEM%</th><th>COMMAND</th>';
				h += '</tr></thead><tbody>';
				for (var i = 0; i < shown.length; i++) {
					var p = shown[i];
					h += '<tr>';
					h += '<td>' + self.esc(p.PID || '?') + '</td>';
					h += '<td>' + self.esc(p.USER || '?') + '</td>';
					h += '<td>' + self.esc(p['%CPU'] || '0') + '</td>';
					h += '<td>' + self.esc(p['%MEM'] || '0') + '</td>';
					h += '<td>' + self.esc(p.COMMAND || '?') + '</td>';
					h += '</tr>';
				}
				h += '</tbody></table></div>';
				el.innerHTML = h;
			}).catch(function(e) { self.setError(c, e); });
		}, 5000);
	},

	statusLogs: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">SYSTEM LOG</div>' +
			'<div style="margin-bottom:10px"><button class="cmk-btn" id="log-refresh">REFRESH</button> ' +
			'<select id="log-priority" class="cmk-input" style="width:auto;display:inline"><option value="">ALL</option><option value="-e">ERROR</option><option value="-l notice">NOTICE</option></select></div>' +
			'<pre id="log-content" class="cmk-log">Loading...</pre></div>';
		function loadLog() {
			var prio = document.getElementById('log-priority');
			var args = ['-l', '200'];
			if (prio && prio.value) args = prio.value.split(' ').concat(args);
			self.rpc('file', 'exec', { command: '/sbin/logread', params: args }).then(function(data) {
				var el = document.getElementById('log-content');
				if (!el) return;
				el.textContent = (data && data.stdout) ? data.stdout : 'No log data';
			}).catch(function(e) {
				var el2 = document.getElementById('log-content');
				if (el2) el2.textContent = 'Error: ' + e;
			});
		}
		var btn = document.getElementById('log-refresh');
		if (btn) btn.onclick = loadLog;
		var prio = document.getElementById('log-priority');
		if (prio) prio.onchange = loadLog;
		loadLog();
	},

	// ============================================================
	// NETWORK PAGES
	// ============================================================

	renderNetwork: function(c, sub) {
		var self = this;
		switch (sub) {
			case 'interfaces': self.netInterfaces(c); break;
			case 'firewall': self.netFirewall(c); break;
			case 'dhcp': self.netDHCP(c); break;
			case 'clients': self.netClients(c); break;
			case 'routes': self.netRoutes(c); break;
			case 'diag': self.netDiag(c); break;
			default: self.netInterfaces(c);
		}
	},

	netInterfaces: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">NETWORK INTERFACES</div><div id="net-ifaces"><div class="cmk-loading">LOADING</div></div></div>' +
			'<div class="cmk-panel"><div class="cmk-panel-title">NETWORK DEVICES</div><div id="net-devs"><div class="cmk-loading">LOADING</div></div></div>';
		Promise.all([
			self.rpc('network.interface', 'dump'),
			self.rpc('luci-rpc', 'getNetworkDevices')
		]).then(function(r) {
			var ifaces = (r[0] && r[0].interface) || [];
			var devs = r[1] || {};
			var el = document.getElementById('net-ifaces');
			if (el) {
				var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
				h += '<th>NAME</th><th>PROTO</th><th>IP</th><th>NETMASK</th><th>GATEWAY</th><th>DNS</th><th>DEVICE</th><th>UPTIME</th><th>STATUS</th>';
				h += '</tr></thead><tbody>';
				for (var i = 0; i < ifaces.length; i++) {
					var ifc = ifaces[i];
					var ip = ifc['ipv4-address'] && ifc['ipv4-address'][0] ? ifc['ipv4-address'][0].address : 'N/A';
					var mask = ifc['ipv4-address'] && ifc['ipv4-address'][0] ? ifc['ipv4-address'][0]['mask'] || '24' : '';
					var gw = ifc.route && ifc.route[0] ? ifc.route[0].target : 'N/A';
					var dns = ifc['dns-server'] ? ifc['dns-server'].join(', ') : 'N/A';
					var ut = ifc.uptime || 0;
					var utStr = ut > 86400 ? Math.floor(ut/86400) + 'd' : ut > 3600 ? Math.floor(ut/3600) + 'h' : Math.floor(ut/60) + 'm';
					h += '<tr>';
					h += '<td><strong>' + self.esc(ifc.interface || '?') + '</strong></td>';
					h += '<td>' + self.esc(ifc.proto || 'none') + '</td>';
					h += '<td>' + self.esc(ip) + '</td>';
					h += '<td>' + self.esc(String(mask)) + '</td>';
					h += '<td>' + self.esc(gw) + '</td>';
					h += '<td>' + self.esc(dns) + '</td>';
					h += '<td>' + self.esc(ifc.l3_device || '-') + '</td>';
					h += '<td>' + utStr + '</td>';
					h += '<td class="' + (ifc.up ? 'cmk-val-up' : 'cmk-val-down') + '">' + (ifc.up ? 'UP' : 'DOWN') + '</td>';
					h += '</tr>';
				}
				h += '</tbody></table></div>';
				el.innerHTML = h;
			}
			var el2 = document.getElementById('net-devs');
			if (el2) {
				var h2 = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
				h2 += '<th>DEVICE</th><th>MAC</th><th>RX BYTES</th><th>TX BYTES</th><th>RX PKTS</th><th>TX PKTS</th><th>SPEED</th><th>LINK</th>';
				h2 += '</tr></thead><tbody>';
				for (var name in devs) {
					var d = devs[name];
					var stats = d.stats || {};
					h2 += '<tr>';
					h2 += '<td><strong>' + self.esc(name) + '</strong></td>';
					h2 += '<td>' + self.esc(d.mac || '-') + '</td>';
					h2 += '<td>' + self.fmtBytes(stats.rx_bytes || 0) + '</td>';
					h2 += '<td>' + self.fmtBytes(stats.tx_bytes || 0) + '</td>';
					h2 += '<td>' + (stats.rx_packets || 0) + '</td>';
					h2 += '<td>' + (stats.tx_packets || 0) + '</td>';
					h2 += '<td>' + (d.link && d.link.speed ? d.link.speed + ' Mb/s' : '-') + '</td>';
					h2 += '<td class="' + (d.link && d.link.carrier ? 'cmk-val-up' : 'cmk-val-down') + '">' + (d.link && d.link.carrier ? 'UP' : 'DOWN') + '</td>';
					h2 += '</tr>';
				}
				h2 += '</tbody></table></div>';
				el2.innerHTML = h2;
			}
		}).catch(function(e) { self.setError(c, e); });
	},

	netFirewall: function(c) {
		var self = this;
		Promise.all([
			self.uci('firewall', 'get'),
			self.uci('firewall', 'get', { type: 'zone' }),
			self.uci('firewall', 'get', { type: 'forwarding' }),
			self.uci('firewall', 'get', { type: 'rule' }),
			self.uci('firewall', 'get', { type: 'redirect' })
		]).then(function(r) {
			var zones = r[1] ? Object.keys(r[1]) : [];
			var forwards = r[2] ? Object.keys(r[2]) : [];
			var rules = r[3] ? Object.keys(r[3]) : [];
			var redirects = r[4] ? Object.keys(r[4]) : [];

			var h = '<div class="cmk-panel"><div class="cmk-panel-title">FIREWALL ZONES</div>';
			h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr><th>ZONE</th><th>INPUT</th><th>OUTPUT</th><th>FORWARD</th><th>SOURCES</th><th>DESTINATIONS</th></tr></thead><tbody>';
			if (r[1]) {
				for (var zk in r[1]) {
					var z = r[1][zk];
					h += '<tr><td><strong>' + self.esc(zk) + '</strong></td>';
					h += '<td>' + self.esc(z.input || '?') + '</td>';
					h += '<td>' + self.esc(z.output || '?') + '</td>';
					h += '<td>' + self.esc(z.forward || '?') + '</td>';
					h += '<td>' + self.esc((z.network || []).join(', ') || '-') + '</td>';
					h += '<td>' + self.esc((z.device || []).join(', ') || '-') + '</td></tr>';
				}
			}
			h += '</tbody></table></div></div>';

			if (redirects.length > 0) {
				h += '<div class="cmk-panel"><div class="cmk-panel-title">PORT FORWARDS (' + redirects.length + ')</div>';
				h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr><th>NAME</th><th>SRC ZONE</th><th>EXT PORT</th><th>DEST IP</th><th>INT PORT</th><th>PROTO</th></tr></thead><tbody>';
				if (r[4]) {
					for (var rk in r[4]) {
						var rd = r[4][rk];
						h += '<tr><td>' + self.esc(rd.name || rk) + '</td>';
						h += '<td>' + self.esc(rd.src || '?') + '</td>';
						h += '<td>' + self.esc(rd.src_dport || '?') + '</td>';
						h += '<td>' + self.esc(rd.dest_ip || '?') + '</td>';
						h += '<td>' + self.esc(rd.dest_port || '?') + '</td>';
						h += '<td>' + self.esc(rd.proto || 'tcpudp') + '</td></tr>';
					}
				}
				h += '</tbody></table></div></div>';
			}

			if (rules.length > 0) {
				h += '<div class="cmk-panel"><div class="cmk-panel-title">TRAFFIC RULES (' + rules.length + ')</div>';
				h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr><th>NAME</th><th>SRC ZONE</th><th>DST ZONE</th><th>PROTO</th><th>PORT</th><th>ACTION</th><th>ENABLED</th></tr></thead><tbody>';
				if (r[3]) {
					for (var rk2 in r[3]) {
						var rl = r[3][rk2];
						h += '<tr><td>' + self.esc(rl.name || rk2) + '</td>';
						h += '<td>' + self.esc(rl.src || '*') + '</td>';
						h += '<td>' + self.esc(rl.dest || '*') + '</td>';
						h += '<td>' + self.esc(rl.proto || '*') + '</td>';
						h += '<td>' + self.esc(rl.dest_port || rl.src_port || '*') + '</td>';
						h += '<td>' + self.esc(rl.target || '?') + '</td>';
						h += '<td>' + (rl.enabled !== '0' ? 'YES' : 'NO') + '</td></tr>';
					}
				}
				h += '</tbody></table></div></div>';
			}

			c.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	netDHCP: function(c) {
		var self = this;
		Promise.all([
			self.uci('dhcp', 'get'),
			self.rpc('luci-rpc', 'getDHCPLeases')
		]).then(function(r) {
			var cfg = r[0] || {};
			var leases = (r[1] && r[1].dhcp_leases) || [];

			var h = '<div class="cmk-panel"><div class="cmk-panel-title">DHCP LEASES (' + leases.length + ')</div>';
			h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
			h += '<th>HOSTNAME</th><th>IP</th><th>MAC</th><th>DUID</th><th>LEASE TIME</th>';
			h += '</tr></thead><tbody>';
			for (var i = 0; i < leases.length; i++) {
				var l = leases[i];
				var rem = l.lease_time || 0;
				h += '<tr><td>' + self.esc(l.hostname || '?') + '</td>';
				h += '<td>' + self.esc(l.ipaddr || '?') + '</td>';
				h += '<td>' + self.esc(l.macaddr || '?') + '</td>';
				h += '<td>' + self.esc(l.duid || '-') + '</td>';
				h += '<td>' + Math.floor(rem/3600) + 'h ' + Math.floor((rem%3600)/60) + 'm</td></tr>';
			}
			h += '</tbody></table></div></div>';

			h += '<div class="cmk-panel"><div class="cmk-panel-title">DHCP/DNS CONFIG</div>';
			h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr><th>CONFIG</th><th>OPTION</th><th>VALUE</th></tr></thead><tbody>';
			for (var sec in cfg) {
				if (typeof cfg[sec] === 'object' && !Array.isArray(cfg[sec])) {
					for (var key in cfg[sec]) {
						if (key === '.type' || key === '.name') continue;
						h += '<tr><td>' + self.esc(sec) + '</td><td>' + self.esc(key) + '</td>';
						h += '<td>' + self.esc(self.fmtVal(cfg[sec][key])) + '</td></tr>';
					}
				}
			}
			h += '</tbody></table></div></div>';

			c.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	netClients: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">LAN CLIENTS</div><div id="clients-box"><div class="cmk-loading">SCANNING</div></div></div>';
		fetch('/cgi-bin/luci/admin/cybermiku/api/clients', { credentials: 'same-origin' })
			.then(function(r) { return r.json(); })
			.then(function(list) {
				var box = document.getElementById('clients-box');
				if (!box) return;
				var dhcpN = 0, stN = 0, onN = 0;
				for (var i = 0; i < list.length; i++) {
					if (list[i].online) onN++;
					if (list[i].source === 'dhcp') dhcpN++; else stN++;
				}
				var h = '<div class="cmk-grid cols-2">';
				h += self.statCard('DHCP LEASES', String(dhcpN));
				h += self.statCard('STATIC NEIGHBORS', String(stN));
				h += '</div>';
				h += '<div class="cmk-table-wrap" style="margin-top:14px"><table class="cmk-table"><thead><tr>';
				h += '<th></th><th>TYPE</th><th>HOSTNAME</th><th>IP</th><th>MAC</th><th>LEASE</th>';
				h += '</tr></thead><tbody>';
				for (var j = 0; j < list.length; j++) {
					var cl = list[j];
					h += '<tr><td><span class="cmk-badge ' + (cl.online ? 'cmk-badge-on' : 'cmk-badge-off') + '">' + (cl.online ? 'ONLINE' : 'OFF') + '</span></td>';
					h += '<td><span class="cmk-badge ' + (cl.source === 'dhcp' ? 'cmk-badge-dhcp' : 'cmk-badge-static') + '">' + (cl.source === 'dhcp' ? 'DHCP' : 'STATIC') + '</span></td>';
					h += '<td>' + self.esc(cl.name || '—') + '</td>';
					h += '<td>' + self.esc(cl.ip || '?') + '</td>';
					h += '<td>' + self.esc(cl.mac || '?') + '</td>';
					if (cl.source === 'dhcp') {
						var rem = cl.remaining || 0;
						h += '<td>' + Math.floor(rem / 3600) + 'h ' + Math.floor((rem % 3600) / 60) + 'm</td>';
					} else {
						h += '<td>—</td>';
					}
					h += '</tr>';
				}
				h += '</tbody></table></div>';
				h += '<p class="cmk-note">DHCP = DYNAMIC LEASES. STATIC = LIVE ARP NEIGHBORS WITHOUT A LEASE (FIXED IP CLIENTS). ONLINE = PRESENT IN ARP RIGHT NOW. TOTAL ONLINE: ' + onN + '</p>';
				box.innerHTML = h;
			})
			.catch(function(e) {
				var box = document.getElementById('clients-box');
				if (box) box.innerHTML = '<div class="cmk-alert cmk-alert-warn">ERROR: ' + self.esc(e.message || e) + '</div>';
			});
	},

	netRoutes: function(c) {
		var self = this;
		self.rpc('network.interface', 'dump').then(function(net) {
			var ifaces = (net && net.interface) || [];
			var h = '<div class="cmk-panel"><div class="cmk-panel-title">ROUTING TABLE</div>';
			h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
			h += '<th>DESTINATION</th><th>GATEWAY</th><th>NETMASK</th><th>METRIC</th><th>INTERFACE</th>';
			h += '</tr></thead><tbody>';
			for (var i = 0; i < ifaces.length; i++) {
				var routes = ifaces[i].route || [];
				for (var j = 0; j < routes.length; j++) {
					var rt = routes[j];
					h += '<tr>';
					h += '<td>' + self.esc(rt.target || '0.0.0.0') + '</td>';
					h += '<td>' + self.esc(rt.gateway || '0.0.0.0') + '</td>';
					h += '<td>' + self.esc(rt.netmask || '255.255.255.255') + '</td>';
					h += '<td>' + (rt.metric || 0) + '</td>';
					h += '<td>' + self.esc(ifaces[i].interface || '?') + '</td>';
					h += '</tr>';
				}
			}
			h += '</tbody></table></div></div>';
			c.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	netDiag: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">NETWORK DIAGNOSTICS</div>' +
			'<div style="margin-bottom:10px">' +
			'<input type="text" id="diag-host" class="cmk-input" placeholder="Host or IP" value="8.8.8.8" style="width:200px;display:inline"> ' +
			'<button class="cmk-btn" id="diag-ping-btn">PING</button> ' +
			'<button class="cmk-btn" id="diag-ns-btn">NSLOOKUP</button> ' +
			'<button class="cmk-btn" id="diag-tr-btn">TRACEROUTE</button>' +
			'</div>' +
			'<pre id="diag-result" class="cmk-log">Enter a host and click a button</pre></div>';
		var diagPaths = { ping: '/bin/ping', nslookup: '/usr/bin/nslookup', traceroute: '/bin/traceroute' };
		function runDiag(cmd) {
			var host = document.getElementById('diag-host').value;
			if (!host) return;
			var el = document.getElementById('diag-result');
			if (el) el.textContent = 'Running ' + cmd + ' ' + host + '...';
			var fullCmd = diagPaths[cmd] || cmd;
			var args;
			if (cmd === 'nslookup') args = [host];
			else if (cmd === 'traceroute') args = ['-m', '15', host];
			else args = ['-c', '10', host];
			self.rpc('file', 'exec', { command: fullCmd, params: args }).then(function(res) {
				if (el) el.textContent = (res.stdout || '') + (res.stderr || '');
			}).catch(function(e) {
				if (el) el.textContent = 'Error: ' + e;
			});
		}
		var pb = document.getElementById('diag-ping-btn');
		if (pb) pb.onclick = function() { runDiag('ping'); };
		var nb = document.getElementById('diag-ns-btn');
		if (nb) nb.onclick = function() { runDiag('nslookup'); };
		var tb = document.getElementById('diag-tr-btn');
		if (tb) tb.onclick = function() { runDiag('traceroute'); };
	},

	// ============================================================
	// WIRELESS PAGES
	// ============================================================

	renderWireless: function(c, sub) {
		var self = this;
		switch (sub) {
			case 'overview': self.wifiOverview(c); break;
			case 'clients': self.wifiClients(c); break;
			case 'scan': self.wifiScan(c); break;
			case 'repeater': self.wifiRepeater(c); break;
			case 'config': self.wifiConfig(c); break;
			default: self.wifiOverview(c);
		}
	},

	wifiOverview: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">WIRELESS RADIOS</div><div id="wifi-radios"><div class="cmk-loading">LOADING</div></div></div>';
		Promise.all([
			self.rpc('network.wireless', 'status'),
			self.rpc('luci-rpc', 'getWirelessDevices')
		]).then(function(r) {
			var wifi = r[0], wdevs = r[1];
			var el = document.getElementById('wifi-radios');
			if (!el) return;
			var radios = [];
			for (var radioName in wifi) {
				if (wifi[radioName] && wifi[radioName].interfaces) {
					radios.push({ name: radioName, data: wifi[radioName] });
				}
			}
			if (!radios.length) {
				el.innerHTML = '<div class="cmk-loading">NO WIRELESS INTERFACES</div>';
				return;
			}
			var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
			h += '<th>INTERFACE</th><th>SSID</th><th>MODE</th><th>CHANNEL</th><th>FREQ</th><th>TXPOWER</th><th>CLIENTS</th><th>STATUS</th>';
			h += '</tr></thead><tbody>';
			for (var i = 0; i < radios.length; i++) {
				var radioName = radios[i].name;
				var r = radios[i].data;
				var info = wdevs && wdevs[radioName] ? wdevs[radioName] : {};
				var ifaces = r.interfaces || [];
				for (var j = 0; j < ifaces.length; j++) {
					var w = ifaces[j];
					var cfg = w.config || {};
					var stationCount = (w.stations && w.stations.length) || 0;
					h += '<tr>';
					h += '<td><strong>' + self.esc(w.ifname || '?') + '</strong></td>';
					h += '<td>' + self.esc(cfg.ssid || '?') + '</td>';
					h += '<td>' + self.esc(info.mode || cfg.mode || '?') + '</td>';
					h += '<td>' + (r.config ? r.config.channel : (info.channel || '?')) + '</td>';
					h += '<td>' + (info.frequency ? info.frequency + ' MHz' : '?') + '</td>';
					h += '<td>' + (info.txpower ? info.txpower + ' dBm' : '?') + '</td>';
					h += '<td>' + stationCount + '</td>';
					h += '<td class="' + (r.up ? 'cmk-val-up' : 'cmk-val-down') + '">' + (r.up ? 'UP' : 'DOWN') + '</td>';
					h += '</tr>';
				}
			}
			h += '</tbody></table></div>';
			el.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	wifiClients: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">CONNECTED WIFI CLIENTS</div><div id="wifi-clients"><div class="cmk-loading">LOADING</div></div></div>';
		self.rpc('network.wireless', 'status').then(function(wifi) {
			var el = document.getElementById('wifi-clients');
			if (!el) return;
			var ifnames = [];
			for (var radioName in wifi) {
				if (wifi[radioName] && wifi[radioName].interfaces) {
					var ifaces = wifi[radioName].interfaces;
					for (var i = 0; i < ifaces.length; i++) {
						if (ifaces[i].ifname) ifnames.push(ifaces[i].ifname);
					}
				}
			}
			if (!ifnames.length) { el.innerHTML = '<div class="cmk-loading">NO WIFI</div>'; return; }

			var proms = [];
			for (var i = 0; i < ifnames.length; i++) {
				proms.push(self.rpc('hostapd.' + ifnames[i], 'get_clients').then(function(clients, ifn) {
					return { iface: ifn, clients: clients };
				}.bind(null, ifnames[i])).catch(function(ifn) {
					return { iface: ifn, clients: null };
				}.bind(null, ifnames[i])));
			}
			return Promise.all(proms).then(function(results) {
				var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
				h += '<th>IFACE</th><th>MAC</th><th>HOSTNAME</th><th>IP</th><th>RSSI</th><th>RX/TX</th><th>CONNECTED</th>';
				h += '</tr></thead><tbody>';
				var totalClients = 0;
				for (var j = 0; j < results.length; j++) {
					var cl = results[j];
					if (!cl.clients || !cl.clients.clients) continue;
					var clients = cl.clients.clients;
					for (var mac in clients) {
						totalClients++;
						var ci = clients[mac];
						h += '<tr>';
						h += '<td>' + self.esc(cl.iface) + '</td>';
						h += '<td>' + self.esc(mac) + '</td>';
						h += '<td>' + self.esc(ci.hostname || '-') + '</td>';
						h += '<td>' + self.esc(ci.ip || '-') + '</td>';
						h += '<td>' + (ci.signal || ci.ssignal || '-') + ' dBm</td>';
						h += '<td>' + self.fmtBytes(ci.rx_bytes || 0) + ' / ' + self.fmtBytes(ci.tx_bytes || 0) + '</td>';
						h += '<td>' + (ci.connected_time || '-') + 's</td>';
						h += '</tr>';
					}
				}
				h += '</tbody></table></div>';
				if (totalClients === 0) h = '<div class="cmk-loading">NO CLIENTS CONNECTED</div>';
				el.innerHTML = h;
			});
		}).catch(function(e) { self.setError(c, e); });
	},

	wifiRepeater: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">WIFI REPEATER / EXTENDER</div>' +
			'<div id="repeater-status"><div class="cmk-loading">LOADING STATUS</div></div></div>' +
			'<div class="cmk-panel"><div class="cmk-panel-title">CONNECT TO REMOTE WIFI</div>' +
			'<div id="repeater-setup"></div></div>' +
			'<div class="cmk-panel"><div class="cmk-panel-title">LOCAL AP CONFIGURATION</div>' +
			'<div id="repeater-ap"></div></div>' +
			'<div class="cmk-panel"><div class="cmk-panel-title">DNS OVERRIDE</div>' +
			'<div id="repeater-dns"></div></div>';

		var POLL_MS = 3000;
		var POLL_CONNECTED_MS = 15000;
		var ASSOC_GRACE_MS = 30000;
		var AUTH_WINDOW_MS = 300000;
		var NOTFOUND_SCAN_MS = 20000;
		var LOCAL_DOWN_GRACE_MS = 20000;
		var repState = {
			cfgSince: Date.now(), assocSince: 0, upDownAt: Date.now(), dropAt: 0,
			localDownAt: 0,
			authAt: 0, logAt: 0, scanAt: 0, scanning: false,
			lastUp: null, lastState: '', ssidMissing: false,
			cfgP: false, staSSID: '', staIfname: '', wwanIp: '', remoteNote: '',
			cfgBuf: null, pollSeq: (self.repState && self.repState.pollSeq) || 0
		};
		self.repState = repState;
		var pws = {};
		var pwsLoad = function() {
			return self.rpc('file', 'exec', { command: '/bin/cat', params: ['/etc/cybermiku.json'] }).then(function(res) {
				var s = (res && res.stdout) ? res.stdout : (typeof res === 'string' ? res : '');
				var o = null;
				try { o = JSON.parse(s); } catch (e) { o = null; }
				if (o && typeof o === 'object' && !Array.isArray(o)) {
					for (var k in o) if (o[k] != null) pws[k] = o[k];
				}
				return pws;
			}).catch(function() { return pws; });
		};
		var pwsSave = function() {
			try {
				var body = JSON.stringify(pws);
				var sh = "umask 077; cat > /etc/cybermiku.json <<'CMKEOF'\n" + body + "\nCMKEOF\n";
				return self.rpc('file', 'exec', { command: '/bin/sh', params: ['-c', sh] }).catch(function() { return null; });
			} catch (e) { return null; }
		};
		var st = null;
		var readWifiTail = function() {
			return self._pTimeout(self.rpc('file', 'exec', { command: '/sbin/logread', params: [] }), 8000).then(function(res) {
				var s = (res && res.stdout) ? res.stdout : (typeof res === 'string' ? res : '');
				var lines = s.split('\n').filter(function(l) {
					return /wpa|eapol|auth|assoc|hostapd|netifd|wwan|wireless|udhcpc|dhcp/i.test(l);
				});
				return lines.slice(-60).join('\n');
			}).catch(function() { return ''; });
		};
		var detectAuthFail = function() {
			var now = Date.now();
			if (now - repState.logAt < 4000) return Promise.resolve(now - repState.authAt < AUTH_WINDOW_MS);
			repState.logAt = now;
			return readWifiTail().then(function(tail) {
				var okRe = /CTRL-EVENT-CONNECTED|Key negotiation completed/gi;
				var failRe = /4-Way Handshake failed|4-way handshake failed|WRONG_KEY|WRONG_PASSWORD|AUTH_FAILED|AUTHENTICATION_FAILED|wrong password|pre-shared key may be incorrect|key may be incorrect|password.*incorrect|incorrect.*password|MIC failure|MIC mismatch|EAPOL.*fail|SSID-TEMP-DISABLED|TEMP-DISABLED|auth_failures/gi;
				var lastOk = -1, lastFail = -1, m;
				while ((m = okRe.exec(tail)) !== null) lastOk = okRe.lastIndex;
				while ((m = failRe.exec(tail)) !== null) lastFail = failRe.lastIndex;
				// the most recent handshake outcome decides: success clears, failure marks authAt
				if (lastOk > lastFail) repState.authAt = 0;
				else if (lastFail >= 0) repState.authAt = now;
				return (now - repState.authAt < AUTH_WINDOW_MS);
			}).catch(function() { return (now - repState.authAt < AUTH_WINDOW_MS); });
		};
		var scanMiss = function(ssid) {
			var now = Date.now();
			if (now - repState.scanAt < NOTFOUND_SCAN_MS) return Promise.resolve(repState.ssidMissing);
			if (repState.scanning) return Promise.resolve(repState.ssidMissing);
			repState.scanning = true;
			return self._pTimeout(self.rpc('iwinfo', 'scan', { device: 'phy0' }), 10000).then(function(data) {
				repState.scanAt = now;
				var results = (data && data.results) ? data.results : (Array.isArray(data) ? data : []);
				var found = false;
				for (var i = 0; i < results.length; i++) {
					if (String(results[i].ssid || '') === ssid) { found = true; break; }
					if (String(results[i].ssid || '') === '' && results[i].encryption && results[i].encryption.enabled) { found = true; }
				}
				repState.ssidMissing = !found;
				return !found;
			}).catch(function() { repState.scanAt = now; return false; }).then(function(miss) {
				repState.scanning = false;
				return miss;
			});
		};
		var paint = function(state, cls) {
			if (!st) return;
			var grid = st.querySelector('.cmk-grid');
			if (!grid) {
				var repH = '';
				repH += '<div class="cmk-grid">';
				repH += self.statCard('STATUS', state, cls);
				repH += self.statCard('REMOTE SSID', repState.cfgP ? self.esc(repState.staSSID) : 'None');
				repH += self.statCard('REMOTE IFACE', repState.cfgP ? self.esc(repState.staIfname || '-') : '-');
				repH += self.statCard('REMOTE IP', repState.wwanIp || '-');
				repH += '</div>';
				repH += '<p class="cmk-rep-note" style="color:var(--text-dim);margin-top:15px;font-size:0.8rem">' +
					self.esc(self.repNote(state)) + '</p>';
				repH += '<div style="margin-top:15px"><button class="cmk-btn" id="repeater-disconnect" style="border-color:var(--danger);color:var(--danger)"' + (state === 'DISCONNECTED' ? ' disabled' : '') + '>DISCONNECT &amp; STOP REPEATER</button></div>';
				st.innerHTML = repH;
				var disco = document.getElementById('repeater-disconnect');
				if (disco) { disco.onclick = function() { self.repeaterDisconnect(); }; disco.disabled = (state === 'DISCONNECTED'); }
				return;
			}
			var vals = grid.querySelectorAll('.cmk-stat-value');
			if (vals[0]) { vals[0].textContent = state; vals[0].className = 'cmk-stat-value ' + cls; }
			if (vals[1]) vals[1].textContent = repState.cfgP ? String(repState.staSSID) : 'None';
			if (vals[2]) vals[2].textContent = repState.cfgP ? String(repState.staIfname || '-') : '-';
			if (vals[3]) vals[3].textContent = repState.wwanIp || '-';
			var note = st.querySelector('.cmk-rep-note');
			if (note) note.textContent = this.repNote(state);
			var disco = st.querySelector('#repeater-disconnect');
			if (disco) disco.disabled = (state === 'DISCONNECTED');
			if (state !== 'CONNECTING') {
				var cmsg = document.getElementById('rep-connect-msg');
				if (cmsg && cmsg.firstChild && cmsg.firstChild.className === 'cmk-loading') cmsg.innerHTML = '';
			}
		};
		var loadStatus = function() {
			st = st || document.getElementById('repeater-status');
			if (!st) return;
			repState.pollSeq = (repState.pollSeq || 0) + 1;
			var seq = repState.pollSeq;
			return self._pTimeout(Promise.all([
				self.rpc('network.wireless', 'status', {}).catch(function() { return {}; }),
				self.uci('wireless', 'get').catch(function() { return {}; }),
				self.uci('network', 'get').catch(function() { return {}; }),
				self.rpc('network.interface', 'dump', {}).catch(function() { return []; })
			]), 10000).then(function(r) {
				var ws = r[0] || {}, wcfg = r[1] || {};
				repState.remoteNote = '';
				var staIface = null, staSSID = '', staIfname = '', staDisabled = false, radioUp = true;
				for (var rn in ws) {
					var radio = ws[rn];
					if (!radio || !radio.interfaces) continue;
					for (var i = 0; i < radio.interfaces.length; i++) {
						var itf = radio.interfaces[i];
						var cfg = itf.config || {};
						if (cfg.mode === 'sta' || itf.mode === 'sta') {
							staIface = itf;
							staSSID = cfg.ssid || itf.ssid || '?';
							staIfname = itf.ifname || '';
							radioUp = (radio.up === false) ? false : true;
							staDisabled = cfg.disabled === '1' || itf.disabled === true;
						}
					}
				}
				var cfgP = false;
				for (var sec in wcfg) {
					if (wcfg[sec] && wcfg[sec].mode === 'sta') { cfgP = true; break; }
				}
				// pre-populate pws from UCI so the web UI knows passwords for configured networks
				for (var sec2 in wcfg) {
					if (wcfg[sec2] && wcfg[sec2].mode === 'sta' && wcfg[sec2].ssid && wcfg[sec2].key) {
						if (pws[wcfg[sec2].ssid] !== wcfg[sec2].key) {
							pws[wcfg[sec2].ssid] = wcfg[sec2].key;
							try { pwsSave(); } catch (e) { }
						}
					}
				}
				var cfgBuf = repState.cfgBuf;
				if (cfgBuf && (Date.now() - cfgBuf.at > 120000)) { repState.cfgBuf = null; cfgBuf = null; }
				if (cfgBuf && !cfgP && (Date.now() - cfgBuf.at > 30000)) { repState.cfgBuf = null; cfgBuf = null; }
				if (cfgBuf) cfgP = true;
				repState.cfgP = cfgP;
				repState.staSSID = cfgBuf ? cfgBuf.ssid : (staSSID || '?');
				repState.staIfname = staIfname || '';
				var livePromise = Promise.resolve({ assoc: false });
				if (staIface && staIfname) {
					livePromise = self._pTimeout(self.rpc('iwinfo', 'info', { device: staIfname }), 10000).then(function(inf) {
						var row = (inf && typeof inf === 'object') ? inf : null;
						if (!row) return { assoc: false };
						var ap = String(row.bssid || row.accesspoint || '');
						if (!/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(ap) || ap === '00:00:00:00:00:00') return { assoc: false };
						var ssid = String(row.ssid || row.essid || '');
						var sig = row.signal == null ? '' : String(row.signal);
						if (/unknown|none|n\/a|^$/i.test(ssid)) return { assoc: false };
						if (/unknown|n\/a|^$/i.test(sig)) return { assoc: false };
						return { assoc: true, sig: sig, ap: ap, ssid: ssid };
					}).catch(function() { return { assoc: false }; });
				}
				return livePromise.then(function(live) {
					var wwanIp = '';
					var dumps = (r[3] && r[3].interface) ? r[3].interface : (Array.isArray(r[3]) ? r[3] : []);
					dumps.forEach(function(it) {
						var addrs = (it && (it['ipv4-address'] || it.ipv4_address)) || [];
						if (it && addrs.length && (it.interface === 'wwan' || it.l3_device === repState.staIfname)) {
							wwanIp = addrs[0].address || '';
						}
					});
repState.wwanIp = wwanIp;
					var now = Date.now();
					var wasConnected = (repState.lastState === 'CONNECTED');
					var staUp = (staIface && staIface.up === false) ? false : true;
					var cfgBuf = repState.cfgBuf;
					if (cfgBuf) staUp = true;
					if (wasConnected && (staDisabled || !cfgP || !radioUp || !staUp || !live.assoc || !wwanIp)) {
						if (!repState.dropAt) repState.dropAt = now;
					} else {
						repState.dropAt = 0;
					}
					// after a user-initiated connect we must not paint CONNECTED from the OLD
					// session's still-valid lease. As soon as the old link is really broken
					// (no association) or the live SSID is unknown, the transition is genuine.
					if (repState.ignoreStale && (!live.assoc || !String(live.ssid || ''))) {
						repState.ignoreStale = false;
					}
					// while we were already CONNECTED and now a live session exists, never claim
					// CONNECTED if it is the dead weight of the PREVIOUS network (the new link has
					// not really established yet) or an unknown SSID
					if (repState.ignoreStale && live.assoc && live.ssid === repState.staSSID) {
						repState.ignoreStale = false;
					}
					if (cfgBuf) {
						// user-initiated connect is in flight - show target SSID and never degrade below CONNECTING
						repState.lastState = 'CONNECTING';
						if (repState.wwanIp && (!live.assoc || !live.ssid || String(live.ssid) !== repState.staSSID)) {
							repState.wwanIp = '';
						}
						paint.call(self, 'CONNECTING', 'cmk-val-mid');
						if (!live.assoc) {
							repState.assocSince = 0;
							repState.lastState = 'CONNECTING';
							// association has not (yet) happened. A wrong password disables the SSID
							// (TEMP-DISABLED) between failed handshakes, so detect it from the log
							// EVEN while disassociated.
							scanMiss(repState.staSSID || '').then(function(miss) {
								if (seq !== repState.pollSeq || repState.lastState !== 'CONNECTING') return;
								if (miss) {
									repState.lastState = 'NOT FOUND';
									repState.remoteNote = 'remote network not found in range';
									repState.cfgBuf = null;
									paint.call(self, 'NOT FOUND', 'cmk-val-mid');
									return;
								}
								detectAuthFail().then(function(authErr) {
									if (seq !== repState.pollSeq) return;
									if (authErr && repState.lastState === 'CONNECTING') {
										repState.lastState = 'AUTH ERROR';
										repState.remoteNote = 'authentication rejected by remote AP (wrong password?)';
										repState.cfgBuf = null;
										paint.call(self, 'AUTH ERROR', 'cmk-val-down');
									}
								});
							});
							return;
						}
						var liveSsid = String(live.ssid || '');
						if (liveSsid !== repState.staSSID) {
							// still associated to the OLD network while switching (or the current
							// SSID is unknown): the old session is being torn down - flush its IP
							// and never claim CONNECTED to a connection that is not the target
							repState.wwanIp = '';
							repState.assocSince = 0;
							paint.call(self, 'CONNECTING', 'cmk-val-mid');
							return;
						}
						if (!repState.assocSince) repState.assocSince = now;
						if (wwanIp) {
							// a stale IP from the previous session while the new link is being set up
							if (repState.ignoreStale) {
								repState.wwanIp = '';
								repState.assocSince = 0;
								paint.call(self, 'CONNECTING', 'cmk-val-mid');
								return;
							}
							repState.lastState = 'CONNECTED';
							repState.remoteNote = '';
							repState.cfgBuf = null;
							repState.assocSince = 0;
							paint.call(self, 'CONNECTED', 'cmk-val-up');
							return;
						}
						// associated to target but no IP: a wrong password fails the 4-way handshake AFTER association
						detectAuthFail().then(function(authErr) {
							if (seq !== repState.pollSeq) return;
							if (authErr) {
								repState.lastState = 'AUTH ERROR';
								repState.remoteNote = 'authentication rejected by remote AP (wrong password?)';
								repState.cfgBuf = null;
								paint.call(self, 'AUTH ERROR', 'cmk-val-down');
								return;
							}
							if (now - repState.assocSince < ASSOC_GRACE_MS) {
								repState.lastState = 'CONNECTING';
								paint.call(self, 'CONNECTING', 'cmk-val-mid');
								return;
							}
							repState.cfgBuf = null;
							repState.lastState = 'REMOTE ERR';
							paint.call(self, 'REMOTE ERR', 'cmk-val-down');
							readWifiTail().then(function(tail) {
								if (seq !== repState.pollSeq || repState.lastState !== 'REMOTE ERR') return;
								var note = '';
								if (/No lease, failing|no lease|udhcpc.*fail|DHCP.*fail/i.test(tail)) note = 'remote DHCP has no lease';
								else if (/been deauthenticated|disassociated|AP.*rejected|denied/i.test(tail)) note = 'remote host rejected association';
								if (note) {
									repState.remoteNote = note;
									var nEl = st && st.querySelector('.cmk-rep-note');
									if (nEl) nEl.textContent = self.repNote('REMOTE ERR');
								}
							});
						});
						return;
					}
					if (staDisabled || !cfgP) {
						repState.lastState = 'DISCONNECTED';
						repState.remoteNote = '';
						repState.assocSince = 0;
						paint.call(self, 'DISCONNECTED', 'cmk-val-down');
						return;
					}
					if (radioUp && staUp) repState.localDownAt = 0;
					if (!radioUp || !staUp) {
						if (!repState.localDownAt) repState.localDownAt = now;
						var downFor = now - repState.localDownAt;
						if (wasConnected && downFor >= POLL_MS * 3) {
							repState.lastState = 'DISCONNECTED';
							repState.remoteNote = '';
							repState.assocSince = 0;
							if (typeof console !== 'undefined' && console.warn) console.warn('[cybermiku] repeater locally dropped after CONNECTED', new Error('local radio drop'));
							paint.call(self, 'DISCONNECTED', 'cmk-val-down');
							return;
						}
						if (downFor > LOCAL_DOWN_GRACE_MS) {
							repState.lastState = 'DISCONNECTED';
							repState.remoteNote = '';
							repState.assocSince = 0;
							paint.call(self, 'DISCONNECTED', 'cmk-val-down');
							return;
						}
						repState.lastState = 'CONNECTING';
						paint.call(self, 'CONNECTING', 'cmk-val-mid');
						return;
					}
					if (live.assoc) {
						var liveSsid = String(live.ssid || '');
						if (repState.ignoreStale && liveSsid === repState.staSSID) {
							repState.ignoreStale = false;
						}
						// while a new connect is inflight, block CONNECTED from the stale old lease
						if (repState.ignoreStale) {
							repState.wwanIp = '';
							repState.assocSince = 0;
							repState.lastState = 'CONNECTING';
							paint.call(self, 'CONNECTING', 'cmk-val-mid');
							return;
						}
						// associated to a different network than configured (drift): flush stale
						// IP and never report CONNECTED to a foreign session
						if (repState.staSSID && liveSsid && liveSsid !== repState.staSSID) {
							repState.wwanIp = '';
							repState.assocSince = 0;
							repState.lastState = 'CONNECTING';
							paint.call(self, 'CONNECTING', 'cmk-val-mid');
							return;
						}
						if (!repState.assocSince) repState.assocSince = now;
						if (wwanIp) {
							repState.lastState = 'CONNECTED';
							repState.remoteNote = '';
							paint.call(self, 'CONNECTED', 'cmk-val-up');
							return;
						}
						// associated but no IP: wrong password fails the 4-way handshake AFTER association
						detectAuthFail().then(function(authErr) {
							if (seq !== repState.pollSeq) return;
							if (authErr) {
								repState.lastState = 'AUTH ERROR';
								repState.remoteNote = 'authentication rejected by remote AP (wrong password?)';
								paint.call(self, 'AUTH ERROR', 'cmk-val-down');
								return;
							}
							if (now - repState.assocSince < ASSOC_GRACE_MS) {
								repState.lastState = 'CONNECTING';
								paint.call(self, 'CONNECTING', 'cmk-val-mid');
								return;
							}
							repState.lastState = 'REMOTE ERR';
							paint.call(self, 'REMOTE ERR', 'cmk-val-down');
							readWifiTail().then(function(tail) {
								if (seq !== repState.pollSeq || repState.lastState !== 'REMOTE ERR') return;
								var note = '';
								if (/No lease, failing|no lease|udhcpc.*fail|DHCP.*fail/i.test(tail)) note = 'remote DHCP has no lease';
								else if (/been deauthenticated|disassociated|AP.*rejected|denied/i.test(tail)) note = 'remote host rejected association';
								if (note) {
									repState.remoteNote = note;
									var nEl = st && st.querySelector('.cmk-rep-note');
									if (nEl) nEl.textContent = self.repNote('REMOTE ERR');
								}
							});
						});
						return;
					}
					// radio up, not associated - still attempting. Check the log first: on a wrong
					// password the failures keep recurring, so AUTH ERROR must stay on screen and
					// must not be hidden by a CONNECTING repaint every poll.
					repState.assocSince = 0;
					detectAuthFail().then(function(authErr) {
						if (seq !== repState.pollSeq) return;
						if (authErr) {
							repState.lastState = 'AUTH ERROR';
							repState.remoteNote = 'authentication rejected by remote AP (wrong password?)';
							paint.call(self, 'AUTH ERROR', 'cmk-val-down');
							return;
						}
						repState.remoteNote = '';
						return scanMiss(repState.staSSID || '').then(function(miss) {
							if (seq !== repState.pollSeq) return;
							if (miss) {
								repState.lastState = 'NOT FOUND';
								repState.remoteNote = 'remote network not found in range';
								paint.call(self, 'NOT FOUND', 'cmk-val-mid');
								return;
							}
							repState.lastState = 'CONNECTING';
							paint.call(self, 'CONNECTING', 'cmk-val-mid');
						});
					});
				});
			}).catch(function(e) {
				if (st) {
					var grid = st.querySelector('.cmk-grid');
					if (grid) {
						var nEl = st.querySelector('.cmk-rep-note');
						if (nEl) nEl.textContent = 'Status check failed (' + String(e) + ') - retrying shortly';
					} else {
						st.innerHTML = '<div class="cmk-alert cmk-alert-warn">' + self.esc(String(e)) + '</div>';
						st = null;
					}
				}
			});
		};
		var scheduleTick = function() {
			if (!self._repTimer) return;
			var iv = (repState.lastState === 'CONNECTED') ? POLL_CONNECTED_MS : POLL_MS;
			self._repTimer = setTimeout(function() {
				var ret = loadStatus();
				if (ret && typeof ret.then === 'function') ret.then(scheduleTick, scheduleTick);
				else scheduleTick();
			}, iv);
		};
		var startPolling = function() {
			stopPolling();
			self._repTimer = setTimeout(function() {
				var ret = loadStatus();
				if (ret && typeof ret.then === 'function') ret.then(scheduleTick, scheduleTick);
				else scheduleTick();
			}, 0);
		};
		var stopPolling = function() {
			if (self._repTimer) { clearTimeout(self._repTimer); self._repTimer = null; }
		};
		this.repNote = function(state) {
			var n = {
				'CONNECTED': 'Repeater is up. Clients reach the internet through the remote link.',
				'CONNECTING': 'Attempting to connect to the remote Wi-Fi network...',
				'NOT FOUND': 'Remote network "' + repState.staSSID + '" not found in range. Check the SSID.',
				'AUTH ERROR': 'Authentication was rejected by the remote access point. Check the password.',
				'REMOTE ERR': 'Remote host problem (no DHCP lease, MAC blocked, or AP refused).',
				'DISCONNECTED': 'Repeater is not configured or has been stopped.'
			}[state] || '';
			if (state === 'CONNECTING' && repState.assocSince) n = 'Associated, waiting for an IP address from the remote DHCP...';
			if (repState.remoteNote) n = repState.remoteNote;
			return n;
		};

		var loadSetup = function() {
			var se = document.getElementById('repeater-setup');
			var h2 = '<p style="color:var(--text-dim);margin-bottom:15px;font-size:0.85rem">' +
				'Scan for nearby Wi-Fi networks, select one and enter its password to use it as your remote internet source.</p>';
			h2 += '<div style="margin-bottom:15px"><button class="cmk-btn" id="rep-scan-btn">SCAN FOR NETWORKS</button></div>';
			h2 += '<div id="rep-scan-results"></div>';
			h2 += '<div id="rep-connect-form" style="margin-top:15px;border-top:1px solid rgba(0,255,255,0.15);padding-top:15px">';
			h2 += '<div class="cmk-form-row"><label>REMOTE SSID</label><input type="text" id="rep-ssid" class="cmk-input" autocomplete="off" placeholder="Type SSID or scan for networks"></div>';
			h2 += '<div class="cmk-form-row"><label>PASSWORD</label><div class="cmk-pw" style="position:relative;display:flex;align-items:center;width:100%;max-width:420px;box-sizing:border-box">' +
				'<input type="password" id="rep-key" class="cmk-input" autocomplete="off" placeholder="Network password" style="flex:1 1 auto;min-width:0;width:100%;box-sizing:border-box;padding-right:44px;max-width:420px">' +
				'<button type="button" class="cmk-eye" id="rep-eye" title="Show / hide password" aria-label="Toggle password visibility" style="position:absolute;right:6px;top:50%;width:32px;height:32px;margin:0;padding:0;transform:translateY(-50%);background:transparent;border:none;border-radius:0;box-shadow:none;color:#00ffff;cursor:pointer">' +
				'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
				'<path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"></path>' +
				'<circle cx="12" cy="12" r="3"></circle>' +
				'</svg></button></div>' +
				'<div class="cmk-caps" id="rep-caps" style="display:none;color:#00ffff">' +
				'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00ffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
				'<path d="M10.3 3.7L1.8 18.1c-.8 1.4.2 3.2 1.8 3.2h16.8c1.6 0 2.6-1.8 1.8-3.2L13.7 3.7c-.8-1.4-2.7-1.4-3.4 0z"></path>' +
				'<rect x="10.7" y="7.5" width="2.6" height="7.5" rx="1.3" fill="#00ffff" stroke="none"></rect>' +
				'<circle cx="12" cy="18" r="1.6" fill="#00ffff" stroke="none"></circle>' +
				'</svg> CAPS LOCK ACTIVE <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00ffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
				'<path d="M10.3 3.7L1.8 18.1c-.8 1.4.2 3.2 1.8 3.2h16.8c1.6 0 2.6-1.8 1.8-3.2L13.7 3.7c-.8-1.4-2.7-1.4-3.4 0z"></path>' +
				'<rect x="10.7" y="7.5" width="2.6" height="7.5" rx="1.3" fill="#00ffff" stroke="none"></rect>' +
				'<circle cx="12" cy="18" r="1.6" fill="#00ffff" stroke="none"></circle>' +
				'</svg></div></div>';
			h2 += '<div class="cmk-form-row"><label>ENCRYPTION</label><select id="rep-enc" class="cmk-input"><option value="psk2">WPA/WPA2 PSK</option><option value="none">None / Open</option></select></div>';
			h2 += '<button class="cmk-btn" id="rep-connect-btn">CONNECT</button> ';
			h2 += '<button class="cmk-btn" id="rep-cancel-btn">CLEAR</button>';
			h2 += '</div>';
			h2 += '<div id="rep-connect-msg" style="margin-top:15px"></div>';
			se.innerHTML = h2;
			var ssidEl = document.getElementById('rep-ssid');
			var keyEl = document.getElementById('rep-key');
			var eyeBtn = document.getElementById('rep-eye');
			var capsEl = document.getElementById('rep-caps');
			var fillKey = function() {
				if (!keyEl || keyEl.disabled) return;
				var s = (ssidEl && ssidEl.value) || '';
				if (s && pws[s] != null) keyEl.value = pws[s];
			};
			if (ssidEl) ssidEl.addEventListener('input', fillKey);
			if (eyeBtn && keyEl) eyeBtn.onclick = function() {
				if (keyEl.type === 'password') { keyEl.type = 'text'; eyeBtn.classList.add('cmk-eye-on'); }
				else { keyEl.type = 'password'; eyeBtn.classList.remove('cmk-eye-on'); }
			};
			var updCaps = function(ev) {
				var on = false;
				try { on = !!(ev && ev.getModifierState && ev.getModifierState('CapsLock')); } catch (e) { on = false; }
				if (on) capsLast = true;
				if (typeof capsLast === 'undefined') capsLast = false;
				if (capsEl) capsEl.style.display = (on || capsLast) ? '' : 'none';
			};
			// heuristic fallback: kbd events in a password field normally arrive lowercase
			// unless CapsLock (for a lower-case-only keystroke set) - best effort only
			var capsLast = false, capsEval = function(ev) {
				try {
					var k = ev && ev.key;
					if (typeof k !== 'string' || k.length !== 1) return;
					var isLetter = /[A-Za-z]/.test(k);
					if (!isLetter) return;
					var same = (ev.shiftKey && k === k.toUpperCase()) || (!ev.shiftKey && k === k.toLowerCase());
					if (same) { capsLast = k === k.toUpperCase(); if (capsEl) capsEl.style.display = capsLast ? '' : 'none'; }
				} catch (e) { }
			};
			if (keyEl) {
				keyEl.addEventListener('keydown', updCaps);
				keyEl.addEventListener('keyup', updCaps);
				keyEl.addEventListener('keypress', updCaps);
				keyEl.addEventListener('focus', updCaps);
				keyEl.addEventListener('click', updCaps);
				keyEl.addEventListener('keydown', capsEval);
			}
			pwsLoad();
			var scanBtn = document.getElementById('rep-scan-btn');
			if (scanBtn) scanBtn.onclick = function() {
				var res = document.getElementById('rep-scan-results');
				if (!res) return;
				scanBtn.disabled = true;
				var render = function(data) {
					scanBtn.disabled = false;
					if (!res) return;
					var results = (data && data.results) ? data.results : data;
					if (!results || !results.length) { res.innerHTML = '<div class="cmk-loading">NO NETWORKS FOUND</div>'; return; }
					var s = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
					s += '<th>SSID</th><th>CHANNEL</th><th>SIGNAL</th><th>SECURITY</th><th></th>';
					s += '</tr></thead><tbody>';
					for (var i = 0; i < results.length; i++) {
						var n = results[i];
						var enc = n.encryption || {};
						var isOpen = !enc.enabled;
						s += '<tr><td><strong>' + self.esc(n.ssid || '(hidden)') + '</strong></td>';
						s += '<td>' + (n.channel || '?') + '</td>';
						s += '<td>' + (n.signal || '?') + ' dBm</td>';
						s += '<td>' + (isOpen ? 'Open' : self.esc(self.fmtEncryption(enc))) + '</td>';
						s += '<td><button class="cmk-btn cmk-btn-sm" data-ssid="' + self.esc(n.ssid || '') + '" data-open="' + (isOpen ? '1' : '0') + '" data-enc="' + (isOpen ? 'none' : 'psk2') + '">SELECT</button></td></tr>';
					}
					s += '</tbody></table></div>';
					res.innerHTML = s;
					res.querySelectorAll('button[data-ssid]').forEach(function(btn) {
					btn.onclick = function() {
						var ssid = document.getElementById('rep-ssid');
						var enc = document.getElementById('rep-enc');
						var key = document.getElementById('rep-key');
						if (ssid) ssid.value = btn.getAttribute('data-ssid');
						if (enc) enc.value = btn.getAttribute('data-enc') || 'psk2';
						if (btn.getAttribute('data-open') === '1') {
							if (key) { key.value = ''; key.disabled = true; }
							if (enc) enc.value = 'none';
						} else {
							if (key) { key.disabled = false; key.value = ''; }
							fillKey();
						}
					};
				});
				};
				var scanOnce = function() {
					res.innerHTML = '<div class="cmk-loading">SCANNING...</div>';
					return self.rpc('iwinfo', 'scan', { device: 'phy0' }).then(function(data) {
						var results = (data && data.results) ? data.results : data;
						return (results && results.length) ? results : null;
					}).catch(function() { return null; });
				};
				scanOnce().then(function(results) {
					if (results) { render(results); return; }
					setTimeout(function() {
						scanOnce().then(function(second) { render(second); });
					}, 1500);
				});
			};
			var cancelBtn = document.getElementById('rep-cancel-btn');
			if (cancelBtn) cancelBtn.onclick = function() {
				var ssid = document.getElementById('rep-ssid');
				var key = document.getElementById('rep-key');
				if (ssid) ssid.value = '';
				if (key) key.value = '';
				var msg = document.getElementById('rep-connect-msg');
				if (msg) msg.innerHTML = '';
			};
			var connBtn = document.getElementById('rep-connect-btn');
			var connBtnEl = connBtn;
			if (keyEl) keyEl.addEventListener('keydown', function(ev) {
				if (ev.key === 'Enter' && connBtnEl && !connBtnEl.disabled) { ev.preventDefault(); connBtnEl.click(); }
			});
			if (connBtn) connBtn.onclick = function() {
				var ssid = (document.getElementById('rep-ssid') || {}).value || '';
				var enc = (document.getElementById('rep-enc') || {}).value || 'psk2';
				var keyEl = document.getElementById('rep-key');
				var key = keyEl && !keyEl.disabled ? keyEl.value : '';
				var msg = document.getElementById('rep-connect-msg');
				if (!ssid) { if (msg) msg.innerHTML = '<div class="cmk-alert cmk-alert-warn">Please select a network first</div>'; return; }
				if (enc !== 'none' && !key) { if (msg) msg.innerHTML = '<div class="cmk-alert cmk-alert-warn">Please enter the network password</div>'; return; }
				if (msg) msg.innerHTML = '<div class="cmk-loading">CONFIGURING REPEATER...</div>';
				connBtn.disabled = true;
				repState.cfgBuf = { ssid: ssid, at: Date.now() };
				repState.cfgP = true;
				repState.staSSID = ssid;
				repState.ignoreStale = true;
				// switching networks tears the current link: drop stale IP/iface instantly
				repState.wwanIp = '';
				repState.staIfname = '';
				repState.assocSince = 0;
				repState.dropAt = 0;
				repState.lastState = 'CONNECTING';
				repState.remoteNote = '';
				repState.logAt = 0;
				repState.scanAt = 0;
				repState.ssidMissing = false;
				paint.call(self, 'CONNECTING', 'cmk-val-mid');
				startPolling();
				setTimeout(function() {
					try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
				}, 2000);
				self.repeaterConnect(ssid, enc, key).then(function() {
					connBtn.disabled = false;
					if (enc !== 'none' && key) {
						pws[ssid] = key;
						pwsSave();
					}
					var cm = document.getElementById('rep-connect-msg');
					if (cm && cm.firstChild && cm.firstChild.className === 'cmk-loading') cm.innerHTML = '';
				}).catch(function(e) {
					connBtn.disabled = false;
					repState.cfgBuf = null;
					repState.ignoreStale = false;
					if (msg) msg.innerHTML = '<div class="cmk-alert cmk-alert-warn">Failed: ' + self.esc(String(e)) + '</div>';
				});
			};
		};

		var loadAp = function() {
			var ap = document.getElementById('repeater-ap');
			if (!ap) return;
			var findAp = function(cfg) {
				for (var sec in cfg) {
					if (cfg[sec] && cfg[sec].mode === 'ap' && cfg[sec].ssid) return { section: sec, conf: cfg[sec] };
				}
				return null;
			};
			self.uci('wireless', 'get').then(function(cfg) {
				var apCfg = findAp(cfg);
				if (!apCfg) { ap.innerHTML = '<div class="cmk-alert cmk-alert-warn">No AP interface found</div>'; return; }
				var curSsid = self.esc(apCfg.conf.ssid || '');
				var curKey = apCfg.conf.key || '';
				var curKeyDisp = curKey ? self.esc(curKey) : '';
				var encSel = apCfg.conf.encryption || 'psk2';
				var h4 = '<p style="color:var(--text-dim);margin-bottom:15px;font-size:0.85rem">' +
					'Configure the name and password of the Wi-Fi network you broadcast. Clients connect to this network and get internet through the remote link.</p>';
				h4 += '<div class="cmk-form-row"><label>NETWORK NAME (SSID)</label><input type="text" id="ap-ssid" class="cmk-input" value="' + curSsid + '"></div>';
				h4 += '<div class="cmk-form-row"><label>PASSWORD</label><input type="text" id="ap-key" class="cmk-input" value="' + curKeyDisp + '" placeholder="Network password (min 8 chars)"></div>';
				h4 += '<div class="cmk-form-row"><label>SECURITY</label><select id="ap-enc" class="cmk-input">' +
					'<option value="psk2" ' + (encSel === 'psk2' ? 'selected' : '') + '>WPA/WPA2 PSK</option>' +
					'<option value="psk-mixed" ' + (encSel === 'psk-mixed' ? 'selected' : '') + '>WPA/WPA2/WPA3</option>' +
					'<option value="none" ' + (encSel === 'none' ? 'selected' : '') + '>None / Open</option>' +
					'</select></div>';
				h4 += '<button class="cmk-btn" id="ap-save-btn">SAVE AP CONFIG</button>';
				h4 += '<div id="ap-msg" style="margin-top:15px"></div>';
				ap.innerHTML = h4;
				document.getElementById('ap-save-btn').onclick = function() {
					var msg = document.getElementById('ap-msg');
					var newSsid = (document.getElementById('ap-ssid').value || '').trim();
					var newKey = document.getElementById('ap-key').value;
					var newEnc = document.getElementById('ap-enc').value;
					if (!newSsid) { if (msg) msg.innerHTML = '<div class="cmk-alert cmk-alert-warn">SSID cannot be empty</div>'; return; }
					if (newEnc !== 'none' && newKey.length < 8) { if (msg) msg.innerHTML = '<div class="cmk-alert cmk-alert-warn">Password must be at least 8 characters</div>'; return; }
					if (msg) msg.innerHTML = '<div class="cmk-loading">SAVING...</div>';
					var vals = { ssid: newSsid, encryption: newEnc };
					if (newEnc !== 'none' && newKey) vals.key = newKey;
					self.rpc('uci', 'set', { config: 'wireless', section: apCfg.section, values: vals }).then(function() {
						return self.rpc('uci', 'commit', { config: 'wireless' });
					}).then(function() {
						return self.rpc('file', 'exec', { command: '/sbin/wifi', params: ['reload'] }).catch(function() { return null; });
					}).then(function() {
						if (msg) msg.innerHTML = '<div class="cmk-alert" style="color:var(--success);border-color:var(--success)">AP configuration saved. WiFi restarted. Reconnecting involved clients...</div>';
						setTimeout(function() { loadAp(); }, 4000);
					}).catch(function(e) {
						if (msg) msg.innerHTML = '<div class="cmk-alert cmk-alert-warn">Failed: ' + self.esc(String(e)) + '</div>';
					});
				};
			}).catch(function(e) {
				ap.innerHTML = '<div class="cmk-alert cmk-alert-warn">Failed to load AP config: ' + self.esc(String(e)) + '</div>';
			});
		};

		var loadDns = function() {
			var dn = document.getElementById('repeater-dns');
			if (!dn) return;
			self.uci('dhcp', 'get').then(function(cfg) {
				var noresolv = '', servers = [];
				var dnsmasq = null;
				for (var sec in cfg) {
					if (cfg[sec] && cfg[sec]['.type'] === 'dnsmasq') { dnsmasq = cfg[sec]; break; }
				}
				if (!dnsmasq) {
					for (var sec2 in cfg) {
						if (cfg[sec2] && cfg[sec2]['.name'] === 'cfg01411c') { dnsmasq = cfg[sec2]; break; }
					}
				}
				if (dnsmasq) {
					noresolv = dnsmasq.noresolv || '';
					servers = dnsmasq.server || [];
					if (!Array.isArray(servers)) servers = [servers];
				}
				var h3 = '<p style="color:var(--text-dim);margin-bottom:15px;font-size:0.85rem">' +
					'Override DNS servers served to your LAN clients. Leave empty to use remote/provider DNS.</p>';
				h3 += '<div class="cmk-form-row"><label class="cmk-check"><input type="checkbox" id="dns-enable" ' + (noresolv === '1' ? 'checked' : '') + '> Enable custom DNS</label></div>';
				h3 += '<div class="cmk-form-row"><label>DNS SERVER 1</label><input type="text" id="dns-1" class="cmk-input" placeholder="e.g. 1.1.1.1" value="' + self.esc(servers[0] || '') + '"></div>';
				h3 += '<div class="cmk-form-row"><label>DNS SERVER 2</label><input type="text" id="dns-2" class="cmk-input" placeholder="e.g. 8.8.8.8" value="' + self.esc(servers[1] || '') + '"></div>';
				h3 += '<button class="cmk-btn" id="dns-save-btn">SAVE DNS</button>';
				h3 += '<div id="dns-msg" style="margin-top:15px"></div>';
				dn.innerHTML = h3;
				document.getElementById('dns-save-btn').onclick = function() {
					var enabled = document.getElementById('dns-enable').checked ? '1' : '0';
					var d1 = (document.getElementById('dns-1').value || '').trim();
					var d2 = (document.getElementById('dns-2').value || '').trim();
					var msg = document.getElementById('dns-msg');
					if (msg) msg.innerHTML = '<div class="cmk-loading">SAVING DNS...</div>';
					self.rpc('uci', 'set', { config: 'dhcp', section: dnsmasq['.name'], values: { noresolv: enabled } }).then(function() {
						var toSet = [];
						if (enabled === '1') {
							if (d1) toSet.push(d1);
							if (d2) toSet.push(d2);
						}
						if (toSet.length) {
							return self.rpc('uci', 'set', { config: 'dhcp', section: dnsmasq['.name'], values: { server: toSet } });
						}
						return self.rpc('uci', 'delete', { config: 'dhcp', section: dnsmasq['.name'], option: 'server' }).catch(function() { return null; });
					}).then(function() {
						return self.rpc('uci', 'commit', { config: 'dhcp' });
					}).then(function() {
						return self.rpc('file', 'exec', { command: '/etc/init.d/dnsmasq', params: ['restart'] }).catch(function() { return null; });
					}).then(function() {
						if (msg) msg.innerHTML = '<div class="cmk-alert" style="color:var(--success);border-color:var(--success)">DNS configuration saved</div>';
					}).catch(function(e) {
						if (msg) msg.innerHTML = '<div class="cmk-alert cmk-alert-warn">Failed: ' + self.esc(String(e)) + '</div>';
					});
				};
			}).catch(function(e) {
				if (dn) dn.innerHTML = '<div class="cmk-alert cmk-alert-warn">Failed to load DNS config: ' + self.esc(String(e)) + '</div>';
			});
		};

		startPolling();
		loadSetup();
		loadAp();
		loadDns();
	},

	_repOp: null,
	_pTimeout: function(p, ms) {
		return new Promise(function(resolve, reject) {
			var done = false;
			var t = setTimeout(function() { if (!done) { done = true; reject(new Error('timeout (' + ms + 'ms)')); } }, ms);
			p.then(function(r) { if (!done) { done = true; clearTimeout(t); resolve(r); } },
				function(e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
		});
	},
	_repStep: function(fn) {
		var self = this;
		var prev = self._repOp || Promise.resolve();
		var p = prev.then(fn, fn);
		var q = p.then(function(r) {
			if (self._repOp === q) self._repOp = null;
			return r;
		}, function(e) {
			if (self._repOp === q) self._repOp = null;
			throw e;
		});
		self._repOp = q;
		return q;
	},

	repeaterConnect: function(ssid, enc, key) {
		var self = this;
		return self._repStep(function() {
			var staName = 'wwan_sta';
			return self.uci('wireless', 'get').then(function(cfg) {
				var existing = null;
				for (var sec in cfg) {
					if (cfg[sec] && cfg[sec].mode === 'sta') { existing = sec; break; }
				}
				var chain = Promise.resolve();
				if (existing) {
					chain = self.rpc('uci', 'set', { config: 'wireless', section: existing, values: { ssid: ssid, encryption: enc, key: key, network: 'wwan', mode: 'sta', device: 'radio0' } });
				} else {
					chain = self.rpc('uci', 'add', { config: 'wireless', type: 'wifi-iface' }).then(function(added) {
						return self.rpc('uci', 'set', { config: 'wireless', section: added.section, values: { device: 'radio0', mode: 'sta', network: 'wwan', ssid: ssid, encryption: enc, key: key } });
					});
				}
				return chain;
			}).then(function() {
				return self.rpc('uci', 'commit', { config: 'wireless' });
			}).then(function() {
				return self.uci('network', 'get').then(function(ncfg) {
					if (!ncfg || !ncfg.wwan) {
						return self.rpc('uci', 'add', { config: 'network', type: 'interface', name: 'wwan', values: { proto: 'dhcp', peerdns: '0' } }).then(function() {
							return self.rpc('uci', 'commit', { config: 'network' });
						});
					}
					return null;
				});
			}).then(function() {
				return self.rsyncFirewallWWAN();
			}).then(function() {
				return self._pTimeout(self.rpc('file', 'exec', { command: '/sbin/wifi', params: [] }), 30000).catch(function() {
					return self._pTimeout(self.rpc('file', 'exec', { command: '/sbin/wifi', params: ['reload'] }), 30000);
				});
			}).then(function() {
				return self._pTimeout(self.rpc('file', 'exec', { command: '/sbin/ifup', params: ['wwan'] }), 30000).catch(function() { return null; });
			});
		});
	},

	rsyncFirewallWWAN: function() {
		var self = this;
		return self.uci('firewall', 'get').then(function(cfg) {
			var hasZone = false, hasFwd = false, wwanZone = null;
			for (var sec in cfg) {
				var s = cfg[sec];
				if (s && s['.type'] === 'zone' && s.name === 'wwan') { hasZone = true; wwanZone = sec; }
				if (s && s['.type'] === 'forwarding' && s.src === 'lan' && s.dest === 'wwan') hasFwd = true;
			}
			var chain = Promise.resolve();
			if (!hasZone) {
				chain = chain.then(function() {
					return self.rpc('uci', 'add', { config: 'firewall', type: 'zone' }).then(function(added) {
						return self.rpc('uci', 'set', { config: 'firewall', section: added.section, values: { name: 'wwan', network: 'wwan', input: 'ACCEPT', output: 'ACCEPT', forward: 'ACCEPT', masq: '1' } });
					});
				});
			}
			if (!hasFwd) {
				chain = chain.then(function() {
					return self.rpc('uci', 'add', { config: 'firewall', type: 'forwarding' }).then(function(added) {
						return self.rpc('uci', 'set', { config: 'firewall', section: added.section, values: { src: 'lan', dest: 'wwan' } });
					});
				});
			}
			return chain.then(function() {
				return self.rpc('uci', 'commit', { config: 'firewall' });
			}).then(function() {
				return self.rpc('file', 'exec', { command: '/etc/init.d/firewall', params: ['reload'] }).catch(function() { return null; });
			});
		});
	},

	repeaterDisconnect: function() {
		var self = this;
		if (self._repTimer) { clearTimeout(self._repTimer); self._repTimer = null; }
		if (self.repState) {
			self.repState.cfgBuf = null;
			self.repState.ignoreStale = false;
			self.repState.pollSeq = (self.repState.pollSeq || 0) + 1;
		}
		var msgDiv = document.getElementById('repeater-status');
		if (msgDiv) msgDiv.innerHTML = '<div class="cmk-loading">DISCONNECTING REPEATER...</div>';
		return self._repStep(function() {
			return self.uci('wireless', 'get').then(function(cfg) {
				var toDelete = [];
				for (var sec in cfg) {
					if (cfg[sec] && (cfg[sec].mode === 'sta')) toDelete.push(sec);
				}
				var chain = Promise.resolve();
				toDelete.forEach(function(sec) {
					chain = chain.then(function() { return self.rpc('uci', 'delete', { config: 'wireless', section: sec }).catch(function() { return null; }); });
				});
				return chain.then(function() { return self.rpc('uci', 'commit', { config: 'wireless' }); });
			}).then(function() {
				return self.uci('network', 'get').then(function(ncfg) {
					if (ncfg && ncfg.wwan) {
						return self.rpc('uci', 'delete', { config: 'network', section: 'wwan' }).then(function() {
							return self.rpc('uci', 'commit', { config: 'network' });
						});
					}
					return null;
				});
			}).then(function() {
				return self._pTimeout(self.rpc('file', 'exec', { command: '/sbin/wifi', params: [] }), 30000).catch(function() {
					return self._pTimeout(self.rpc('file', 'exec', { command: '/sbin/wifi', params: ['reload'] }), 30000);
				});
			});
		}).then(function() {
			var msgDiv2 = document.getElementById('repeater-status');
			if (msgDiv2) msgDiv2.innerHTML = '<div class="cmk-alert" style="color:var(--success);border-color:var(--success)">Repeater disconnected. WiFi restored to normal AP mode.</div>';
			setTimeout(function() { self.wifiRepeater(document.getElementById('content')); }, 3000);
		}).catch(function(e) {
			var msgDiv3 = document.getElementById('repeater-status');
			if (msgDiv3) msgDiv3.innerHTML = '<div class="cmk-alert cmk-alert-warn">Failed: ' + self.esc(String(e)) + '</div>';
		});
	},

	wifiScan: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">WIFI SCAN</div>' +
			'<button class="cmk-btn" id="wifi-scan-btn">START SCAN</button>' +
			'<div id="wifi-scan-results" style="margin-top:15px"></div></div>';
		var btn = document.getElementById('wifi-scan-btn');
		if (btn) btn.onclick = function() {
			var el = document.getElementById('wifi-scan-results');
			if (el) el.innerHTML = '<div class="cmk-loading">SCANNING...</div>';
			btn.disabled = true;
			self.rpc('iwinfo', 'scan', { device: 'phy0' }).then(function(data) {
				btn.disabled = false;
				if (!el) return;
				var results = (data && data.results) ? data.results : data;
				if (!results || !results.length) { el.innerHTML = '<div class="cmk-loading">NO NETWORKS FOUND</div>'; return; }
				var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
				h += '<th>SSID</th><th>BSSID</th><th>CHANNEL</th><th>SIGNAL</th><th>ENCRYPTION</th>';
				h += '</tr></thead><tbody>';
				for (var i = 0; i < results.length; i++) {
					var n = results[i];
					h += '<tr>';
					h += '<td><strong>' + self.esc(n.ssid || '(hidden)') + '</strong></td>';
					h += '<td>' + self.esc(n.bssid || '?') + '</td>';
					h += '<td>' + (n.channel || '?') + '</td>';
					h += '<td>' + (n.signal || '?') + ' dBm</td>';
					h += '<td>' + self.esc(self.fmtEncryption(n.encryption)) + '</td>';
					h += '</tr>';
				}
				h += '</tbody></table></div>';
				el.innerHTML = h;
			}).catch(function(e) {
				btn.disabled = false;
				if (el) el.innerHTML = '<div class="cmk-alert cmk-alert-warn">Scan failed: ' + self.esc(String(e)) + '</div>';
			});
		};
	},

	wifiConfig: function(c) {
		var self = this;
		self.uci('wireless', 'get').then(function(cfg) {
			var h = '<div class="cmk-panel"><div class="cmk-panel-title">WIRELESS CONFIGURATION</div>';
			h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr><th>SECTION</th><th>OPTION</th><th>VALUE</th></tr></thead><tbody>';
			for (var sec in cfg) {
				if (typeof cfg[sec] === 'object' && !Array.isArray(cfg[sec])) {
					for (var key in cfg[sec]) {
						if (key === '.type' || key === '.name') continue;
						h += '<tr><td>' + self.esc(sec) + '</td><td>' + self.esc(key) + '</td>';
						h += '<td>' + self.esc(self.fmtVal(cfg[sec][key])) + '</td></tr>';
					}
				}
			}
			h += '</tbody></table></div></div>';
			c.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	// ============================================================
	// SERVICES PAGES
	// ============================================================

	renderServices: function(c, sub) {
		var self = this;
		switch (sub) {
			case 'init': self.svcInit(c); break;
			case 'packages': self.svcPackages(c); break;
			case 'startup': self.svcStartup(c); break;
			default: self.svcInit(c);
		}
	},

	svcInit: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">INIT SCRIPTS</div><div id="init-scripts"><div class="cmk-loading">LOADING</div></div></div>';
		Promise.all([
			self.rpc('luci', 'getInitList'),
			self.rpc('service', 'list')
		]).then(function(r) {
			var services = r[0] || {};
			var serviceList = r[1] || {};
			var el = document.getElementById('init-scripts');
			if (!el) return;
			var keys = Object.keys(services).sort();
			var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
			h += '<th>SERVICE</th><th>STATUS</th><th>ENABLED</th><th>ACTIONS</th>';
			h += '</tr></thead><tbody>';
			for (var i = 0; i < keys.length; i++) {
				var name = keys[i];
				var svc = services[name];
				var enabled = svc.enabled;
				var running = false;
				if (serviceList[name] && serviceList[name].instances) {
					var insts = serviceList[name].instances;
					for (var k in insts) {
						if (insts[k].running) { running = true; break; }
					}
				}
				h += '<tr>';
				h += '<td><strong>' + self.esc(name) + '</strong></td>';
				h += '<td class="' + (running ? 'cmk-val-up' : 'cmk-val-down') + '">' + (running ? 'RUNNING' : 'STOPPED') + '</td>';
				h += '<td>' + (enabled ? 'YES' : 'NO') + '</td>';
				h += '<td>';
				if (running) {
					h += '<button class="cmk-btn-sm" onclick="CMK.svcAction(\'' + self.esc(name) + '\',\'stop\')">STOP</button> ';
					h += '<button class="cmk-btn-sm" onclick="CMK.svcAction(\'' + self.esc(name) + '\',\'restart\')">RESTART</button>';
				} else {
					h += '<button class="cmk-btn-sm" onclick="CMK.svcAction(\'' + self.esc(name) + '\',\'start\')">START</button>';
				}
				h += '</td></tr>';
			}
			h += '</tbody></table></div>';
			el.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	svcAction: function(name, action) {
		var self = this;
		self.rpc('luci', 'setInitAction', { name: name, action: action }).then(function() {
			setTimeout(function() { self.svcInit(document.getElementById('content')); }, 1000);
		}).catch(function(e) { alert('Action failed: ' + e); });
	},

	svcPackages: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">INSTALLED PACKAGES</div>' +
			'<div style="margin-bottom:10px"><input type="text" id="pkg-search" class="cmk-input" placeholder="Filter..." style="width:200px;display:inline"></div>' +
			'<div id="pkg-list"><div class="cmk-loading">LOADING</div></div></div>';
		self.rpc('file', 'exec', { command: '/bin/opkg', params: ['list-installed'] }).then(function(res) {
			var el = document.getElementById('pkg-list');
			if (!el) return;
			var lines = (res.stdout || '').split('\n').filter(function(l) { return l.trim(); });
			var h = '<div class="cmk-table-wrap"><table class="cmk-table" id="pkg-table"><thead><tr>';
			h += '<th>PACKAGE</th><th>VERSION</th><th>DESCRIPTION</th>';
			h += '</tr></thead><tbody>';
			for (var i = 0; i < lines.length; i++) {
				var parts = lines[i].split(' - ');
				var name = parts[0] || '';
				var ver = parts[1] || '';
				var desc = parts.slice(2).join(' - ') || '';
				h += '<tr class="pkg-row"><td>' + self.esc(name) + '</td>';
				h += '<td>' + self.esc(ver) + '</td>';
				h += '<td>' + self.esc(desc) + '</td></tr>';
			}
			h += '</tbody></table></div>';
			el.innerHTML = h;
			var search = document.getElementById('pkg-search');
			if (search) search.oninput = function() {
				var q = search.value.toLowerCase();
				var rows = el.querySelectorAll('.pkg-row');
				for (var j = 0; j < rows.length; j++) {
					rows[j].style.display = rows[j].textContent.toLowerCase().indexOf(q) === -1 ? 'none' : '';
				}
			};
		}).catch(function(e) { self.setError(c, e); });
	},

	svcStartup: function(c) {
		var self = this;
		self.svcInit(c);
	},

	// ============================================================
	// SYSTEM PAGES
	// ============================================================

	renderSystem: function(c, sub) {
		var self = this;
		switch (sub) {
			case 'info': self.sysInfo(c); break;
			case 'password': window.location.href = '/cgi-bin/luci/admin/system/admin'; break;
			case 'leds': self.sysLEDs(c); break;
			case 'cron': self.sysCron(c); break;
			case 'backup': self.sysBackup(c); break;
			case 'shell': self.sysShell(c); break;
			default: self.sysInfo(c);
		}
	},

	sysInfo: function(c) {
		var self = this;
		Promise.all([
			self.rpc('system', 'board'),
			self.rpc('system', 'info'),
			self.uci('system', 'get')
		]).then(function(r) {
			var board = r[0], sys = r[1], syscfg = r[2] || {};
			var h = '<div class="cmk-panel"><div class="cmk-panel-title">SYSTEM INFORMATION</div>';
			h += '<div class="cmk-grid">';
			h += self.statCard('HOSTNAME', board.hostname || '?');
			h += self.statCard('MODEL', (board.model || board.board_name || '?').split(' ').slice(-2).join(' '));
			h += self.statCard('SYSTEM', board.system || '?');
			h += self.statCard('KERNEL', board.kernel || '?');
			h += '</div></div>';

			h += '<div class="cmk-panel"><div class="cmk-panel-title">OPENWRT</div>';
			h += '<div class="cmk-grid cols-2">';
			var rel = board.release || {};
			h += self.statCard('VERSION', rel.version || '?');
			h += self.statCard('REVISION', rel.revision || '?');
			h += self.statCard('TARGET', rel.target || '?');
			h += self.statCard('ARCH', rel.architecture || '?');
			h += '</div></div>';

			if (sys.cpuinfo) {
				h += '<div class="cmk-panel"><div class="cmk-panel-title">CPU</div>';
				h += '<div class="cmk-grid cols-2">';
				h += self.statCard('MODEL', sys.cpuinfo.model || '?');
				h += self.statCard('MHZ', sys.cpuinfo.clock || '?');
				h += '</div></div>';
			}

			var mem = sys.memory || {};
			h += '<div class="cmk-panel"><div class="cmk-panel-title">MEMORY</div>';
			h += '<div class="cmk-grid">';
			h += self.statCard('TOTAL', self.fmtBytes(mem.total || 0));
			h += self.statCard('FREE', self.fmtBytes(mem.free || 0));
			h += self.statCard('AVAILABLE', self.fmtBytes(mem.available || 0));
			h += self.statCard('CACHED', self.fmtBytes(mem.cached || 0));
			h += '</div></div>';

			if (sys.uptime !== undefined) {
				var ut = sys.uptime || 0;
				h += '<div class="cmk-panel"><div class="cmk-panel-title">TIME</div>';
				h += '<div class="cmk-grid cols-2">';
				h += self.statCard('UPTIME', Math.floor(ut/86400) + 'd ' + Math.floor((ut%86400)/3600) + 'h ' + Math.floor((ut%3600)/60) + 'm');
				var now = new Date();
				h += self.statCard('LOCAL TIME', now.toLocaleString());
				h += '</div></div>';
			}

			h += '<div class="cmk-panel"><div class="cmk-panel-title">UCI SYSTEM CONFIG</div>';
			h += '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr><th>OPTION</th><th>VALUE</th></tr></thead><tbody>';
			for (var sec in syscfg) {
				if (typeof syscfg[sec] === 'object' && !Array.isArray(syscfg[sec])) {
					for (var key in syscfg[sec]) {
						if (key === '.type' || key === '.name') continue;
						h += '<tr><td>' + self.esc(sec + '.' + key) + '</td>';
						h += '<td>' + self.esc(String(syscfg[sec][key])) + '</td></tr>';
					}
				}
			}
			h += '</tbody></table></div></div>';

			h += '<div class="cmk-panel"><div class="cmk-panel-title">ACTIONS</div>';
			h += '<button class="cmk-btn" onclick="if(confirm(\'Reboot?\'))CMK.sysReboot()">REBOOT</button></div>';

			c.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	sysReboot: function() {
		this.rpc('system', 'reboot').catch(function() {});
	},

	sysLEDs: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">LED CONFIGURATION</div><div id="led-list"><div class="cmk-loading">LOADING</div></div></div>';
		self.rpc('luci', 'getLEDs').then(function(leds) {
			var el = document.getElementById('led-list');
			if (!el) return;
			if (!leds || !Object.keys(leds).length) { el.innerHTML = '<div class="cmk-loading">NO LEDS</div>'; return; }
			var h = '<div class="cmk-table-wrap"><table class="cmk-table"><thead><tr>';
			h += '<th>LED</th><th>STATE</th><th>TRIGGER</th><th>BRIGHTNESS</th>';
			h += '</tr></thead><tbody>';
			for (var name in leds) {
				var led = leds[name];
				var isOn = led.brightness > 0;
				h += '<tr>';
				h += '<td><strong>' + self.esc(name) + '</strong></td>';
				h += '<td class="' + (isOn ? 'cmk-val-up' : 'cmk-val-down') + '">' + (isOn ? 'ON' : 'OFF') + '</td>';
				h += '<td>' + self.esc(led.active_trigger || '?') + '</td>';
				h += '<td>' + (led.brightness || 0) + ' / ' + (led.max_brightness || 1) + '</td>';
				h += '</tr>';
			}
			h += '</tbody></table></div>';
			el.innerHTML = h;
		}).catch(function(e) { self.setError(c, e); });
	},

	sysCron: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">CRONTAB</div>' +
			'<div id="cron-content"><div class="cmk-loading">LOADING</div></div></div>';
		self.rpc('file', 'list', { path: '/etc/crontabs' }).then(function(list) {
			var el = document.getElementById('cron-content');
			if (!el) return;
			var entries = (list && list.entries) || [];
			var files = [];
			for (var i = 0; i < entries.length; i++) {
				var en = entries[i];
				if (en && en.name) files.push(en.name);
			}
			if (!files.length) {
				el.innerHTML = '<div class="cmk-alert cmk-alert-warn">No crontab files found in /etc/crontabs</div>';
				return;
			}
			var readOne = function(name) {
				self.rpc('file', 'read', { path: '/etc/crontabs/' + name }).then(function(data) {
					var content = data && data.data != null ? data.data : (typeof data === 'string' ? data : '');
					el.innerHTML = '<h3 style="color:var(--cyan);margin-bottom:10px">/etc/crontabs/' + self.esc(name) + '</h3>' +
						'<pre class="cmk-log">' + self.esc(content || 'No crontab entries') + '</pre>';
				}).catch(function() {
					el.innerHTML = '<div class="cmk-alert cmk-alert-warn">Crontab file /etc/crontabs/' + self.esc(name) + ' is empty or unreadable</div>';
				});
			};
			readOne(files[0]);
		}).catch(function(e) {
			var el2 = document.getElementById('cron-content');
			if (el2) el2.innerHTML = '<div class="cmk-alert cmk-alert-warn">Cron not configured yet. ' + self.esc(String(e)) + '</div>';
		});
	},

	sysShell: function(c) {
		var self = this;
		var h = '<div class="cmk-panel"><div class="cmk-panel-title">SHELL</div>';
		h += '<p class="cmk-note">INTEGRATED WEB TERMINAL (TTYD). RUNS AS ROOT — FULL CONTROL. MODIFY ONLY WHAT YOU UNDERSTAND.</p>';
		h += '<iframe class="cmk-shell-frame" src="' + ttydUrl() + '" title="Terminal"></iframe>';
		h += '<p class="cmk-note">WEB TERMINAL ON PORT 7681. AUTH: router ROOT USER / PASSWORD.</p>';
		h += '<p class="cmk-note"><a href="' + ttydUrl() + '" target="_blank">OPEN IN NEW TAB</a></p>';
		h += '</div>';
		c.innerHTML = h;
	},

	sysBackup: function(c) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">BACKUP / RESTORE</div>' +
			'<p style="color:var(--text);margin-bottom:15px">Download a backup archive or restore from one.</p>' +
			'<a href="/cgi-bin/luci/admin/system/flash" class="cmk-btn" target="_blank">BACKUP <svg class="cmk-ext-icon" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H5v12h12v-6h2v8H3V5h2z"/></svg></a>' +
			'</div>' +
			'<div class="cmk-panel"><div class="cmk-panel-title">FIRMWARE</div>' +
			'<p style="color:var(--text);margin-bottom:15px">Flash new firmware image.</p>' +
			'<a href="/cgi-bin/luci/admin/system/flash" class="cmk-btn" target="_blank">FLASH <svg class="cmk-ext-icon" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H5v12h12v-6h2v8H3V5h2z"/></svg></a>' +
			'</div>';
	},

	// ============================================================
	// DIAGNOSTICS PAGES
	// ============================================================

	renderDiagnostics: function(c, sub) {
		var self = this;
		switch (sub) {
			case 'ping': self.diagPing(c); break;
			case 'nslookup': self.diagNslookup(c); break;
			case 'traceroute': self.diagTraceroute(c); break;
			default: self.diagPing(c);
		}
	},

	diagRun: function(c, title, cmd, args) {
		var self = this;
		c.innerHTML = '<div class="cmk-panel"><div class="cmk-panel-title">' + title + '</div>' +
			'<div style="margin-bottom:10px">' +
			'<input type="text" id="diag-host" class="cmk-input" placeholder="Host or IP" value="8.8.8.8" style="width:200px;display:inline"> ' +
			'<button class="cmk-btn" id="diag-run-btn">RUN</button></div>' +
			'<pre id="diag-result" class="cmk-log">Enter a host and click RUN</pre></div>';
		var btn = document.getElementById('diag-run-btn');
		if (btn) btn.onclick = function() {
			var host = document.getElementById('diag-host').value;
			if (!host) return;
			var el = document.getElementById('diag-result');
			if (el) el.textContent = 'Running...';
			var params = args(host);
			self.rpc('file', 'exec', { command: cmd, params: params, timeout: 15 }).then(function(res) {
				if (el) el.textContent = (res.stdout || '') + (res.stderr || '') || 'No output';
			}).catch(function(e) {
				if (el) el.textContent = 'Error: ' + e;
			});
		};
	},

	diagPing: function(c) {
		this.diagRun(c, 'PING', '/bin/ping', function(host) { return ['-c', '5', host]; });
	},

	diagNslookup: function(c) {
		this.diagRun(c, 'NSLOOKUP', '/usr/bin/nslookup', function(host) { return [host]; });
	},

	diagTraceroute: function(c) {
		this.diagRun(c, 'TRACEROUTE', '/bin/traceroute', function(host) { return ['-m', '15', host]; });
	},

	// ============================================================
	// UTILITIES
	// ============================================================

	statCard: function(label, value, cls) {
		cls = cls || '';
		return '<div class="cmk-stat"><div class="cmk-stat-label">' +
			this.esc(label) + '</div><div class="cmk-stat-value ' + cls + '">' +
			this.esc(String(value)) + '</div></div>';
	},

	fmtBytes: function(b) {
		if (!b || b === 0) return '0 B';
		var units = ['B', 'KB', 'MB', 'GB'];
		var i = 0;
		while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
		return b.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
	},

	fmtEncryption: function(enc) {
		if (!enc || !enc.enabled) return 'Open';
		var wpa = (enc.wpa || []).join('/');
		var auth = (enc.authentication || []).join('+');
		var ciphers = (enc.ciphers || []).join('+');
		var parts = [];
		if (wpa) parts.push(wpa);
		if (auth) parts.push(auth);
		if (ciphers) parts.push(ciphers);
		return parts.length ? parts.join(' - ') : 'Encrypted';
	},

	fmtVal: function(v) {
		if (v === null || v === undefined) return '';
		if (Array.isArray(v)) return v.join(', ');
		if (typeof v === 'object') return JSON.stringify(v);
		return String(v);
	},

	esc: function(s) {
		var d = document.createElement('div');
		d.appendChild(document.createTextNode(String(s)));
		return d.innerHTML;
	}
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', function() { CMK.init(); });
} else {
	CMK.init();
}
