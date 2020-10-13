import com.sun.jna.Native;
import com.sun.jna.win32.StdCallLibrary;

import java.io.File;

public class TG_Connection extends Thread {
    // eeg server.
    private EEGService eeg;
    boolean terminating = false;

    // thinkgear connection
    int connectionID = -1;

    //EEG value
    public float attention = 0;
    public float meditation = 0;
    public float delta = 0;
    public float theta = 0;
    public float alpha1= 0 ;
    public float alpha2 = 0;
    public float beta1 = 0;
    public float beta2 = 0;
    public float gamma1 = 0;
    public float gamma2 = 0;


    // Data format
    public static final int TG_STREAM_PACKETS = 0;
    public static final int TG_STREAM_FILE_PACKETS =2;

    // Baud rate for use with TG_Connet() and TG_SetBaudRate()
    public static final int TG_BAUD_1200 = 1200;
    public static final int TG_BAUD_2400 = 2400;
    public static final int TG_BAUD_4800 = 4800;
    public static final int TG_BAUD_9600 = 9600;
    public static final int TG_BAUD_57600 = 57600;
    public static final int TG_BAUD_115200 = 115200;


    // Data types
    public static final int TG_DATA_POOR_SIGNAL = 1;
    public static final int TG_DATA_ATTENTION = 2;
    public static final int TG_DATA_MEDITATION = 3;
    public static final int TG_DATA_RAW = 4;
    public static final int TG_DATA_DELTA = 5;
    public static final int TG_DATA_THETA = 6;
    public static final int TG_DATA_ALPHA1 = 7;
    public static final int TG_DATA_ALPHA2 = 8;
    public static final int TG_DATA_BETA1 = 9;
    public static final int TG_DATA_BETA2 = 10;
    public static final int TG_DATA_GAMMA1 = 11;
    public static final int TG_DATA_GAMMA2 = 12;

    private boolean connection_status = false;

    public boolean get_status() {
        return connection_status;
    }
    // using JNA technique to load C++ library
    public interface Dll extends StdCallLibrary {
        Dll INSTANCE = (Dll) Native.load(System.getProperty("user.dir") + File.separator + "thinkgear64.dll", Dll.class);
        public int TG_GetVersion();
        public int TG_GetNewConnectionId();
        public int TG_SetStreamLog(int connectionId, String filename);
        public int TG_SetDataLog(int connectionId, String filename);
        public int TG_Connect(int connectionId, String serialPortName, int serialBaudrate, int serialDataFormat);
        public int TG_ReadPackets(int connectionId, int numPackets);
        public int TG_GetValueStatus(int connectionId, int dataType);
        public float TG_GetValue(int connectionId, int dataType);
        public void TG_Disconnect(int connectionId);
        public void TG_FreeConnection(int connectionId);
    }


    public TG_Connection(EEGService eeg) {
        this.eeg = eeg;
    }

    public void terminate() {
        this.terminating = true;
    }

    public void run() {

        String comPortName = "\\\\.\\COM4";

        int dllversion = Dll.INSTANCE.TG_GetVersion();
        System.out.println("The dllversion is: " + dllversion);

        connectionID = Dll.INSTANCE.TG_GetNewConnectionId();
        if (connectionID != 0) {
            System.out.println("ERROR: TG_GetNewConnectionId() returned " + connectionID);
            return;
        }
        System.out.println("The connectID is: " + connectionID);

        int errCode = Dll.INSTANCE.TG_SetStreamLog(connectionID, "streamLog.txt");
        if(errCode < 0) {
            System.out.println("ERROR: TG_SetStreamLog() returned" + errCode );
            return;
        }

        errCode = Dll.INSTANCE.TG_SetDataLog(connectionID, "dataLog.txt");
        if(errCode < 0) {
            System.out.println("ERROR: TG_SetDataLog() returned" + errCode );
            return;
        }

        errCode = Dll.INSTANCE.TG_Connect(connectionID, comPortName, TG_BAUD_9600,  TG_STREAM_PACKETS);
        if(errCode < 0) {
            System.out.println("ERROR: TG_Connect() returned" + errCode );
            return;
        }

        connection_status = true;
        System.out.println("Thinkgear initials succeessfully!");

        while(!this.terminating) {
            errCode = Dll.INSTANCE.TG_ReadPackets(connectionID, 1);
            if (errCode == 1) {

                if (Dll.INSTANCE.TG_GetValueStatus(connectionID, TG_DATA_ATTENTION) != 0) {  // if value changes
                    attention = Dll.INSTANCE.TG_GetValue(connectionID, TG_DATA_ATTENTION);
                    eeg.sendAttentionValueChangedEvent((int) attention);
                    System.out.println("Current Attention Value is: " + attention);
                }

//                if (TGConnection.Dll.INSTANCE.TG_GetValueStatus(connectionID, TG_DATA_ALPHA1) != 0) {  // if value changes
//                    alpha1 = TGConnection.Dll.INSTANCE.TG_GetValue(connectionID, TG_DATA_ALPHA1);
//                    System.out.println("Current Alpha1 Value is: " + alpha1);
//                }
//
//                if (TGConnection.Dll.INSTANCE.TG_GetValueStatus(connectionID, TG_DATA_ALPHA2) != 0) {  // if value changes
//                    alpha2 = TGConnection.Dll.INSTANCE.TG_GetValue(connectionID, TG_DATA_ALPHA2);
//                    System.out.println("Current Alpha2 Value is: " + alpha2);
//                }
//
//                if (TGConnection.Dll.INSTANCE.TG_GetValueStatus(connectionID, TG_DATA_BETA1) != 0) {  // if value changes
//                    beta1 = TGConnection.Dll.INSTANCE.TG_GetValue(connectionID, TG_DATA_BETA1);
//                    System.out.println("Current Beta1 Value is: " + beta1);
//                }
//
//                if (TGConnection.Dll.INSTANCE.TG_GetValueStatus(connectionID, TG_DATA_BETA2) != 0) {  // if value changes
//                    beta2 = TGConnection.Dll.INSTANCE.TG_GetValue(connectionID, TG_DATA_BETA2);
//                    System.out.println("Current Beta2 Value is: " + beta2);
//                }
//
//                if (TGConnection.Dll.INSTANCE.TG_GetValueStatus(connectionID, TG_DATA_DELTA) != 0) {  // if value changes
//                    delta = TGConnection.Dll.INSTANCE.TG_GetValue(connectionID, TG_DATA_DELTA);
//                    System.out.println("Current Delta Value is: " + delta);
//                }
            }
        }


    }
}

