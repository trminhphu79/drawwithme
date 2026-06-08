#!/usr/bin/env bash
#
# vn-firewall.sh — restrict the public web ports of this VPS to Vietnamese IPs.
#
# Why a script (not Caddy): the app runs in Docker, and Docker bypasses the
# normal iptables INPUT chain for published container ports. Geo-filtering must
# live in the DOCKER-USER chain, which this script manages. It also mirrors the
# rules for IPv6 and can install a systemd timer to refresh the IP list + re-apply
# on boot (ipset/iptables are not persistent by themselves).
#
# Usage (run as root on the VPS):
#   sudo ./scripts/vn-firewall.sh            # build VN sets + apply rules now
#   sudo ./scripts/vn-firewall.sh --install  # also install a weekly+boot systemd timer
#   sudo ./scripts/vn-firewall.sh --clear    # remove all rules + sets (open again)
#
# Env:
#   WEB_PORTS  ports to protect (default "80,443")
#   SCOPE      "web" (default) = only WEB_PORTS are VN-only.
#              "all" = ALSO drop non-VN on the host INPUT chain, EXCEPT SSH_PORT.
#   SSH_PORT   kept open in SCOPE=all so you don't lock yourself out (default 22)
#
# Source of VN CIDR blocks: https://www.ipdeny.com (aggregated zones).
set -euo pipefail

WEB_PORTS="${WEB_PORTS:-80,443}"
SCOPE="${SCOPE:-web}"
SSH_PORT="${SSH_PORT:-22}"
V4_URL="https://www.ipdeny.com/ipblocks/data/aggregated/vn-aggregated.zone"
V6_URL="https://www.ipdeny.com/ipv6/ipaddresses/aggregated/vn-aggregated.zone"
SELF="$(readlink -f "$0")"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
die() { echo "ERROR: $1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root (sudo)."
command -v ipset >/dev/null 2>&1 || die "ipset not installed. Try: apt-get install -y ipset"
command -v iptables >/dev/null 2>&1 || die "iptables not installed."
command -v curl >/dev/null 2>&1 || die "curl not installed."
HAS_V6=0; command -v ip6tables >/dev/null 2>&1 && HAS_V6=1

# ---- build/refresh an ipset from a remote CIDR list (atomic swap) ----
build_set() {
  local name="$1" family="$2" url="$3"
  local tmp="${name}_tmp"
  ipset create "$name" hash:net family "$family" -exist
  ipset create "$tmp"  hash:net family "$family" -exist
  ipset flush "$tmp"
  local n=0
  while read -r cidr; do
    [ -n "$cidr" ] || continue
    case "$cidr" in \#*) continue;; esac
    ipset add "$tmp" "$cidr" -exist && n=$((n + 1))
  done < <(curl -fsSL "$url")
  [ "$n" -gt 0 ] || die "Downloaded 0 ranges from $url (aborting to avoid lockout)."
  ipset swap "$tmp" "$name"
  ipset destroy "$tmp"
  echo "  $name: $n ranges"
}

apply_docker_user() {
  local ipt="$1" setname="$2"
  $ipt -N DOCKER-USER 2>/dev/null || true
  $ipt -F DOCKER-USER
  # Keep existing connections alive.
  $ipt -A DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
  # Allow Vietnam to the web ports; drop everyone else on those ports.
  $ipt -A DOCKER-USER -p tcp -m multiport --dports "$WEB_PORTS" -m set --match-set "$setname" src -j RETURN
  $ipt -A DOCKER-USER -p tcp -m multiport --dports "$WEB_PORTS" -j DROP
  # Everything else passes through to Docker as usual.
  $ipt -A DOCKER-USER -j RETURN
}

apply_host_input() {
  local ipt="$1" setname="$2"
  # SCOPE=all: lock the host itself to VN too, but never SSH (anti-lockout).
  $ipt -C INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT 2>/dev/null \
    || $ipt -I INPUT 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
  $ipt -C INPUT -i lo -j ACCEPT 2>/dev/null || $ipt -I INPUT 2 -i lo -j ACCEPT
  $ipt -C INPUT -p tcp --dport "$SSH_PORT" -j ACCEPT 2>/dev/null \
    || $ipt -I INPUT 3 -p tcp --dport "$SSH_PORT" -j ACCEPT
  $ipt -C INPUT -m set --match-set "$setname" src -j ACCEPT 2>/dev/null \
    || $ipt -A INPUT -m set --match-set "$setname" src -j ACCEPT
  $ipt -C INPUT -j DROP 2>/dev/null || $ipt -A INPUT -j DROP
}

clear_all() {
  log "Removing VN firewall rules"
  iptables -F DOCKER-USER 2>/dev/null && iptables -A DOCKER-USER -j RETURN || true
  [ "$HAS_V6" -eq 1 ] && { ip6tables -F DOCKER-USER 2>/dev/null && ip6tables -A DOCKER-USER -j RETURN || true; }
  for s in vn4 vn6; do ipset destroy "$s" 2>/dev/null || true; done
  echo "Cleared. (INPUT-chain rules from SCOPE=all are left in place — review with: iptables -L INPUT -n)"
}

install_timer() {
  log "Installing systemd service + weekly/boot timer"
  cat >/etc/systemd/system/vn-firewall.service <<UNIT
[Unit]
Description=Apply Vietnam-only firewall (DrawWithMe)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
Environment=WEB_PORTS=${WEB_PORTS} SCOPE=${SCOPE} SSH_PORT=${SSH_PORT}
ExecStart=${SELF}
UNIT
  cat >/etc/systemd/system/vn-firewall.timer <<'UNIT'
[Unit]
Description=Refresh Vietnam firewall IP set

[Timer]
OnBootSec=2min
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  systemctl enable --now vn-firewall.timer
  echo "Timer installed (runs on boot + weekly). Status: systemctl status vn-firewall.timer"
}

case "${1:-}" in
  --clear) clear_all; exit 0 ;;
esac

log "Building Vietnam IP sets"
build_set vn4 inet "$V4_URL"
if [ "$HAS_V6" -eq 1 ]; then
  build_set vn6 inet6 "$V6_URL" || echo "  (IPv6 list unavailable; skipping)"
fi

log "Applying rules (web ports: $WEB_PORTS, scope: $SCOPE)"
apply_docker_user iptables vn4
[ "$HAS_V6" -eq 1 ] && ipset list vn6 >/dev/null 2>&1 && apply_docker_user ip6tables vn6
if [ "$SCOPE" = "all" ]; then
  apply_host_input iptables vn4
  [ "$HAS_V6" -eq 1 ] && ipset list vn6 >/dev/null 2>&1 && apply_host_input ip6tables vn6
fi

if [ "${1:-}" = "--install" ]; then install_timer; fi

log "Done"
echo "Protected ports $WEB_PORTS now accept Vietnam IPs only."
echo "Re-run after deploys/reboots, or use --install for the systemd timer."
echo "To undo: sudo $SELF --clear"
