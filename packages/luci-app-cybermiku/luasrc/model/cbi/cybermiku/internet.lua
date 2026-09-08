local sys = require "luci.sys"
local uci = require("luci.model.uci").cursor()

m = Map("network", translate("Internet Settings"),
	translate("Configure WAN connection mode and DNS settings."))

-- WAN Mode
s = m:section(TypedSection, "interface", translate("WAN Interface"))
s.anonymous = true
s.addremove = false
s:option(ListValue, "proto", translate("Protocol"))
	:value("dhcp", translate("DHCP (Cable)"))
	:value("static", translate("Static IP"))
	:value("disabled", translate("Disabled (Repeater)"))

s:option(Value, "ipaddr", translate("IP Address"))
	.datatype = "ip4addr"
	s:depends("proto", "static")

s:option(Value, "netmask", translate("Netmask"))
	.datatype = "ip4addr"
	s:depends("proto", "static")

s:option(Value, "gateway", translate("Gateway"))
	.datatype = "ip4addr"
	s:depends("proto", "static")

-- DNS Settings
s2 = m:section(TypedSection, "interface", translate("DNS Settings"))
s2.anonymous = true
s2.addremove = false

dns1 = s2:option(Value, "dns", translate("Primary DNS"))
	dns1.datatype = "ip4addr"
	dns1.placeholder = "8.8.8.8"

dns2 = s2:option(Value, "dns2", translate("Secondary DNS"))
	dns2.datatype = "ip4addr"
	dns2.placeholder = "8.8.4.4"

-- Custom DNS presets
s3 = m:section(TypedSection, "interface", translate("DNS Presets"))
s3.anonymous = true

local presets = {
	{"Google", "8.8.8.8", "8.8.4.4"},
	{"Cloudflare", "1.1.1.1", "1.0.0.1"},
	{"Quad9", "9.9.9.9", "149.112.112.112"},
	{"AdGuard", "94.140.14.14", "94.140.15.15"},
	{"OpenDNS", "208.67.222.222", "208.67.220.220"},
}

for _, p in ipairs(presets) do
	btn = s3:option(Button, "_apply_" .. p[1]:lower(), translate("Apply"))
	btn.inputtitle = translate("%s (%s)".format(p[1], p[2]))
	btn.inputstyle = "apply"
	btn:depends("proto", "dhcp")
end

-- Repeater / Bridge Mode
s4 = m:section(TypedSection, "interface", translate("LAN Bridge (Repeater Mode)"))
s4.anonymous = true
s4.addremove = false

s4:option(Flag, "bridge", translate("Bridge LAN to WAN"),
	translate("Enable to repeat WiFi to wired clients"))

return m
