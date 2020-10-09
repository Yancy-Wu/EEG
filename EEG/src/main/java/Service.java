import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.reflect.Method;

@Retention(RetentionPolicy.RUNTIME)
@interface CalledByRemote {
}

/*
    该基类的构造函数在初始化时，将查找其子类的所有成员函数
    如果发现某个成员函数存在CalledByRemote标记，将自动将之记录到Server的回调函数字典中。
 */
public class Service {
    Server server = null;
    public <T> Service(Server server, Class<T> serviceClass) throws Exception {
        this.server = server;
        for(Method method:serviceClass.getDeclaredMethods()){
            if(method.isAnnotationPresent(CalledByRemote.class)){
                this.server.registerMessageHandler(this.getClass(), this, method.getName());
            }
        }
    }
}
