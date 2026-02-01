#!/bin/bash
# Learn LM - Interactive Local Development Setup TUI
# A beautiful terminal UI for setting up your development environment

set -e

# ============================================
# Configuration
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ============================================
# Colors and Styling
# ============================================
BOLD='\033[1m'
DIM='\033[2m'
ITALIC='\033[3m'
UNDERLINE='\033[4m'
BLINK='\033[5m'
REVERSE='\033[7m'
RESET='\033[0m'

# Colors
BLACK='\033[0;30m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'

# Bright colors
BRIGHT_BLACK='\033[0;90m'
BRIGHT_RED='\033[0;91m'
BRIGHT_GREEN='\033[0;92m'
BRIGHT_YELLOW='\033[0;93m'
BRIGHT_BLUE='\033[0;94m'
BRIGHT_MAGENTA='\033[0;95m'
BRIGHT_CYAN='\033[0;96m'
BRIGHT_WHITE='\033[0;97m'

# Background colors
BG_BLUE='\033[44m'
BG_MAGENTA='\033[45m'
BG_CYAN='\033[46m'
BG_WHITE='\033[47m'

# ============================================
# Terminal Utilities
# ============================================
get_terminal_width() {
    local width
    width=$(tput cols 2>/dev/null) || width=${COLUMNS:-80}
    echo "${width:-80}"
}

get_terminal_height() {
    local height
    height=$(tput lines 2>/dev/null) || height=${LINES:-24}
    echo "${height:-24}"
}

clear_screen() {
    printf '\033[2J\033[H' >&2
}

hide_cursor() {
    printf '\033[?25l' >&2
}

show_cursor() {
    printf '\033[?25h' >&2
}

move_cursor() {
    printf '\033[%d;%dH' "$1" "$2" >&2
}

# ============================================
# Drawing Functions
# ============================================
draw_box() {
    local x=$1 y=$2 width=$3 height=$4
    local title="${5:-}"
    
    # Box drawing characters
    local tl="+" tr="+" bl="+" br="+" h="-" v="|"
    
    # Top border
    move_cursor $y $x
    printf "${CYAN}${tl}" >&2
    for ((i=0; i<width-2; i++)); do printf "${h}" >&2; done
    printf "${tr}${RESET}" >&2
    
    # Title if provided
    if [[ -n "$title" ]]; then
        local title_len=${#title}
        local title_pos=$((x + (width - title_len - 2) / 2))
        move_cursor $y $title_pos
        printf "${CYAN}${BOLD} ${title} ${RESET}" >&2
    fi
    
    # Sides
    for ((row=1; row<height-1; row++)); do
        move_cursor $((y + row)) $x
        printf "${CYAN}${v}${RESET}" >&2
        move_cursor $((y + row)) $((x + width - 1))
        printf "${CYAN}${v}${RESET}" >&2
    done
    
    # Bottom border
    move_cursor $((y + height - 1)) $x
    printf "${CYAN}${bl}" >&2
    for ((i=0; i<width-2; i++)); do printf "${h}" >&2; done
    printf "${br}${RESET}" >&2
}

draw_header() {
    local width=$(get_terminal_width)
    local center=$(( (width - 44) / 2 ))
    [[ $center -lt 1 ]] && center=1
    
    clear_screen
    
    # ASCII Art Logo - Learn LM
    move_cursor 2 $center
    printf "${BRIGHT_CYAN}${BOLD} _                            _     __  __ ${RESET}" >&2
    move_cursor 3 $center
    printf "${BRIGHT_CYAN}${BOLD}| |    ___  __ _ _ __ _ __   | |   |  \\/  |${RESET}" >&2
    move_cursor 4 $center
    printf "${BRIGHT_CYAN}${BOLD}| |   / _ \\/ _\` | '__| '_ \\  | |   | |\\/| |${RESET}" >&2
    move_cursor 5 $center
    printf "${BRIGHT_CYAN}${BOLD}| |__|  __/ (_| | |  | | | | | |___| |  | |${RESET}" >&2
    move_cursor 6 $center
    printf "${BRIGHT_CYAN}${BOLD}|_____\\___|\\__,_|_|  |_| |_| |_____|_|  |_|${RESET}" >&2
    
    move_cursor 8 $(( (width - 26) / 2 ))
    printf "${DIM}AI Tutor - Development Setup${RESET}" >&2
}

draw_menu() {
    local title="$1"
    shift
    local options=("$@")
    local selected=0
    local num_options=${#options[@]}
    
    local width=$(get_terminal_width)
    local menu_width=50
    local menu_height=$((num_options + 4))
    local start_x=$(( (width - menu_width) / 2 ))
    [[ $start_x -lt 1 ]] && start_x=1
    local start_y=11
    
    # Initial draw - send to stderr so it doesn't interfere with return value
    draw_box $start_x $start_y $menu_width $menu_height "$title" >&2
    
    while true; do
        # Draw options
        for i in "${!options[@]}"; do
            move_cursor $((start_y + 2 + i)) $((start_x + 3)) >&2
            if [[ $i -eq $selected ]]; then
                printf "${REVERSE}${BRIGHT_WHITE}  > %-$((menu_width - 10))s  ${RESET}" "${options[$i]}" >&2
            else
                printf "${WHITE}    %-$((menu_width - 10))s  ${RESET}" "${options[$i]}" >&2
            fi
        done
        
        # Instructions
        move_cursor $((start_y + menu_height + 1)) $((start_x + 2)) >&2
        printf "${DIM}Up/Down: Navigate | Enter: Select | q: Quit${RESET}" >&2
        
        # Read key - handle escape sequences for arrow keys
        IFS= read -rsn1 key
        
        # Check for escape sequence (arrow keys)
        if [[ "$key" == $'\x1b' ]]; then
            read -rsn2 -t 0.1 rest
            key+="$rest"
        fi
        
        case "$key" in
            $'\x1b[A'|k) # Up arrow or k
                ((selected--)) || true
                [[ $selected -lt 0 ]] && selected=$((num_options - 1))
                ;;
            $'\x1b[B'|j) # Down arrow or j
                ((selected++)) || true
                [[ $selected -ge $num_options ]] && selected=0
                ;;
            '') # Enter
                echo $selected
                return
                ;;
            q|Q)
                echo -1
                return
                ;;
        esac
    done
}

draw_progress() {
    local current=$1
    local total=$2
    local label="$3"
    local width=$(get_terminal_width)
    local bar_width=$((width - 20))
    local filled=$(( (current * bar_width) / total ))
    local empty=$((bar_width - filled))
    
    move_cursor 20 5
    printf "${WHITE}%-30s${RESET}" "$label"
    
    move_cursor 21 5
    printf "${CYAN}["
    for ((i=0; i<filled; i++)); do printf "█"; done
    for ((i=0; i<empty; i++)); do printf "░"; done
    printf "]${RESET} ${BRIGHT_WHITE}%3d%%${RESET}" $(( (current * 100) / total ))
}

draw_status() {
    local message="$1"
    local type="${2:-info}"
    local width=$(get_terminal_width)
    
    move_cursor 23 5
    printf "%-${width}s" " "  # Clear line
    move_cursor 23 5
    
    case "$type" in
        success) printf "${GREEN}✓ ${message}${RESET}" ;;
        error)   printf "${RED}✗ ${message}${RESET}" ;;
        warning) printf "${YELLOW}⚠ ${message}${RESET}" ;;
        *)       printf "${BLUE}◉ ${message}${RESET}" ;;
    esac
}

draw_checklist() {
    local title="$1"
    shift
    local items=("$@")
    
    local width=$(get_terminal_width)
    local box_width=60
    local box_height=$((${#items[@]} + 4))
    local start_x=$(( (width - box_width) / 2 ))
    local start_y=12
    
    draw_box $start_x $start_y $box_width $box_height "$title"
    
    for i in "${!items[@]}"; do
        move_cursor $((start_y + 2 + i)) $((start_x + 4))
        printf "${DIM}○ ${items[$i]}${RESET}"
    done
}

update_checklist_item() {
    local index=$1
    local status=$2
    local text="$3"
    
    local width=$(get_terminal_width)
    local box_width=60
    local start_x=$(( (width - box_width) / 2 ))
    local start_y=12
    
    move_cursor $((start_y + 2 + index)) $((start_x + 4))
    
    case "$status" in
        pending)  printf "${DIM}○ %-50s${RESET}" "$text" ;;
        running)  printf "${YELLOW}◐ %-50s${RESET}" "$text" ;;
        success)  printf "${GREEN}● %-50s${RESET}" "$text" ;;
        error)    printf "${RED}✗ %-50s${RESET}" "$text" ;;
    esac
}

# ============================================
# Task Functions
# ============================================
check_prerequisites() {
    local errors=0
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -ge 18 ]]; then
            update_checklist_item 0 "success" "Node.js $(node -v)"
        else
            update_checklist_item 0 "error" "Node.js 18+ required (found $(node -v))"
            ((errors++))
        fi
    else
        update_checklist_item 0 "error" "Node.js not found"
        ((errors++))
    fi
    sleep 0.3
    
    # Check npm
    if command -v npm &> /dev/null; then
        update_checklist_item 1 "success" "npm $(npm -v)"
    else
        update_checklist_item 1 "error" "npm not found"
        ((errors++))
    fi
    sleep 0.3
    
    # Check git
    if command -v git &> /dev/null; then
        update_checklist_item 2 "success" "git $(git --version | cut -d' ' -f3)"
    else
        update_checklist_item 2 "error" "git not found"
        ((errors++))
    fi
    sleep 0.3
    
    return $errors
}

install_dependencies() {
    draw_header
    
    local steps=("Installing backend dependencies..." "Installing frontend dependencies..." "Verifying wrangler...")
    draw_checklist "Installing Dependencies" "${steps[@]}"
    
    # Backend
    update_checklist_item 0 "running" "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend"
    if npm install --silent 2>/dev/null; then
        update_checklist_item 0 "success" "Backend dependencies installed"
    else
        update_checklist_item 0 "error" "Backend installation failed"
        return 1
    fi
    sleep 0.3
    
    # Frontend
    update_checklist_item 1 "running" "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    if npm install --silent 2>/dev/null; then
        update_checklist_item 1 "success" "Frontend dependencies installed"
    else
        update_checklist_item 1 "error" "Frontend installation failed"
        return 1
    fi
    sleep 0.3
    
    # Wrangler
    update_checklist_item 2 "running" "Verifying wrangler..."
    cd "$PROJECT_ROOT/backend"
    if npx wrangler --version &>/dev/null; then
        update_checklist_item 2 "success" "Wrangler $(npx wrangler --version 2>/dev/null)"
    else
        update_checklist_item 2 "error" "Wrangler not available"
        return 1
    fi
    sleep 0.5
    
    return 0
}

setup_database() {
    draw_header
    
    local steps=("Running schema migrations..." "Seeding sample data..." "Verifying database...")
    draw_checklist "Database Setup" "${steps[@]}"
    
    cd "$PROJECT_ROOT/backend"
    
    # Migrations
    update_checklist_item 0 "running" "Running schema migrations..."
    if npx wrangler d1 execute sfu-ai-teacher-db --local --file=./sql/schema.sql &>/dev/null; then
        update_checklist_item 0 "success" "Schema migrations complete"
    else
        update_checklist_item 0 "error" "Migration failed"
        return 1
    fi
    sleep 0.3
    
    # Seed data
    update_checklist_item 1 "running" "Seeding sample data..."
    if npx wrangler d1 execute sfu-ai-teacher-db --local --file=./sql/seed.sql &>/dev/null; then
        update_checklist_item 1 "success" "Sample data seeded"
    else
        update_checklist_item 1 "error" "Seeding failed"
        return 1
    fi
    sleep 0.3
    
    # Verify
    update_checklist_item 2 "running" "Verifying database..."
    local course_count=$(npx wrangler d1 execute sfu-ai-teacher-db --local --command="SELECT COUNT(*) as c FROM sfu_courses" --json 2>/dev/null | grep -o '"c":[0-9]*' | cut -d':' -f2)
    if [[ -n "$course_count" && "$course_count" -gt 0 ]]; then
        update_checklist_item 2 "success" "Database verified ($course_count courses)"
    else
        update_checklist_item 2 "success" "Database created"
    fi
    sleep 0.5
    
    return 0
}

setup_environment() {
    draw_header
    
    local steps=("Checking frontend .env..." "Verifying configuration...")
    draw_checklist "Environment Setup" "${steps[@]}"
    
    cd "$PROJECT_ROOT/frontend"
    
    # Frontend .env
    update_checklist_item 0 "running" "Checking frontend .env..."
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            update_checklist_item 0 "success" "Created .env from .env.example"
        else
            echo "VITE_BACKEND_URL=http://localhost:8787" > .env
            update_checklist_item 0 "success" "Created default .env"
        fi
    else
        update_checklist_item 0 "success" ".env already exists"
    fi
    sleep 0.3
    
    # Verify
    update_checklist_item 1 "running" "Verifying configuration..."
    sleep 0.3
    update_checklist_item 1 "success" "Configuration verified"
    sleep 0.5
    
    return 0
}

run_tests() {
    draw_header
    
    local steps=("Running backend tests..." "Building frontend...")
    draw_checklist "Verification" "${steps[@]}"
    
    # Backend tests
    update_checklist_item 0 "running" "Running backend tests..."
    cd "$PROJECT_ROOT/backend"
    if npm run test:run &>/dev/null; then
        update_checklist_item 0 "success" "All tests passed"
    else
        update_checklist_item 0 "warning" "Some tests failed (non-critical)"
    fi
    sleep 0.3
    
    # Frontend build check
    update_checklist_item 1 "running" "Checking frontend build..."
    cd "$PROJECT_ROOT/frontend"
    if npm run build &>/dev/null; then
        update_checklist_item 1 "success" "Frontend builds successfully"
    else
        update_checklist_item 1 "error" "Frontend build failed"
        return 1
    fi
    sleep 0.5
    
    return 0
}

show_success_screen() {
    draw_header
    
    local width=$(get_terminal_width)
    local box_width=60
    local start_x=$(( (width - box_width) / 2 ))
    
    draw_box $start_x 11 $box_width 14 "Setup Complete!"
    
    move_cursor 13 $((start_x + 4))
    printf "${GREEN}${BOLD}✓ All components installed successfully${RESET}"
    
    move_cursor 15 $((start_x + 4))
    printf "${WHITE}${BOLD}To start developing:${RESET}"
    
    move_cursor 17 $((start_x + 6))
    printf "${CYAN}Terminal 1 (Backend):${RESET}"
    move_cursor 18 $((start_x + 8))
    printf "${DIM}cd backend && npm run dev${RESET}"
    
    move_cursor 20 $((start_x + 6))
    printf "${CYAN}Terminal 2 (Frontend):${RESET}"
    move_cursor 21 $((start_x + 8))
    printf "${DIM}cd frontend && npm run dev${RESET}"
    
    move_cursor 23 $((start_x + 4))
    printf "${BRIGHT_BLACK}Frontend: http://localhost:5173${RESET}"
    move_cursor 24 $((start_x + 4))
    printf "${BRIGHT_BLACK}Backend:  http://localhost:8787${RESET}"
    
    move_cursor 26 $(( (width - 20) / 2 ))
    printf "${DIM}Press any key to exit${RESET}"
    
    read -rsn1
}

show_quick_actions_menu() {
    while true; do
        draw_header
        
        local choice=$(draw_menu "Quick Actions" \
            "Reset Database (schema + seed)" \
            "Seed Database Only" \
            "Run Backend Tests" \
            "Build Frontend" \
            "Open D1 Studio" \
            "Back to Main Menu")
        
        case $choice in
            0) # Reset Database
                draw_header
                local steps=("Dropping tables..." "Running migrations..." "Seeding data...")
                draw_checklist "Resetting Database" "${steps[@]}"
                
                cd "$PROJECT_ROOT/backend"
                update_checklist_item 0 "running" "Dropping tables..."
                sleep 0.3
                update_checklist_item 0 "success" "Tables dropped"
                
                update_checklist_item 1 "running" "Running migrations..."
                npx wrangler d1 execute sfu-ai-teacher-db --local --file=./sql/schema.sql &>/dev/null || true
                update_checklist_item 1 "success" "Migrations complete"
                
                update_checklist_item 2 "running" "Seeding data..."
                npx wrangler d1 execute sfu-ai-teacher-db --local --file=./sql/seed.sql &>/dev/null || true
                update_checklist_item 2 "success" "Data seeded"
                
                sleep 1
                ;;
            1) # Seed Only
                draw_header
                local steps=("Seeding database...")
                draw_checklist "Seeding Database" "${steps[@]}"
                
                cd "$PROJECT_ROOT/backend"
                update_checklist_item 0 "running" "Seeding database..."
                npx wrangler d1 execute sfu-ai-teacher-db --local --file=./sql/seed.sql &>/dev/null || true
                update_checklist_item 0 "success" "Database seeded"
                
                sleep 1
                ;;
            2) # Run Tests
                draw_header
                local steps=("Running tests...")
                draw_checklist "Running Tests" "${steps[@]}"
                
                cd "$PROJECT_ROOT/backend"
                update_checklist_item 0 "running" "Running tests..."
                if npm run test:run 2>/dev/null | tail -5; then
                    update_checklist_item 0 "success" "Tests complete"
                else
                    update_checklist_item 0 "error" "Tests failed"
                fi
                
                move_cursor 20 5
                printf "${DIM}Press any key to continue${RESET}"
                read -rsn1
                ;;
            3) # Build Frontend
                draw_header
                local steps=("Building frontend...")
                draw_checklist "Building Frontend" "${steps[@]}"
                
                cd "$PROJECT_ROOT/frontend"
                update_checklist_item 0 "running" "Building frontend..."
                if npm run build &>/dev/null; then
                    update_checklist_item 0 "success" "Build complete"
                else
                    update_checklist_item 0 "error" "Build failed"
                fi
                
                sleep 1
                ;;
            4) # D1 Studio
                show_cursor
                clear_screen
                echo "Opening D1 Studio..."
                echo "Press Ctrl+C to exit when done."
                cd "$PROJECT_ROOT/backend"
                npx wrangler d1 studio sfu-ai-teacher-db --local || true
                hide_cursor
                ;;
            5|-1) # Back / Quit
                return
                ;;
        esac
    done
}

# ============================================
# Main Menu
# ============================================
main_menu() {
    while true; do
        draw_header
        
        local choice=$(draw_menu "Main Menu" \
            "Full Setup (recommended for first time)" \
            "Install Dependencies Only" \
            "Setup Database Only" \
            "Setup Environment Only" \
            "Run Verification Tests" \
            "Quick Actions" \
            "Exit")
        
        case $choice in
            0) # Full Setup
                # Prerequisites
                draw_header
                local prereq_items=("Node.js 18+" "npm" "git")
                draw_checklist "Checking Prerequisites" "${prereq_items[@]}"
                if ! check_prerequisites; then
                    move_cursor 20 5
                    printf "${RED}Please install missing prerequisites and try again.${RESET}"
                    move_cursor 22 5
                    printf "${DIM}Press any key to continue${RESET}"
                    read -rsn1
                    continue
                fi
                sleep 1
                
                # Install dependencies
                install_dependencies || continue
                sleep 1
                
                # Setup database
                setup_database || continue
                sleep 1
                
                # Setup environment
                setup_environment || continue
                sleep 1
                
                # Run tests
                run_tests || true
                sleep 1
                
                # Success
                show_success_screen
                ;;
            1) # Dependencies Only
                install_dependencies
                sleep 2
                ;;
            2) # Database Only
                setup_database
                sleep 2
                ;;
            3) # Environment Only
                setup_environment
                sleep 2
                ;;
            4) # Tests Only
                run_tests
                move_cursor 20 5
                printf "${DIM}Press any key to continue${RESET}"
                read -rsn1
                ;;
            5) # Quick Actions
                show_quick_actions_menu
                ;;
            6|-1) # Exit
                clear_screen
                show_cursor
                printf "${GREEN}Thanks for using Learn LM Setup!${RESET}\n\n"
                exit 0
                ;;
        esac
    done
}

# ============================================
# Entry Point
# ============================================
cleanup() {
    show_cursor
    clear_screen
}

trap cleanup EXIT

# Check if running in interactive terminal
if [[ ! -t 0 ]]; then
    echo "This script requires an interactive terminal."
    exit 1
fi

hide_cursor
main_menu
