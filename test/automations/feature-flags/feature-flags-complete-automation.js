const AutomationBase = require('../shared/automation-base');
const Logger = require('../shared/logger');

class FeatureFlagsAutomation extends AutomationBase {
    constructor() {
        super({ name: 'Feature Flags Automation' });
    }

    getFeatureFlags() {
        return [
            {
                key: 'content-events',
                name: 'Events Module',
                description: 'Enable/disable events functionality',
                enabled: true,
            },
            {
                key: 'content-meditations',
                name: 'Meditations Module',
                description: 'Enable/disable meditations functionality',
                enabled: true,
            },
            {
                key: 'content-documents',
                name: 'Documents Module',
                description: 'Enable/disable documents functionality',
                enabled: true,
            },
            {
                key: 'content-informatives',
                name: 'Informatives Module',
                description: 'Enable/disable informative banners',
                enabled: true,
            },
            {
                key: 'event-email-notifications',
                name: 'Event Email Notifications',
                description: 'Enable/disable email notifications for events',
                enabled: false,
            },

            {
                key: 'pages-video',
                name: 'Video Pages',
                description: 'Enable/disable video pages functionality',
                enabled: true,
            },
            {
                key: 'pages-image',
                name: 'Image Pages',
                description: 'Enable/disable image galleries',
                enabled: true,
            },
            {
                key: 'pages-ideas',
                name: 'Ideas Pages',
                description: 'Enable/disable ideas pages',
                enabled: true,
            },
            {
                key: 'pages-visit-material',
                name: 'Visit Material Pages',
                description: 'Enable/disable visit material pages',
                enabled: true,
            },

            {
                key: 'communication-comments',
                name: 'Comments System',
                description: 'Enable/disable user comments',
                enabled: true,
            },
            {
                key: 'communication-contact',
                name: 'Contact Form',
                description: 'Enable/disable contact form',
                enabled: true,
            },
            {
                key: 'communication-feedback',
                name: 'Site Feedback',
                description: 'Enable/disable site feedback system',
                enabled: true,
            },

            {
                key: 'shelter-management',
                name: 'Shelter Management',
                description: 'Enable/disable shelter management features',
                enabled: false,
            },
            {
                key: 'shelter-schedules',
                name: 'Shelter Schedules',
                description: 'Enable/disable visit and meeting schedules',
                enabled: true,
            },
            {
                key: 'shelter-teams',
                name: 'Teams Management',
                description: 'Enable/disable teams functionality',
                enabled: true,
            },
            {
                key: 'shelter-pagelas',
                name: 'Pagelas System',
                description: 'Enable/disable pagelas (attendance sheets)',
                enabled: false,
            },
            {
                key: 'shelter-address',
                name: 'Shelter Address',
                description: 'Enable/disable shelter address visibility',
                enabled: false,
            },

            {
                key: 'attendance-tracking',
                name: 'Attendance Tracking',
                description: 'Enable/disable attendance tracking system',
                enabled: true,
            },
            {
                key: 'attendance-reports',
                name: 'Attendance Reports',
                description: 'Enable/disable attendance reports and statistics',
                enabled: true,
            },

            {
                key: 'profile-personal-data',
                name: 'Personal Data Management',
                description: 'Enable/disable personal data editing',
                enabled: true,
            },
            {
                key: 'profile-preferences',
                name: 'User Preferences',
                description: 'Enable/disable user preferences',
                enabled: true,
            },

            {
                key: 'advanced-ai-suggestions',
                name: 'AI Suggestions',
                description: 'Enable/disable AI-powered content suggestions',
                enabled: false,
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

            await this.delay(300);
        }

        Logger.section('📊 Resumo da Criação');
        Logger.success(`✅ Criadas: ${created}`);
        if (errors > 0) {
            Logger.error(`❌ Erros: ${errors}`);
        }
        Logger.info(`📋 Total: ${flags.length}`);
        Logger.info('');

        await this.testListings();
    }

    async testListings() {
        Logger.section('🧪 Testando listagens de feature flags');

        const allResponse = await this.client.get('/feature-flags');
        if (allResponse && allResponse.status === 200) {
            Logger.success(`${allResponse.data.meta.totalItems} feature flags encontradas (total)`);
        } else {
            Logger.error('Falha ao listar feature flags');
        }

        const statsResponse = await this.client.get('/feature-flags/stats');
        if (statsResponse && statsResponse.status === 200) {
            Logger.success(`${statsResponse.data.enabled} ligadas e ${statsResponse.data.disabled} desligadas`);
        } else {
            Logger.error('Falha ao obter estatísticas de feature flags');
        }

        const checkResponse = await this.client.get('/feature-flags/check/content-events');
        if (checkResponse && checkResponse.status === 200) {
            const status = checkResponse.data.enabled ? '✅ Enabled' : '❌ Disabled';
            Logger.success(`Status de 'content-events': ${status}`);
        } else {
            Logger.error('Falha ao verificar status da flag');
        }

        const mapResponse = await this.client.get('/feature-flags/map');
        if (mapResponse && mapResponse.status === 200) {
            Logger.success('Mapa público de feature flags carregado');
        } else {
            Logger.error('Falha ao carregar o mapa público de feature flags');
        }
    }
}

const automation = new FeatureFlagsAutomation();
automation.run();
