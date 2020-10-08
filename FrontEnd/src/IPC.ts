import { ChildProcess, spawn } from 'child_process';

// EEG java包所在的地址
const EEG_APP_PATH = "../EEG/out/artifacts/EEG_jar/EEG.jar"

export default class IPC {
    // IPC类的单例
    private static instance: IPC = null;

    // EEG java进程
    private child: ChildProcess;

    // 回调函数字典
    private callbackDict: { [key: string]: Function; }

    /*
        IPC构造函数
    */
    private constructor() {
        this.callbackDict = {}
        // 创建EEG进程
        this.child = spawn('java', ['-jar', EEG_APP_PATH]);
        // 接管其标准输出，当EEG输出信息到控制台时，dispatchRemoteCall将调用
        this.child.stdout.on("data", this.dispatchRemoteCall.bind(this))
        this.child.stderr.on("data", this.handleRemoteError.bind(this))
    }

    /*
        IPC的单例函数
    */
    public static getInstance() {
        if (IPC.instance) return IPC.instance;
        IPC.instance = new IPC();
        return IPC.instance;
    }

    /*
        注册处理EEG消息回调的装饰器函数
    */
    public static registerMessageHandler(
        _: Object,
        propertyName: string,
        propertyDescriptor: PropertyDescriptor): PropertyDescriptor {
        // 将回调函数加入字典中
        // IPC.getInstance().callbackDict[propertyName] = propertyDescriptor.value;
        return propertyDescriptor;
    }

    /*
        远程调用EEG进程的函数
        @param {string} funcName：函数名
        @param {any} args: 函数参数
    */
    public callRemote(funcName: string, ...args: any): void {
        this.child.stdin.write(JSON.stringify({
            "funcName": funcName,
            "args": args
        }))
    }

    /*
        分发来自EEG进程的消息到回调函数中
    */
    private dispatchRemoteCall(data: any): void {
        let commands: string = data.toString();
        commands.split('\n').forEach(element => {
            try {
                if (element.toString().trim() === '') return;
                let command = JSON.parse(element.toString());
                this.callbackDict[command["funcName"]](...command["args"])
            } catch (error) {
                if (error instanceof SyntaxError) {
                    console.log(`Cannot parse json from string: ${element}`)
                }
            }
        });
    }

    /*
        打印来自EEG进程的错误信息(似乎并没有作用)
    */
    private handleRemoteError(data: any): void {
        console.log(data.toString());
    }
}