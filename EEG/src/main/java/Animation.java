import processing.core.PApplet;
import processing.core.PImage;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

public class Animation extends PApplet {
    // TGConnection
    TG_Connection tg_connection;

    // Global variables
    int index[];

    final int IRON = 0;
    final int FIRE = 1;
    final int SEW = 2;
    final int HIT = 3;

    final int PARTITIONS = 4;
    boolean generated = false;
    boolean colored = false;
    Map eng2ch = new HashMap();
    Map inx2eng = new HashMap();
    Map eng2num = new HashMap();
    final int[] trigger_point = {20, 931, 896, 1250, 1215, 1910, 1852, 2480};
    int edge_timemark = trigger_point[0];
    int color_timemark = trigger_point[0];
    int current_part = 0;


    // Image processing
    PImage bg;
    PImage[] edges;
    PImage[] temp_edges;
    PImage[][] img_list;

    // Image directory
    String imgPath = System.getProperty("user.dir") + File.separator + "src\\imgs\\";



    public static void main(String[] Args) {
        long maxMemory = Runtime.getRuntime().maxMemory();//java虚拟机使用的最大内存量
        long totalMemory = Runtime.getRuntime().totalMemory();//java虚拟机内存总量

        System.out.println("MAX_MEMORY = " + maxMemory + "(字节)、" + (maxMemory / (double) 1024 / 1024) + "MB");
        System.out.println("TOTAL_MEMORY = " + totalMemory + "(字节)、" + (totalMemory / (double) 1024 / 1024) + "MB");


        String[] appletArgs = {"Animation"};
        Animation animation = new Animation();
        PApplet.runSketch(appletArgs, animation);
    }



    public void settings() {
        // get EEG device connection
        // HOW to deal with connection FAILURE
        tg_connection = new TG_Connection();
        tg_connection.start();

        System.out.println("EEG Headset connect successfully!");

        // background initialization
        bg = loadImage(imgPath + "background-1.png");
        bg.resize(bg.width, bg.height);
        size(bg.width, bg.height);

        // variables initialization
        eng2ch.put("fire", "煽火");
        eng2ch.put("hit", "捣衣");
        eng2ch.put("iron", "熨布");
        eng2ch.put("sew", "织衣");

        inx2eng.put(1, "fire");
        inx2eng.put(3, "hit");
        inx2eng.put(0, "iron");
        inx2eng.put(2, "sew");

        eng2num.put("fire", 60);
        eng2num.put("hit", 180);
        eng2num.put("iron", 60);
        eng2num.put("sew", 60);

        index = new int[PARTITIONS];
        for (int i = 0; i < PARTITIONS; i++){
            index[i] = 0;
        }

        // edges initialization
        edges = new PImage[PARTITIONS];
        for (int i = 0; i < PARTITIONS; i++){
            String edge_path = imgPath + "edges\\" + inx2eng.get(i).toString() + ".png";
            edges[i] = loadImage(edge_path);
            System.out.print(edge_path);
        }

        temp_edges = new PImage[PARTITIONS];
        for (int i = 0; i < PARTITIONS; i++){
            temp_edges[i] = createImage(edges[i].width, edges[i].height, ARGB);
        }

        // images initialization
        img_list = new PImage[PARTITIONS][];
        for (int i = 0; i < PARTITIONS; i++) {
            img_list[i] = new PImage[Integer.parseInt(eng2num.get(inx2eng.get(i)).toString())+1];
            for (int j = 0; j < img_list[i].length; j++){
                String index_str = String.format("%03d", j);
                String framePath = imgPath + "Partitions\\" + inx2eng.get(i).toString() + "\\"+ eng2ch.get(inx2eng.get(i)).toString() + "_00" +  index_str + ".png";
                System.out.println(framePath);
                img_list[i][j] = loadImage(framePath);
            }
        }
    }

    public PImage generateEdegs(int inx, int col, int left_start, int right_end){
        if (col >= right_end){
            col = right_end - 1;
        }
        PImage output = createImage(edges[inx].width, edges[inx].height, ARGB);
        loadPixels();
        for (int y = 0; y < edges[inx].height; y++) {

            for (int x = left_start; x <= col; x++) {
                int loc = y * edges[inx].width + x;
                output.pixels[loc] = color(255, 255, 255, 0);
                float r = red(edges[inx].pixels[loc]);
                float g = green(edges[inx].pixels[loc]);
                float b = blue(edges[inx].pixels[loc]);
                float a = alpha(edges[inx].pixels[loc]);
                float sum = r + g + b;
//                if (alpha(edges[inx].pixels[loc]) != 0 && sum < 180 * 3) {
                    output.pixels[loc] = color(r, g, b, a);

//                }
            }

        }

        updatePixels();
        return output;
    }

    public PImage colorPainting(int inx, int col, int left_start, int right_end){
        if (col >= right_end){
            col = right_end - 1;
        }
        PImage output = createImage(edges[inx].width, edges[inx].height, ARGB);
        loadPixels();
        for (int y = 0; y < img_list[0][0].height; y++) {
            // color paintings
            for (int x = left_start; x <= col; x++) {

                    int loc = y * img_list[inx][0].width + x;
                    float r = red(img_list[inx][0].pixels[loc]);
                    float g = green(img_list[inx][0].pixels[loc]);
                    float b = blue(img_list[inx][0].pixels[loc]);
                    float a = alpha(img_list[inx][0].pixels[loc]);
                    output.pixels[loc] = color(r, g, b, a);

            }
            // remain part: edges
            for (int x = col + 1; x < right_end; x++){
                int loc = y * edges[inx].width + x;
                output.pixels[loc] = color(255, 255, 255, 0);
                float r = red(edges[inx].pixels[loc]);
                float g = green(edges[inx].pixels[loc]);
                float b = blue(edges[inx].pixels[loc]);
                float a = alpha(edges[inx].pixels[loc]);
                float sum = r + g + b;
                output.pixels[loc] = color(r, g, b, a);
            }
        }

        updatePixels();
        return output;
    }

    public void draw() {
        background(bg);
        frameRate(25);

        fill(0,0,0,0);
        textAlign(LEFT,TOP);
        fill(255);
        textSize(48);
        text("Current Attention: " + (int) tg_connection.attention, 15, 15);


        // sketching
        if (! generated && current_part < PARTITIONS){
            System.out.println(current_part);
            for (int i = 0; i < current_part; i++)
            {
                image(edges[i],0,0,edges[i].width, edges[i].height);
            }

            if (edge_timemark >= trigger_point[7]){
                    generated = true;
            }
//            temp_edges = generateEdegs(col_timemark);
            edge_timemark += ceil(tg_connection.attention / 10);
            image(generateEdegs(current_part, edge_timemark, trigger_point[current_part * 2], trigger_point[current_part * 2 + 1]), 0, 0, temp_edges[current_part].width, temp_edges[current_part].height);

            if (edge_timemark > trigger_point[current_part * 2 + 1]) {
                current_part++;
                if (current_part >= 4){
                    generated = true;
                    current_part = 0;
                }
                else{
                    edge_timemark = trigger_point[current_part * 2];
                }

            }

        }else if (!colored){ //coloring
            if (color_timemark >= trigger_point[7]){
                colored = true;
            }

            color_timemark += ceil(tg_connection.attention / 5);
           for (int i = current_part + 1; i < PARTITIONS; i++){
               image(edges[i],0,0,edges[i].width, edges[i].height);
           }

            for (int i = 0; i < current_part; i++)
            {
                image(img_list[i][0],0,0,img_list[i][0].width, img_list[i][0].height);
            }
            image(colorPainting(current_part, color_timemark, trigger_point[current_part * 2], trigger_point[current_part * 2 + 1]), 0, 0, temp_edges[current_part].width, temp_edges[current_part].height);


            if (color_timemark > trigger_point[current_part * 2 + 1]) {
                current_part++;
                if (current_part >= 4){
                    colored = true;
                    for (int i = 0; i < PARTITIONS; i++)
                    {
                        edges[i]=null;
                        temp_edges[i]=null;
                    }

                    current_part = 0;
                }
                else{
                    color_timemark = trigger_point[current_part * 2];
                }

            }

        }
        else { // movement control
            image(img_list[SEW][index[SEW]%img_list[SEW].length], 0,0, img_list[SEW][index[SEW]%img_list[SEW].length].width, img_list[SEW][index[SEW]%img_list[SEW].length].height);
            image(img_list[HIT][index[HIT]%img_list[HIT].length], 0,0, img_list[HIT][index[HIT]%img_list[HIT].length].width, img_list[HIT][index[HIT]%img_list[HIT].length].height);
            image(img_list[FIRE][index[FIRE]%img_list[FIRE].length], 0,0, img_list[FIRE][index[FIRE]%img_list[FIRE].length].width, img_list[FIRE][index[FIRE]%img_list[FIRE].length].height);
            image(img_list[IRON][index[IRON]%img_list[IRON].length], 0,0, img_list[IRON][index[IRON]%img_list[IRON].length].width, img_list[IRON][index[IRON]%img_list[IRON].length].height);


            if (tg_connection.attention > 20){
                index[SEW]++;
            }
            if (tg_connection.attention > 40){
                index[HIT]++;
            }
            if (tg_connection.attention > 60){
                index[FIRE]++;
            }
            if (tg_connection.attention > 80){
                index[IRON]++;
            }

            for (int i = 0; i < PARTITIONS; i++){
                if (index[i] >= Integer.parseInt(eng2num.get(inx2eng.get(i)).toString()))
                    index[i] = 0;
            }
        }
    }

}
