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
    // 一个字典，其中记录了特定命令对应的回调函数
    private final Map<String, HandlerInfo> handlerDict = new HashMap<>();

    // 用于读取标准输入的变量
    private final BufferedReader br;

    public Server() {
        InputStreamReader isr = new InputStreamReader(System.in);
        br = new BufferedReader(isr);
    }

    /*
        给一个来自前端的IPC请求注册回调函数：
        该函数将从cls类中寻找名为{funcName}的函数，并将其保存到字典中.
     */
    public <T> void registerMessageHandler(Class<T> cls, Object caller, String funcName)
            throws Exception {
        // 遍历cls类的成员函数.
        Method method = null;
        for(Method curMethod : cls.getDeclaredMethods()){
            // 找到特定回调函数.
            if(curMethod.getName().equals(funcName))
                method = curMethod;
        }

        if(method == null)
            throw new Exception("No Such Method");

        // 将该类实例和回调函数保存到字典中.
        HandlerInfo handlerInfo = new HandlerInfo();
        handlerInfo.caller = caller;
        handlerInfo.method = method;
        this.handlerDict.put(funcName, handlerInfo);
    }

    /*
        调用前端的函数(IPC call)
        将函数名称和参数通过JSON序列化以后扔到标准输出(标准输出的另一头是前端)
     */
    public void callRemote(String funcName, Object... args){
        Map<String, Object> sendDict = new HashMap<>();
        sendDict.put("funcName", funcName);
        sendDict.put("args", args);
        String jsonString = JSON.toJSONString(sendDict);
        System.out.print(jsonString + '\n');
    }

    /*
        读取来自前端的函数调用
     */
    public void dispatchRemoteCall() throws Exception {
        if(!br.ready()) return;
        String request = br.readLine();
        while (!request.isEmpty()) {
            this.dispatch(request);
            request = br.readLine();
        }
    }

    /*
        分发来自前端的函数调用
        从保存的回调字典中查找是否有该调用以及调用的参数类型，若找到则调用该函数。
     */
    private void dispatch(String request) throws Exception{
        JSONObject obj = JSON.parseObject(request);
        String funcName = obj.getString("funcName");
        JSONArray args = obj.getJSONArray("args");
        HandlerInfo handlerInfo = this.handlerDict.get(funcName);
        if(handlerInfo == null) {
            System.out.println("Illegal remote call, check remote client please.");
            return;
        }

        // 将前端传来的参数反序列化成对象，并传到回调函数中。
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
        // 不停的读取来自前端的IPC请求，直到该线程发生中断.
        while(!Thread.currentThread().isInterrupted()){
            try {
                this.dispatchRemoteCall();
                Thread.sleep(200);
            } catch (Exception e) {
                e.printStackTrace();
                return;
            }
        }
    }
}
