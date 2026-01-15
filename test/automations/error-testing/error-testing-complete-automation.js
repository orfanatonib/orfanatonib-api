#!/usr/bin/env node

/**
 * Error Testing Automation
 * Testa todos os cenários de erro da API para garantir que o tratamento está funcionando
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPass123!';

class ErrorTestingAutomation {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
        });
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.authToken = null;
    }

    async run() {
        console.log('🚀 Starting Error Testing Automation');
        console.log('=' .repeat(50));

        try {
            // Login para obter token (se disponível)
            await this.attemptLogin();

            // Executar todos os testes de erro
            await this.runAllErrorTests();

            // Gerar relatório
            await this.generateReport();

            console.log('\n' + '='.repeat(50));
            console.log('🏁 Error Testing Automation Completed');
            console.log(`✅ Passed: ${this.results.passed}`);
            console.log(`❌ Failed: ${this.results.failed}`);
            console.log(`📊 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

        } catch (error) {
            console.error('💥 Automation failed:', error.message);
            process.exit(1);
        }
    }

    async attemptLogin() {
        try {
            console.log('🔐 Attempting to login for authenticated tests...');
            const response = await this.client.post('/auth/login', {
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            });

            this.authToken = response.data.access_token;
            this.client.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
            console.log('✅ Login successful');
        } catch (error) {
            console.log('⚠️  Login failed, running tests without authentication');
        }
    }

    async runAllErrorTests() {
        const testSuites = [
            this.testValidationErrors.bind(this),
            this.testAuthenticationErrors.bind(this),
            this.testAuthorizationErrors.bind(this),
            this.testNotFoundErrors.bind(this),
            this.testRateLimitingErrors.bind(this),
            this.testServerErrors.bind(this),
            this.testTimeoutErrors.bind(this),
        ];

        for (const testSuite of testSuites) {
            await testSuite();
        }
    }

    async testValidationErrors() {
        console.log('\n📝 Testing Validation Errors');

        const validationTests = [
            {
                name: 'Empty email validation',
                request: () => this.client.post('/auth/register', { password: '123456' }),
                expectedStatus: 400,
                expectedCategory: 'RULE'
            },
            {
                name: 'Invalid email format',
                request: () => this.client.post('/auth/register', {
                    email: 'invalid-email',
                    password: '123456'
                }),
                expectedStatus: 400,
                expectedCategory: 'RULE'
            },
            {
                name: 'Password too short',
                request: () => this.client.post('/auth/register', {
                    email: 'test@example.com',
                    password: '123'
                }),
                expectedStatus: 400,
                expectedCategory: 'RULE'
            },
            {
                name: 'Missing required field',
                request: () => this.client.post('/shelters', { name: 'Test Shelter' }),
                expectedStatus: 400,
                expectedCategory: 'RULE'
            }
        ];

        for (const test of validationTests) {
            await this.runTest(test);
        }
    }

    async testAuthenticationErrors() {
        console.log('\n🔐 Testing Authentication Errors');

        const authTests = [
            {
                name: 'Invalid login credentials',
                request: () => this.client.post('/auth/login', {
                    email: 'nonexistent@example.com',
                    password: 'wrongpassword'
                }),
                expectedStatus: 401,
                expectedCategory: 'BUSINESS'
            },
            {
                name: 'Missing authorization header',
                request: () => {
                    const client = axios.create({ baseURL: API_BASE_URL });
                    return client.get('/users/profile');
                },
                expectedStatus: 401,
                expectedCategory: 'BUSINESS'
            },
            {
                name: 'Invalid JWT token',
                request: () => {
                    const client = axios.create({
                        baseURL: API_BASE_URL,
                        headers: { Authorization: 'Bearer invalid.jwt.token' }
                    });
                    return client.get('/users/profile');
                },
                expectedStatus: 401,
                expectedCategory: 'BUSINESS'
            }
        ];

        for (const test of authTests) {
            await this.runTest(test);
        }
    }

    async testAuthorizationErrors() {
        console.log('\n🚫 Testing Authorization Errors');

        const authzTests = [
            {
                name: 'Forbidden resource access',
                request: () => this.client.get('/admin/users'),
                expectedStatus: 403,
                expectedCategory: 'BUSINESS',
                skipIfNoAuth: true
            }
        ];

        for (const test of authzTests) {
            if (test.skipIfNoAuth && !this.authToken) {
                console.log(`⏭️  Skipping: ${test.name} (no auth token)`);
                continue;
            }
            await this.runTest(test);
        }
    }

    async testNotFoundErrors() {
        console.log('\n🔍 Testing Not Found Errors');

        const notFoundTests = [
            {
                name: 'Non-existent user',
                request: () => this.client.get('/users/999999'),
                expectedStatus: 404,
                expectedCategory: 'BUSINESS'
            },
            {
                name: 'Non-existent shelter',
                request: () => this.client.get('/shelters/999999'),
                expectedStatus: 404,
                expectedCategory: 'BUSINESS'
            },
            {
                name: 'Invalid endpoint',
                request: () => this.client.get('/nonexistent-endpoint'),
                expectedStatus: 404,
                expectedCategory: 'BUSINESS'
            }
        ];

        for (const test of notFoundTests) {
            await this.runTest(test);
        }
    }

    async testRateLimitingErrors() {
        console.log('\n⏱️  Testing Rate Limiting');

        // Fazer múltiplas requests rápidas para testar rate limiting
        const rateLimitTest = {
            name: 'Rate limiting activation',
            request: async () => {
                const requests = [];
                // Fazer 10 requests rápidas
                for (let i = 0; i < 10; i++) {
                    requests.push(this.client.get('/health'));
                }

                try {
                    await Promise.all(requests);
                    return { status: 200 }; // Se todas passarem, rate limiting não ativou
                } catch (error) {
                    if (error.response?.status === 429) {
                        return error.response;
                    }
                    throw error;
                }
            },
            expectedStatus: 429,
            expectedCategory: 'RULE'
        };

        await this.runTest(rateLimitTest);
    }

    async testServerErrors() {
        console.log('\n💥 Testing Server Errors');

        // Este teste pode precisar de um endpoint específico que cause erro interno
        const serverTests = [
            {
                name: 'Malformed JSON payload',
                request: () => this.client.post('/users', '{"invalid": json}'),
                expectedStatus: 400,
                expectedCategory: 'RULE'
            }
        ];

        for (const test of serverTests) {
            await this.runTest(test);
        }
    }

    async testTimeoutErrors() {
        console.log('\n⏳ Testing Timeout Errors');

        const timeoutTest = {
            name: 'Request timeout',
            request: () => {
                const client = axios.create({
                    baseURL: API_BASE_URL,
                    timeout: 1 // Timeout muito curto
                });
                return client.get('/health');
            },
            expectedStatus: 408,
            expectedCategory: 'SERVER'
        };

        await this.runTest(timeoutTest);
    }

    async runTest(test) {
        try {
            console.log(`   Running: ${test.name}`);
            const response = await test.request();

            // Verificar status code
            if (response.status !== test.expectedStatus) {
                throw new Error(`Expected status ${test.expectedStatus}, got ${response.status}`);
            }

            // Verificar categoria se especificada
            if (test.expectedCategory && response.data?.category !== test.expectedCategory) {
                throw new Error(`Expected category ${test.expectedCategory}, got ${response.data?.category}`);
            }

            // Verificar campos obrigatórios da resposta de erro
            this.validateErrorResponse(response.data);

            console.log(`   ✅ Passed`);
            this.results.passed++;
            this.results.tests.push({
                name: test.name,
                status: 'passed',
                expectedStatus: test.expectedStatus,
                actualStatus: response.status,
                category: response.data?.category
            });

        } catch (error) {
            if (error.response) {
                // Erro da API - verificar se era esperado
                if (error.response.status === test.expectedStatus) {
                    console.log(`   ✅ Passed (expected error)`);
                    this.results.passed++;
                    this.results.tests.push({
                        name: test.name,
                        status: 'passed',
                        expectedStatus: test.expectedStatus,
                        actualStatus: error.response.status,
                        category: error.response.data?.category
                    });
                } else {
                    console.log(`   ❌ Failed: Expected status ${test.expectedStatus}, got ${error.response.status}`);
                    this.results.failed++;
                    this.results.tests.push({
                        name: test.name,
                        status: 'failed',
                        expectedStatus: test.expectedStatus,
                        actualStatus: error.response.status,
                        error: error.response.data
                    });
                }
            } else {
                // Erro de rede ou outro tipo
                console.log(`   ❌ Failed: ${error.message}`);
                this.results.failed++;
                this.results.tests.push({
                    name: test.name,
                    status: 'failed',
                    expectedStatus: test.expectedStatus,
                    error: error.message
                });
            }
        }
    }

    validateErrorResponse(errorData) {
        const requiredFields = ['statusCode', 'message', 'error', 'category', 'timestamp', 'path'];

        for (const field of requiredFields) {
            if (!(field in errorData)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validar tipos
        if (typeof errorData.statusCode !== 'number') {
            throw new Error('statusCode must be a number');
        }

        if (typeof errorData.timestamp !== 'string') {
            throw new Error('timestamp must be a string');
        }

        // Validar formato do timestamp
        const timestamp = new Date(errorData.timestamp);
        if (isNaN(timestamp.getTime())) {
            throw new Error('timestamp must be a valid ISO date string');
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            apiBaseUrl: API_BASE_URL,
            summary: {
                passed: this.results.passed,
                failed: this.results.failed,
                total: this.results.passed + this.results.failed,
                successRate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)
            },
            tests: this.results.tests
        };

        const reportPath = path.join(__dirname, 'error-testing-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log(`📋 Report saved to: ${reportPath}`);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const automation = new ErrorTestingAutomation();
    automation.run().catch(console.error);
}

module.exports = ErrorTestingAutomation;
