#!/usr/bin/env bash
# =============================================================================
# Chesapeake City Chatbot — SSL Certificate Generation
# =============================================================================
# This script generates SSL certificates for the chatbot deployment.
# It can generate self-signed certificates for development/testing
# and is designed to work with the deployment workflow.
#
# Usage:
#   # Generate self-signed certificates (default)
#   ./scripts/generate-ssl-certs.sh
#
#   # Specify domain
#   DOMAIN=chesapeakechatbot.chat ./scripts/generate-ssl-certs.sh
#
#   # Specify output directory
#   SSL_DIR=./nginx/ssl ./scripts/generate-ssl-certs.sh
#
# Environment variables:
#   DOMAIN      — Domain name for certificate (default: extracted from nginx config)
#   SSL_DIR     — Output directory for certificates (default: ./nginx/ssl)
#   SKIP_DHPARAM — Set to "true" to skip DH param generation
#   DAYS        — Certificate validity in days (default: 365)
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

# ── Configuration ─────────────────────────────────────────────────────────────
# Default values
DEFAULT_DOMAIN="localhost"
DEFAULT_SSL_DIR="./nginx/ssl"
DEFAULT_DAYS=365

# Use environment variables or defaults
DOMAIN="${DOMAIN:-}"
SSL_DIR="${SSL_DIR:-$DEFAULT_SSL_DIR}"
SKIP_DHPARAM="${SKIP_DHPARAM:-false}"
DAYS="${DAYS:-$DEFAULT_DAYS}"

# Certificate file paths
PRIVKEY_FILE="$SSL_DIR/privkey.pem"
FULLCHAIN_FILE="$SSL_DIR/fullchain.pem"
CHAIN_FILE="$SSL_DIR/chain.pem"
DHPARAM_FILE="$SSL_DIR/dhparam.pem"

# ── Functions ─────────────────────────────────────────────────────────────────

# Extract domain from nginx configuration
extract_domain_from_nginx() {
    local nginx_conf="${1:-./nginx/nginx.conf}"

    if [[ -f "$nginx_conf" ]]; then
        # Try to extract domain from server_name directive in HTTPS block
        local domain=$(grep "server_name" "$nginx_conf" | tail -1 | awk '{print $2}' | sed 's/;//')

        # Check if domain is valid (not placeholder or underscore)
        if [[ -n "$domain" && "$domain" != "_" && "$domain" != "__DOMAIN_NAME__" ]]; then
            echo "$domain"
            return 0
        fi
    fi

    return 1
}

# Check if OpenSSL is available
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        err "OpenSSL is not installed or not in PATH"
        return 1
    fi
    return 0
}

# Generate self-signed certificate
generate_self_signed_cert() {
    local domain="$1"
    local days="$2"

    info "Generating self-signed certificate for: $domain (valid for ${days} days)"

    # Generate private key and certificate
    openssl req -x509 -nodes -days "$days" -newkey rsa:2048 \
        -keyout "$PRIVKEY_FILE" \
        -out "$FULLCHAIN_FILE" \
        -subj "/C=US/ST=Virginia/L=Chesapeake/O=Chesapeake City/CN=$domain" 2>/dev/null

    if [[ $? -ne 0 ]]; then
        err "Failed to generate self-signed certificate"
        return 1
    fi

    # Create chain.pem (same as fullchain for self-signed)
    cp "$FULLCHAIN_FILE" "$CHAIN_FILE" 2>/dev/null || true

    ok "Self-signed certificate generated"
    return 0
}

# Generate DH parameters
generate_dh_params() {
    info "Generating 2048-bit DH parameters (this may take a minute)..."

    if openssl dhparam -out "$DHPARAM_FILE" 2048 2>/dev/null; then
        ok "DH parameters generated"
        return 0
    else
        warn "Failed to generate DH parameters"
        return 1
    fi
}

# Check if certificates already exist
check_existing_certs() {
    if [[ -f "$PRIVKEY_FILE" && -f "$FULLCHAIN_FILE" ]]; then
        return 0
    fi
    return 1
}

# Print certificate information
print_cert_info() {
    if [[ -f "$FULLCHAIN_FILE" ]]; then
        info "Certificate information:"
        openssl x509 -in "$FULLCHAIN_FILE" -noout -text 2>/dev/null | \
            grep -A1 "Subject:" | \
            sed 's/^/  /'
        openssl x509 -in "$FULLCHAIN_FILE" -noout -dates 2>/dev/null | \
            sed 's/^/  /'
    fi
}

# ── Main script ───────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "=============================================="
    echo "  SSL Certificate Generation"
    echo "=============================================="
    echo ""

    # ── 1. Check prerequisites ──────────────────────────────────────────────
    info "Checking prerequisites..."
    if ! check_openssl; then
        exit 1
    fi

    # ── 2. Determine domain ────────────────────────────────────────────────
    if [[ -z "$DOMAIN" ]]; then
        info "Domain not specified, attempting to extract from nginx config..."
        DOMAIN=$(extract_domain_from_nginx)

        if [[ -z "$DOMAIN" ]]; then
            warn "Could not extract domain from nginx config, using default: $DEFAULT_DOMAIN"
            DOMAIN="$DEFAULT_DOMAIN"
        fi
    fi

    info "Using domain: $DOMAIN"

    # ── 3. Create SSL directory ────────────────────────────────────────────
    info "Creating SSL directory: $SSL_DIR"
    mkdir -p "$SSL_DIR"

    # ── 4. Check for existing certificates ─────────────────────────────────
    if check_existing_certs; then
        ok "SSL certificates already exist in $SSL_DIR"
        print_cert_info

        # Check if we should regenerate DH params
        if [[ "$SKIP_DHPARAM" != "true" && ! -f "$DHPARAM_FILE" ]]; then
            generate_dh_params || true
        fi

        echo ""
        ok "SSL setup complete (using existing certificates)"
        exit 0
    fi

    warn "SSL certificates not found, generating new ones..."

    # ── 5. Generate certificates ───────────────────────────────────────────
    if ! generate_self_signed_cert "$DOMAIN" "$DAYS"; then
        err "Failed to generate SSL certificates"
        exit 1
    fi

    # ── 6. Generate DH parameters (if not skipped) ────────────────────────
    if [[ "$SKIP_DHPARAM" != "true" ]]; then
        generate_dh_params || warn "DH parameters not generated, but continuing..."
    fi

    # ── 7. Set permissions ────────────────────────────────────────────────
    chmod 644 "$FULLCHAIN_FILE" "$CHAIN_FILE" 2>/dev/null || true
    chmod 600 "$PRIVKEY_FILE" 2>/dev/null || true
    chmod 644 "$DHPARAM_FILE" 2>/dev/null || true

    # ── 8. Print summary ──────────────────────────────────────────────────
    echo ""
    ok "SSL certificates generated successfully!"
    info "Files created in $SSL_DIR:"
    info "  - privkey.pem    (private key)"
    info "  - fullchain.pem  (certificate)"
    info "  - chain.pem      (certificate chain)"
    if [[ -f "$DHPARAM_FILE" ]]; then
        info "  - dhparam.pem    (DH parameters)"
    fi

    print_cert_info

    echo ""
    warn "IMPORTANT: These are self-signed certificates for development/testing."
    warn "For production, replace with Let's Encrypt certificates:"
    warn "  1. Update nginx/nginx.conf with your domain"
    warn "  2. Run: certbot certonly --webroot -w /var/www/letsencrypt"
    warn "  3. Copy certificates to $SSL_DIR/"
    echo ""
    ok "SSL setup complete"
}

# ── Error handling and execution ──────────────────────────────────────────────
trap 'err "Script interrupted"; exit 1' INT TERM

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
