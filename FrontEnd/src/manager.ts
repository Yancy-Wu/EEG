import IPC from "./IPC";
import { BrowserWindow } from 'electron';

export default class Manager {
    private ipc: IPC = null;
    private window:BrowserWindow = null;
    private static instance:Manager = null;

    private constructor() {
        // this.ipc = IPC.getInstance();
        // this.ipc.callRemote("hello", 123, "this message from front end.");
    }

    public setWindow(window:BrowserWindow) {
        this.window = window
    }

    public static getInstance(): Manager {
        if(Manager.instance) return Manager.instance;
        Manager.instance = new Manager();
        return Manager.instance;
    }

    @IPC.registerMessageHandler
    private static onAttentionValueChangedEvent(value: Number) {
        console.log(value);
        Manager.getInstance().window.webContents.send("onAttentionValueChangedEvent", value);
    }

    @IPC.registerMessageHandler
    private onMessage(message:String){
        console.log(message);
    }
}