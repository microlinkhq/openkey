import Redis from 'ioredis';
require('dotenv').config()

const redis = new Redis(process.env.REDIS_URL);

interface Plan {
    id: string;
    limit: string;
    ttl: string;
    name: string;
}

interface KeyData {
    key: string;
    id: string;
    name: string;
    planId: string;
}

interface Usage {
    used: number;
    remain: number;
    limit: number;
    reset: number;
}

const planCache = new Map<string, Plan>();
const keyDataCache = new Map<string, KeyData>();

async function createPlan(plan: Plan): Promise<Plan> {
    const newPlan = { ...plan };
    await redis.hmset(`plan:${plan.id}`, newPlan);
    planCache.set(plan.id, newPlan);
    return newPlan;
}

async function retrievePlan(id: string): Promise<Plan | undefined> {
    if (planCache.has(id)) {
        return planCache.get(id);
    }
    const plan = await redis.hgetall(`plan:${id}`);
    if (Object.keys(plan).length) {
        const planData = plan as unknown as Plan;
        planCache.set(id, planData);
        return planData;
    }
    return undefined;
}

async function updatePlan(id: string, updates: Partial<Plan>): Promise<Partial<Plan>> {
    const updatedPlan = { ...updates };
    await redis.hmset(`plan:${id}`, updatedPlan);
    const plan = await redis.hgetall(`plan:${id}`);
    const planData = plan as unknown as Plan;
    planCache.set(id, planData);
    return planData;
}

async function deletePlan(id: string): Promise<void> {
    await redis.del(`plan:${id}`);
    planCache.delete(id);
}

async function listPlans(): Promise<Plan[]> {
    const planIds = await redis.keys('plan:*');
    const plans = await Promise.all(planIds.map(async (id) => retrievePlan(id.replace('plan:', ''))));
    return plans as Plan[];
}

async function createKey(keyData: KeyData): Promise<KeyData> {
    await redis.hmset(`key:${keyData.key}`, keyData);
    await redis.sadd(`plan:${keyData.planId}:keys`, keyData.id);
    keyDataCache.set(keyData.id, keyData);
    return keyData;
}

async function retrieveKey(id: string): Promise<KeyData | undefined> {
    if (keyDataCache.has(id)) {
        return keyDataCache.get(id);
    }
    const keyData = await redis.hgetall(`key:${id}`);
    if (Object.keys(keyData).length) {
        const keyDataObj = keyData as unknown as KeyData;
        keyDataCache.set(id, keyDataObj);
        return keyDataObj;
    }
    return undefined;
}

async function updateKey(id: string, updates: Partial<KeyData>): Promise<KeyData> {
    await redis.hmset(`key:${id}`, updates);
    const keyData = await redis.hgetall(`key:${id}`);
    const keyDataObj = keyData as unknown as KeyData;
    keyDataCache.set(id, keyDataObj);
    return keyDataObj;
}

async function deleteKey(id: string): Promise<void> {
    const keyData = await retrieveKey(id);
    if (!keyData) return;
    await redis.srem(`plan:${keyData.planId}:keys`, id);
    await redis.del(`key:${id}`);
    keyDataCache.delete(id);
}

async function listKeys(): Promise<KeyData[]> {
    const keyIds = await redis.keys('key:*');
    const keys = await Promise.all(keyIds.map(async (id) => retrieveKey(id.replace('key:', ''))));
    return keys as KeyData[];
}

async function getUsage(key: string): Promise<Usage> {
    const keyData = await retrieveKey(key);

    if (!keyData) {
        throw new Error('Invalid API key');
    }

    const plan = await retrievePlan(keyData.planId);
    if (!plan) {
        throw new Error('Invalid plan ID');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const resetTimestamp = currentTimestamp + plan.ttl;

    const countKey = `count:${keyData.id}:${currentTimestamp}`;
    const used = await redis.incr(countKey);
    await redis.expire(countKey, plan.ttl);
    const remain = plan.limit - used;
    const reset = resetTimestamp - currentTimestamp;

    return {
        used,
        remain,
        limit: plan.limit,
        reset,
    };
}

const gateway = {
    plans: {
        create: createPlan,
        retrieve: retrievePlan,
        update: updatePlan,
        del: deletePlan,
        list: listPlans,
    },
    key: {
        create: createKey,
        retrieve: retrieveKey,
        update: updateKey,
        del: deleteKey,
        list: listKeys,
    },
    usage: getUsage,
};

export {
    gateway,
    redis
};
