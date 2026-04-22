#!/usr/bin/env python3
"""
Generate the nginx configuration for the Chesapeake Chatbot deployment.

Usage:
  # HTTP-only (no domain / no SSL):
  python3 scripts/generate-nginx-config.py nginx/nginx.conf > nginx/nginx.conf.deploy

  # With domain (SSL-enabled):
  DOMAIN_NAME=chatbot.example.com \
  ADMIN_EMAIL=admin@example.com \
  python3 scripts/generate-nginx-config.py nginx/nginx.conf > nginx/nginx.conf.deploy
"""

import os
import re
import sys


def strip_https_block(content: str) -> str:
    """Remove the HTTPS server block, identified by the marker comment."""
    marker = "# __HTTPS_SERVER_BLOCK_START__"
    start = content.find(marker)
    if start == -1:
        return content

    # Walk forward from the marker, counting braces until we close the server block.
    brace_count = 0
    i = start
    while i < len(content):
        ch = content[i]
        if ch == "{":
            brace_count += 1
        elif ch == "}":
            brace_count -= 1
            if brace_count == 0:
                i += 1  # include the closing brace
                break
        i += 1

    return content[:start] + content[i:]


def substitute_domain(content: str, domain: str, admin_email: str) -> str:
    """Replace __DOMAIN_NAME__ and __ADMIN_EMAIL__ placeholders."""
    content = content.replace("__DOMAIN_NAME__", domain)
    content = content.replace("__ADMIN_EMAIL__", admin_email)
    return content


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <nginx-template.conf>", file=sys.stderr)
        sys.exit(1)

    template_path = sys.argv[1]

    if not os.path.isfile(template_path):
        print(f"Error: template file not found: {template_path}", file=sys.stderr)
        sys.exit(1)

    with open(template_path) as f:
        content = f.read()

    domain = os.environ.get("DOMAIN_NAME", "").strip()

    if not domain:
        # No domain → HTTP-only config (strip the HTTPS server block)
        content = strip_https_block(content)
        # Also remove the placeholder from the HTTP server_name
        content = content.replace("__DOMAIN_NAME__", "_")
        content = content.replace("__ADMIN_EMAIL__", "admin@localhost")
        # Replace the HTTPS redirect with a direct proxy_pass
        content = content.replace(
            "            return 301 https://$host$request_uri;",
            "            proxy_pass http://chatbot_backend;\n"
            "            proxy_http_version 1.1;\n"
            "            proxy_set_header Upgrade $http_upgrade;\n"
            "            proxy_set_header Connection 'upgrade';\n"
            "            proxy_set_header Host $host;\n"
            "            proxy_set_header X-Real-IP $remote_addr;\n"
            "            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
            "            proxy_set_header X-Forwarded-Proto $scheme;\n"
            "            proxy_cache_bypass $http_upgrade;\n"
            "            proxy_buffering off;\n"
            "            proxy_redirect off;\n"
            "            proxy_connect_timeout 60s;\n"
            "            proxy_send_timeout 60s;\n"
            "            proxy_read_timeout 60s;",
        )
    else:
        admin_email = os.environ.get("ADMIN_EMAIL", f"admin@{domain}").strip()
        content = substitute_domain(content, domain, admin_email)

    sys.stdout.write(content)


if __name__ == "__main__":
    main()
