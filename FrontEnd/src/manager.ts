import IPC from "./IPC";
import { BrowserWindow } from 'electron';

export default class Manager {
    private ipc: IPC = null;
    private window:BrowserWindow = null;
    private static instance:Manager = null;

    private constructor() {
        this.ipc = IPC.getInstance();
        setInterval(() => this.ipc.callRemote("tick"), 1000);
    }

    public setWindow(window:BrowserWindow) {
        this.window = window;
    }

    public static getInstance(): Manager {
        if(Manager.instance) return Manager.instance;
        Manager.instance = new Manager();
        return Manager.instance;
    }

    /*
        该函数由Java端在Attention值变化时调用.  
    */
    @IPC.registerMessageHandler
    private static onAttentionValueChangedEvent(value: number) {
        Manager.getInstance().window.setTitle(`EEG DEMO - attention value: ${value}`);
        // 将attention值由主进程传递到渲染进程，见renderer.ts.
        Manager.getInstance().window.webContents.send("onAttentionValueChangedEvent", value);
    }

    /*
        该函数由Java端需要向前端发送消息时调用.
    */
    @IPC.registerMessageHandler
    private onMessage(message:string){
        console.log(message);
    }
}