<p align="center">
  <span style="color:#FF00E8;font-size:22px;font-weight:bold">◆◆◆ CYBERMIKU FIRMWARE ◆◆◆</span><br />
  <span style="color:#00F0FF;font-size:14px">Hatsune Miku-inspired OpenWrt LuCI theme &amp; dashboard</span><br />
  <span style="color:#A5F3FC;font-size:12px">MIKUDAYOOO ~&lt;(\(&gt;o.O)&lt;)/ MIKUDAYOOO</span>
</p>

---

## <span style="color:#00F0FF">🔷 О проекте · About</span>

**RU:** Кастомная прошивка на базе исходников [OpenWrt](https://openwrt.org) (24.10-SNAPSHOT, `ath79/generic`) для роутера **TP-Link TL-WR841HP v3** (флеш 8 МБ). В образе — вдохновлённая Хацунэ Мику тёмная **Kyberpunk**-тема и SPA-дашборд: статус системы, сеть, беспроводное, сервисы, диагностика, список клиентов, веб-терминал и страница репитера.

**EN:** A custom firmware built from upstream [OpenWrt](https://openwrt.org) sources (24.10-SNAPSHOT, `ath79/generic`) for the **TP-Link TL-WR841HP v3** router (8&nbsp;MB flash). Ships a Hatsune Miku-inspired dark **cyberpunk** LuCI theme and a SPA dashboard: system status, network, wireless, services, diagnostics, client list, web terminal and a repeater/extender page.

> <span style="color:#FF00E8">**MIKUDAYOOO!** Прошивка неофициальная, не связана с Crypton Future Media / Miku. МИКУ — ВСЕМ! МИКУ — ВЕЗДЕ!</span>

---

## <span style="color:#FF00E8">🔷 Возможности · Features</span>

| <span style="color:#00F0FF">RU</span> | <span style="color:#00F0FF">EN</span> |
|---|---|
| Тема **CyberMiku** (циан/маджента, неон, аниме-графика) | **CyberMiku** LuCI theme (cyan/magenta neon, anime art) |
| SPA-панель вместо стандартного LuCI | Single-page dashboard replacing stock LuCI |
| Статус: CPU/RAM/температура, трафик, аптайм, поднятые сервисы | Status: CPU/RAM/temp, traffic, uptime, running services |
| **CLIENTS** — таблица Wi-Fi/LAN-клиентов (MAC, IP, hostname, RSSI, RX/TX) | **CLIENTS** — live Wi-Fi/LAN client table (MAC, IP, host, RSSI, RX/TX) |
| **SHELL** — веб-терминал **ttyd** на порту `7681` | **SHELL** — **ttyd** web terminal on port `7681` |
| **REPEATER** — страница репитера: подключение к «чужой» сети, локальный AP, DNSS, статус (CONNECTED/CONNECTING/DISCONNECTED) | **REPEATER** — extender page: connect to a remote Wi-Fi, local AP config, DNS override, live status |
| Диагностика: ping/traceroute/route/занятость | Diagnostics: ping/traceroute/routes/load |
| Мобильная адаптивная вёрстка (бургер-меню) | Mobile-adaptive layout (burger menu) |
| **ttyd** + **libwebsockets-mbedtls** вместо OpenSSL-стека (образ влезает в 8 МБ) | ttyd + libwebsockets-mbedtls instead of the OpenSSL stack (fits 8 MB) |

---

## <span style="color:#00F0FF">🔷 Совместимость · Hardware</span>

**RU:** Проверено только на `TP-Link TL-WR841HP v3` (`ath79`). Микропрограмма рассчитана на **8&nbsp;МБ** флеш и **64&nbsp;МБ** RAM. Вшитый профиль — `tplink_tl-wr841hp-v3`.
**EN:** Tested on `TP-Link TL-WR841HP v3` (`ath79`) only. The image targets **8&nbsp;MB** flash / **64&nbsp;MB** RAM. Target profile: `tplink_tl-wr841hp-v3`.

> ⚠️ Для других плат не собирайте без правки `.config` — конфиг ужат под данное железо.

---

## <span style="color:#FF00E8">🔷 Структура репозитория · Layout</span>

```
cybermiku-openwrt/
├── packages/
│   ├── luci-theme-cybermiku/      # тема + SPA-дашборд (app.js etc.)
│   └── luci-app-cybermiku/        # контроллеры, cbi, acl, uci-defaults
├── config/
│   ├── cybermiku.config           # openwrt .config (ужатый под 8 МБ)
│   ├── wr840n-v6.config           # openwrt .config для TL-WR840N v6.2 (4 МБ)
│   └── refs.env                   # пины: openwrt + фиды (sha1)
├── files/
│   └── wr840n-v6/                 # поддержка TL-WR840N v6.2 (ramips/mt76x8)
│       ├── mt7628an_tplink_tl-wr840n-v6.2.dts   # DTS (партиции, LED, GPIO)
│       ├── apply.py               # патчит дерево openwrt (mk + board.d)
│       ├── setup.sh               # обёртка над apply.py
│       └── build.sh               # полная сборка под 4 МБ
├── patches/
│   └── 001-feeds-packages-lws-ttyd.patch   # lws-mbedtls + ttyd
├── scripts/
│   └── build.sh                   # скрипт полной сборки (ath79)
└── .github/workflows/build.yml    # CI: сборка + релиз при деплое
```

---

## <span style="color:#00F0FF">🔷 Сборка · Building</span>

### Локально (Linux / WSL)
```bash
sudo apt install -y build-essential clang bison flex g++ gettext texinfo \
  ncurses-dev zlib1g-dev libssl-dev python3 python3-pip unzip file wget \
  rsync svn cmake ninja-build gawk bc git ca-certificates xxd perl-base

mkdir -p /work/openwrt
OPENWRT_DIR=/work/openwrt bash scripts/build.sh
# артефакты: /work/openwrt/bin/targets/ath79/generic/
#   openwrt-ath79-generic-tplink_tl-wr841hp-v3-squashfs-{factory,sysupgrade}.bin
```

### CI (GitHub Actions)
Пуш в `main`/`master` (или ручной запуск *workflow_dispatch*) сам соберёт прошивку,
загрузит её в артефакты и **обновит релиз** `ci-build` с готовыми `.bin` + `manifest` + `sha256sums.txt`.

```yaml
# nothing to configure: just push and MIKUDAYOOO
```

---

## <span style="color:#FF00E8">🔷 TL-WR840N v6.2 (4 МБ) · ramips/mt76x8</span>

**RU:** Ветка `wr840n-v6` — та же cybermiku, но под **TP-Link TL-WR840N v6.2**
(`ramips/mt76x8`, флеш **4 МБ**, RAM 32 МБ). Официальный OpenWrt эту версию не
поддерживает, поэтому в дерево добавлены DTS, запись устройства и правила сети
(`files/wr840n-v6/`). Жёсткий лимит образа — **3968 КБ** (kernel + squashfs),
поэтому конфиг ужат: без ppp, без IPv6, без opkg, `wpad-basic-mbedtls`,
`ttyd` + `libwebsockets-mbedtls`.

**EN:** Branch `wr840n-v6` — same cybermiku for the **TP-Link TL-WR840N v6.2**
(`ramips/mt76x8`, **4 MB** flash, 32 MB RAM). That revision is not supported
upstream, so `files/wr840n-v6/` carries the DTS, the device entry and the
network rules. Hard image limit is **3968 KB**, hence the trimmed config.

### Сборка · Build

```bash
# дерево openwrt уже клонировано и запинено (см. config/refs.env)
bash files/wr840n-v6/build.sh              # OPENWRT_TREE=$HOME/openwrt-build
# артефакты: ~/openwrt-build/bin/targets/ramips/mt76x8/
#   openwrt-ramips-mt76x8-tplink_tl-wr840n-v6.2-squashfs-sysupgrade.bin
```

`build.sh` копирует `packages/*` в `package/custom`, прогоняет `apply.py`
(добавляет поддержку v6.2 в дерево), ставит `config/wr840n-v6.config`,
делает `make defconfig` и собирает `make -j`.

### Прошивка · Flash (с 19.07 → 24.10)

```sh
scp openwrt-...-sysupgrade.bin root@192.168.1.1:/tmp/
# -F: другой branch/openwrt, board_name совпадает ("tplink,tl-wr840n-v6.2")
# -n: чистая конфигурация (19.07 -> 24.10 конфиги несовместимы)
ssh root@192.168.1.1 'sysupgrade -F -n /tmp/openwrt-...-sysupgrade.bin'
```



**RU:** Всегда делайте бэкап конфига!

**sysupgrade (с сохранением настроек):**
1. Скачайте `...-squashfs-sysupgrade.bin` с релиза.
2. Откройте LuCI → *System → Backup/Flash Firmware*, либо из CLI:
   ```sh
   scp openwrt-...-squashfs-sysupgrade.bin root@192.168.1.1:/tmp/
   ssh root@192.168.1.1 'sysupgrade -v /tmp/openwrt-...-squashfs-sysupgrade.bin'
   ```
3. После перезагрузки — `http://192.168.1.1` (логин `root`, пароль (первый вход — задать)).

**factory (полный сброс):** прошивается через TP-Link bootloader (TFTP/mise) —
используйте только если sysupgrade невозможен.

**EN:** Always back up your config first! Use the `sysupgrade` image to keep settings
(default: `sysupgrade` preserves `/etc/config`), or the `factory` image via the TP-Link
bootloader / TFTP for a clean slate.

---

## <span style="color:#00F0FF">🔷 Первый запуск · First boot</span>

```
http://192.168.1.1              # LuCI / SPA-дашборд
ssh root@192.168.1.1            # SSH (dropbear)
http://192.168.1.1:7681         # ttyd web terminal (вход: root / пароль)
```

Задайте пароль root при первом входе (иначе веб-интерфейс работает в «незащищённом» режиме).

> <span style="color:#FF00E8">МИКУКАЦААА... то есть, пароль root нужен обязательно!</span>

---

## <span style="color:#00F0FF">🔷 Примечания · Notes</span>

**RU:**
- LuCI работает по **HTTP** (TLS-стек вырезан ради размера образа). SSH/ttyd доступны всегда.
- Веб-терминал **ttyd** на `:7681` с авторизацией через `login` (root/пароль).
- Репитер на одноканальном радио делит эфир между апстримом и своим AP — пропускная способность ниже.
- Статус репитера — «живая» проверка (ассоциация + IP адрес), а не просто конфиг.

**EN:**
- LuCI runs over plain **HTTP** (TLS stack removed to fit 8 MB). SSH/ttyd remain available.
- The **ttyd** terminal (`:7681`) authenticates via `login` (root/password).
- Single-radio repeater shares the air between the remote link and your AP — throughput drops.
- Repeater status is a live check (association + IP), not a stale config echo.

---

## <span style="color:#00F0FF">🔷 Лицензия · License</span>

Собственный код: **MIT** (см. `LICENSE`). OpenWrt и фиды — под их лицензиями (в основном GPL-2.0).
«Hatsune Miku» © Crypton Future Media — используется как фанатская адаптация/арт; прошивка не аффилирована и не одобрена правообладателем.

---

<p align="center">
  <span style="color:#A5F3FC;font-size:13px">.·.MAW  MIKUDAYOOO~ MIKUDAYOOO~ «Спасибо, что топишь за гайд ого-го» .·.</span><br />
  <span style="color:#00F0FF">CYBERMIKU</span> <span style="color:#FF00E8">MIKU</span> — powered by OpenWrt 24.10-SNAPSHOT · ath79
</p>