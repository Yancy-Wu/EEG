const { ipcRenderer } = require('electron');
const fs = require("fs");
//import * as fs from "fs";

ipcRenderer.on('onAttentionValueChangedEvent', function (_: any, value: number) {
    let attentionValSpan = document.getElementById("attentionVal");
    attentionValSpan.innerHTML = value.toString();
});

function getAttentionValue(): number {
    let attentionValSpan = document.getElementById("attentionVal");
    return Number.parseFloat(attentionValSpan.innerHTML);
}

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

class SVGPathManipulator {
    private pathElement: SVGPathElement;
    private startPosition: Vector2;
    private fillColor: string;
    constructor(pathElement: SVGPathElement) {
        this.pathElement = pathElement;
        this.startPosition = this._getSVGPathStartPosition(pathElement);
        this.fillColor = window.getComputedStyle(pathElement).fill;
        this.pathElement.setAttribute("class", "");
    }
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
    public getStartPosition(): Vector2 {
        return this.startPosition;
    }
    public hideEdge() {
        let len = this.pathElement.getTotalLength();
        this.pathElement.style.strokeDasharray = len.toString();
        this.pathElement.style.strokeDashoffset = len.toString();
    }
    public length = () => this.pathElement.getTotalLength();
    public hideFill = () => this.pathElement.style.fill = "none";
    public setStrokeColor = (color: string) => this.pathElement.style.stroke = color;
    public setStrokeWidth = (width: number) => this.pathElement.style.strokeWidth = width.toString();
    public drawEdge(onDone: Function, decrease: number, interval: number) {
        let len = this.pathElement.getTotalLength();
        let savedLen = len;
        let animation = setInterval(() => {
            const t = (1 - len / this.pathElement.getTotalLength());
            const factor = this.getBezierTangent(t, new Vector2(0.5, 0.1), new Vector2(0.5, 0.8));
            const newDecrease = decrease * factor.tan();
            len -= newDecrease;
            len = Math.max(0, len);
            this.pathElement.style.strokeDasharray = savedLen.toString();
            this.pathElement.style.strokeDashoffset = len.toString();
            if (len == 0) {
                clearInterval(animation);
                onDone();
            }
        }, interval);
    }
    public drawFill(onDone: Function, increase: number, interval: number) {
        let opacity = 0.0;
        let animation = setInterval(() => {
            opacity += increase;
            opacity = Math.min(1.0, opacity);
            this.pathElement.style.fill = this.fillColor;
            this.pathElement.style.opacity = opacity.toString();
            if (opacity >= 0.99) {
                clearInterval(animation);
                onDone();
            }
        }, interval);
    }
}

class ImageAnimationController {
    private imgs: HTMLImageElement[];
    private canvasElement: HTMLCanvasElement;
    private curFrameIndex: number = 0;
    private fps: number = 0;
    private timer: NodeJS.Timeout = null;
    private loadedFileCount = 0;
    public constructor(canvasElement: HTMLCanvasElement, dirname: string) {
        let imgFileNames: string[] = fs.readdirSync(dirname, { encoding: "utf-8" });
        imgFileNames = imgFileNames.sort();
        this.canvasElement = canvasElement;
        this.imgs = imgFileNames.map(_ => null);
        let curIndex = 0;
        const loadImg = () => {
            const fn = imgFileNames[curIndex];
            const img = new Image();
            img.onload = () => {
                const width = Number.parseFloat(this.canvasElement.getAttribute("width"));
                // time consuming operation.
                // createImageBitmap(img, {resizeWidth:width}).then(val => {
                //     this.imgs[curIndex] = val;
                //     this.loadedFileCount++;
                //     if (this.loadedFileCount == imgFileNames.length) this.onload();
                //     else loadImg();
                // });
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
    public onload: () => void;
    public getLoadedFrameCount = () => this.loadedFileCount;
    public getFrameCount = () => this.imgs.length;
    public setFPS(fps: number) {
        fps = Math.max(fps, 0);
        if (fps == this.fps) return;
        const isPaused = this.fps == 0;
        if (fps == 0) clearTimeout(this.timer);
        this.fps = fps;
        if (isPaused) this.update();
    }
    private update() {
        if (this.fps == 0) return;
        this.curFrameIndex = (this.curFrameIndex + 1) % this.imgs.length;
        let ctx = this.canvasElement.getContext("2d");
        const width = Number.parseFloat(this.canvasElement.getAttribute("width"));
        const height = Number.parseFloat(this.canvasElement.getAttribute("height"));
        const curImg = this.imgs[this.curFrameIndex];
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(curImg, 0, 0, width, height);
        this.timer = setTimeout(this.update.bind(this), 1000 / this.fps);
    }
}

class ImageAnimationManager {
    private controllerDict: { [key: string]: ImageAnimationController; } = {}
    private controllerList: ImageAnimationController[] = [];
    public constructor(containerElement: HTMLDivElement) {
        let loadedController = 0;
        const canvasElements = Array.from(containerElement.children);
        canvasElements.forEach((canvasElement: HTMLCanvasElement) => {
            const name = canvasElement.dataset.name;
            const animationDir = canvasElement.dataset.animationDir;
            const controller = new ImageAnimationController(canvasElement, animationDir);
            this.controllerDict[name] = controller;
            this.controllerList.push(controller);
            controller.onload = () => {
                loadedController++;
                if (loadedController == canvasElements.length) this.onload();
            }
        });
    }
    public getController(name: string) {
        return this.controllerDict[name];
    }
    public getLoadProgress(): number {
        let totalFrameCount = 0;
        let loadedFrameCount = 0;
        this.controllerList.forEach(controller => totalFrameCount += controller.getFrameCount());
        this.controllerList.forEach(controller => loadedFrameCount += controller.getLoadedFrameCount());
        return loadedFrameCount / totalFrameCount;
    }
    public hide() {
        // pass.
    }
    public display() {
        // pass.
    }
    public onload: () => void;
}

class SVGManager {
    private paths: SVGPathManipulator[] = null;
    private drawingCount:number = 0;
    public drawBatchCount: number = 6;
    public edgeLengthPerDraw: number = 10;
    public edgeInterval: number = 30;
    public fillInterval: number = 30;
    public constructor(svgContainer: HTMLDivElement) {
        // 获取捣练图的SVG文件内容.
        let svgFileBuffer = fs.readFileSync(svgContainer.dataset.svgPath);
        svgContainer.innerHTML = svgFileBuffer.toString();
        // 拿到SVG节点
        const svg = svgContainer.children[0];
        const pathElements = svg.getElementsByTagName("path");
        // 创建SVGPathManipulator
        this.paths = Array.from(pathElements).map(pathElement => new SVGPathManipulator(pathElement));
        this.paths = this.sortSVGPaths(this.paths);
        // this.paths = this.paths.filter((path) => this.filterShortSVGPath(path, 10));
    }

    private sortSVGPaths(paths: SVGPathManipulator[]): SVGPathManipulator[] {
        return paths.sort((a, b) => {
            return a.getStartPosition().x - b.getStartPosition().x;
        })
    }

    public getLongestPathLength(): number {
        let maxLength = 0;
        this.paths.forEach(path => {
            maxLength = Math.max(maxLength, path.length());
        })
        return maxLength;
    }

    public clearDrawingCount() {
        this.drawingCount = 0;
    }

    public drawFillBundle(onDone:Function) {
        let nextDrawIndex = 0;
        let drawFillImpl = () => {
            if(nextDrawIndex == this.getPathCount()) return;
            for(;this.drawingCount <= this.drawBatchCount; ++this.drawingCount) {
                this.paths[nextDrawIndex].hideEdge();
                this.paths[nextDrawIndex].drawFill(() => {
                    --this.drawingCount;
                    drawFillImpl();
                }, 0.2, this.fillInterval);
                ++nextDrawIndex;
                if(nextDrawIndex == this.getPathCount()) onDone(); 
            }
        };
        drawFillImpl();
    }

    public drawEdgeBundle(onDone:Function) {
        let nextDrawIndex = 0;
        let drawEdgeImpl = () => {
            if(nextDrawIndex == this.getPathCount()) return;
            for(;this.drawingCount <= this.drawBatchCount; ++this.drawingCount) {
                this.paths[nextDrawIndex].drawEdge(() => {
                    --this.drawingCount;
                    drawEdgeImpl();
                }, this.edgeLengthPerDraw, this.edgeInterval);
                ++nextDrawIndex;
                if(nextDrawIndex == this.getPathCount()) onDone(); 
            }
        };
        drawEdgeImpl();
    }

    public hide() {
        this.paths.forEach((path, _, __) => {
            path.hideEdge();
            path.hideFill();
            path.setStrokeColor("#222222");
            path.setStrokeWidth(0.75);
        })
    }

    public getPath(index: number) {
        return this.paths[index]
    }

    public getPathCount() {
        return this.paths.length;
    }
}

window.onload = () => {
    // 拿到一些元素节点.
    const toastElement = document.getElementById("toast");
    const backElement = document.getElementById("backWrapper");
    const backImgElement = document.getElementById("backImg");

    // 创建SVG管理和图片动画管理.
    const svgManager = new SVGManager(
        <HTMLDivElement>document.getElementById("svgContainer")
    );
    const imgAnimationManager = new ImageAnimationManager(
        <HTMLDivElement>document.getElementById("imgContainer")
    );

    // 设定背景图片的宽度;
    backImgElement.style.width = window.innerWidth.toString();

    // 主渲染逻辑
    let procedure: "prepare" | "loading" | "load-done" | "edging" | "edge-done" | "filling" |
                   "fill-done" | "animation" | "end" = "prepare";
    let draw = () => {
        const attention = getAttentionValue();
        switch (procedure) {
            // 准备阶段
            case "prepare":
                svgManager.hide();
                imgAnimationManager.hide();
                procedure = "loading";
                imgAnimationManager.onload = () => {
                    procedure = "load-done";
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
                toastElement.className = "loaded";
                setTimeout(() => {
                    procedure = "edging";
                    svgManager.drawEdgeBundle(() => {
                        procedure = "edge-done";
                    });
                    draw();
                }, 4000);
            // 描边阶段
            case "edging":
                // do control here.
                // svgManager.edgeInterval = ?
                // svgManager.drawBatchCount = ?
                // svgManager.edgeLengthPerDraw = ?
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
                // svgManager.fillInterval = ?
                // svgManager.drawBatchCount = ?
                setTimeout(draw, 50);
                break;
            // 填色完成阶段
            case "fill-done":
                imgAnimationManager.display();
                svgManager.hide();
                procedure = "animation";
                setTimeout(draw, 10);
                break;
            // 动画阶段
            case "animation":
                // do control here.
                imgAnimationManager.getController("捣衣").setFPS(60);
                imgAnimationManager.getController("煽火").setFPS(30);
                imgAnimationManager.getController("熨布").setFPS(30);
                imgAnimationManager.getController("织衣").setFPS(30);
                setTimeout(draw, 50);
                break;
            default:
                break;
        }
    }
    // 开始绘制
    draw();
};
