export interface NotifyCommand {
    command: string;
    args: string[];
}
/** 平台无关的通知命令构造（纯函数，可单测） */
export declare function buildNotifyCommand(platform: NodeJS.Platform, title: string, message: string): NotifyCommand;
/** 执行通知命令；返回描述性结果（不抛错） */
export declare function sendNotification(cmd: NotifyCommand): Promise<string>;
