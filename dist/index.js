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
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const http_1 = require("http");
const gateway_1 = require("./gateway");
const server = (0, http_1.createServer)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            res.statusCode = 401;
            res.end('Unauthorized');
            return;
        }
        const { used, remain, limit, reset } = yield gateway_1.gateway.usage(apiKey);
        res.setHeader('X-Rate-Limit-Limit', limit);
        res.setHeader('X-Rate-Limit-Remaining', remain);
        res.setHeader('X-Rate-Limit-Reset', reset);
        if (used > limit) {
            res.statusCode = 429;
            res.end('Rate limit exceeded');
            return;
        }
        res.end('Microlink seal of approval');
    }
    catch (error) {
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
}));
exports.server = server;
server.listen(3000, () => {
    console.log('Listening on port 3000');
});
//# sourceMappingURL=index.js.map