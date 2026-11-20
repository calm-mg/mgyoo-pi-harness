pipeline {
    agent { label 'linux-arm64' }
    options { timeout(time: 30, unit: 'MINUTES') }

    stages {
        stage('Check agent') {
            steps {
                sh '''
                    set -eu
                    command -v node >/dev/null || { echo 'Install Node.js 24+ on the Jenkins agent.' >&2; exit 1; }
                    node lib/cli.mjs doctor pi
                    case "$(docker info --format '{{.OSType}}/{{.Architecture}}')" in
                        linux/aarch64|linux/arm64) ;;
                        *) echo 'A local Linux arm64 Docker engine is required.' >&2; exit 1 ;;
                    esac
                '''
            }
        }
        stage('Test and install in Docker') {
            steps {
                sh '''
                    set -eu
                    image=$(docker build --quiet --target ci-base -f container/Dockerfile .)
                    docker run --rm --user "$(id -u):$(id -g)" --env HOME=/tmp/ci-home \
                        --volume "$PWD:/work" --workdir /work "$image" sh -ec '
                            mkdir -p "$HOME"
                            npm ci --ignore-scripts --no-audit --no-fund
                            npm run check
                            sh install.sh
                            "$HOME/.local/bin/harness" setup pi --dry-run
                            "$HOME/.local/bin/harness" setup omp --dry-run
                        '
                '''
            }
        }
        stage('Pi and OMP Docker boundary') {
            steps {
                sh 'sh tests/container/smoke.sh'
            }
        }
    }
}
