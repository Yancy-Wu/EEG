import java.io.IOException;

class EEGService extends Service{
    public EEGService(Server server) throws Exception {
        super(server, EEGService.class);
    }

    @CalledByRemote
    public void hello(int testInt, String testString) throws IOException {
        EEGLogger.log(testString);
    }

    public void sendAttentionValueChangedEvent(int attention){
        this.server.callRemote("onAttentionValueChangedEvent", attention);
    }

    public void sendMessage(String message){
        this.server.callRemote("onMessage", message);
    }
}