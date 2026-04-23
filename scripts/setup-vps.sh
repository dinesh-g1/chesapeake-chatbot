#!/usr/bin/env bash
# =============================================================================
# Chesapeake City Chatbot — VPS Initial Setup
# =============================================================================
# Run this ONCE on your fresh VPS before the first GitHub Actions deploy.
#
# Usage:
#   chmod +x scripts/setup-vps.sh
#   ssh root@<VPS_IP> bash -s < scripts/setup-vps.sh
#
# Or copy it to the VPS and run:
#   scp scripts/setup-vps.sh root@<VPS_IP>:/tmp/
#   ssh root@<VPS_IP> bash /tmp/setup-vps.sh
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Preflight checks ─────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root (use sudo or run as root user)"
    exit 1
fi

echo ""
echo "=============================================="
echo " Chesapeake City Chatbot — VPS Setup"
echo "=============================================="
echo ""

# ── 1. System updates ────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
ok "System packages updated"

# ── 2. Install essential packages ────────────────────────────────────────────
info "Installing essential packages..."
apt-get install -y -qq \
    apt-transport-https \
    ca-certificates \
    curl \
    wget \
    gnupg \
    lsb-release \
    software-properties-common \
    ufw \
    git \
    rsync \
    htop \
    net-tools
ok "Essential packages installed"

# ── 3. Docker installation ───────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    ok "Docker installed: $(docker --version)"
else
    ok "Docker already installed: $(docker --version)"
fi

# ── 4. Docker Compose plugin ─────────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
    info "Installing Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin
    ok "Docker Compose installed: $(docker compose version)"
else
    ok "Docker Compose already installed: $(docker compose version)"
fi

# ── 5. Docker post-install ───────────────────────────────────────────────────
info "Configuring Docker..."

# Enable Docker to start on boot
systemctl enable docker
systemctl start docker

# Create deploy user (if not exists)
if ! id -u deploy &>/dev/null; then
    info "Creating 'deploy' user..."
    useradd -m -s /bin/bash -G docker deploy
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    touch /home/deploy/.ssh/authorized_keys
    chmod 600 /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    ok "User 'deploy' created and added to docker group"
else
    warn "User 'deploy' already exists — ensuring they're in the docker group"
    usermod -aG docker deploy
fi

# ── 6. Application directory ─────────────────────────────────────────────────
info "Setting up application directory..."
mkdir -p /opt/chesapeake-chatbot/{data,caddy}
ok "Application directory created at /opt/chesapeake-chatbot"

# ── 7. Caddy data directory ─────────────────────────────────────────────────
# Caddy automatically provisions and renews Let's Encrypt certificates.
# No manual certbot, dhparam, or SSL scripts needed. It stores certificates
# in its own data directory (mounted as a Docker volume in docker-compose.yml).
mkdir -p /opt/chesapeake-chatbot/caddy
ok "Caddy data directory created"

# ── 8. Firewall (UFW) ────────────────────────────────────────────────────────
info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp comment 'SSH'

# HTTP / HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Docker networks — allow internal traffic
ufw allow in on docker0 comment 'Docker bridge'

ufw --force enable
ok "Firewall configured and enabled"

# ── 9. Security hardening (SSH) ──────────────────────────────────────────────
SSHD_CONFIG="/etc/ssh/sshd_config"
if grep -q "^PasswordAuthentication" "$SSHD_CONFIG"; then
    sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
else
    echo "PasswordAuthentication no" >> "$SSHD_CONFIG"
fi

if grep -q "^PermitRootLogin" "$SSHD_CONFIG"; then
    sed -i 's/^PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD_CONFIG"
else
    echo "PermitRootLogin prohibit-password" >> "$SSHD_CONFIG"
fi

systemctl reload sshd
ok "SSH hardened (password auth disabled, root login restricted)"

# ── 10. Swap (for low-memory VPS) ────────────────────────────────────────────
if [[ $(free -m | awk '/^Mem:/{print $2}') -lt 4000 ]]; then
    if ! swapon --show | grep -q .; then
        info "Adding 2GB swap file..."
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        ok "Swap file created (2GB)"
    else
        ok "Swap already active"
    fi
fi

# ── 11. Docker systemd resource limits ───────────────────────────────────────
info "Configuring Docker daemon for production..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKER_EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "experimental": true
}
DOCKER_EOF
systemctl restart docker
ok "Docker daemon configured"

# ── 12. Ownership fix ────────────────────────────────────────────────────────
chown -R deploy:deploy /opt/chesapeake-chatbot
ok "Ownership set to deploy user"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo " ✅  VPS Setup Complete!"
echo "=============================================="
echo ""
echo " Next steps:"
echo ""
echo "  1. Add your SSH public key to deploy user:"
echo "     ssh-copy-id deploy@<VPS_IP>"
echo "     or manually:"
echo "     cat ~/.ssh/id_rsa.pub | ssh root@<VPS_IP> 'tee -a /home/deploy/.ssh/authorized_keys'"
echo ""
echo "  2. Get the SSH host key fingerprint for GitHub Secrets:"
echo "     ssh-keyscan -H <VPS_IP>"
echo "     (paste the output as VPS_KNOWN_HOSTS secret)"
echo ""
echo "  3. No SSL setup needed! Caddy automatically:"
echo "     • Obtains Let's Encrypt certificates on first request"
echo "     • Renews certificates automatically before expiry"
echo "     • Redirects HTTP → HTTPS automatically"
echo "     Just ensure DNS A records point to this server's IP."
echo ""
echo "  4. Configure GitHub Secrets (see .github/workflows/deploy.yml for list)"
echo "     Required secrets:"
echo "       - VPS_SSH_KEY, VPS_KNOWN_HOSTS, VPS_USER, VPS_HOST"
echo "       - DOMAIN_NAME (e.g. chesapeakechatbot.chat)"
echo "       - LLM_API_KEY (for DeepSeek)"
echo ""
echo "  5. Push to main — the deploy workflow will handle the rest!"
echo ""
echo "=============================================="
