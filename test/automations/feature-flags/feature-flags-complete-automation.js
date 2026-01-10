const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

/**
 * Automação de Feature Flags
 * Cria feature flags para todos os módulos do projeto
 */
class FeatureFlagsAutomation extends AutomationBase {
    constructor() {
        super({ name: 'Feature Flags Automation' });
    }

    /**
     * Define as feature flags baseadas nos módulos do projeto
     */
    getFeatureFlags() {
        return [
            // Content Module
            {
                key: 'content-events',
                name: 'Events Module',
                description: 'Enable/disable events functionality',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'content-meditations',
                name: 'Meditations Module',
                description: 'Enable/disable meditations functionality',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'content-documents',
                name: 'Documents Module',
                description: 'Enable/disable documents functionality',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'content-informatives',
                name: 'Informatives Module',
                description: 'Enable/disable informative banners',
                enabled: true,
                environment: 'staging'
            },

            // Pages Module
            {
                key: 'pages-video',
                name: 'Video Pages',
                description: 'Enable/disable video pages functionality',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'pages-image',
                name: 'Image Pages',
                description: 'Enable/disable image galleries',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'pages-ideas',
                name: 'Ideas Pages',
                description: 'Enable/disable ideas pages',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'pages-visit-material',
                name: 'Visit Material Pages',
                description: 'Enable/disable visit material pages',
                enabled: true,
                environment: 'staging'
            },

            // Communication Module
            {
                key: 'communication-comments',
                name: 'Comments System',
                description: 'Enable/disable user comments',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'communication-contact',
                name: 'Contact Form',
                description: 'Enable/disable contact form',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'communication-feedback',
                name: 'Site Feedback',
                description: 'Enable/disable site feedback system',
                enabled: true,
                environment: 'staging'
            },

            // Shelter Module
            {
                key: 'shelter-management',
                name: 'Shelter Management',
                description: 'Enable/disable shelter management features',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'shelter-schedules',
                name: 'Shelter Schedules',
                description: 'Enable/disable visit and meeting schedules',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'shelter-teams',
                name: 'Teams Management',
                description: 'Enable/disable teams functionality',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'shelter-pagelas',
                name: 'Pagelas System',
                description: 'Enable/disable pagelas (attendance sheets)',
                enabled: true,
                environment: 'staging'
            },

            // Attendance Module
            {
                key: 'attendance-tracking',
                name: 'Attendance Tracking',
                description: 'Enable/disable attendance tracking system',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'attendance-reports',
                name: 'Attendance Reports',
                description: 'Enable/disable attendance reports and statistics',
                enabled: true,
                environment: 'staging'
            },

            // Profile Module
            {
                key: 'profile-personal-data',
                name: 'Personal Data Management',
                description: 'Enable/disable personal data editing',
                enabled: true,
                environment: 'staging'
            },
            {
                key: 'profile-preferences',
                name: 'User Preferences',
                description: 'Enable/disable user preferences',
                enabled: true,
                environment: 'staging'
            },

            // Advanced Features
            {
                key: 'advanced-ai-suggestions',
                name: 'AI Suggestions',
                description: 'Enable/disable AI-powered content suggestions',
                enabled: false,
                environment: 'staging',
                metadata: {
                    provider: 'openai',
                    model: 'gpt-4'
                }
            },
            {
                key: 'advanced-analytics',
                name: 'Advanced Analytics',
                description: 'Enable/disable advanced analytics dashboard',
                enabled: false,
                environment: 'staging',
                metadata: {
                    provider: 'google-analytics',
                    trackingId: 'GA-XXXXXXX'
                }
            },
            {
                key: 'advanced-notifications',
                name: 'Push Notifications',
                description: 'Enable/disable push notifications',
                enabled: false,
                environment: 'staging',
                metadata: {
                    provider: 'firebase',
                    enabled: false
                }
            }
        ];
    }

    async execute() {
        const flags = this.getFeatureFlags();
        Logger.info(`📋 Criando ${flags.length} feature flags...`);
        Logger.info('');

        let created = 0;
        let errors = 0;

        for (const flag of flags) {
            try {
                const response = await this.client.post('/feature-flags', flag);

                if (response && response.status === 201) {
                    const status = flag.enabled ? '✅ Enabled' : '❌ Disabled';
                    Logger.success(`${status} - ${flag.name} (${flag.key})`);
                    created++;
                } else {
                    Logger.warning(`Erro ao criar flag: ${flag.key}`);
                    errors++;
                }
            } catch (error) {
                if (error.response?.status === 409) {
                    Logger.info(`⏭️  Flag já existe: ${flag.key}`);
                } else {
                    Logger.error(`Erro ao criar flag ${flag.key}: ${error.message}`);
                    errors++;
                }
            }

            // Delay para não sobrecarregar o servidor
            await this.delay(300);
        }

        Logger.section('📊 Resumo da Criação');
        Logger.success(`✅ Criadas: ${created}`);
        if (errors > 0) {
            Logger.error(`❌ Erros: ${errors}`);
        }
        Logger.info(`📋 Total: ${flags.length}`);
        Logger.info('');

        // Testar listagem
        await this.testListings();
    }

    /**
     * Testa as listagens de feature flags
     */
    async testListings() {
        Logger.section('🧪 Testando listagens de feature flags');

        // Listar todas
        const allResponse = await this.client.get('/feature-flags');
        if (allResponse && allResponse.status === 200) {
            Logger.success(`${allResponse.data.length} feature flags encontradas (total)`);
        } else {
            Logger.error('Falha ao listar feature flags');
        }

        // Listar por ambiente
        const stagingResponse = await this.client.get('/feature-flags/environment/staging');
        if (stagingResponse && stagingResponse.status === 200) {
            Logger.success(`${stagingResponse.data.length} feature flags em staging`);
        } else {
            Logger.error('Falha ao listar feature flags de staging');
        }

        // Verificar uma flag específica
        const checkResponse = await this.client.get('/feature-flags/check/content-events?environment=staging');
        if (checkResponse && checkResponse.status === 200) {
            const status = checkResponse.data.enabled ? '✅ Enabled' : '❌ Disabled';
            Logger.success(`Status de 'content-events': ${status}`);
        } else {
            Logger.error('Falha ao verificar status da flag');
        }
    }
}

// Executar automação
const automation = new FeatureFlagsAutomation();
automation.run();
