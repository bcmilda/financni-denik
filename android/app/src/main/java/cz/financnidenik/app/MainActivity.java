package cz.financnidenik.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// Finanční deník – hlavní okno Android appky (webová část je ve složce app/).
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DiktatPlugin.class); // diktování přes rozpoznávání řeči telefonu
        super.onCreate(savedInstanceState);
    }
}
