import { createServer, IncomingMessage, ServerResponse } from 'http';
import { gateway } from './gateway';

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            res.statusCode = 401;
            res.end('Unauthorized');
            return;
        }

        const { used, remain, limit, reset } = await gateway.usage(apiKey);

        res.setHeader('X-Rate-Limit-Limit', limit);
        res.setHeader('X-Rate-Limit-Remaining', remain);
        res.setHeader('X-Rate-Limit-Reset', reset);

        if (used > limit) {
            res.statusCode = 429;
            res.end('Rate limit exceeded');
            return;
        }

        res.end('Microlink seal of approval');
    } catch (error) {
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
});

server.listen(3000, () => {
    console.log('Listening on port 3000');
});

export { server };
