public class Main {
    public static void main(String[] args) throws Exception {
        // Server监听来自stdin的消息并将消息移交给回调函数进行处理.
        final Server server = new Server();

        // 回调函数在各Service中定义.
        final EEGService eeg = new EEGService(server);

        // 用于标记Server线程是否结束.
        final boolean[] terminated = {false};

        /*
            监视线程，该线程每2s检查一次来自前端的心跳(Tick)信号。
            如果没有收到则认为与前端的通信断开，然后停止运行。
         */
        new Thread() {
            public void run() {
                while(true) {
                    // 当前系统时间
                    long curTime = System.currentTimeMillis();
                    // 上一次收到Tick的时间
                    long lastTickTime = eeg.getLastTickTime();
                    if(curTime - lastTickTime > 2000) {
                        // 终止server运行并标记
                        System.out.println("Terminated because no tick received.");
                        server.interrupt();
                        terminated[0] = true;
                        return;
                    }
                    try {
                        Thread.sleep(2000);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }.start();

        // Server启动，开始监听
        server.start();


        /*
            主线程中其他正常进行的逻辑操作.
         */
        for (int i = 0; i < 10000; i++) {
            eeg.sendAttentionValueChangedEvent(i);
            if(terminated[0]) return;
            Thread.sleep(1000);
        }
        Thread.sleep(1000);
    }
}