pipeline {
    agent any

    tools {
        nodejs 'NodeJS-18'
    }

    environment {
        DOCKER_HUB_REPO  = 'anashossamops/taskmanager-api'
        DOCKER_CREDS     = 'dockerhub-creds'
        GIT_SHORT_HASH   = '' // will be set dynamically
        IMAGE_TAG        = '' // will be set dynamically
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '5'))
        // Same as the UI setting but defined as code
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {

                    GIT_SHORT_HASH = sh(
                        script: 'git rev-parse --short=7 HEAD',
                        returnStdout: true
                    ).trim()
                    IMAGE_TAG = "${BUILD_NUMBER}-${GIT_SHORT_HASH}"
                    echo "Building image tag: ${IMAGE_TAG}"
                }
            }
        }


        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }


        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }


        stage('Test') {
            steps {
                sh '''
                    docker run -d \
                        --name mongo-test-${BUILD_NUMBER} \
                        -p 27018:27017 \
                        mongo:7
                    
                    echo "Waiting for MongoDB to be ready..."
                    for i in $(seq 1 10); do
                        if docker exec mongo-test-${BUILD_NUMBER} mongosh --eval "db.runCommand('ping')" --quiet 2>/dev/null; then
                            echo "MongoDB is ready!"
                            break
                        fi
                        echo "Attempt $i: MongoDB not ready yet..."
                        sleep 2
                    done
                '''
                // Instead of a just "sleep 5"


                sh 'MONGO_URI=mongodb://localhost:27018/taskmanager-test npm test'
            }
            post {
                always {
                    sh '''
                        docker stop mongo-test-${BUILD_NUMBER} || true
                        docker rm mongo-test-${BUILD_NUMBER} || true
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build \
                        -f docker/Dockerfile \
                        --target production \
                        -t ${DOCKER_HUB_REPO}:${IMAGE_TAG} \
                        -t ${DOCKER_HUB_REPO}:latest \
                        --label "build.number=${BUILD_NUMBER}" \
                        --label "build.git.commit=${GIT_SHORT_HASH}" \
                        --label "build.timestamp=\$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                        .
                """

            }
        }


        stage('Security Scan') {
            steps {
                sh """
                    echo "Scanning image for vulnerabilities..."
                    trivy image \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        --format table \
                        ${DOCKER_HUB_REPO}:${IMAGE_TAG}
                """
                // If In production, --exit-code 1


                echo "Generating scan report..."
                sh """
                    trivy image \
                        --severity HIGH,CRITICAL \
                        --format json \
                        --output trivy-report.json \
                        ${DOCKER_HUB_REPO}:${IMAGE_TAG} || true
                """

            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                    // Saves the report in Jenkins build artifacts
                }
            }
        }


        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin
                        
                        echo "Pushing ${DOCKER_HUB_REPO}:${IMAGE_TAG}..."
                        docker push ${DOCKER_HUB_REPO}:${IMAGE_TAG}
                        
                        echo "Pushing ${DOCKER_HUB_REPO}:latest..."
                        docker push ${DOCKER_HUB_REPO}:latest
                        
                        docker logout
                    '''
                }
            }
        }
    }


    post {
        always {
            echo """
                ========================================
                Pipeline Summary
                ========================================
                Result:    ${currentBuild.currentResult}
                Image:     ${DOCKER_HUB_REPO}:${IMAGE_TAG}
                Duration:  ${currentBuild.durationString}
                Build:     #${BUILD_NUMBER}
                Commit:    ${GIT_SHORT_HASH}
                ========================================
            """
        }
        success {
            echo 'CI Pipeline succeeded! Image pushed to Docker Hub.'
        }
        failure {
            echo 'CI Pipeline failed! Check the logs above.'
        }
        cleanup {
            // Remove built images to save disk space
            sh """
                docker rmi ${DOCKER_HUB_REPO}:${IMAGE_TAG} || true
                docker rmi ${DOCKER_HUB_REPO}:latest || true
            """
            cleanWs()
        }
    }
}