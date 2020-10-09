class EEGService extends Service {
    private long lastTickTime = System.currentTimeMillis();

    public EEGService(Server server) throws Exception {
        super(server, EEGService.class);
    }

    public long getLastTickTime() {
        return lastTickTime;
    }

    /*
        该函数由前端调用，用于保持和前端的连接心跳。
     */
    @CalledByRemote
    public void tick() {
        lastTickTime = System.currentTimeMillis();
        // System.out.println("Received Tick!");
    }

    /*
        该函数将调用前端的onAttentionValueChangedEvent的函数，并传递当前的attention值。
     */
    public void sendAttentionValueChangedEvent(int attention){
        this.server.callRemote("onAttentionValueChangedEvent", attention);
    }
}