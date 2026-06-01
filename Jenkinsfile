pipeline {

    agent any

    stages {

        stage('Install') {
            steps {
                sh 'npm install'
                sh 'npx playwright install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npx playwright test'
            }
        }
    }
}