local sys = require "luci.sys"
local uci = require("luci.model.uci").cursor()

m = Map("wireless", translate("WiFi Administration"),
	translate("Configure WiFi network name, password and connected clients."))

-- WiFi Settings
s = m:section(TypedSection, "wifi-device", translate("Wireless Settings"))
s.anonymous = true
s.addremove = false

s:option(ListValue, "channel", translate("Channel"))
	:value("auto", translate("Auto"))
	for i = 1, 11 do s:option(ListValue, "channel", translate("Channel")):value(tostring(i)) end

s:option(Value, "txpower", translate("TX Power (dBm)"))

-- Interface Settings
s2 = m:section(TypedSection, "wifi-iface", translate("Interface Settings"))
s2.anonymous = true
s2.addremove = false

s2:option(Value, "ssid", translate("Network Name (SSID)"))
	.datatype = "maxlength(32)"

s2:option(ListValue, "encryption", translate("Encryption"))
	:value("none", translate("None"))
	:value("psk2", translate("WPA2-PSK"))
	:value("psk-mixed", translate("WPA/WPA2 Mixed"))

s2:option(Value, "key", translate("Password"))
	.datatype = "maxlength(63)"
	s2.rmempty = false

-- Connected Clients
s3 = m:section(Table, {}, translate("Connected Clients"))

local clients = {}
local leasefile = "/tmp/dhcp.leases"
local f = io.open(leasefile, "r")
if f then
	for line in f:lines() do
		local mac, ip, name = line:match("^(%S+)%s+(%S+)%s+(%S+)")
		if mac then
			table.insert(clients, {mac, ip, name ~= "*" and name or "-"})
		end
	end
	f:close()
end

s3.rows = clients

return m
