"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.gateway = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
require('dotenv').config();
const redis = new ioredis_1.default('redis://default:redispw@localhost:32770');
exports.redis = redis;
const planCache = new Map();
const keyDataCache = new Map();
function createPlan(plan) {
    return __awaiter(this, void 0, void 0, function* () {
        const newPlan = Object.assign({}, plan);
        yield redis.hmset(`plan:${plan.id}`, newPlan);
        planCache.set(plan.id, newPlan);
        return newPlan;
    });
}
function retrievePlan(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (planCache.has(id)) {
            return planCache.get(id);
        }
        const plan = yield redis.hgetall(`plan:${id}`);
        if (Object.keys(plan).length) {
            const planData = plan;
            planCache.set(id, planData);
            return planData;
        }
        return undefined;
    });
}
function updatePlan(id, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const updatedPlan = Object.assign({}, updates);
        yield redis.hmset(`plan:${id}`, updatedPlan);
        const plan = yield redis.hgetall(`plan:${id}`);
        const planData = plan;
        planCache.set(id, planData);
        return planData;
    });
}
function deletePlan(id) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.del(`plan:${id}`);
        planCache.delete(id);
    });
}
function listPlans() {
    return __awaiter(this, void 0, void 0, function* () {
        const planIds = yield redis.keys('plan:*');
        const plans = yield Promise.all(planIds.map((id) => __awaiter(this, void 0, void 0, function* () { return retrievePlan(id.replace('plan:', '')); })));
        return plans;
    });
}
function createKey(keyData) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.hmset(`key:${keyData.key}`, keyData);
        yield redis.sadd(`plan:${keyData.planId}:keys`, keyData.id);
        keyDataCache.set(keyData.id, keyData);
        return keyData;
    });
}
function retrieveKey(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (keyDataCache.has(id)) {
            return keyDataCache.get(id);
        }
        const keyData = yield redis.hgetall(`key:${id}`);
        if (Object.keys(keyData).length) {
            const keyDataObj = keyData;
            keyDataCache.set(id, keyDataObj);
            return keyDataObj;
        }
        return undefined;
    });
}
function updateKey(id, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redis.hmset(`key:${id}`, updates);
        const keyData = yield redis.hgetall(`key:${id}`);
        const keyDataObj = keyData;
        keyDataCache.set(id, keyDataObj);
        return keyDataObj;
    });
}
function deleteKey(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyData = yield retrieveKey(id);
        if (!keyData)
            return;
        yield redis.srem(`plan:${keyData.planId}:keys`, id);
        yield redis.del(`key:${id}`);
        keyDataCache.delete(id);
    });
}
function listKeys() {
    return __awaiter(this, void 0, void 0, function* () {
        const keyIds = yield redis.keys('key:*');
        const keys = yield Promise.all(keyIds.map((id) => __awaiter(this, void 0, void 0, function* () { return retrieveKey(id.replace('key:', '')); })));
        return keys;
    });
}
function getUsage(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyData = yield retrieveKey(key);
        if (!keyData) {
            throw new Error('Invalid API key');
        }
        const plan = yield retrievePlan(keyData.planId);
        if (!plan) {
            throw new Error('Invalid plan ID');
        }
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const resetTimestamp = currentTimestamp + plan.ttl;
        const countKey = `count:${keyData.id}:${currentTimestamp}`;
        const used = yield redis.incr(countKey);
        yield redis.expire(countKey, plan.ttl);
        const remain = plan.limit - used;
        const reset = resetTimestamp - currentTimestamp;
        return {
            used,
            remain,
            limit: plan.limit,
            reset,
        };
    });
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
exports.gateway = gateway;
//# sourceMappingURL=gateway.js.map