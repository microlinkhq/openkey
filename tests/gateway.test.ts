import { gateway, redis } from '../gateway';

describe('Gateway', () => {
    beforeEach(async () => {
        await redis.flushdb();
    });
    describe('Plans', () => {
        let testPlan;

        beforeEach(async () => {
            testPlan = {
                id: 'test-plan',
                name: 'Test Plan',
                limit: '5',
                ttl: '60',
            };
            await gateway.plans.create(testPlan);
        });

        afterEach(async () => {
            await gateway.plans.del(testPlan.id);
        });

        test('create and retrieve a plan', async () => {
            const plan = await gateway.plans.retrieve(testPlan.id);
            expect(plan).toEqual(testPlan);
        });

        test('update a plan', async () => {
            const updates = { name: 'Updated Test Plan', limit: '10' };
            await gateway.plans.update(testPlan.id, updates);
            const updatedPlan = await gateway.plans.retrieve(testPlan.id);
            expect(updatedPlan).toEqual({ ...testPlan, ...updates });
        });

        test('delete a plan', async () => {
            await gateway.plans.del(testPlan.id);
            const plan = await gateway.plans.retrieve(testPlan.id);
            expect(plan).toBeUndefined();
        });

        test('list plans', async () => {
            const anotherPlan = {
                id: 'another-test-plan',
                name: 'Another Test Plan',
                limit: '8',
                ttl: '120',
            };
            await gateway.plans.create(anotherPlan);

            const plans = await gateway.plans.list();
            expect(plans).toEqual(expect.arrayContaining([testPlan, anotherPlan]));

            await gateway.plans.del(anotherPlan.id);
        });
    });

    describe('Keys', () => {
        let testKey;
        let testPlan;

        beforeEach(async () => {
            testPlan = {
                id: 'test-plan',
                name: 'Test Plan',
                limit: '5',
                ttl: '60',
            };
            await gateway.plans.create(testPlan);

            testKey = {
                planId: testPlan.id,
                id: 'test-key',
                key: 'test-api-key',
                name: 'Test API Key',
            };
            await gateway.key.create(testKey);
        });

        test('create and retrieve a key', async () => {
            const key = await gateway.key.retrieve(testKey.key);
            expect(key).toEqual(testKey);
        });

        test('update a key', async () => {
            const updates = { name: 'Updated Test API Key' };
            await gateway.key.update(testKey.key, updates);
            const updatedKey = await gateway.key.retrieve(testKey.key);
            expect(updatedKey).toEqual({ ...testKey, ...updates });
        });

        test('delete a key', async () => {
            await gateway.key.del(testKey.key);
            const key = await gateway.key.retrieve(testKey.key);
            expect(key).toBeUndefined();
        });

        test('list keys', async () => {
            const anotherKey = {
                planId: testPlan.id,
                id: 'another-test-key',
                key: 'another-test-api-key',
                name: 'Another Test API Key',
            };
            await gateway.key.create(anotherKey);

            const keys = await gateway.key.list();
            expect(keys).toEqual(expect.arrayContaining([testKey, anotherKey]));

            await gateway.key.del(anotherKey.key);
        });
    });

    describe('Usage', () => {
        let testKey;
        let testPlan;

        beforeEach(async () => {
            testPlan = {
                id: 'test-plan',
                name: 'Test Plan',
                limit: '5',
                ttl: '60',
            };
            await gateway.plans.create(testPlan);

            testKey = {
                planId: testPlan.id,
                id: 'test-key',
                key: 'test-api-key',
                name: 'Test API Key',
            };
            await gateway.key.create(testKey);
        });

        afterEach(async () => {
            await gateway.plans.del(testPlan.id);
            await gateway.key.del(testKey.key);
        });

        test('get usage with valid API key', async () => {
            const usage = await gateway.usage(testKey.key);
            expect(usage).toHaveProperty('used');
            expect(usage).toHaveProperty('remain');
            expect(usage).toHaveProperty('limit', testPlan.limit);
            expect(usage).toHaveProperty('reset');
        });

        test('get usage with invalid API key', async () => {
            expect.assertions(1);
            try {
                await gateway.usage('invalid-api-key');
            } catch (error) {
                expect(error.message).toBe('Invalid API key');
            }
        });

        test('get usage with non-existent plan', async () => {
            await gateway.key.update(testKey.key, { planId: 'non-existent-plan' });
            expect.assertions(1);
            try {
                await gateway.usage(testKey.key);
            } catch (error) {
                expect(error.message).toBe('Invalid plan ID');
            }
        });
    });
});
