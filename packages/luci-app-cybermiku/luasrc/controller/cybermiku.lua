module("luci.controller.cybermiku", package.seeall)

function index()
	entry({"admin", "cybermiku"}, alias("admin", "cybermiku", "dashboard"), _("CyberMiku"), 30).index = true
	entry({"admin", "cybermiku", "dashboard"}, template("themes/cybermiku/dashboard"), _("Dashboard"), 1).acl = {"cybermiku"}
	entry({"admin", "cybermiku", "admin"}, cbi("cybermiku/admin"), _("Admin"), 2).acl = {"cybermiku"}
	entry({"admin", "cybermiku", "internet"}, cbi("cybermiku/internet"), _("Internet"), 3).acl = {"cybermiku"}
	entry({"admin", "cybermiku", "system"}, cbi("cybermiku/system"), _("System"), 4).acl = {"cybermiku"}

	entry({"admin", "cybermiku", "api", "status"}, call("action_status"), nil).leaf = true
	entry({"admin", "cybermiku", "api", "clients"}, call("action_clients"), nil).leaf = true
	entry({"admin", "cybermiku", "api", "reboot"}, call("action_reboot"), nil).leaf = true
	entry({"admin", "cybermiku", "logout"}, call("action_logout"), _("Logout"), 100).leaf = true
end

function action_logout()
	if luci.dispatcher.context.authsession then
		local ubus = require "ubus"
		local conn = ubus.connect()
		if conn then
			conn:call("session", "destroy", { ubus_rpc_session = luci.dispatcher.context.authsession })
		end
	end
	luci.http.header("Set-Cookie", "sysauth_http=; max-age=0; path=/cgi-bin/luci/")
	luci.http.redirect(luci.dispatcher.build_url("admin", "cybermiku"))
end

function action_status()
	local status = {}
	local uptime = luci.sys.exec("cat /proc/uptime"):match("^(%S+)")
	status.uptime = tonumber(uptime) or 0
	local load = luci.sys.exec("cat /proc/loadavg"):match("^(%S+)")
	status.load = load or "0"
	local meminfo = luci.sys.exec("free | grep Mem"):match("(%d+)%s+(%d+)%s+(%d+)")
	status.memory = meminfo or "0 0 0"
	status.wan_ip = luci.sys.exec("uci get network.wan.ipaddr 2>/dev/null"):match("^%s*(.-)%s*$") or ""
	status.wan_up = luci.sys.exec("ifstatus wan 2>/dev/null"):match('"up": true') ~= nil
	status.wifi_up = luci.sys.exec("uci get wireless.radio0.disabled 2>/dev/null") ~= "1"
	luci.http.prepare_content("application/json")
	luci.http.write_json(status)
end

function action_clients()
	local clients = {}
	local leases = {}
	local arp = {}

	local f = io.open("/tmp/dhcp.leases", "r")
	if f then
		for line in f:lines() do
			local expiry, mac, ip, name, cid = line:match("^(%d+)%s+(%S+)%s+(%S+)%s+(%S+)%s?(%S*)")
			if mac then
				local entry = {
					mac = mac:upper(),
					ip = ip,
					name = (name ~= nil and name ~= "*") and name or "",
					duid = cid or "",
					leasetime = tonumber(expiry) or 0,
					source = "dhcp"
				}
				leases[entry.mac] = entry
				table.insert(clients, entry)
			end
		end
		f:close()
	end

	local lan = luci.sys.exec("uci get network.lan.ipaddr 2>/dev/null"):match("^%s*(.-)%s*$") or ""
	local mac2name = {}
	local hosts = io.open("/etc/hosts", "r")
	if hosts then
		for line in hosts:lines() do
			local ip, hn = line:match("^(%d+%.%d+%.%d+%.%d+)%s+(%S+)")
			if ip and hn then mac2name[ip] = hn end
		end
		hosts:close()
	end

	local f2 = io.open("/proc/net/arp", "r")
	if f2 then
		local first = true
		for line in f2:lines() do
			if first then
				first = false
			else
				local ip, mac, dev = line:match("^(%S+)%s+%S+%s+%S+%s+(%S+)%s+%S+%s+(%S+)")
				if ip and mac and mac ~= "00:00:00:00:00:00" and mac ~= "" and dev == "br-lan" and ip ~= lan then
					mac = mac:upper()
					arp[mac] = true
					if not leases[mac] then
						table.insert(clients, {
							mac = mac,
							ip = ip,
							name = mac2name[ip] or "",
							duid = "",
							leasetime = 0,
							source = "static"
						})
					end
				end
			end
		end
		f2:close()
	end

	for _, c in ipairs(clients) do
		c.online = arp[c.mac] == true
		if c.leasetime and c.leasetime > 0 then
			c.remaining = c.leasetime - os.time()
		end
	end

	table.sort(clients, function(a, b)
		if a.online ~= b.online then return a.online end
		if a.source ~= b.source then return a.source == "dhcp" end
		return (a.name or "") < (b.name or "")
	end)

	luci.http.prepare_content("application/json")
	luci.http.write_json(clients)
end

function action_reboot()
	luci.http.status(200, "Rebooting...")
	luci.sys.reboot()
end
