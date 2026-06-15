#!/bin/bash
# ============================================================
# 表单自动设计器 - 启动脚本
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

# ==================== 环境检查 ====================
check_docker() {
    log_step "检查 Docker 环境..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        log_error "麒麟系统: sudo yum install docker-ce"
        log_error "Ubuntu:   sudo apt-get install docker-ce"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker 服务未启动，请执行: sudo systemctl start docker"
        exit 1
    fi

    local docker_version
    docker_version=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    log_info "Docker 版本: ${docker_version}"
}

check_docker_compose() {
    log_step "检查 Docker Compose 环境..."
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
        local compose_version
        compose_version=$(docker compose version --short 2>/dev/null || echo "unknown")
        log_info "Docker Compose (plugin) 版本: ${compose_version}"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        local compose_version
        compose_version=$(docker-compose --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_info "Docker Compose (standalone) 版本: ${compose_version}"
    else
        log_error "Docker Compose 未安装"
        log_error "请安装 Docker Compose 插件或独立版本"
        exit 1
    fi
}

check_env_file() {
    log_step "检查环境变量文件..."
    if [ ! -f "${ENV_FILE}" ]; then
        log_error "环境变量文件不存在: ${ENV_FILE}"
        exit 1
    fi
    log_info "环境变量文件: ${ENV_FILE}"
}

# ==================== 端口检查 ====================
check_port() {
    local port=$1
    local service=$2
    if ss -tlnp 2>/dev/null | grep -q ":${port} " || \
       netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
        log_warn "端口 ${port} 已被占用 (${service})，请检查是否有冲突"
        return 1
    fi
    return 0
}

check_ports() {
    log_step "检查端口占用..."
    local ports=(3306 6379 2181 9092 9000 9001 8000 50051 8080)
    local services=("MySQL" "Redis" "Zookeeper" "Kafka" "MinIO-API" "MinIO-Console" "AI-HTTP" "AI-gRPC" "Backend")
    local has_conflict=0

    for i in "${!ports[@]}"; do
        if ! check_port "${ports[$i]}" "${services[$i]}"; then
            has_conflict=1
        fi
    done

    if [ "${has_conflict}" -eq 1 ]; then
        log_warn "存在端口冲突，可修改 .env 文件中的端口配置"
        read -rp "是否继续启动？(y/N): " confirm
        if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
            log_info "已取消启动"
            exit 0
        fi
    else
        log_info "所有端口检查通过"
    fi
}

# ==================== 启动服务 ====================
start_services() {
    log_step "启动所有服务..."
    cd "${COMPOSE_DIR}"

    ${COMPOSE_CMD} --env-file "${ENV_FILE}" up -d

    log_info "所有容器已启动，等待服务就绪..."
}

# ==================== 等待服务就绪 ====================
wait_for_service() {
    local service=$1
    local max_wait=$2
    local elapsed=0

    while [ ${elapsed} -lt ${max_wait} ]; do
        local status
        status=$(${COMPOSE_CMD} -f "${COMPOSE_DIR}/docker-compose.yml" ps "${service}" --format json 2>/dev/null | grep -oP '"Health"\s*:\s*"\K[^"]+' || echo "unknown")
        if [ "${status}" = "healthy" ]; then
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    echo ""
    return 1
}

wait_for_services() {
    log_step "等待服务就绪..."

    local services=("mysql" "redis" "zookeeper" "kafka" "minio" "form-ai-service" "form-designer-backend")
    local max_waits=(60 30 30 60 30 60 120)

    for i in "${!services[@]}"; do
        echo -n "  等待 ${services[$i]} 就绪"
        if wait_for_service "${services[$i]}" "${max_waits[$i]}"; then
            log_info "${services[$i]} 已就绪"
        else
            log_warn "${services[$i]} 等待超时，请手动检查状态"
        fi
    done
}

# ==================== 输出状态 ====================
print_status() {
    echo ""
    echo "============================================================"
    echo "  表单自动设计器 - 服务状态"
    echo "============================================================"
    ${COMPOSE_CMD} -f "${COMPOSE_DIR}/docker-compose.yml" ps
    echo ""
    echo "============================================================"
    echo "  访问地址"
    echo "============================================================"

    local host_ip
    host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

    source "${ENV_FILE}" 2>/dev/null || true

    echo "  后端服务:     http://${host_ip}:${BACKEND_PORT:-8080}"
    echo "  AI识别服务:   http://${host_ip}:${AI_SERVICE_HTTP_PORT:-8000}"
    echo "  MinIO控制台:  http://${host_ip}:${MINIO_CONSOLE_PORT:-9001}"
    echo "  MySQL:        ${host_ip}:${MYSQL_PORT:-3306}"
    echo "  Redis:        ${host_ip}:${REDIS_PORT:-6379}"
    echo "  Kafka:        ${host_ip}:${KAFKA_PORT:-9092}"
    echo "============================================================"
    echo ""
}

# ==================== 主流程 ====================
main() {
    echo ""
    echo "============================================================"
    echo "  表单自动设计器 - 一键启动"
    echo "  系统: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || uname -a)"
    echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================================"
    echo ""

    check_docker
    check_docker_compose
    check_env_file
    check_ports
    start_services
    wait_for_services
    print_status

    log_info "启动完成！"
}

main "$@"
