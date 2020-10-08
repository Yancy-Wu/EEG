import java.io.IOException;
import java.util.logging.FileHandler;
import java.util.logging.Level;
import java.util.logging.Logger;


public class EEGLogger {
    private final Logger logger = Logger.getLogger(EEGLogger.class.getName());
    private static EEGLogger eegLogger = null;
    private static final String recordFileName = "./log.txt";

    private EEGLogger() throws IOException {
        FileHandler fileHandler = new FileHandler(EEGLogger.recordFileName);
        fileHandler.setLevel(Level.INFO);
        logger.addHandler(fileHandler);
    }

    public static EEGLogger getInstance() throws IOException {
        if(EEGLogger.eegLogger != null) return EEGLogger.eegLogger;
        EEGLogger.eegLogger = new EEGLogger();
        return EEGLogger.eegLogger;
    }

    public static void log(String msg) throws IOException {
        EEGLogger.getInstance().logger.info(msg);
    }
}
