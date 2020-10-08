import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.util.*;

class HandlerInfo{
    public Method method = null;
    public Object caller = null;
}

public class Server extends Thread {
    private final Map<String, HandlerInfo> handlerDict = new HashMap<String, HandlerInfo>();

    public <T> void registerMessageHandler(Class<T> cls, Object caller, String funcName)
            throws Exception {
        Method method = null;
        for(Method curMethod : cls.getDeclaredMethods()){
            if(curMethod.getName().equals(funcName))
                method = curMethod;
        }
        if(method == null)
            throw new Exception("No Such Method");
        HandlerInfo handlerInfo = new HandlerInfo();
        handlerInfo.caller = caller;
        handlerInfo.method = method;
        this.handlerDict.put(funcName, handlerInfo);
    }

    public void callRemote(String funcName, Object... args){
        Map<String, Object> sendDict = new HashMap<>();
        sendDict.put("funcName", funcName);
        sendDict.put("args", args);
        String jsonString = JSON.toJSONString(sendDict);
        System.out.print(jsonString + '\n');
    }

    public void dispatchRemoteCall() throws Exception {
        InputStreamReader isr = new InputStreamReader(System.in);
        BufferedReader br = new BufferedReader(isr);
        String request = br.readLine();
        while (!request.isEmpty()) {
            this.dispatch(request);
            request = br.readLine();
        }
    }

    private void dispatch(String request) throws Exception{
        JSONObject obj = JSON.parseObject(request);
        String funcName = obj.getString("funcName");
        JSONArray args = obj.getJSONArray("args");
        HandlerInfo handlerInfo = this.handlerDict.get(funcName);
        if(handlerInfo == null) {
            EEGLogger.log("Illegal remote call, check remote client please.");
            return;
        }
        Method method = this.handlerDict.get(funcName).method;
        Object caller = this.handlerDict.get(funcName).caller;
        Type[] argsType = method.getGenericParameterTypes();
        ArrayList<Object> objArgs = new ArrayList<>();
        for(int i = 0; i != args.size(); ++i){
            Type type = argsType[i];
            objArgs.add(args.getObject(i, type));
        }
        method.invoke(caller, objArgs.toArray());
    }

    @Override
    public void run(){
        while(true){
            try {
                this.dispatchRemoteCall();
                Thread.sleep(200);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
