const { ipcRenderer } = require('electron');
const fs = require("fs");
//import * as fs from "fs";

/*
    接受来自Electron主线程的事件回调(来自manager.ts)
*/
ipcRenderer.on('onAttentionValueChangedEvent', function (_: any, value: number) {
    // 获取attention显示节点并修改值.
    let attentionValSpan = document.getElementById("attentionVal");
    attentionValSpan.innerHTML = value.toString();
});

/*
    从Attention显示节点中获取注意力值
*/
function getAttentionValue(): number {
    let attentionValSpan = document.getElementById("attentionVal");
    let att = Number.parseFloat(attentionValSpan.innerHTML);
    if (att.toString() == 'NaN') att = 0;
    return Math.max(0, Math.min(att, 100)) / 100;
}

class TimeoutManager {
    private static savedTimer: NodeJS.Timeout[] = [];
    public static setTimeout(callback: Function, time: number): NodeJS.Timeout {
        const tag = setTimeout(() => {
            this.savedTimer.splice(this.savedTimer.indexOf(tag), 1);
            callback();
        }, time);
        this.savedTimer.push(tag);
        return tag;
    }
    public static clearAll() {
        this.savedTimer.forEach(timer => {
            clearTimeout(timer);
        })
    }
}

/*
    二维向量表示.
*/
class Vector2 {
    public x: number = 0;
    public y: number = 0;
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }
    public add(v: Vector2): Vector2 {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    public minus(v: Vector2): Vector2 {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    public times(factor: number): Vector2 {
        return new Vector2(this.x * factor, this.y * factor);
    }
    public magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    public tan(): number {
        return this.y / this.x;
    }
}

/*
    操纵一条SVG Path的类
*/
class SVGPathManipulator {
    private pathElement: SVGPathElement;
    private startPosition: Vector2;
    private fillColor: string;
    private timer: NodeJS.Timeout = null;
    public edgeInterval: number = 30;
    public edgeDecrease: number = 10;
    public fillOpacityIncrease: number = 0.3;
    public fillInterval: number = 30;
    constructor(pathElement: SVGPathElement) {
        this.pathElement = pathElement;
        // 拿到该路径的起始点
        this.startPosition = this._getSVGPathStartPosition(pathElement);
        // 拿到该路径的填充颜色
        this.fillColor = window.getComputedStyle(pathElement).fill;
        // 无额外样式
        this.pathElement.setAttribute("class", "");
    }

    // 从d属性字符串中获取路径的起始位置.
    private _getSVGPathStartPosition(pathElement: SVGPathElement): Vector2 {
        const zeroASCII = '0'.charCodeAt(0);
        const nineASCII = '9'.charCodeAt(0);
        const dotASCII = '.'.charCodeAt(0);
        let strPathCommmand = pathElement.getAttribute("d");
        let indexStartPosition = strPathCommmand.indexOf("M") + 1;
        let indexCommaPosition = indexStartPosition;
        for (; strPathCommmand.charAt(indexCommaPosition) != ','; ++indexCommaPosition);
        let indexEndPosition = indexCommaPosition + 1;
        let isNumberOrDot = (char: number) => {
            return (char >= zeroASCII && char <= nineASCII) || (char == dotASCII);
        };
        for (; isNumberOrDot(strPathCommmand.charCodeAt(indexEndPosition)); ++indexEndPosition);
        let xString = strPathCommmand.substr(indexStartPosition, indexCommaPosition - indexStartPosition);
        let yString = strPathCommmand.substr(indexCommaPosition + 1, indexEndPosition - indexCommaPosition - 1);
        let x = Number.parseFloat(xString);
        let y = Number.parseFloat(yString);
        return new Vector2(x, y);
    }

    // 获取一条由p1，p2点定义的三次贝塞尔曲线在点(t, 0)处的切线斜率.
    private getBezierTangent(t: number, p1: Vector2, p2: Vector2) {
        const p0 = new Vector2(0, 0);
        const p3 = new Vector2(1, 1);
        const u = 1 - t;
        const uu = u * u;
        const tu = t * u;
        const tt = t * t;
        let p = p0.times(3).times(uu).times(-1.0);
        p = p.add(p1.times(3).times(uu - 2 * tu));
        p = p.add(p2.times(3).times(2 * tu - tt));
        p = p.add(p3.times(3).times(tt));
        return p;
    }

    // 获取起始位置.
    public getStartPosition(): Vector2 {
        return this.startPosition;
    }

    // 隐藏该路径的边线
    public hideEdge() {
        let len = this.pathElement.getTotalLength();
        this.pathElement.style.strokeDasharray = len.toString();
        this.pathElement.style.strokeDashoffset = len.toString();
    }

    // 获取路径的总长度
    public length = () => this.pathElement.getTotalLength();

    // 不填充该路径
    public hideFill = () => this.pathElement.style.fill = "none";

    // 终止绘画
    public stop = () => { if (this.timer != null) clearTimeout(this.timer); }

    // 设定画笔颜色和宽度
    public setStrokeColor = (color: string) => this.pathElement.style.stroke = color;
    public setStrokeWidth = (width: number) => this.pathElement.style.strokeWidth = width.toString();

    // 绘制该路径的边线
    public drawEdge(onDone: Function, ...args:any) {
        let len = this.pathElement.getTotalLength();
        let savedLen = len;
        // 每隔interval时间，绘制decrease长度.
        let loop = () => {
            // 当前绘制进度
            const t = (1 - len / this.pathElement.getTotalLength());
            // 获取绘制速率
            const factor = this.getBezierTangent(t, new Vector2(0.5, 0.1), new Vector2(0.5, 0.8));
            const newDecrease = this.edgeDecrease * factor.tan();
            len -= newDecrease;
            len = Math.max(0, len);
            this.pathElement.style.strokeDasharray = savedLen.toString();
            this.pathElement.style.strokeDashoffset = len.toString();
            if (len <= 0) onDone(args);
            else this.timer = TimeoutManager.setTimeout(loop, this.edgeInterval);
        }
        TimeoutManager.setTimeout(loop, this.edgeInterval);
    }

    // 填充该路径
    public drawFill(onDone: Function, ...args:any) {
        let opacity = 0.0;
        let loop = () => {
            opacity += this.fillOpacityIncrease;
            opacity = Math.min(1.0, opacity);
            this.pathElement.style.fill = this.fillColor;
            this.pathElement.style.opacity = opacity.toString();
            if (opacity >= 0.99) onDone(args);
            else this.timer = TimeoutManager.setTimeout(loop, this.fillInterval);
        }
        TimeoutManager.setTimeout(loop, this.fillInterval);
    }
}

/*
    操纵一块绘画区域动画的类
*/
class ImageAnimationController {
    private imgs: HTMLImageElement[];
    private canvasElement: HTMLCanvasElement;
    private curFrameIndex: number = 0;
    private fps: number = 0;
    private timer: NodeJS.Timeout = null;
    private loadedFileCount = 0;
    public constructor(canvasElement: HTMLCanvasElement, dirname: string) {
        // 按名称排序
        let imgFileNames: string[] = fs.readdirSync(dirname, { encoding: "utf-8" });
        imgFileNames = imgFileNames.sort();
        this.canvasElement = canvasElement;
        this.imgs = imgFileNames.map(_ => null);
        let curIndex = 0;

        // 异步加载图片
        const loadImg = () => {
            const fn = imgFileNames[curIndex];
            const img = new Image();
            img.onload = () => {
                this.imgs[curIndex] = img;
                this.loadedFileCount++;
                curIndex++;
                if (this.loadedFileCount == imgFileNames.length) this.onload();
                else loadImg();
            }
            img.src = `${dirname}/${fn}`;
        }
        loadImg();
    }

    // onload将在图片加载完成时调用.
    public onload: () => void;
    public getLoadedFrameCount = () => this.loadedFileCount;
    public getFrameCount = () => this.imgs.length;

    // 设定帧率，fps=0时暂停
    public setFPS(fps: number) {
        fps = Math.max(fps, 0);
        if (fps == this.fps) return;
        const isPaused = this.fps == 0;
        if (fps == 0) clearTimeout(this.timer);
        this.fps = fps;
        if (isPaused) this.update();
    }

    // 清除该canvas画布的内容
    public clearCanvas() {
        let ctx = this.canvasElement.getContext("2d");
        const width = Number.parseFloat(this.canvasElement.getAttribute("width"));
        const height = Number.parseFloat(this.canvasElement.getAttribute("height"));
        ctx.clearRect(0, 0, width, height);
    }

    // 绘制第一帧
    public drawFirstFrame() {
        this.drawFrame(0);
    }

    // 绘制指定的帧
    private drawFrame(frameIndex: number) {
        let ctx = this.canvasElement.getContext("2d");
        const width = Number.parseFloat(this.canvasElement.getAttribute("width"));
        const height = Number.parseFloat(this.canvasElement.getAttribute("height"));
        const curImg = this.imgs[frameIndex];
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(curImg, 0, 0, width, height);
    }

    // 根据FPS的值自动绘制和更新画布帧
    private update() {
        if (this.fps == 0) return;
        this.curFrameIndex = (this.curFrameIndex + 1) % this.imgs.length;
        this.drawFrame(this.curFrameIndex);
        this.timer = TimeoutManager.setTimeout(this.update.bind(this), 1000 / this.fps);
    }
}

// 控制图片动画的管理类
class ImageAnimationManager {
    private controllerDict: { [key: string]: ImageAnimationController; } = {}
    private controllerList: ImageAnimationController[] = [];
    private loaded: boolean = false;

    public constructor(containerElement: HTMLDivElement) {
        let loadedController = 0;
        const canvasElements = Array.from(containerElement.children);

        // 获取存放图片的div元素下的所有子节点
        canvasElements.forEach((canvasElement: HTMLCanvasElement) => {
            // 设定其宽度为窗口宽度
            canvasElement.style.width = window.innerWidth.toString();

            // 获取子节点的名称和动画资源目录
            const name = canvasElement.dataset.name;
            const animationDir = canvasElement.dataset.animationDir;

            // 创建对应的绘画区域操控类
            const controller = new ImageAnimationController(canvasElement, animationDir);
            this.controllerDict[name] = controller;
            this.controllerList.push(controller);
            controller.onload = () => {
                loadedController++;
                if (loadedController == canvasElements.length) {
                    this.onload();
                    this.loaded = true;
                }
            }
        });
    }

    // 获取一块指定的绘画区域操控类
    public getController(name: string) {
        return this.controllerDict[name];
    }

    // 获取当前的图片资源加载进度.
    public getLoadProgress(): number {
        let totalFrameCount = 0;
        let loadedFrameCount = 0;
        this.controllerList.forEach(controller => totalFrameCount += controller.getFrameCount());
        this.controllerList.forEach(controller => loadedFrameCount += controller.getLoadedFrameCount());
        return loadedFrameCount / totalFrameCount;
    }

    // 是否完成
    public isLoaded(): boolean {
        return this.loaded;
    }

    // 清空所有画布的内容
    public hide() {
        this.controllerList.forEach(controller => controller.clearCanvas());
    }

    // 显示所有画布的第一帧
    public display() {
        this.controllerList.forEach(controller => controller.drawFirstFrame());
    }

    // 该函数将在资源加载完成时调用.
    public onload: () => void;
}


class AudioManager {
    private audioElements: HTMLAudioElement[] = null;
    private maxAudioNum: number = 2;
    constructor(audioContainer: HTMLDivElement) {
        this.audioElements = Array.from(audioContainer.children).map(child => <HTMLAudioElement>child);
        this.audioElements.forEach((audioElement) => {
            audioElement.volume = Number.parseFloat(audioElement.dataset.volumn);
            audioElement.playbackRate = Number.parseFloat(audioElement.dataset.speed);
        })
    }
    public playIfAvail() {
        let availElementIndices: HTMLAudioElement[] = [];
        this.audioElements.forEach(audioElement => {
            if (audioElement.ended == true || audioElement.readyState == 4) {
                availElementIndices.push(audioElement);
            }
        });
        if (availElementIndices.length <= this.audioElements.length - this.maxAudioNum) return;
        availElementIndices[Math.floor(Math.random() * availElementIndices.length)].play();
    }
}

class BackAudioManager {
    private audioElements: HTMLAudioElement[] = null;
    private curPlayIndex: number = 0;
    constructor(audioContainer: HTMLDivElement) {
        this.audioElements = Array.from(audioContainer.children).map(child => <HTMLAudioElement>child);
        this.audioElements.forEach((audioElement) => {
            audioElement.volume = Number.parseFloat(audioElement.dataset.volumn);
        });
        const loop = () => {
            this.audioElements[this.curPlayIndex].play();
            this.audioElements[this.curPlayIndex].onended = () => {
                setTimeout(loop, 2000);
            };
            this.curPlayIndex = (this.curPlayIndex + 1) % this.audioElements.length;
        };
        loop();
    }
}

// 时间管理器
class TimeManager {
    private startTime: number;
    private currentTime: number;
    private stopped: boolean = false;
    public start() {
        this.startTime = new Date().getTime();
        this.stopped = false;
    }
    private fixInteger(num:number, length:number) {
        return (Array(length).join('0') + num).slice(-length);
    }
    public getElapseTime() {
        if(!this.stopped) this.currentTime = new Date().getTime();
        const elapseTime = new Date(this.currentTime - this.startTime);
        const mins = this.fixInteger(elapseTime.getMinutes(), 2);
        const secs = this.fixInteger(elapseTime.getSeconds(), 2);
        const millSecs = this.fixInteger(elapseTime.getMilliseconds(), 3);
        return `${mins}:${secs}:${millSecs}`;
    }
    public stop() {
        this.stopped = true;
    }
}

// 操控SVG图片的管理类
class SVGManager {
    private paths: SVGPathManipulator[] = null;
    private drawingCount: number = 0;
    private audioManager: AudioManager = null;
    private drawingPathIndices: number[] = [];
    public drawBatchCount: number = 5;
    public edgeLengthPerDraw: number = 10;
    public edgeInterval: number = 30;
    public fillInterval: number = 30;
    public fillOpacityIncrease: number = 0.3;

    public constructor(svgContainer: HTMLDivElement, audioManager: AudioManager) {
        // 保存声音管理
        this.audioManager = audioManager;

        // 获取捣练图的SVG文件内容.
        let svgFileBuffer = fs.readFileSync(svgContainer.dataset.svgPath);
        svgContainer.innerHTML = svgFileBuffer.toString();
        // 拿到SVG节点
        const svg = svgContainer.children[0];
        const pathElements = svg.getElementsByTagName("path");
        // 创建SVGPathManipulator
        this.paths = Array.from(pathElements).map(pathElement => new SVGPathManipulator(pathElement));
        this.paths = this.sortSVGPaths(this.paths);
    }

    // 对所有的path进行排序
    private sortSVGPaths(paths: SVGPathManipulator[]): SVGPathManipulator[] {
        return paths.sort((a, b) => {
            return a.getStartPosition().x - b.getStartPosition().x;
        })
    }

    // 获取最长路径的长度
    public getLongestPathLength(): number {
        let maxLength = 0;
        this.paths.forEach(path => {
            maxLength = Math.max(maxLength, path.length());
        })
        return maxLength;
    }

    // 清除当前正在绘制的路径数量.
    public clearDrawingCount() {
        this.drawingCount = 0;
    }

    // 应用速度修改.
    public applySpeedModify() {
        this.drawingPathIndices.forEach(index => {
            const path = this.paths[index];
            path.edgeDecrease = this.edgeLengthPerDraw;
            path.edgeInterval = this.edgeInterval;
            path.fillInterval = this.fillInterval;
            path.fillOpacityIncrease = this.fillOpacityIncrease;
        })
    }

    // 同时进行多个路径的填充操作
    public drawFillBundle(onDone: Function) {
        let nextDrawIndex = 0;
        let hasDone = 0;
        let drawFillImpl = () => {
            if (nextDrawIndex == this.getPathCount()) return;
            for (; this.drawingCount <= this.drawBatchCount; ++this.drawingCount) {
                this.drawingPathIndices.push(nextDrawIndex);
                this.audioManager.playIfAvail();
                const path = this.paths[nextDrawIndex];
                path.fillInterval = this.fillInterval;
                path.fillOpacityIncrease = this.fillOpacityIncrease;
                path.hideEdge();
                path.drawFill((index:number) => {
                    this.drawingPathIndices.splice(this.drawingPathIndices.indexOf(index), 1);
                    --this.drawingCount;
                    ++hasDone;
                    if (hasDone == this.getPathCount()) onDone();
                    drawFillImpl();
                }, nextDrawIndex);
                ++nextDrawIndex;
            }
        };
        drawFillImpl();
    }

    // 同时进行多个路径的绘制操作.
    public drawEdgeBundle(onDone: Function) {
        let nextDrawIndex = 0;
        let hasDone = 0;
        let drawEdgeImpl = () => {
            if (nextDrawIndex == this.getPathCount()) return;
            for (; this.drawingCount <= this.drawBatchCount; ++this.drawingCount) {
                this.drawingPathIndices.push(nextDrawIndex);
                this.audioManager.playIfAvail();
                const path = this.paths[nextDrawIndex];
                path.edgeDecrease = this.edgeLengthPerDraw;
                path.edgeInterval = this.edgeInterval;
                this.paths[nextDrawIndex].drawEdge((index:number) => {
                    this.drawingPathIndices.splice(this.drawingPathIndices.indexOf(index), 1);
                    --this.drawingCount;
                    ++hasDone;
                    if (hasDone == this.getPathCount()) onDone();
                    drawEdgeImpl();
                }, nextDrawIndex);
                ++nextDrawIndex;
            }
        };
        drawEdgeImpl();
    }

    public stopAll() {
        this.paths.forEach((path, _, __) => {
            path.stop();
        })
        this.drawingCount = 0;
    }

    // 隐藏所有的路径
    public hide() {
        this.paths.forEach((path, _, __) => {
            path.hideEdge();
            path.hideFill();
            path.setStrokeColor("#222222");
            path.setStrokeWidth(0.75);
        })
    }

    // 获取指定索引的路径(unused)
    public getPath(index: number) {
        return this.paths[index]
    }

    // 获取路径的数目
    public getPathCount() {
        return this.paths.length;
    }
}

class ProgressHintManager {
    private hintElements: HTMLDivElement[] = [];
    constructor(hintContainer: HTMLDivElement) {
        this.hintElements = Array.from(hintContainer.children).map(c => <HTMLDivElement>c);
        this.hintElements.sort(
            (a, b) => Number.parseFloat(a.dataset.checkpoint) - Number.parseFloat(b.dataset.checkpoint)
        );
        this.hintElements.forEach(hintElement => {
            const checkpoint = Number.parseFloat(hintElement.dataset.checkpoint);
            hintElement.style.left = `${checkpoint * 100}%`;
        });
    }
}

window.onload = () => {
    // 拿到一些元素节点.
    const toastElement = <HTMLDivElement>document.getElementById("toast");
    const backElement = <HTMLDivElement>document.getElementById("backWrapper");
    const backImgElement = <HTMLImageElement>document.getElementById("backImg");
    const svgContainer = <HTMLDivElement>document.getElementById("svgContainer");
    const imgContainer = <HTMLImageElement>document.getElementById("imgContainer");
    const restartButton = <HTMLDivElement>document.getElementById("restartButton");
    const audioContainer = <HTMLDivElement>document.getElementById("audioContainer");
    const backAudioContainer = <HTMLDivElement>document.getElementById("backAudioContainer");
    const attentionProgressBar = <HTMLDivElement>document.getElementById("attentionValProgress");
    const paintingTime = <HTMLSpanElement>document.getElementById("paintingTime");
    const paintingTimeContainer = <HTMLDivElement>document.getElementById("patingTimeContainer");
    const progressHintContainer = <HTMLDivElement>document.getElementById("progressHintContainer");

    // 创建SVG管理和图片动画管理.
    const audioManager = new AudioManager(audioContainer);
    const svgManager = new SVGManager(svgContainer, audioManager);
    const imgAnimationManager = new ImageAnimationManager(imgContainer);
    const backAudioManager = new BackAudioManager(backAudioContainer);
    const timeManager = new TimeManager();
    const progressHintManager = new ProgressHintManager(progressHintContainer);

    // 设定背景图片的宽度;
    backImgElement.style.width = window.innerWidth.toString();
    const svgElement = <SVGElement>svgContainer.children[0];
    svgElement.style.width = window.innerWidth.toString();

    // 流程定义
    let procedure: "prepare" | "loading" | "load-done" | "edging" | "edge-done" | "filling" |
        "fill-done" | "animation" | "end" = "prepare";

    // 设定单击事件
    restartButton.onclick = () => {
        procedure = "end";
    }

    // 设定声音
    // setInterval(() => {
    //     // const index = Math.floor(Math.random() * 4);
    //     const index = 0;
    //     audioElement.src = `./audio/pencil_draw_${index}.mp3`;
    //     audioElement.playbackRate = 1;
    //     audioElement.play().then();
    // }, 2000);

    // 主渲染逻辑
    let draw = () => {
        const attention = getAttentionValue();
        const elapseTime = timeManager.getElapseTime();
        paintingTime.innerHTML = elapseTime.toString();
        attentionProgressBar.style.width = `${attention * 100}%`;
        switch (procedure) {
            // 准备阶段
            case "prepare":
                paintingTimeContainer.style.display = `none`;
                progressHintContainer.style.display = `none`;
                svgManager.hide();
                imgAnimationManager.hide();
                procedure = "loading";
                if (imgAnimationManager.isLoaded()) procedure = "load-done";
                else {
                    imgAnimationManager.onload = () => {
                        procedure = "load-done";
                        // procedure = "edge-done";
                    }
                }
                setTimeout(draw, 50);
                break;
            // 加载资源阶段
            case "loading":
                setTimeout(draw, 50);
                break;
            // 加载完毕阶段
            case "load-done":
                backElement.style.width = "100%";
                imgContainer.style.width = "100%";
                svgContainer.style.width = "100%";
                toastElement.className = "loaded";
                setTimeout(() => {
                    procedure = "edging";
                    paintingTimeContainer.style.display = `block`;
                    timeManager.start();
                    svgManager.drawEdgeBundle(() => {
                        procedure = "edge-done";
                    });
                    draw();
                }, 3000);
                break;
            // 描边阶段
            case "edging":
                // do control here.
                // svgManager.edgeInterval = (1 / (attention + 0.1)) * 30;
                // svgManager.drawBatchCount = ?
                svgManager.edgeLengthPerDraw = Math.max(attention, 0.1) * 50;
                svgManager.applySpeedModify();
                setTimeout(draw, 50);
                break;
            // 描边完成阶段
            case "edge-done":
                svgManager.clearDrawingCount();
                svgManager.drawFillBundle(() => {
                    procedure = "fill-done";
                });
                procedure = "filling";
                setTimeout(draw, 10);
                break;
            // 填色阶段
            case "filling":
                // do control here.
                // interval: 1 -> 10, 0 -> 30;
                // svgManager.fillOpacityIncrease = Math.max(attention, 0.1) * 0.8;
                svgManager.fillInterval = 30 - attention * 20;
                svgManager.applySpeedModify();
                setTimeout(draw, 50);
                break;
            // 填色完成阶段
            case "fill-done":
                progressHintContainer.style.display = `block`;
                imgAnimationManager.display();
                svgManager.hide();
                procedure = "animation";
                timeManager.stop();
                setTimeout(draw, 10);
                break;
            // 动画阶段
            case "animation":
                // do control here.
                imgAnimationManager.getController("捣衣").setFPS(Number((attention - 0.3) > 0) * 10 + (Math.max(attention - 0.3, 0) / 0.7) * 50);
                imgAnimationManager.getController("煽火").setFPS(Number((attention - 0.45) > 0) * 10 + (Math.max(attention - 0.45, 0) / 0.55) * 50);
                imgAnimationManager.getController("熨布").setFPS(Number((attention - 0.55) > 0) * 10 + (Math.max(attention - 0.55, 0) / 0.45) * 50);
                imgAnimationManager.getController("织衣").setFPS(Number((attention - 0.1) > 0) * 10 + (Math.max(attention - 0.1, 0) / 0.9) * 50);
                setTimeout(draw, 50);
                break;
            case "end":
                TimeoutManager.clearAll();
                svgManager.stopAll();
                imgContainer.style.width = "0%";
                backElement.style.width = "0%";
                svgContainer.style.width = "0%";
                imgAnimationManager.getController("捣衣").setFPS(0);
                imgAnimationManager.getController("煽火").setFPS(0);
                imgAnimationManager.getController("熨布").setFPS(0);
                imgAnimationManager.getController("织衣").setFPS(0);
                setTimeout(() => {
                    procedure = "prepare";
                    draw();
                }, 3000);
                break;
            default:
                break;
        }
    }
    // 开始绘制
    draw();
};
