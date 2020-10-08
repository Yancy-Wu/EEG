public class Main {
    public static void main(String[] args) throws Exception {
        Server server = new Server();
        server.start();

        EEGService eeg = new EEGService(server);

        eeg.sendMessage("EEG Device Connecting...");
        Thread.sleep(1000);
        eeg.sendMessage("EEG Connected.");
        for (int i = 0; i < 10000; i++) {
            eeg.sendAttentionValueChangedEvent(i);
            Thread.sleep(1000);
        }
        Thread.sleep(1000);
        eeg.sendMessage("EEG Device Interrupted.");
    }
}