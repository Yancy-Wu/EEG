import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.reflect.Method;

@Retention(RetentionPolicy.RUNTIME)
@interface CalledByRemote {
}

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
