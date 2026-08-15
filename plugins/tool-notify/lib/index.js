import { defineTool } from '@deepseek-ai/dsh-tools';
import { sendNotification, buildNotifyCommand } from './notify.js';
export const name = 'tool-notify';
export const inject = ['tools'];
export function apply(ctx) {
    ctx.tools.register(defineTool({
        name: 'notify',
        description: 'Send a desktop notification with a title and message. ' +
            'Use for long-running task completion alerts or when the user is away from the terminal.',
        parameters: {
            title: {
                type: 'string',
                required: true,
                description: 'Notification title (short, e.g. "Build finished")',
            },
            message: {
                type: 'string',
                required: true,
                description: 'Notification body message',
            },
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute(args) {
            const cmd = buildNotifyCommand(process.platform, args.title, args.message);
            return sendNotification(cmd);
        },
    }));
}
export { buildNotifyCommand };
