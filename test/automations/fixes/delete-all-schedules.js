#!/usr/bin/env node

const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

async function deleteAllSchedules() {
    console.log('🔐 Fazendo login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    const token = loginRes.data.accessToken;

    console.log('📋 Buscando todos os schedules...');
    const schedulesRes = await axios.get(`${BASE_URL}/shelter-schedules`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const schedules = schedulesRes.data;
    console.log(`🗑️  Deletando ${schedules.length} schedules...`);

    for (const schedule of schedules) {
        await axios.delete(`${BASE_URL}/shelter-schedules/${schedule.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`  ✅ Deletado: ${schedule.id}`);
    }

    console.log(`\n✅ Todos os ${schedules.length} schedules foram deletados!`);
}

deleteAllSchedules().catch(console.error);
