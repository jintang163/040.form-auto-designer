#!/bin/bash
# ============================================================
# 表单自动设计器 - 停止脚本
# 支持麒麟(Kylin)系统 / CentOS / Ubuntu
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")/docker"
ENV_FILE="${COMPOSE_DIR}/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }

detect_compose_cmd() {
    if docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo ""
    fi
}

stop_services() {
    local COMPOSE_CMD
    COMPOSE_CMD=$(detect_compose_cmd)

    if [ -z "${COMPOSE_CMD}" ]; then
        log_error "Docker Compose 未安装"
        exit 1
    fi

    log_step "停止所有服务..."
    cd "${COMPOSE_DIR}"

    ${COMPOSE_CMD} --env-file "${ENV_FILE}" down

    log_info "所有服务已停止"
}

stop_and_remove() {
    local COMPOSE_CMD
    COMPOSE_CMD=$(detect_compose_cmd)

    if [ -z "${COMPOSE_CMD}" ]; then
        log_error "Docker Compose 未安装"
        exit 1
    fi

    log_step "停止服务并删除数据卷..."
    cd "${COMPOSE_DIR}"

    ${COMPOSE_CMD} --env-file "${ENV_FILE}" down -v

    log_info "所有服务已停止，数据卷已删除"
}

show_status() {
    local COMPOSE_CMD
    COMPOSE_CMD=$(detect_compose_cmd)

    if [ -z "${COMPOSE_CMD}" ]; then
        log_error "Docker Compose 未安装"
        exit 1
    fi

    echo ""
    echo "============================================================"
    echo "  表单自动设计器 - 当前服务状态"
    echo "============================================================"
    ${COMPOSE_CMD} -f "${COMPOSE_DIR}/docker-compose.yml" ps 2>/dev/null || echo "  无运行中的服务"
    echo "============================================================"
    echo ""
}

print_usage() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  (无)      停止所有服务（保留数据）"
    echo "  -v        停止服务并删除数据卷（清除所有数据）"
    echo "  -s        查看服务状态"
    echo "  -h        显示帮助信息"
    echo ""
}

main() {
    local action="stop"

    while getopts "vsh" opt; do
        case ${opt} in
            v) action="remove" ;;
            s) action="status" ;;
            h) action="help" ;;
            *) action="help" ;;
        esac
    done

    case ${action} in
        stop)
            echo ""
            echo "============================================================"
            echo "  表单自动设计器 - 停止服务"
            echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "============================================================"
            echo ""
            stop_services
            ;;
        remove)
            echo ""
            echo "============================================================"
            echo "  表单自动设计器 - 停止服务并清除数据"
            echo "  警告: 此操作将删除所有数据卷，数据不可恢复！"
            echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "============================================================"
            echo ""
            read -rp "确认删除所有数据卷？(yes/N): " confirm
            if [ "${confirm}" = "yes" ]; then
                stop_and_remove
            else
                log_info "已取消，仅停止服务..."
                stop_services
            fi
            ;;
        status)
            show_status
            ;;
        help)
            print_usage
            ;;
    esac
}

main "$@"
