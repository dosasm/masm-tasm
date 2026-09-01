#!/usr/bin/env bash
# ============================================================================
# install-dosbox-x.sh
# -------------------
# Install DOSBox-X on Linux or macOS.
#
# Supported methods (in order of preference):
#   1. Package manager: apt (Ubuntu/Debian), dnf (Fedora), brew (macOS)
#   2. GitHub release:  download prebuilt binary from latest release
#   3. Flatpak:         com.dosbox_x.DOSBox-X (if flatpak is available)
#
# Usage:
#   chmod +x install-dosbox-x.sh
#   ./install-dosbox-x.sh            # auto-detect & install
#   ./install-dosbox-x.sh --help     # show this help
#   ./install-dosbox-x.sh --github   # force download from GitHub release
#   ./install-dosbox-x.sh --flatpak  # force install via flatpak
#   ./install-dosbox-x.sh --prefix ~/my-dosbox  # custom install prefix
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Defaults ────────────────────────────────────────────────────────────────
PREFIX="/usr/local"
FORCE_GITHUB=false
FORCE_FLATPAK=false
DOSBOX_X_VERSION="2026.08.02"

# ── Help ────────────────────────────────────────────────────────────────────
usage() {
    sed -n '3,16p' "$0"
    exit 0
}

# ── Parse arguments ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)    usage ;;
        --github)  FORCE_GITHUB=true; shift ;;
        --flatpak) FORCE_FLATPAK=true; shift ;;
        --prefix)  PREFIX="$2"; shift 2 ;;
        *)         error "Unknown option: $1"; usage ;;
    esac
done

# ── OS detection ────────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux)  OS="linux" ;;
    Darwin) OS="macos" ;;
    *)
        error "Unsupported OS: $OS (only Linux and macOS are supported)"
        exit 1
        ;;
esac

info "Detected: $OS ($ARCH)"

# ── Helper: check if a command exists ────────────────────────────────────────
cmd_exists() { command -v "$1" &>/dev/null; }

# ── Helper: check if dosbox-x is already installed ───────────────────────────
is_installed() {
    if cmd_exists dosbox-x; then
        local ver
        ver="$(dosbox-x -version 2>/dev/null | head -1 || true)"
        ok "DOSBox-X is already installed: ${ver:-version unknown}"
        return 0
    fi
    return 1
}

# ── Install via package manager ─────────────────────────────────────────────
install_from_package_manager() {
    info "Attempting installation via package manager..."

    if [[ "$OS" == "linux" ]]; then
        if cmd_exists apt; then
            info "Detected apt (Debian/Ubuntu)"
            sudo apt update
            sudo apt install -y dosbox-x
            return 0
        fi
        if cmd_exists dnf; then
            info "Detected dnf (Fedora)"
            sudo dnf install -y dosbox-x
            return 0
        fi
        if cmd_exists pacman; then
            info "Detected pacman (Arch Linux)"
            sudo pacman -S --noconfirm dosbox-x
            return 0
        fi
        if cmd_exists zypper; then
            info "Detected zypper (openSUSE)"
            sudo zypper install -y dosbox-x
            return 0
        fi
        warn "No supported package manager found (apt/dnf/pacman/zypper)"
        return 1
    fi

    if [[ "$OS" == "macos" ]]; then
        if cmd_exists brew; then
            info "Detected Homebrew"
            brew install dosbox-x
            return 0
        fi
        warn "Homebrew not found (install from https://brew.sh)"
        return 1
    fi

    return 1
}

# ── Install via Flatpak ─────────────────────────────────────────────────────
install_from_flatpak() {
    info "Attempting installation via Flatpak..."
    if ! cmd_exists flatpak; then
        warn "flatpak is not installed"
        return 1
    fi
    flatpak install -y flathub com.dosbox_x.DOSBox-X
    # Create a wrapper script so `dosbox-x` works from the command line
    local wrapper="$PREFIX/bin/dosbox-x"
    if [[ ! -f "$wrapper" ]]; then
        info "Creating wrapper script: $wrapper"
        sudo mkdir -p "$(dirname "$wrapper")"
        sudo tee "$wrapper" > /dev/null <<'WRAPPER'
#!/usr/bin/env bash
exec flatpak run com.dosbox_x.DOSBox-X "$@"
WRAPPER
        sudo chmod +x "$wrapper"
    fi
    return 0
}

# ── Install from GitHub release ─────────────────────────────────────────────
install_from_github() {
    info "Downloading DOSBox-X v${DOSBOX_X_VERSION} from GitHub..."

    local download_url=""
    local filename=""

    case "$OS" in
        linux)
            case "$ARCH" in
                x86_64)
                    filename="dosbox-x-linux-x86_64-${DOSBOX_X_VERSION}.tar.xz"
                    download_url="https://github.com/joncampbell123/dosbox-x/releases/download/dosbox-x-v${DOSBOX_X_VERSION}/${filename}"
                    ;;
                aarch64|arm64)
                    filename="dosbox-x-linux-aarch64-${DOSBOX_X_VERSION}.tar.xz"
                    download_url="https://github.com/joncampbell123/dosbox-x/releases/download/dosbox-x-v${DOSBOX_X_VERSION}/${filename}"
                    ;;
                *)
                    error "No prebuilt binary for Linux/$ARCH. Try without --github."
                    return 1
                    ;;
            esac
            ;;
        macos)
            case "$ARCH" in
                x86_64)
                    filename="dosbox-x-macos-x86_64-${DOSBOX_X_VERSION}.dmg"
                    download_url="https://github.com/joncampbell123/dosbox-x/releases/download/dosbox-x-v${DOSBOX_X_VERSION}/${filename}"
                    ;;
                arm64)
                    filename="dosbox-x-macos-arm64-${DOSBOX_X_VERSION}.dmg"
                    download_url="https://github.com/joncampbell123/dosbox-x/releases/download/dosbox-x-v${DOSBOX_X_VERSION}/${filename}"
                    ;;
                *)
                    error "No prebuilt binary for macOS/$ARCH. Try without --github."
                    return 1
                    ;;
            esac
            ;;
    esac

    if [[ -z "$download_url" ]]; then
        error "Could not determine download URL"
        return 1
    fi

    local tmpdir
    tmpdir="$(mktemp -d)"
    local archive="$tmpdir/$filename"

    info "Downloading: $download_url"
    if cmd_exists curl; then
        curl -fSL "$download_url" -o "$archive" || {
            error "Download failed. Check the version at https://github.com/joncampbell123/dosbox-x/releases"
            rm -rf "$tmpdir"
            return 1
        }
    elif cmd_exists wget; then
        wget "$download_url" -O "$archive" || {
            error "Download failed. Check the version at https://github.com/joncampbell123/dosbox-x/releases"
            rm -rf "$tmpdir"
            return 1
        }
    else
        error "Neither curl nor wget is available"
        rm -rf "$tmpdir"
        return 1
    fi

    if [[ "$OS" == "linux" ]]; then
        info "Extracting to $PREFIX"
        sudo mkdir -p "$PREFIX/bin"
        sudo tar -xJf "$archive" -C "$PREFIX/bin" --strip-components=1 \
            --wildcards '*/dosbox-x' 2>/dev/null || \
        sudo tar -xJf "$archive" -C "$PREFIX/bin" --strip-components=1 \
            --wildcards '*/dosbox-x' 2>/dev/null || {
            # If extraction with strip fails, extract fully and find the binary
            local extract_dir="$tmpdir/extracted"
            mkdir -p "$extract_dir"
            tar -xJf "$archive" -C "$extract_dir"
            local binary
            binary="$(find "$extract_dir" -name 'dosbox-x' -type f 2>/dev/null | head -1)"
            if [[ -n "$binary" ]]; then
                sudo cp "$binary" "$PREFIX/bin/dosbox-x"
            else
                error "Could not find dosbox-x binary in the archive"
                rm -rf "$tmpdir"
                return 1
            fi
        }
        sudo chmod +x "$PREFIX/bin/dosbox-x"
    elif [[ "$OS" == "macos" ]]; then
        info "Mounting DMG and copying to /Applications..."
        local volume
        volume="$(hdiutil attach "$archive" -nobrowse | tail -1 | awk '{print $3}')"
        if [[ -n "$volume" ]]; then
            sudo cp -R "$volume/DOSBox-X.app" /Applications/
            hdiutil detach "$volume" &>/dev/null
            # Create a symlink in PATH
            if [[ ! -f /usr/local/bin/dosbox-x ]]; then
                sudo mkdir -p /usr/local/bin
                sudo ln -sf /Applications/DOSBox-X.app/Contents/MacOS/dosbox-x /usr/local/bin/dosbox-x
            fi
        else
            error "Failed to mount DMG"
            rm -rf "$tmpdir"
            return 1
        fi
    fi

    rm -rf "$tmpdir"
    ok "DOSBox-X v${DOSBOX_X_VERSION} installed to $PREFIX/bin/dosbox-x"
    return 0
}

# ── Main ────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "=============================================="
    echo "  DOSBox-X Installer for masm-tasm"
    echo "=============================================="
    echo ""

    # If already installed, ask whether to reinstall
    if is_installed; then
        echo ""
        read -r -p "Reinstall anyway? [y/N] " reply
        if [[ ! "$reply" =~ ^[Yy]$ ]]; then
            info "Skipping installation."
            exit 0
        fi
        echo ""
    fi

    # Install
    if [[ "$FORCE_FLATPAK" == true ]]; then
        install_from_flatpak || {
            error "Flatpak installation failed"
            exit 1
        }
    elif [[ "$FORCE_GITHUB" == true ]]; then
        install_from_github || {
            error "GitHub release installation failed"
            exit 1
        }
    else
        # Try package manager first, then flatpak, then GitHub release
        if install_from_package_manager; then
            :  # success
        elif install_from_flatpak; then
            :  # success
        elif install_from_github; then
            :  # success
        else
            error "All installation methods failed."
            echo ""
            echo "  Please install DOSBox-X manually from:"
            echo "    https://github.com/joncampbell123/dosbox-x/releases"
            echo ""
            echo "  Or via Flatpak:"
            echo "    flatpak install flathub com.dosbox_x.DOSBox-X"
            echo ""
            exit 1
        fi
    fi

    # Verify
    echo ""
    if cmd_exists dosbox-x; then
        local ver
        ver="$(dosbox-x -version 2>/dev/null | head -1 || echo "(version unknown)")"
        ok "DOSBox-X installed successfully: $ver"
    else
        warn "dosbox-x command not found in PATH after installation."
        echo "  You may need to add $PREFIX/bin to your PATH, or"
        echo "  restart your terminal."
    fi

    # Check if the project references it
    local conf_path
    conf_path="$(find "$PROJECT_DIR" -path '*/resources/dosbox-x/dosbox-x.reference.full.conf' -type f 2>/dev/null | head -1)"
    if [[ -n "$conf_path" ]]; then
        echo ""
        info "The project already includes a DOSBox-X reference config at:"
        echo "  $conf_path"
    fi

    echo ""
    info "To configure DOSBox-X in masm-tasm, set these VS Code settings:"
    echo '  "masmtasm.command.dosboxX": "dosbox-x -nopromptfolder"'
    echo '  "masmtasm.ASM.emulator": "dosbox-x"'
    echo ""
    info "Done."
}

main "$@"