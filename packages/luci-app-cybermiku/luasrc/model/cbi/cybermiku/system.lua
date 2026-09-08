local sys = require "luci.sys"
local fs = require "nixio.fs"

m = Map("system", translate("System Settings"),
	translate("Reboot device, update firmware, and view system information."))

-- System Info
s = m:section(SimpleSection, nil, translate("System Information"))

local uptime = sys.exec("cat /proc/uptime"):match("^(%S+)")
local hours = math.floor((tonumber(uptime) or 0) / 3600)
local mins = math.floor(((tonumber(uptime) or 0) % 3600) / 60)

s.template = "cybermiku/status"
s.uptime = ("%dh %dm"):format(hours, mins)
s.model = sys.exec("cat /proc/sys/kernel/hostname"):match("^%s*(.-)%s*$") or "Unknown"
s.kernel = sys.exec("uname -r"):match("^%s*(.-)%s*$") or "Unknown"

-- Reboot
s2 = m:section(SimpleSection, nil, translate("Device Control"))
s2.template = "cybermiku/reboot"

-- Firmware Upgrade
s3 = m:section(SimpleSection, nil, translate("Firmware Upgrade"))
s3.template = "cybermiku/upgrade"

-- Root Password
s4 = m:section(SimpleSection, nil, translate("Change Root Password"))
s4.template = "cybermiku/password"

return m
